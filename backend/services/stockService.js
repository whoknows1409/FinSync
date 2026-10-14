// backend/services/stockService.js
const marketData = require('./marketDataService');
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

// Well-known NSE tickers that get the .NS suffix when given bare
const INDIAN_STOCKS = ['SBIN', 'RELIANCE', 'TCS', 'INFY', 'HDFC', 'ICICIBANK', 'HINDUNILVR', 'ITC', 'KOTAKBANK', 'L&T'];

function toYahooSymbol(symbol) {
  const upper = symbol.toUpperCase();
  return INDIAN_STOCKS.includes(upper) ? `${upper}.NS` : upper;
}

// Get live stock details. Throws if no live quote is available, so callers never
// trade or display a made-up price.
exports.getStockDetails = async function(symbol, interval = '1d') {
  const stockSymbol = toYahooSymbol(symbol);
  logger.info(`Fetching stock details for: ${stockSymbol} with interval: ${interval}`);

  const quote = await marketData.getQuote(stockSymbol);
  return {
    ...quote,
    interval,
    sector: stockSectorMap[quote.symbol] || 'Unknown'
  };
};

// Get the live price for a stock. Throws if no live quote is available.
exports.getRealTimePrice = async function(symbol) {
  const quote = await marketData.getQuote(toYahooSymbol(symbol));
  const timestamp = new Date(quote.lastUpdated);

  return {
    symbol: quote.symbol,
    currentPrice: quote.currentPrice,
    sector: stockSectorMap[quote.symbol] || 'Unknown',
    // Stale if the last trade is older than 1 minute (e.g. market closed)
    isStale: Date.now() - timestamp.getTime() > 60 * 1000,
    timestamp,
    marketState: quote.marketState
  };
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
      return { isValid: false, error: externalError.message };
    }
  } catch (error) {
    logger.error('Stock symbol validation error:', error);
    throw new Error(`Invalid stock symbol: ${error.message}`);
  }
};