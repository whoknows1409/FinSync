// backend/routes/stockRoutes.js
const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const Stock = require('../models/Stock');
const NodeCache = require('node-cache');
const marketData = require('../services/marketDataService');

// Well-known NSE tickers that get the .NS suffix when given bare
const INDIAN_STOCKS = ['SBIN', 'RELIANCE', 'TCS', 'INFY', 'HDFC', 'ICICIBANK', 'HINDUNILVR', 'ITC', 'KOTAKBANK', 'L&T'];

function toYahooSymbol(symbol) {
  const upper = String(symbol).toUpperCase();
  return INDIAN_STOCKS.includes(upper) ? `${upper}.NS` : upper;
}

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Refresh the saved Stock document from a live quote, so search results and
// gainers/losers don't keep the price from when a symbol was first looked up
async function saveQuote(quote, interval) {
  try {
    return await Stock.findOneAndUpdate(
      { symbol: quote.symbol },
      {
        $set: {
          name: quote.name,
          interval,
          currentPrice: quote.currentPrice,
          previousClose: quote.previousClose,
          change: quote.change ?? 0,
          changePercent: quote.changePercent ?? 0,
          volume: quote.volume,
          marketCap: quote.marketCap,
          lastUpdated: new Date(),
        },
        $setOnInsert: { sector: 'Unknown' },
      },
      { upsert: true, new: true }
    );
  } catch (error) {
    logger.warn(`Could not save ${quote.symbol} to database: ${error.message}`);
    return null;
  }
}

function sendMarketDataError(res, error, message) {
  if (error.status === 404) {
    return res.status(404).json({ success: false, message: 'Stock not found. Please check the symbol and try again.' });
  }
  res.status(error.status === 400 ? 400 : 502).json({ success: false, message });
}

// Cache for historical data to reduce Yahoo Finance API calls
const historicalCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });

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
    await marketData.getQuote('RELIANCE.NS');
    
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

// @desc    Search stocks by symbol or name
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
    const pattern = escapeRegex(String(q));
    const dbStocks = await Stock.find({
      $or: [
        { symbol: { $regex: pattern, $options: 'i' } },
        { name: { $regex: pattern, $options: 'i' } }
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
    let quote;
    try {
      quote = await marketData.getQuote(toYahooSymbol(q));
    } catch (error) {
      if (error.status === 404) {
        return res.json({ success: true, data: { stocks: [] } });
      }
      throw error;
    }
    await saveQuote(quote, interval);
    
    res.json({
      success: true,
      data: {
        stocks: [{ ...quote, interval, sector: 'Unknown' }]
      }
    });
  } catch (error) {
    logger.error('Error in stock search:', error);
    res.status(502).json({ 
      success: false, 
      message: 'Failed to search stocks. Please try again later.' 
    });
  }
});

// @desc    Get live stock details by symbol
// @route   GET /api/v1/stocks/:symbol
// @access  Public
router.get('/:symbol', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { interval = '1d' } = req.query;

    // Always quote live; the saved document is refreshed, never served in place of a quote
    const quote = await marketData.getQuote(toYahooSymbol(symbol));
    const saved = await saveQuote(quote, interval);
    
    res.json({
      success: true,
      data: {
        stock: { ...(saved ? saved.toObject() : {}), ...quote, interval }
      }
    });
  } catch (error) {
    logger.error('Error fetching stock details:', error);
    sendMarketDataError(res, error, 'Failed to fetch stock details. Please try again later.');
  }
});

// @desc    Get real-time price for a stock
// @route   GET /api/v1/stocks/:symbol/price
// @access  Public
router.get('/:symbol/price', async (req, res) => {
  try {
    const quote = await marketData.getQuote(toYahooSymbol(req.params.symbol));
    
    res.json({
      success: true,
      data: {
        symbol: quote.symbol,
        currentPrice: quote.currentPrice,
        // Stale if the last trade is older than 5 minutes
        isStale: Date.now() - Date.parse(quote.lastUpdated) > 5 * 60 * 1000
      }
    });
  } catch (error) {
    logger.error('Error fetching stock price:', error);
    sendMarketDataError(res, error, 'Failed to fetch stock price. Please try again later.');
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
    
    // Check cache first
    const cacheKey = `hist_${stockSymbol}_${timeframe}`;
    const cached = historicalCache.get(cacheKey);
    if (cached) {
      logger.info(`Cache hit for ${cacheKey}`);
      return res.json({ success: true, data: cached });
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
    
    const p1 = Math.floor(period1.getTime() / 1000);
    const p2 = Math.floor(period2.getTime() / 1000);
    logger.info(`Fetching from Yahoo Finance: ${stockSymbol}, period1: ${period1.toISOString()}, period2: ${period2.toISOString()}, interval: ${interval}`);
    
    // Try query2 first (less rate-limited), then query1 as fallback
    const endpoints = [
      `https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(stockSymbol)}?period1=${p1}&period2=${p2}&interval=${encodeURIComponent(interval)}`,
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(stockSymbol)}?period1=${p1}&period2=${p2}&interval=${encodeURIComponent(interval)}`
    ];

    let formattedData = null;

    for (const url of endpoints) {
      try {
        logger.info(`Trying: ${url.split('?')[0]}`);
        const resp = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        });

        if (!resp.ok) {
          logger.warn(`Yahoo chart API responded ${resp.status} from ${url.includes('query2') ? 'query2' : 'query1'}`);
          continue;
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
          logger.warn('No data points in response, trying next endpoint');
          continue;
        }

        // Skip bars Yahoo hasn't filled in (null close) instead of plotting them at 0
        formattedData = timestamps.map((ts, idx) => ({
          time: new Date(ts * 1000).toISOString(),
          open: Number(o[idx] ?? c[idx] ?? 0),
          high: Number(h[idx] ?? c[idx] ?? 0),
          low: Number(l[idx] ?? c[idx] ?? 0),
          close: Number(c[idx] ?? 0),
          volume: Number(v[idx] ?? 0),
        })).filter((_, idx) => c[idx] != null);

        break; // Success, stop trying endpoints
      } catch (fetchErr) {
        logger.warn(`Fetch failed for endpoint: ${fetchErr.message}`);
        continue;
      }
    }

    if (formattedData && formattedData.length > 0) {
      // Cache the result (5 min for intraday, 30 min for daily+)
      const cacheTTL = ['Live', '1D', '1W'].includes(timeframe) ? 300 : 1800;
      historicalCache.set(cacheKey, formattedData, cacheTTL);

      logger.info(`Fetched ${formattedData.length} data points for ${stockSymbol}`);
      return res.json({ success: true, data: formattedData });
    }

    // All endpoints failed
    throw new Error(`Failed to fetch historical data for ${timeframe} timeframe. Please try again later.`);
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

// @desc    Get real-time stock data
// @route   GET /api/v1/stocks/:symbol/real-time
// @access  Public
router.get('/:symbol/real-time', async (req, res) => {
  try {
    const quote = await marketData.getQuote(toYahooSymbol(req.params.symbol));
    
    res.json({
      success: true,
      data: {
        ...quote,
        timestamp: quote.lastUpdated,
        isStale: Date.now() - Date.parse(quote.lastUpdated) > 60 * 1000
      }
    });
  } catch (error) {
    logger.error('Get real-time data error:', error);
    sendMarketDataError(res, error, 'Failed to fetch real-time data. Please try again later.');
  }
});

module.exports = router;