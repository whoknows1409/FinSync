const express = require('express');
const axios = require('axios');
const router = express.Router();
const logger = require('../utils/logger');

// @desc    Proxy route to fetch historical stock data from Yahoo Finance API
// @route   GET /api/stocks/data
// @access  Public
router.get('/data', async (req, res) => {
  try {
    const { symbol, interval, range, includePrePost } = req.query;
    
    if (!symbol) {
      return res.status(400).json({ 
        success: false, 
        message: 'Symbol is required' 
      });
    }
    
    // Construct the Yahoo Finance API URL
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${interval || '1d'}&range=${range || '1d'}&includePrePost=${includePrePost || false}`;
    
    logger.info(`Fetching historical data from: ${url}`);
    
    // Make request to Yahoo Finance API
    const response = await axios.get(url);
    
    // Return the data
    res.json({
      success: true,
      data: response.data
    });
  } catch (error) {
    logger.error('Error fetching historical stock data:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch historical stock data',
      error: error.message 
    });
  }
});

module.exports = router;