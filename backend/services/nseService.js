const axios = require('axios');
const cheerio = require('cheerio');

// Base URL for NSE India
const NSE_BASE_URL = 'https://www.nseindia.com';

// Create axios instance with necessary headers
const nseClient = axios.create({
  baseURL: NSE_BASE_URL,
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'max-age=0',
  },
  timeout: 15000,
});

// Function to get top gainers
async function getTopGainers() {
  try {
    const response = await nseClient.get('/market-data/live-market-losers');
    const $ = cheerio.load(response.data);
    
    const gainers = [];
    
    // Parse the gainers table
    $('#topGainersTable tbody tr').each((i, element) => {
      if (i < 10) { // Get top 10 gainers
        const $row = $(element);
        const symbol = $row.find('td:nth-child(1)').text().trim();
        const name = $row.find('td:nth-child(2)').text().trim();
        const lastPrice = parseFloat($row.find('td:nth-child(3)').text().replace(/,/g, ''));
        const change = parseFloat($row.find('td:nth-child(4)').text().replace(/,/g, ''));
        const changePercent = parseFloat($row.find('td:nth-child(5)').text().replace(/,/g, ''));
        
        gainers.push({
          symbol,
          name,
          currentPrice: lastPrice,
          change,
          changePercent,
          sector: 'N/A', // NSE doesn't provide sector in this table
          marketCap: 0, // Not available in this table
          volume: 0, // Not available in this table
          pe: null // Not available in this table
        });
      }
    });
    
    return gainers;
  } catch (error) {
    console.error('Error fetching top gainers:', error);
    throw new Error('Failed to fetch top gainers from NSE');
  }
}

// Function to get top losers
async function getTopLosers() {
  try {
    const response = await nseClient.get('/market-data/live-market-losers');
    const $ = cheerio.load(response.data);
    
    const losers = [];
    
    // Parse the losers table
    $('#topLosersTable tbody tr').each((i, element) => {
      if (i < 10) { // Get top 10 losers
        const $row = $(element);
        const symbol = $row.find('td:nth-child(1)').text().trim();
        const name = $row.find('td:nth-child(2)').text().trim();
        const lastPrice = parseFloat($row.find('td:nth-child(3)').text().replace(/,/g, ''));
        const change = parseFloat($row.find('td:nth-child(4)').text().replace(/,/g, ''));
        const changePercent = parseFloat($row.find('td:nth-child(5)').text().replace(/,/g, ''));
        
        losers.push({
          symbol,
          name,
          currentPrice: lastPrice,
          change,
          changePercent,
          sector: 'N/A', // NSE doesn't provide sector in this table
          marketCap: 0, // Not available in this table
          volume: 0, // Not available in this table
          pe: null // Not available in this table
        });
      }
    });
    
    return losers;
  } catch (error) {
    console.error('Error fetching top losers:', error);
    throw new Error('Failed to fetch top losers from NSE');
  }
}

// Function to get most active equities
async function getMostActiveEquities() {
  try {
    const response = await nseClient.get('/market-data/live-market-active-equities');
    const $ = cheerio.load(response.data);
    
    const activeEquities = [];
    
    // Parse the active equities table
    $('#activeEquitiesTable tbody tr').each((i, element) => {
      if (i < 10) { // Get top 10 active equities
        const $row = $(element);
        const symbol = $row.find('td:nth-child(1)').text().trim();
        const name = $row.find('td:nth-child(2)').text().trim();
        const lastPrice = parseFloat($row.find('td:nth-child(3)').text().replace(/,/g, ''));
        const change = parseFloat($row.find('td:nth-child(4)').text().replace(/,/g, ''));
        const changePercent = parseFloat($row.find('td:nth-child(5)').text().replace(/,/g, ''));
        const volume = parseInt($row.find('td:nth-child(6)').text().replace(/,/g, ''));
        
        activeEquities.push({
          symbol,
          name,
          currentPrice: lastPrice,
          change,
          changePercent,
          sector: 'N/A', // NSE doesn't provide sector in this table
          marketCap: 0, // Not available in this table
          volume,
          pe: null // Not available in this table
        });
      }
    });
    
    return activeEquities;
  } catch (error) {
    console.error('Error fetching most active equities:', error);
    throw new Error('Failed to fetch most active equities from NSE');
  }
}

// Function to get Nifty 50 index data for the current day
async function getNifty50Data() {
  try {
    const response = await nseClient.get('/api/indices/indices?index=NIFTY%2050');
    const data = response.data;
    
    // Extract index data
    const indexData = data.data[0];
    
    // Get intraday data for the chart
    const intradayResponse = await nseClient.get(`/api/indices/historical?index=NIFTY%2050&from=${new Date().toISOString().split('T')[0]}&to=${new Date().toISOString().split('T')[0]}`);
    const intradayData = intradayResponse.data.map(item => ({
      time: item.timestamp,
      value: item.close
    }));
    
    return {
      name: indexData.index,
      current: indexData.last,
      open: indexData.open,
      high: indexData.high,
      low: indexData.low,
      previousClose: indexData.previousClose,
      change: indexData.change,
      changePercent: indexData.pChange,
      intradayData
    };
  } catch (error) {
    console.error('Error fetching Nifty 50 data:', error);
    throw new Error('Failed to fetch Nifty 50 data');
  }
}

module.exports = {
  getTopGainers,
  getTopLosers,
  getMostActiveEquities,
  getNifty50Data
};