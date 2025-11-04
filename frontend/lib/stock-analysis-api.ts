import axios from 'axios';

// The API base URL should include the /api prefix
const API_BASE_URL = '/api';

// Add axios interceptor for authentication
axios.interceptors.request.use(
  (config) => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export interface StockAnalysisData {
  symbol: string;
  name: string;
  currentPrice: number;
  previousClose: number;
  marketCap: number;
  peRatio?: number | null;
  dividendYield?: number | null;
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
  volume: number;
  averageVolume?: number | null;
  beta?: number | null;
  sector?: string;
  lastUpdated?: Date;
  change?: number;
  changePercent?: number;
}

// Get stock analysis data with all required fields
export const getStockAnalysisData = async (symbol: string): Promise<StockAnalysisData> => {
  try {
    console.log('Getting stock analysis data for:', symbol);
    
    // Generate a unique cache buster
    const uniqueCacheBuster = `${Date.now()}-${Math.random()}`;
    
    // First try to fetch from the stock-analysis endpoint
    const response = await axios.get(`${API_BASE_URL}/stocks-analysis/stock-data`, {
      params: { 
        symbol,
        _: uniqueCacheBuster,
        t: Date.now(), // Additional timestamp
        r: Math.random() // Random parameter
      },
      timeout: 15000, // 15 second timeout
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    console.log('Stock analysis response:', response.data);
    
    // Extract the stock data from the response
    const stockData = response.data;
    
    // Calculate change and changePercent if not available
    if (!stockData.change || !stockData.changePercent) {
      const change = stockData.currentPrice - stockData.previousClose;
      const changePercent = (change / stockData.previousClose) * 100;
      stockData.change = Number(change.toFixed(2));
      stockData.changePercent = Number(changePercent.toFixed(2));
    }
    
    return stockData;
  } catch (error) {
    console.error('Error fetching stock analysis data:', error);
    
    // If the stock-analysis endpoint fails, try the regular stocks endpoint
    try {
      console.log('Falling back to regular stocks endpoint for:', symbol);
      
      const fallbackResponse = await axios.get(`${API_BASE_URL}/v1/stocks/${symbol}`, {
        params: { 
          interval: '1d',
          _: `${Date.now()}-${Math.random()}`,
          t: Date.now(),
          r: Math.random()
        },
        timeout: 15000,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      console.log('Fallback stocks response:', fallbackResponse.data);
      
      // Extract the stock object from the response
      const stock = fallbackResponse.data.data.stock;
      
      // Format the data to match StockAnalysisData interface
      const formattedData: StockAnalysisData = {
        symbol: stock.symbol,
        name: stock.name,
        currentPrice: stock.currentPrice,
        previousClose: stock.previousClose,
        marketCap: stock.marketCap || 0,
        peRatio: stock.peRatio,
        dividendYield: stock.dividendYield,
        fiftyTwoWeekHigh: stock.fiftyTwoWeekHigh,
        fiftyTwoWeekLow: stock.fiftyTwoWeekLow,
        volume: stock.volume || 0,
        averageVolume: stock.averageVolume,
        beta: stock.beta,
        sector: stock.sector || 'Unknown',
        lastUpdated: stock.lastUpdated ? new Date(stock.lastUpdated) : new Date()
      };
      
      // Calculate change and changePercent if not available
      if (!formattedData.change || !formattedData.changePercent) {
        const change = formattedData.currentPrice - formattedData.previousClose;
        const changePercent = (change / formattedData.previousClose) * 100;
        formattedData.change = Number(change.toFixed(2));
        formattedData.changePercent = Number(changePercent.toFixed(2));
      }
      
      return formattedData;
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      
      // Create a fallback stock object
      return {
        symbol: symbol.toUpperCase(),
        name: symbol.toUpperCase(),
        currentPrice: 100,
        previousClose: 100,
        marketCap: 0,
        volume: 0,
        sector: 'Unknown',
        lastUpdated: new Date()
      };
    }
  }
};

// Get stock analysis using AI
export const getStockAIAnalysis = async (stock: StockAnalysisData) => {
  try {
    console.log('Getting AI analysis for stock:', stock.symbol);
    
    const response = await fetch('/api/stocks-analysis/stock-analysis', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ stock }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('AI Analysis Error Response:', errorText);
      throw new Error(`API Error (${response.status}): ${errorText || 'Unknown error'}`);
    }
    
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('Non-JSON response:', text);
      throw new Error(`Invalid response format. Expected JSON but got: ${text.substring(0, 100)}...`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching AI analysis:', error);
    throw error;
  }
};