// backend/routes/stockRoutes.js
const express = require('express');
const router = express.Router();
let yahooFinanceInstance;
async function getYahooFinance() {
  if (!yahooFinanceInstance) {
    const YahooFinanceClass = (await import('yahoo-finance2')).default;
    yahooFinanceInstance = new YahooFinanceClass();
  }
  return yahooFinanceInstance;
}
const logger = require('../utils/logger');
const Stock = require('../models/Stock');

// Test route
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Stock API is working',
    timestamp: new Date().toISOString()
  });
});

// Health check endpoint
router.get('/health', async (req, res) => {
  try {
    // Test Yahoo Finance connectivity
    await (await getYahooFinance()).quote('RELIANCE.NS');
    
    res.json({
      success: true,
      message: 'Stock API is healthy',
      yahooFinance: 'connected',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      message: 'Stock API is unhealthy',
      yahooFinance: 'disconnected',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// @desc    Search stocks by symbol or name with improved error handling
// @route   GET /api/v1/stocks/search
// @access  Public
router.get('/search', async (req, res) => {
  try {
    const { q, interval = '1d' } = req.query;
    
    if (!q) {
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

    logger.info(`Fetching from Yahoo Finance: ${symbol}`);
    
    // Add retry logic
    let quote = null;
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        quote = await (await getYahooFinance()).quote(symbol);
        break;
      } catch (retryError) {
        retryCount++;
        logger.warn(`Retry ${retryCount}/${maxRetries} for ${symbol}:`, retryError.message);
        
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
    
    // Format the stock data
    const stock = {
      symbol: quote.symbol,
      name: quote.longName || quote.shortName || symbol,
      interval: interval,
      currentPrice: quote.regularMarketPrice,
      previousClose: quote.regularMarketPreviousClose,
      marketCap: quote.marketCap || 0,
      peRatio: quote.trailingPE || 0,
      dividendYield: quote.dividendYield || 0,
      fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || 0,
      fiftyTwoWeekLow: quote.fiftyTwoWeekLow || 0,
      volume: quote.regularMarketVolume || 0,
      averageVolume: quote.averageDailyVolume3Month || 0,
      beta: quote.beta || 0,
      change: quote.regularMarketPrice && quote.regularMarketPreviousClose 
        ? quote.regularMarketPrice - quote.regularMarketPreviousClose 
        : 0,
      changePercent: quote.regularMarketPrice && quote.regularMarketPreviousClose 
        ? ((quote.regularMarketPrice - quote.regularMarketPreviousClose) / quote.regularMarketPreviousClose) * 100 
        : 0,
      sector: quote.sector || 'Unknown'
    };
    
    // Save to database for future use
    const newStock = new Stock(stock);
    await newStock.save();
    logger.info(`Saved new stock to database: ${stock.symbol}`);
    
    res.json({
      success: true,
      data: {
        stocks: [stock]
      }
    });
  } catch (error) {
    logger.error('Error in stock search:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to search stocks. Please check the symbol and try again.' 
    });
  }
});

// @desc    Get stock details by symbol with improved error handling
// @route   GET /api/v1/stocks/:symbol
// @access  Public
router.get('/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { interval = '1d' } = req.query;
    
    if (!symbol) {
      return res.status(400).json({ 
        success: false, 
        message: 'Stock symbol is required' 
      });
    }

    // Try to find in our database first
    let stock = await Stock.findOne({ 
      $or: [
        { symbol: symbol.toUpperCase() },
        { symbol: symbol.toUpperCase() + '.NS' },
        { symbol: symbol.toUpperCase() + '.BSE' }
      ]
    });

    if (!stock) {
      // If not found in database, fetch from Yahoo Finance
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
      
      // Format the stock data
      const stockData = {
        symbol: quote.symbol,
        name: quote.longName || quote.shortName || symbol,
        interval: interval,
        currentPrice: quote.regularMarketPrice,
        previousClose: quote.regularMarketPreviousClose,
        marketCap: quote.marketCap,
        peRatio: quote.trailingPE,
        dividendYield: quote.dividendYield,
        fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: quote.fiftyTwoWeekLow,
        volume: quote.regularMarketVolume,
        averageVolume: quote.averageDailyVolume3Month,
        beta: quote.beta,
        change: quote.regularMarketPrice && quote.regularMarketPreviousClose 
          ? quote.regularMarketPrice - quote.regularMarketPreviousClose 
          : 0,
        changePercent: quote.regularMarketPrice && quote.regularMarketPreviousClose 
          ? ((quote.regularMarketPrice - quote.regularMarketPreviousClose) / quote.regularMarketPreviousClose) * 100 
          : 0,
        sector: quote.sector || 'Unknown'
      };
      
      // Save to database
      stock = new Stock(stockData);
      await stock.save();
      logger.info(`Saved new stock to database: ${stockData.symbol}`);
    } else {
      // Update interval if provided and different
      if (stock.interval !== interval) {
        stock.interval = interval;
        await stock.save();
      }
    }
    
    res.json({
      success: true,
      data: {
        stock
      }
    });
  } catch (error) {
    logger.error('Error fetching stock details:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch stock details. Please check the symbol and try again.' 
    });
  }
});

// @desc    Get real-time price for a stock with improved error handling
// @route   GET /api/v1/stocks/:symbol/price
// @access  Public
router.get('/:symbol/price', async (req, res) => {
  try {
    const { symbol } = req.params;
    
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

    logger.info(`Fetching price from Yahoo Finance: ${stockSymbol}`);
    
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
      throw new Error('Failed to fetch stock price after retries');
    }
    
    // Check if the data is stale (older than 5 minutes)
    const now = new Date();
    const quoteTime = new Date(quote.regularMarketTime * 1000);
    const isStale = (now - quoteTime) > 5 * 60 * 1000;
    
    res.json({
      success: true,
      data: {
        symbol: quote.symbol,
        currentPrice: quote.regularMarketPrice,
        isStale
      }
    });
  } catch (error) {
    logger.error('Error fetching stock price:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch stock price. Please check the symbol and try again.' 
    });
  }
});

// @desc    Get historical stock data with proper intervals and improved error handling
// @route   GET /api/v1/stocks/:symbol/historical
// @access  Public
router.get('/:symbol/historical', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { timeframe = '1D' } = req.query;
    
    logger.info(`Fetching historical data for ${symbol} with timeframe ${timeframe}`);
    
    // Add .NS suffix for Indian stocks if not present
    let stockSymbol = symbol.toUpperCase();
    const indianStocks = ['SBIN', 'RELIANCE', 'TCS', 'INFY', 'HDFC', 'ICICIBANK', 'HINDUNILVR', 'ITC', 'KOTAKBANK', 'L&T'];
    if (indianStocks.includes(stockSymbol) && !stockSymbol.endsWith('.NS') && !stockSymbol.endsWith('.BSE')) {
      stockSymbol += '.NS';
    }
    
    const now = new Date();
    let period1, period2, interval;
    
    // Configure based on timeframe
    switch (timeframe) {
      case 'Live':
      case '1D':
        period1 = new Date();
        period1.setHours(9, 15, 0, 0);
        if (period1 > now) period1.setDate(period1.getDate() - 1);
        period2 = now;
        interval = '5m';
        break;
      case '1W':
        period1 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        period2 = now;
        interval = '15m';
        break;
      case '1M':
        period1 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        period2 = now;
        interval = '30m';
        break;
      case '3M':
        period1 = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        period2 = now;
        interval = '1h';
        break;
      case '6M':
        period1 = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        period2 = now;
        interval = '1h';
        break;
      case '1Y':
        period1 = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        period2 = now;
        interval = '1d';
        break;
      case '2Y':
        period1 = new Date(now.getTime() - 2 * 365 * 24 * 60 * 60 * 1000);
        period2 = now;
        interval = '1d';
        break;
      case '5Y':
        period1 = new Date(now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000);
        period2 = now;
        interval = '1d';
        break;
      default:
        period1 = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        period2 = now;
        interval = '5m';
    }
    
    logger.info(`Fetching from Yahoo Finance: ${stockSymbol}, period1: ${period1.toISOString()}, period2: ${period2.toISOString()}, interval: ${interval}`);
    
    try {
      const p1 = Math.floor(period1.getTime() / 1000);
      const p2 = Math.floor(period2.getTime() / 1000);
      logger.info('Yahoo Finance query options:', { period1: period1.toISOString(), period2: period2.toISOString(), interval });
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(stockSymbol)}?period1=${p1}&period2=${p2}&interval=${encodeURIComponent(interval)}`;
      const resp = await fetch(url);
      if (!resp.ok) {
        throw new Error(`Yahoo chart API responded ${resp.status}`);
      }
      const json = await resp.json();
      const result = json?.chart?.result?.[0];
      const timestamps = result?.timestamp || [];
      const o = result?.indicators?.quote?.[0]?.open || [];
      const h = result?.indicators?.quote?.[0]?.high || [];
      const l = result?.indicators?.quote?.[0]?.low || [];
      const c = result?.indicators?.quote?.[0]?.close || [];
      const v = result?.indicators?.quote?.[0]?.volume || [];

      if (!timestamps.length || !c.length) {
        throw new Error('No historical data returned from Yahoo Finance');
      }

      const formattedData = timestamps.map((ts, idx) => ({
        time: new Date(ts * 1000).toISOString(),
        open: Number(o[idx] ?? c[idx] ?? 0),
        high: Number(h[idx] ?? c[idx] ?? 0),
        low: Number(l[idx] ?? c[idx] ?? 0),
        close: Number(c[idx] ?? 0),
        volume: Number(v[idx] ?? 0),
      }));

      logger.info(`Fetched ${formattedData.length} data points for ${stockSymbol}`);
      
      res.json({
        success: true,
        data: formattedData
      });
    } catch (yfError) {
      logger.error('Yahoo Finance API error:', yfError);
      
      // Try alternative approach for problematic timeframes
      try {
        logger.info('Trying alternative approach for timeframe:', timeframe);
        
        let altPeriod1;
        switch (timeframe) {
          case '1W':
            altPeriod1 = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
            break;
          case '1M':
            altPeriod1 = new Date(now.getTime() - 45 * 24 * 60 * 60 * 1000);
            break;
          default:
            altPeriod1 = period1;
        }
        
        if (altPeriod1 !== period1) {
          logger.info(`Trying with alternative period: ${altPeriod1.toISOString()}`);
          const altHistorical = [];
          
          if (altHistorical && altHistorical.length > 0) {
            const altFormattedData = altHistorical.map(item => ({
              time: item.date.toISOString(),
              open: item.open,
              high: item.high,
              low: item.low,
              close: item.close,
              volume: item.volume || 0
            }));
            
            logger.info(`Successfully fetched ${altFormattedData.length} data points with alternative approach`);
            
            res.json({
              success: true,
              data: altFormattedData
            });
            return;
          }
        }
        
        throw yfError;
      } catch (altError) {
        logger.error('Alternative approach also failed:', altError);
        
        // For development, return mock data
        if (process.env.NODE_ENV === 'development') {
          const mockData = generateMockHistoricalData(timeframe);
          return res.json({
            success: true,
            data: mockData,
            warning: 'Using mock data due to API error'
          });
        }
        
        throw new Error(`Failed to fetch historical data for ${timeframe} timeframe. Please try a different timeframe.`);
      }
    }
  } catch (error) {
    logger.error('Get historical data error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch historical data. Please try again later.'
    });
  }
});

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

// @desc    Get real-time stock data with improved error handling
// @route   GET /api/v1/stocks/:symbol/real-time
// @access  Public
router.get('/:symbol/real-time', async (req, res) => {
  try {
    const { symbol } = req.params;
    
    logger.info(`Fetching real-time data for ${symbol}`);
    
    // Add .NS suffix for Indian stocks if not present
    let stockSymbol = symbol.toUpperCase();
    const indianStocks = ['SBIN', 'RELIANCE', 'TCS', 'INFY', 'HDFC', 'ICICIBANK', 'HINDUNILVR', 'ITC', 'KOTAKBANK', 'L&T'];
    if (indianStocks.includes(stockSymbol) && !stockSymbol.endsWith('.NS') && !stockSymbol.endsWith('.BSE')) {
      stockSymbol += '.NS';
    }
    
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
      throw new Error('Failed to fetch real-time data after retries');
    }
    
    const realTimeData = {
      symbol: quote.symbol,
      name: quote.longName || quote.shortName || symbol,
      currentPrice: quote.regularMarketPrice,
      previousClose: quote.regularMarketPreviousClose,
      change: quote.regularMarketPrice - quote.regularMarketPreviousClose,
      changePercent: ((quote.regularMarketPrice - quote.regularMarketPreviousClose) / quote.regularMarketPreviousClose) * 100,
      marketCap: quote.marketCap,
      volume: quote.regularMarketVolume,
      lastUpdated: new Date(quote.regularMarketTime * 1000).toISOString(),
      isStale: (Date.now() - quote.regularMarketTime * 1000) > 60000
    };
    
    logger.info(`Real-time data fetched for ${symbol}: ${realTimeData.currentPrice}`);
    
    res.json({
      success: true,
      data: realTimeData
    });
  } catch (error) {
    logger.error('Get real-time data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch real-time data. Please check the symbol and try again.'
    });
  }
});

module.exports = router;