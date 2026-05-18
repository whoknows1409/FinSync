// backend/controllers/stockController.js
const axios = require('axios');
const Stock = require('../models/Stock');
const { GoogleGenerativeAI } = require('@google/generative-ai');
let yahooFinanceInstance;
async function getYahooFinance() {
  if (!yahooFinanceInstance) {
    const mod = (await import('yahoo-finance2')).default;
    // v3 exports a class (needs `new`), v2 exports a ready-to-use object
    if (typeof mod === 'function') {
      yahooFinanceInstance = new mod();
    } else {
      yahooFinanceInstance = mod;
    }
  }
  return yahooFinanceInstance;
}
const logger = require('../utils/logger');

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// @desc    Get stock data with improved error handling
// @route   GET /api/v1/stocks/:symbol
// @access  Private
exports.getStockData = async (req, res) => {
  try {
    const { symbol } = req.params;
    const { interval = '1d' } = req.query;
    
    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: 'Stock symbol is required'
      });
    }

    // Check if stock exists in our database
    let stock = await Stock.findOne({ 
      $or: [
        { symbol: symbol.toUpperCase() },
        { symbol: symbol.toUpperCase() + '.NS' },
        { symbol: symbol.toUpperCase() + '.BSE' }
      ]
    });
    
    if (!stock) {
      // Try to fetch from external API and create stock
      try {
        const externalStock = await fetchStockFromYahoo(symbol);
        stock = new Stock(externalStock);
        await stock.save();
        logger.info(`Created new stock: ${externalStock.symbol}`);
      } catch (error) {
        logger.error('Error creating stock:', error);
        return res.status(404).json({
          success: false,
          message: 'Stock not found and could not be created'
        });
      }
    }
    
    // Update interval if provided and different
    if (interval && stock.interval !== interval) {
      stock.interval = interval;
      await stock.save();
    }
    
    // Check if data is recent (within last 5 minutes)
    const now = new Date();
    const lastUpdated = new Date(stock.lastUpdated);
    const diffMinutes = (now - lastUpdated) / (1000 * 60);
    
    if (diffMinutes > 5) {
      // Try to update stock data
      try {
        const updatedStock = await fetchStockFromYahoo(symbol);
        stock.currentPrice = updatedStock.currentPrice;
        stock.previousClose = updatedStock.previousClose;
        stock.change = updatedStock.change;
        stock.changePercent = updatedStock.changePercent;
        stock.volume = updatedStock.volume;
        stock.lastUpdated = new Date();
        await stock.save();
      } catch (error) {
        logger.error('Error updating stock data:', error);
        // Continue with existing data if update fails
      }
    }
    
    res.json({
      success: true,
      data: { stock }
    });
  } catch (error) {
    logger.error('Get stock data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stock data'
    });
  }
};

// Helper function to fetch stock from Yahoo Finance
async function fetchStockFromYahoo(symbol) {
  let stockSymbol = symbol.toUpperCase();
  
  // Add .NS suffix for Indian stocks if not present
  const indianStocks = ['SBIN', 'RELIANCE', 'TCS', 'INFY', 'HDFC', 'ICICIBANK', 'HINDUNILVR', 'ITC', 'KOTAKBANK', 'L&T'];
  if (indianStocks.includes(stockSymbol) && !stockSymbol.endsWith('.NS') && !stockSymbol.endsWith('.BSE')) {
    stockSymbol += '.NS';
  }

  logger.info(`Fetching from Yahoo Finance: ${stockSymbol}`);
  
  // Add retry logic
  let quote = null;
  let retryCount = 0;
  const maxRetries = 3;
  
  while (retryCount < maxRetries) {
    try {
      quote = await (await getYahooFinance()).quote(stockSymbol);
      break;
    } catch (retryError) {
      retryCount++;
      logger.warn(`Retry ${retryCount}/${maxRetries} for ${stockSymbol}:`, retryError.message);
      
      if (retryCount >= maxRetries) {
        throw retryError;
      }
      
      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retryCount)));
    }
  }
  
  if (!quote) {
    throw new Error('Failed to fetch stock data after retries');
  }

  const price = quote.price || {};
  const summaryDetail = quote.summaryDetail || {};
  
  return {
    symbol: price.symbol || stockSymbol,
    name: price.longName || price.shortName || symbol,
    interval: '1d',
    currentPrice: price.regularMarketPrice || 100,
    previousClose: price.regularMarketPreviousClose || 100,
    change: price.regularMarketPrice && price.regularMarketPreviousClose 
      ? price.regularMarketPrice - price.regularMarketPreviousClose 
      : 0,
    changePercent: price.regularMarketPrice && price.regularMarketPreviousClose 
      ? ((price.regularMarketPrice - price.regularMarketPreviousClose) / price.regularMarketPreviousClose) * 100 
      : 0,
    volume: price.regularMarketVolume || 0,
    marketCap: price.marketCap || 0,
    peRatio: summaryDetail.trailingPE || null,
    dividendYield: summaryDetail.dividendYield || null,
    fiftyTwoWeekHigh: summaryDetail.fiftyTwoWeekHigh || 0,
    fiftyTwoWeekLow: summaryDetail.fiftyTwoWeekLow || 0,
    sector: price.sector || 'Unknown',
    lastUpdated: new Date()
  };
}

// @desc    Get historical stock data with improved error handling
// @route   GET /api/v1/stocks/:symbol/historical
// @access  Private
exports.getHistoricalData = async (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeframe = '1D', interval = '5m' } = req.query;
    
    if (!symbol) {
      return res.status(400).json({
        success: false,
        message: 'Stock symbol is required'
      });
    }

    // Add .NS suffix for Indian stocks if not present
    let stockSymbol = symbol.toUpperCase();
    const indianStocks = ['SBIN', 'RELIANCE', 'TCS', 'INFY', 'HDFC', 'ICICIBANK', 'HINDUNILVR', 'ITC', 'KOTAKBANK', 'L&T'];
    if (indianStocks.includes(stockSymbol) && !stockSymbol.endsWith('.NS') && !stockSymbol.endsWith('.BSE')) {
      stockSymbol += '.NS';
    }
    
    const now = new Date();
    let period1, period2;
    
    // Configure based on timeframe
    switch (timeframe) {
      case 'Live':
      case '1D':
        period1 = new Date();
        period1.setHours(9, 15, 0, 0);
        if (period1 > now) period1.setDate(period1.getDate() - 1);
        period2 = now;
        break;
      case '1W':
        period1 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        period2 = now;
        break;
      case '1M':
        period1 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        period2 = now;
        break;
      case '3M':
        period1 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        period2 = now;
        break;
      case '6M':
        period1 = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        period2 = now;
        break;
      case '1Y':
        period1 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        period2 = now;
        break;
      case '2Y':
        period1 = new Date(now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000);
        period2 = now;
        break;
      case '5Y':
        period1 = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000);
        period2 = now;
        break;
      default:
        period1 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        period2 = now;
    }
    
    try {
      const queryOptions = {
        period1,
        period2,
        interval: interval,
      };
      
      const chartResult = await Promise.race([
        (await getYahooFinance()).chart(stockSymbol, queryOptions),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Historical data request timeout')), 15000)
        )
      ]);
      
      const historical = (chartResult?.quotes || []).filter(item => item.close != null);

      if (!historical || historical.length === 0) {
        throw new Error('No historical data returned');
      }
      
      // Format data for frontend
      const formattedData = historical.map(item => ({
        time: item.date.toISOString(),
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume || 0
      }));

      res.json({
        success: true,
        data: formattedData
      });
    } catch (yfError) {
      logger.error('Yahoo Finance API error:', yfError);
      
      // For development, return mock data
      if (process.env.NODE_ENV === 'development') {
        const mockData = generateMockHistoricalData(timeframe);
        return res.json({
          success: true,
          data: mockData,
          warning: 'Using mock data due to API error'
        });
      }
      
      throw new Error(`Failed to fetch historical data: ${yfError.message}`);
    }
  } catch (error) {
    logger.error('Get historical data error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch historical data'
    });
  }
}

// Helper function to generate mock historical data
function generateMockHistoricalData(timeframe) {
  const data = [];
  const now = new Date();
  let points = 0;
  
  switch (timeframe) {
    case '1D': points = 78; break;
    case '1W': points = 7 * 24 * 4; break;
    case '1M': points = 30 * 24 * 2; break;
    default: points = 100;
  }
  
  let basePrice = 100;
  
  for (let i = points; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 5 * 60 * 1000);
    const change = (Math.random() - 0.5) * 2;
    basePrice += change;
    
    data.push({
      time: date.toISOString(),
      open: basePrice,
      high: basePrice + Math.random() * 2,
      low: basePrice - Math.random() * 2,
      close: basePrice + (Math.random() - 0.5),
      volume: Math.floor(Math.random() * 1000000)
    });
  }
  
  return data;
}

// @desc    Get stock analysis using Gemini AI
// @route   POST /api/v1/stocks/:symbol/analysis
// @access  Private
exports.getStockAnalysis = async (req, res) => {
  try {
    const { symbol } = req.params;
    const { query, interval = '1d' } = req.body;
    
    // Get stock data
    const stock = await Stock.findOne({ symbol: symbol.toUpperCase() });
    
    if (!stock) {
      return res.status(404).json({
        success: false,
        message: 'Stock not found'
      });
    }
    
    // For now, return a message that analysis is not available
    return res.status(501).json({
      success: false,
      message: 'Stock analysis is not available at the moment'
    });
    
    // In a real implementation, we would use Gemini AI for analysis
  } catch (error) {
    logger.error('Get stock analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get stock analysis'
    });
  }
};

// @desc    Get popular stocks
// @route   GET /api/v1/stocks/popular
// @access  Private
exports.getPopularStocks = async (req, res) => {
  try {
    const { interval = '1d' } = req.query;
    
    // Get top stocks by market cap
    const stocks = await Stock.find({ isActive: true })
      .sort({ marketCap: -1 })
      .limit(50);
    
    if (stocks.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No stocks found. Please try again later.'
      });
    }
    
    res.json({
      success: true,
      data: { stocks }
    });
  } catch (error) {
    logger.error('Get popular stocks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch popular stocks'
    });
  }
};

// @desc    Search stocks with improved error handling
// @route   GET /api/v1/stocks/search
// @access  Private
exports.searchStocks = async (req, res) => {
  try {
    const { q, interval = '1d' } = req.query;
    
    if (!q || q.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    
    // Try to find in our database first
    const dbStocks = await Stock.find({
      $or: [
        { symbol: { $regex: q, $options: 'i' } },
        { name: { $regex: q, $options: 'i' } }
      ]
    }).limit(20);

    if (dbStocks.length > 0) {
      return res.json({
        success: true,
        data: {
          stocks: dbStocks
        }
      });
    }

    // If not found in database, fetch from Yahoo Finance
    let symbol = q.toUpperCase();
    
    // Add .NS suffix for Indian stocks if not present
    const indianStocks = ['SBIN', 'RELIANCE', 'TCS', 'INFY', 'HDFC', 'ICICIBANK', 'HINDUNILVR', 'ITC', 'KOTAKBANK', 'L&T'];
    if (indianStocks.includes(symbol) && !symbol.endsWith('.NS') && !symbol.endsWith('.BSE')) {
      symbol += '.NS';
    }

    try {
      const externalStock = await fetchStockFromYahoo(symbol);
      
      // Save to database for future use
      const newStock = new Stock(externalStock);
      await newStock.save();
      logger.info(`Saved new stock to database: ${externalStock.symbol}`);
      
      res.json({
        success: true,
        data: {
          stocks: [newStock]
        }
      });
    } catch (error) {
      logger.error('Error fetching from external API:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to search stocks. Please check the symbol and try again.'
      });
    }
  } catch (error) {
    logger.error('Search stocks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search stocks'
    });
  }
};