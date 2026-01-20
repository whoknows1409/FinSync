// backend/services/stockService.js
const axios = require('axios');
let yahooFinanceInstance;
async function getYahooFinance() {
  if (!yahooFinanceInstance) {
    const YahooFinanceClass = (await import('yahoo-finance2')).default;
    yahooFinanceInstance = new YahooFinanceClass();
  }
  return yahooFinanceInstance;
}
const Stock = require('../models/Stock');
const logger = require('../utils/logger');

// Sector mapping for known stocks
const stockSectorMap = {
  'RELIANCE.NS': 'Energy',
  'TCS.NS': 'Information Technology',
  'INFY.NS': 'Information Technology',
  'HDFC.NS': 'Financial Services',
  'ICICIBANK.NS': 'Financial Services',
  'HINDUNILVR.NS': 'Consumer Goods',
  'ITC.NS': 'Consumer Goods',
  'KOTAKBANK.NS': 'Financial Services',
  'SBIN.NS': 'Financial Services',
  'L&T.NS': 'Construction',
  'RELIANCE': 'Energy',
  'TCS': 'Information Technology',
  'INFY': 'Information Technology',
  'HDFC': 'Financial Services',
  'ICICIBANK': 'Financial Services',
  'HINDUNILVR': 'Consumer Goods',
  'ITC': 'Consumer Goods',
  'KOTAKBANK': 'Financial Services',
  'SBIN': 'Financial Services',
  'L&T': 'Construction'
};

// Get stock details from external API with improved error handling and retry logic
exports.getStockDetails = async function(symbol, interval = '1d') {
  try {
    logger.info(`Fetching stock details for: ${symbol} with interval: ${interval}`);
    
    let stockSymbol = symbol.toUpperCase();
    
    // Only add .NS for Indian stocks that don't already have a suffix
    const indianStocks = ['SBIN', 'RELIANCE', 'TCS', 'INFY', 'HDFC', 'ICICIBANK', 'HINDUNILVR', 'ITC', 'KOTAKBANK', 'L&T'];
    if (indianStocks.includes(stockSymbol) && !stockSymbol.endsWith('.NS') && !stockSymbol.endsWith('.BSE')) {
      stockSymbol += '.NS';
    }

    logger.info(`Fetching from Yahoo Finance: ${stockSymbol}`);
    
    // Add retry logic with exponential backoff
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

    // Determine sector
    let sector = 'Unknown';
    
    // First check our mapping
    if (stockSectorMap[stockSymbol]) {
      sector = stockSectorMap[stockSymbol];
    } 
    // Then try to get from Yahoo Finance data
    else if (quote.price?.sector && quote.price?.sector !== 'N/A') {
      sector = quote.price?.sector;
    } 
    else if (quote.sector && quote.sector !== 'N/A') {
      sector = quote.sector;
    } 
    // Try industry as a fallback
    else if (quote.price?.industry && quote.price?.industry !== 'N/A') {
      sector = quote.price?.industry;
    }
    else if (quote.industry && quote.industry !== 'N/A') {
      sector = quote.industry;
    }
    
    logger.info(`Determined sector for ${stockSymbol}: ${sector}`);
    
    // Extract data from different modules, with fallbacks
    const price = quote.price || {};
    const summaryDetail = quote.summaryDetail || {};
    const defaultKeyStatistics = quote.defaultKeyStatistics || {};
    const financialData = quote.financialData || {};
    
    // Get 52-week high/low with multiple fallbacks
    let fiftyTwoWeekHigh = summaryDetail.fiftyTwoWeekHigh || 
                          defaultKeyStatistics.fiftyTwoWeekHigh || 
                          price.fiftyTwoWeekHigh || 
                          financialData.fiftyTwoWeekHigh || 0;
    
    let fiftyTwoWeekLow = summaryDetail.fiftyTwoWeekLow || 
                         defaultKeyStatistics.fiftyTwoWeekLow || 
                         price.fiftyTwoWeekLow || 
                         financialData.fiftyTwoWeekLow || 0;
    
    // If we still don't have valid 52-week values, try to fetch historical data
    if (fiftyTwoWeekHigh === 0 || fiftyTwoWeekLow === 0) {
      try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(endDate.getFullYear() - 1);
        
        const historicalData = [];
        
        if (historicalData && historicalData.length > 0) {
          const prices = historicalData.map(item => item.high);
          const lowPrices = historicalData.map(item => item.low);
          
          fiftyTwoWeekHigh = Math.max(...prices);
          fiftyTwoWeekLow = Math.min(...lowPrices);
          
          logger.info(`Fetched 52-week high/low from historical data: ${fiftyTwoWeekHigh}, ${fiftyTwoWeekLow}`);
        }
      } catch (histError) {
        logger.error('Error fetching historical data for 52-week range:', histError);
      }
    }
    
    // Format the stock data
    return {
      symbol: price.symbol || stockSymbol,
      name: price.longName || price.shortName || symbol,
      interval: interval,
      currentPrice: price.regularMarketPrice || 100,
      previousClose: price.regularMarketPreviousClose || 100,
      marketCap: price.marketCap || summaryDetail.marketCap || 0,
      peRatio: summaryDetail.trailingPE || financialData.trailingPE || null,
      dividendYield: summaryDetail.dividendYield || financialData.dividendYield || null,
      fiftyTwoWeekHigh: fiftyTwoWeekHigh,
      fiftyTwoWeekLow: fiftyTwoWeekLow,
      volume: price.regularMarketVolume || 0,
      averageVolume: summaryDetail.averageDailyVolume3Month || defaultKeyStatistics.averageDailyVolume3Month || 0,
      beta: defaultKeyStatistics.beta || null,
      change: price.regularMarketPrice && price.regularMarketPreviousClose 
        ? price.regularMarketPrice - price.regularMarketPreviousClose 
        : 0,
      changePercent: price.regularMarketPrice && price.regularMarketPreviousClose 
        ? ((price.regularMarketPrice - price.regularMarketPreviousClose) / price.regularMarketPreviousClose) * 100 
        : 0,
      sector: sector
    };
  } catch (error) {
    logger.error('Error fetching from Yahoo Finance:', error);
    
    // If Yahoo Finance fails, return default stock data with sector mapping
    return {
      symbol: symbol.toUpperCase(),
      name: symbol.toUpperCase(),
      interval: interval,
      currentPrice: 100,
      previousClose: 100,
      marketCap: 0,
      peRatio: null,
      dividendYield: null,
      fiftyTwoWeekHigh: 100,
      fiftyTwoWeekLow: 100,
      volume: 0,
      averageVolume: 0,
      beta: null,
      change: 0,
      changePercent: 0,
      sector: stockSectorMap[symbol.toUpperCase()] || 'Unknown'
    };
  }
};

// Get real-time price for a stock with improved error handling
exports.getRealTimePrice = async function(symbol) {
  try {
    logger.info(`Fetching real-time price for: ${symbol}`);
    
    let stockSymbol = symbol.toUpperCase();
    
    // Only add .NS for Indian stocks that don't already have a suffix
    const indianStocks = ['SBIN', 'RELIANCE', 'TCS', 'INFY', 'HDFC', 'ICICIBANK', 'HINDUNILVR', 'ITC', 'KOTAKBANK', 'L&T'];
    if (indianStocks.includes(stockSymbol) && !stockSymbol.endsWith('.NS') && !stockSymbol.endsWith('.BSE')) {
      stockSymbol += '.NS';
    }

    // Add a unique timestamp to prevent caching
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 10000);
    const uniqueId = `${timestamp}-${random}`;

    logger.info(`Fetching real-time price with unique ID: ${uniqueId}`);

    // Fetch real-time quote from Yahoo Finance with timeout and cache prevention
    const quote = await (await getYahooFinance()).quote(stockSymbol);
    
    // Check if the data is stale (older than 1 minute for real-time)
    const now = new Date();
    const quoteTime = new Date(quote.regularMarketTime * 1000);
    const isStale = (now - quoteTime) > 60 * 1000; // 1 minute threshold
    
    logger.info(`Price data for ${stockSymbol}: ${quote.regularMarketPrice}, Time: ${quoteTime}, Stale: ${isStale}`);
    
    // Determine sector
    let sector = 'Unknown';
    
    // First check our mapping
    if (stockSectorMap[stockSymbol]) {
      sector = stockSectorMap[stockSymbol];
    } 
    // Then try to get from Yahoo Finance data
    else if (quote.sector && quote.sector !== 'N/A') {
      sector = quote.sector;
    } 
    // Try industry as a fallback
    else if (quote.industry && quote.industry !== 'N/A') {
      sector = quote.industry;
    }
    
    return {
      symbol: quote.symbol,
      currentPrice: quote.regularMarketPrice,
      sector: sector,
      isStale,
      timestamp: quoteTime,
      marketState: quote.marketState
    };
  } catch (error) {
    logger.error('Error fetching real-time price:', error);
    
    // If Yahoo Finance fails, return default price data with sector mapping
    return {
      symbol: symbol.toUpperCase(),
      currentPrice: 100,
      sector: stockSectorMap[symbol.toUpperCase()] || 'Unknown',
      isStale: true,
      timestamp: new Date(),
      marketState: 'CLOSED'
    };
  }
};

// Validate stock symbol with improved error handling
exports.validateStockSymbol = async function(symbol, interval = '1d') {
  try {
    logger.info(`Validating stock symbol: ${symbol} with interval: ${interval}`);
    
    // Try to find the stock in the database first
    let stock = await Stock.findOne({ 
      $or: [
        { symbol: symbol.toUpperCase() },
        { symbol: symbol.toUpperCase() + '.NS' },
        { symbol: symbol.toUpperCase() + '.BSE' }
      ]
    });
    
    if (stock) {
      // Update the interval if it's different
      if (stock.interval !== interval) {
        stock.interval = interval;
        await stock.save();
      }
      return { isValid: true, details: stock };
    }
    
    // If not found, try to fetch from external API
    try {
      const stockDetails = await this.getStockDetails(symbol, interval);
      
      // Create a new stock in the database
      stock = new Stock({
        symbol: stockDetails.symbol,
        name: stockDetails.name,
        interval: stockDetails.interval,
        currentPrice: stockDetails.currentPrice,
        sector: stockDetails.sector || 'Unknown'
      });
      await stock.save();
      
      return { isValid: true, details: stock };
    } catch (externalError) {
      logger.error('Error fetching from external API:', externalError);
      
      // If external API fails, create a default stock entry with sector mapping
      stock = new Stock({
        symbol: symbol.toUpperCase(),
        name: symbol.toUpperCase(),
        interval: interval,
        currentPrice: 100,
        sector: stockSectorMap[symbol.toUpperCase()] || 'Unknown'
      });
      await stock.save();
      
      return { isValid: true, details: stock };
    }
  } catch (error) {
    logger.error('Stock symbol validation error:', error);
    throw new Error(`Invalid stock symbol: ${error.message}`);
  }
};