// Alpha Vantage API service
const axios = require('axios');
const logger = require('./logger');

const ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query';

class AlphaVantageService {
  constructor() {
    this.apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!this.apiKey) {
      logger.warn('ALPHA_VANTAGE_API_KEY not set in environment variables');
    }
  }

  async quote(symbol) {
    try {
      // Remove .NS or .BSE suffix for Alpha Vantage
      const cleanSymbol = symbol.replace(/\.(NS|BSE)$/i, '');
      
      const response = await axios.get(ALPHA_VANTAGE_BASE_URL, {
        params: {
          function: 'GLOBAL_QUOTE',
          symbol: cleanSymbol,
          apikey: this.apiKey
        }
      });

      const quote = response.data['Global Quote'];
      
      if (!quote || Object.keys(quote).length === 0) {
        throw new Error(`No data found for symbol: ${cleanSymbol}`);
      }

      // Map Alpha Vantage response to our format
      return {
        symbol: cleanSymbol,
        price: {
          symbol: cleanSymbol,
          regularMarketPrice: parseFloat(quote['05. price']) || 0,
          regularMarketPreviousClose: parseFloat(quote['08. previous close']) || 0,
          regularMarketVolume: parseInt(quote['06. volume']) || 0,
          regularMarketChange: parseFloat(quote['09. change']) || 0,
          regularMarketChangePercent: parseFloat((quote['10. change percent'] || '0').replace('%', '')) || 0,
          regularMarketOpen: parseFloat(quote['02. open']) || 0,
          regularMarketDayHigh: parseFloat(quote['03. high']) || 0,
          regularMarketDayLow: parseFloat(quote['04. low']) || 0,
          longName: cleanSymbol,
          shortName: cleanSymbol
        },
        regularMarketPrice: parseFloat(quote['05. price']) || 0,
        regularMarketPreviousClose: parseFloat(quote['08. previous close']) || 0,
        regularMarketVolume: parseInt(quote['06. volume']) || 0,
        longName: cleanSymbol,
        shortName: cleanSymbol
      };
    } catch (error) {
      logger.error(`Error fetching quote for ${symbol}:`, error.message);
      throw error;
    }
  }

  async getCompanyOverview(symbol) {
    try {
      const cleanSymbol = symbol.replace(/\.(NS|BSE)$/i, '');
      
      const response = await axios.get(ALPHA_VANTAGE_BASE_URL, {
        params: {
          function: 'OVERVIEW',
          symbol: cleanSymbol,
          apikey: this.apiKey
        }
      });

      const data = response.data;
      
      if (!data || Object.keys(data).length === 0 || data.Note) {
        // If rate limited or no data, return minimal info
        return {
          Symbol: cleanSymbol,
          Name: cleanSymbol,
          MarketCapitalization: 0,
          PERatio: null,
          DividendYield: null,
          '52WeekHigh': null,
          '52WeekLow': null,
          Beta: null,
          Sector: 'Unknown',
          Industry: 'Unknown'
        };
      }

      return data;
    } catch (error) {
      logger.error(`Error fetching company overview for ${symbol}:`, error.message);
      return {
        Symbol: symbol.replace(/\.(NS|BSE)$/i, ''),
        Name: symbol.replace(/\.(NS|BSE)$/i, ''),
        MarketCapitalization: 0,
        PERatio: null,
        DividendYield: null,
        '52WeekHigh': null,
        '52WeekLow': null,
        Beta: null,
        Sector: 'Unknown',
        Industry: 'Unknown'
      };
    }
  }

  async getDetailedQuote(symbol) {
    try {
      // Get both quote and overview for comprehensive data
      const [quote, overview] = await Promise.all([
        this.quote(symbol),
        this.getCompanyOverview(symbol)
      ]);

      // Merge the data
      return {
        symbol: quote.symbol,
        price: {
          ...quote.price,
          longName: overview.Name || quote.symbol,
          shortName: overview.Name || quote.symbol,
          marketCap: parseFloat(overview.MarketCapitalization) || 0,
          trailingPE: parseFloat(overview.PERatio) || null,
          beta: parseFloat(overview.Beta) || null
        },
        regularMarketPrice: quote.regularMarketPrice,
        regularMarketPreviousClose: quote.regularMarketPreviousClose,
        regularMarketVolume: quote.regularMarketVolume,
        longName: overview.Name || quote.symbol,
        shortName: overview.Name || quote.symbol,
        marketCap: parseFloat(overview.MarketCapitalization) || 0,
        trailingPE: parseFloat(overview.PERatio) || null,
        dividendYield: parseFloat(overview.DividendYield) || null,
        fiftyTwoWeekHigh: parseFloat(overview['52WeekHigh']) || null,
        fiftyTwoWeekLow: parseFloat(overview['52WeekLow']) || null,
        beta: parseFloat(overview.Beta) || null,
        sector: overview.Sector || 'Unknown',
        industry: overview.Industry || 'Unknown',
        summaryDetail: {
          trailingPE: parseFloat(overview.PERatio) || null,
          dividendYield: parseFloat(overview.DividendYield) || null,
          fiftyTwoWeekHigh: parseFloat(overview['52WeekHigh']) || null,
          fiftyTwoWeekLow: parseFloat(overview['52WeekLow']) || null,
          beta: parseFloat(overview.Beta) || null
        }
      };
    } catch (error) {
      logger.error(`Error fetching detailed quote for ${symbol}:`, error.message);
      throw error;
    }
  }

  async historical(symbol, options = {}) {
    try {
      const cleanSymbol = symbol.replace(/\.(NS|BSE)$/i, '');
      
      // Alpha Vantage uses TIME_SERIES_DAILY for daily data
      const response = await axios.get(ALPHA_VANTAGE_BASE_URL, {
        params: {
          function: 'TIME_SERIES_DAILY',
          symbol: cleanSymbol,
          outputsize: 'full', // Get full historical data
          apikey: this.apiKey
        }
      });

      const timeSeries = response.data['Time Series (Daily)'];
      
      if (!timeSeries) {
        throw new Error(`No historical data found for symbol: ${cleanSymbol}`);
      }

      // Convert to array format
      const historicalData = Object.entries(timeSeries).map(([date, values]) => ({
        date: new Date(date),
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
        volume: parseInt(values['5. volume'])
      }));

      // Sort by date ascending
      historicalData.sort((a, b) => a.date - b.date);

      // Filter by date range if provided
      if (options.period1 && options.period2) {
        return historicalData.filter(item => 
          item.date >= options.period1 && item.date <= options.period2
        );
      }

      return historicalData;
    } catch (error) {
      logger.error(`Error fetching historical data for ${symbol}:`, error.message);
      throw error;
    }
  }

  async getIntradayData(symbol, interval = '5min') {
    try {
      const cleanSymbol = symbol.replace(/\.(NS|BSE)$/i, '');
      
      const response = await axios.get(ALPHA_VANTAGE_BASE_URL, {
        params: {
          function: 'TIME_SERIES_INTRADAY',
          symbol: cleanSymbol,
          interval: interval,
          apikey: this.apiKey
        }
      });

      const timeSeries = response.data[`Time Series (${interval})`];
      
      if (!timeSeries) {
        throw new Error(`No intraday data found for symbol: ${cleanSymbol}`);
      }

      return Object.entries(timeSeries).map(([datetime, values]) => ({
        datetime: new Date(datetime),
        open: parseFloat(values['1. open']),
        high: parseFloat(values['2. high']),
        low: parseFloat(values['3. low']),
        close: parseFloat(values['4. close']),
        volume: parseInt(values['5. volume'])
      }));
    } catch (error) {
      logger.error(`Error fetching intraday data for ${symbol}:`, error.message);
      throw error;
    }
  }
}

// Create singleton instance
const alphaVantageService = new AlphaVantageService();

module.exports = alphaVantageService;
