// backend/utils/nseScraper.js
const puppeteer = require('puppeteer');
const logger = require('./logger');

class NSEScraper {
  constructor() {
    this.browser = null;
  }

  async initialize() {
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--no-first-run',
          '--no-zygote',
          '--disable-gpu'
        ]
      });
      logger.info('Browser launched successfully');
    } catch (error) {
      logger.error('Failed to launch browser:', error);
      throw error;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      logger.info('Browser closed');
    }
  }

  async scrapeTopGainersLosers() {
    try {
      const page = await this.browser.newPage();
      
      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Set viewport
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Navigate to NSE India top gainers and losers page
      await page.goto('https://www.nseindia.com/market-data/top-gainers-losers#gainers', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for the table to load
      await page.waitForSelector('#topGainersTable', { timeout: 15000 });

      // Scrape top gainers
      const gainers = await page.evaluate(() => {
        const gainersData = [];
        const gainerRows = document.querySelectorAll('#topGainersTable tbody tr');
        
        gainerRows.forEach((row, index) => {
          if (index < 10) { // Get top 10
            const cells = row.querySelectorAll('td');
            if (cells.length >= 4) {
              const symbol = cells[0].textContent.trim();
              const companyName = cells[1].textContent.trim();
              const currentPrice = parseFloat(cells[2].textContent.replace(/,/g, ''));
              const changePercent = parseFloat(cells[3].textContent.replace(/%/g, ''));
              
              gainersData.push({
                symbol: symbol + '.NS',
                name: companyName,
                currentPrice: currentPrice,
                changePercent: changePercent,
                previousClose: currentPrice / (1 + changePercent / 100)
              });
            }
          }
        });
        
        return gainersData;
      });

      // Navigate to losers tab
      await page.click('a[href="#losers"]');
      await page.waitForSelector('#topLosersTable', { timeout: 15000 });

      // Scrape top losers
      const losers = await page.evaluate(() => {
        const losersData = [];
        const loserRows = document.querySelectorAll('#topLosersTable tbody tr');
        
        loserRows.forEach((row, index) => {
          if (index < 10) { // Get top 10
            const cells = row.querySelectorAll('td');
            if (cells.length >= 4) {
              const symbol = cells[0].textContent.trim();
              const companyName = cells[1].textContent.trim();
              const currentPrice = parseFloat(cells[2].textContent.replace(/,/g, ''));
              const changePercent = parseFloat(cells[3].textContent.replace(/%/g, ''));
              
              losersData.push({
                symbol: symbol + '.NS',
                name: companyName,
                currentPrice: currentPrice,
                changePercent: changePercent,
                previousClose: currentPrice / (1 + changePercent / 100)
              });
            }
          }
        });
        
        return losersData;
      });

      await page.close();
      
      return {
        gainers,
        losers,
        totalStocks: gainers.length + losers.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error scraping NSE data:', error);
      throw error;
    }
  }

  async scrapeNifty50Data() {
    try {
      const page = await this.browser.newPage();
      
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Navigate to NIFTY 50 page
      await page.goto('https://www.nseindia.com/get-quotes/equity?symbol=NIFTY%2050', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for the data to load
      await page.waitForSelector('#quoteLtp', { timeout: 15000 });

      const data = await page.evaluate(() => {
        const ltp = parseFloat(document.querySelector('#quoteLtp').textContent.replace(/,/g, ''));
        const change = parseFloat(document.querySelector('#quoteChange').textContent.replace(/,/g, ''));
        const changePercent = parseFloat(document.querySelector('#quoteChangePercent').textContent.replace(/%/g, ''));
        const previousClose = ltp - change;
        
        return {
          ltp,
          change,
          changePercent,
          previousClose
        };
      });

      await page.close();
      return data;
    } catch (error) {
      logger.error('Error scraping NIFTY 50 data:', error);
      throw error;
    }
  }

  async scrapeAllTopGainersLosers() {
    try {
      const page = await this.browser.newPage();
      
      // Set user agent to avoid detection
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
      
      // Set viewport
      await page.setViewport({ width: 1920, height: 1080 });
      
      // Navigate to NSE India top gainers and losers page
      await page.goto('https://www.nseindia.com/market-data/top-gainers-losers', {
        waitUntil: 'networkidle2',
        timeout: 30000
      });

      // Wait for the content to load
      await page.waitForSelector('.market-status', { timeout: 15000 });

      // Function to scrape a table
      const scrapeTable = async (tableId) => {
        return await page.evaluate((id) => {
          const data = [];
          const rows = document.querySelectorAll(`#${id} tbody tr`);
          
          rows.forEach((row, index) => {
            if (index < 10) { // Get top 10
              const cells = row.querySelectorAll('td');
              if (cells.length >= 4) {
                const symbol = cells[0].textContent.trim();
                const companyName = cells[1].textContent.trim();
                const currentPrice = parseFloat(cells[2].textContent.replace(/,/g, ''));
                const changePercent = parseFloat(cells[3].textContent.replace(/%/g, ''));
                const high = parseFloat(cells[4].textContent.replace(/,/g, ''));
                const low = parseFloat(cells[5].textContent.replace(/,/g, ''));
                const volume = parseInt(cells[6].textContent.replace(/,/g, ''));
                
                data.push({
                  symbol: symbol + '.NS',
                  name: companyName,
                  currentPrice: currentPrice,
                  changePercent: changePercent,
                  previousClose: currentPrice / (1 + changePercent / 100),
                  high,
                  low,
                  volume
                });
              }
            }
          });
          
          return data;
        }, tableId);
      };

      // Scrape top gainers
      const gainers = await scrapeTable('topGainersTable');

      // Scrape top losers
      const losers = await scrapeTable('topLosersTable');

      await page.close();
      
      return {
        gainers,
        losers,
        totalStocks: gainers.length + losers.length,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error scraping NSE data:', error);
      throw error;
    }
  }
}

module.exports = NSEScraper;