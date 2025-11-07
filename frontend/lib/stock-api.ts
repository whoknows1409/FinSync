// frontend/lib/stock-api.ts
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

export interface Stock {
  _id?: string; // MongoDB ObjectId (optional)
  id?: string; // Alternative ID field (optional)
  symbol: string;
  name: string;
  interval: string;
  currentPrice: number;
  previousClose: number; // Added for price change calculation
  change?: number;
  changePercent?: number;
  volume?: number;
  averageVolume?: number; // Added for volume comparison
  marketCap?: number; // Added for market cap display
  peRatio?: number; // Added for P/E ratio display
  dividendYield?: number; // Added for dividend yield display
  beta?: number; // Added for beta display
  fiftyTwoWeekHigh?: number; // Added for 52-week high
  fiftyTwoWeekLow?: number; // Added for 52-week low
  sector?: string;
  lastUpdated?: Date;
}

export interface Holding {
  symbol: string;
  name: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  marketValue: number;
  unrealizedPnL: number;
  pnlPercentage: number;
  sector?: string;
}

export interface Order {
  id: string;
  symbol: string;
  name: string;
  type: 'BUY' | 'SELL';
  quantity: number;
  price: number;
  orderType: 'MARKET' | 'LIMIT';
  status: 'PENDING' | 'EXECUTED' | 'CANCELLED';
  timestamp: string;
  executedAt?: string;
  executedPrice?: number;
}

export interface TradingStats {
  totalTrades: number;
  winRate: number;
  totalPnL: number;
  portfolioValue: number;
  bestTrade: {
    symbol: string;
    pnl: number;
  } | null;
  worstTrade: {
    symbol: string;
    pnl: number;
  } | null;
  averageHoldingTime: number;
  totalVolume: number;
  sectorAllocation: Array<{
    sector: string;
    value: number;
    percentage: number;
  }>;
}

// Add a function to initialize trading account with improved error handling
export const initializeTradingAccount = async (): Promise<boolean> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/v1/trading/account`, {
      params: { 
        _: Date.now(),
        t: Date.now(),
        r: Math.random()
      },
      timeout: 10000,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    return true;
  } catch (error) {
    console.error('Error initializing trading account:', error);
    throw error;
  }
};

// Stock Search and Details with improved error handling
export const searchStocks = async (query: string): Promise<Stock[]> => {
  try {
    if (!query || query.length < 1) return [];
    
    
    // Generate a unique cache buster
    const uniqueCacheBuster = `${Date.now()}-${Math.random()}`;
    
    const response = await axios.get(`${API_BASE_URL}/v1/stocks/search`, {
      params: { 
        q: query,
        _: uniqueCacheBuster,
        t: Date.now(),
        r: Math.random()
      },
      timeout: 10000,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    
    // Check if the response has the expected structure
    if (response.data && response.data.success && response.data.data && response.data.data.stocks) {
      return response.data.data.stocks;
    }
    
    return [];
  } catch (error) {
    console.error('Error searching stocks:', error);
    return [];
  }
};

// Get real-time stock data with improved error handling
export const getRealTimeStockData = async (symbol: string, cacheBuster?: number): Promise<Stock> => {
  try {
    
    // Generate a unique cache buster
    const uniqueCacheBuster = cacheBuster || `${Date.now()}-${Math.random()}`;
    
    const response = await axios.get(`${API_BASE_URL}/v1/stocks/${symbol}/real-time`, {
      params: { 
        _: uniqueCacheBuster,
        t: Date.now(),
        r: Math.random()
      },
      timeout: 10000,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });  
    
    
    const realTimeData = response.data.data;
    
    // Check if data is stale
    if (realTimeData.isStale) {
      console.warn('Real-time data is stale for:', symbol, 'Timestamp:', realTimeData.timestamp);
    }
    
    // Format as Stock object
    return {
      symbol: realTimeData.symbol,
      name: realTimeData.name,
      interval: '1m',
      currentPrice: realTimeData.currentPrice,
      previousClose: realTimeData.previousClose,
      change: realTimeData.change,
      changePercent: realTimeData.changePercent,
      marketCap: realTimeData.marketCap,
      volume: realTimeData.volume,
      sector: realTimeData.sector || 'Unknown',
      lastUpdated: realTimeData.timestamp ? new Date(realTimeData.timestamp) : new Date()
    };
  } catch (error) {
    console.error('Error fetching real-time stock data:', error);
    
    // Fallback to regular stock details if real-time fails
    try {
      return await getStockDetails(symbol, '1d', cacheBuster);
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      throw new Error('Failed to fetch real-time stock data');
    }
  }
};

// Updated getStockDetails to include interval parameter and cache-busting
export const getStockDetails = async (symbol: string, interval: string = '1d', cacheBuster?: number): Promise<Stock> => {
  try {
    
    // For real-time data (1m interval), use the real-time endpoint
    if (interval === '1m') {
      return await getRealTimeStockData(symbol, cacheBuster);
    }
    
    // Make sure we have a valid interval
    const validInterval = interval || '1d';
    
    // Generate a unique cache buster
    const uniqueCacheBuster = cacheBuster || `${Date.now()}-${Math.random()}`;
    
    const response = await axios.get(`${API_BASE_URL}/v1/stocks/${symbol}`, {
      params: { 
        interval: validInterval,
        _: uniqueCacheBuster,
        t: Date.now(),
        r: Math.random()
      },
      timeout: 10000,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });  
    
    
    // Extract the stock object from the response
    const stock = response.data.data.stock;
    
    // Log the stock object to see what fields are available
    
    // Calculate change and changePercent if not available
    if (!stock.change || !stock.changePercent) {
      const change = stock.currentPrice - stock.previousClose;
      const changePercent = (change / stock.previousClose) * 100;
      stock.change = Number(change.toFixed(2));
      stock.changePercent = Number(changePercent.toFixed(2));
    }
    
    return stock;
  } catch (error) {
    console.error('Error fetching stock details:', error);
    
    // Create a fallback stock object
    return {
      symbol: symbol.toUpperCase(),
      name: symbol.toUpperCase(),
      interval: interval,
      currentPrice: 100,
      previousClose: 100,
      change: 0,
      changePercent: 0,
      marketCap: 0,
      volume: 0,
      sector: 'Unknown',
      lastUpdated: new Date()
    };
  }
};

// Trading Account Management with improved error handling
export const getTradingAccount = async () => {
  try {
    
    // Generate a unique cache buster
    const uniqueCacheBuster = `${Date.now()}-${Math.random()}`;
    
    const response = await axios.get(`${API_BASE_URL}/v1/trading/account`, {
      params: { 
        _: uniqueCacheBuster,
        t: Date.now(),
        r: Math.random()
      },
      timeout: 10000,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    return response.data.data;
  } catch (error) {
    console.error('Error fetching trading account:', error);
    // Return default account instead of throwing
    return {
      tradingAccount: {
        walletBalance: 10000,
        holdings: [],
        orders: [],
        totalValue: 10000,
        totalPnL: 0
      }
    };
  }
};

export const getHoldings = async (): Promise<Holding[]> => {
  try {
    
    // Generate a unique cache buster
    const uniqueCacheBuster = `${Date.now()}-${Math.random()}`;
    
    const response = await axios.get(`${API_BASE_URL}/v1/trading/holdings`, {
      params: { 
        _: uniqueCacheBuster,
        t: Date.now(),
        r: Math.random()
      },
      timeout: 10000,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    return response.data.data.holdings;
  } catch (error) {
    console.error('Error fetching holdings:', error);
    return [];
  }
};

export const getOrders = async (): Promise<Order[]> => {
  try {
    
    // Generate a unique cache buster
    const uniqueCacheBuster = `${Date.now()}-${Math.random()}`;
    
    const response = await axios.get(`${API_BASE_URL}/v1/trading/orders`, {
      params: { 
        _: uniqueCacheBuster,
        t: Date.now(),
        r: Math.random()
      },
      timeout: 10000,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    return response.data.data.orders;
  } catch (error) {
    console.error('Error fetching orders:', error);
    return [];
  }
};

export const getTradingStats = async (): Promise<TradingStats> => {
  try {
    
    // Generate a unique cache buster
    const uniqueCacheBuster = `${Date.now()}-${Math.random()}`;
    
    const response = await axios.get(`${API_BASE_URL}/v1/trading/stats`, {
      params: { 
        _: uniqueCacheBuster,
        t: Date.now(),
        r: Math.random()
      },
      timeout: 10000,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    return response.data.data;
  } catch (error) {
    console.error('Error fetching trading stats:', error);
    // Return default stats instead of throwing
    return {
      totalTrades: 0,
      winRate: 0,
      totalPnL: 0,
      portfolioValue: 0,
      bestTrade: null,
      worstTrade: null,
      averageHoldingTime: 0,
      totalVolume: 0,
      sectorAllocation: []
    };
  }
};

// Order Management with improved error handling
export interface PlaceOrderParams {
  symbol: string;
  stock?: string; // MongoDB ObjectId (optional)
  type: 'BUY' | 'SELL';
  quantity: number;
  price?: number; // Only required for LIMIT orders
  orderType: 'MARKET' | 'LIMIT';
}

// Update the placeOrder function to handle insufficient holdings more gracefully
export const placeOrder = async (params: PlaceOrderParams) => {
  try {
    
    // First, ensure the trading account is initialized
    try {
      await initializeTradingAccount();
    } catch (initError) {
      console.error('Failed to initialize trading account:', initError);
      // Continue with order placement anyway
    }
    
    const response = await axios.post(`${API_BASE_URL}/v1/trading/orders`, params, {
      timeout: 15000,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    return response.data.data.order;
  } catch (error: any) {
    console.error('Error placing order:', error);
    
    // Enhanced error logging (sanitized for security)
    if (error.response) {
      console.error('Error response status:', error.response.status);
      // Don't log full response data - may contain sensitive info
      console.error('Error message:', error.response.data?.message || 'Unknown error');
      
      // Check for the specific error about totalTrades
      if (error.response.data && error.response.data.message && 
          error.response.data.message.includes("Cannot read properties of undefined (reading 'totalTrades')")) {
        console.error('Backend error: Trading account stats not initialized');
        
        // Try to initialize the trading account stats
        try {
          await initializeTradingAccount();
          
          // Retry placing the order after initialization
          const retryResponse = await axios.post(`${API_BASE_URL}/v1/trading/orders`, params, {
            timeout: 15000,
            headers: {
              'Cache-Control': 'no-cache, no-store, must-revalidate',
              'Pragma': 'no-cache',
              'Expires': '0'
            }
          });
          
          return retryResponse.data.data.order;
        } catch (initError: any) {
          console.error('Failed to initialize trading account:', initError);
          throw new Error("Your trading account needs to be set up. Please try again later or contact support.");
        }
      }
      
      // Handle insufficient holdings error specifically
      if (error.response.data && error.response.data.message && 
          error.response.data.message.includes("Insufficient holdings")) {
        // Just pass through the original error message
        throw new Error(error.response.data.message);
      }
      
      // Try to extract validation errors
      if (error.response.data && error.response.data.errors) {
        console.error('Validation errors:');
        error.response.data.errors.forEach((err: any, index: number) => {
          console.error(`Error ${index + 1}:`, err);
          if (err.field) console.error(`  Field: ${err.field}`);
          if (err.message) console.error(`  Message: ${err.message}`);
          if (err.value) console.error(`  Value: ${err.value}`);
          if (err.location) console.error(`  Location: ${err.location}`);
        });
      }
      
      // Log sanitized request info (don't log full params - may contain sensitive data)
      console.error('Order type:', params.orderType);
      console.error('Symbol:', params.symbol);
      console.error('Quantity:', params.quantity);
    }
    
    const errorMessage = error.response?.data?.message || error.message || 'Failed to place order';
    throw new Error(errorMessage);
  }
};

export const cancelOrder = async (orderId: string) => {
  try {
    
    // Generate a unique cache buster
    const uniqueCacheBuster = `${Date.now()}-${Math.random()}`;
    
    const response = await axios.put(`${API_BASE_URL}/v1/trading/orders/${orderId}/cancel`, {}, {
      params: { 
        _: uniqueCacheBuster,
        t: Date.now(),
        r: Math.random()
      },
      timeout: 10000,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    return response.data;
  } catch (error: any) {
    console.error('Error cancelling order:', error);
    const errorMessage = error.response?.data?.message || error.message || 'Failed to cancel order';
    throw new Error(errorMessage);
  }
};

// Updated function to fetch historical data with proper interval handling for different timeframes
export const getStockHistoricalData = async (
  symbol: string, 
  timeframe: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '2Y' | '5Y', 
  interval: string, 
  cacheBuster?: number
): Promise<any[]> => {
  try {
    
    // Define valid intervals for each timeframe
    const validIntervals: Record<string, string[]> = {
      '1D': ['1m', '5m', '15m', '30m', '1h'],
      '1W': ['1h', '1d'],
      '1M': ['1d', '1wk'],
      '3M': ['1d', '1wk'],
      '6M': ['1d', '1wk'],
      '1Y': ['1d', '1wk', '1mo'],
      '2Y': ['1d', '1wk', '1mo'],
      '5Y': ['1d', '1wk', '1mo']
    };
    
    // Define default intervals for each timeframe
    const defaultIntervals: Record<string, string> = {
      '1D': '15m',
      '1W': '1d',
      '1M': '1d',
      '3M': '1d',
      '6M': '1d',
      '1Y': '1d',
      '2Y': '1d',
      '5Y': '1d'
    };
    
    // Validate and adjust interval if needed
    let adjustedInterval = interval;
    if (!validIntervals[timeframe].includes(interval)) {
      adjustedInterval = defaultIntervals[timeframe];
      console.warn(`Interval ${interval} is not valid for timeframe ${timeframe}. Using default interval ${adjustedInterval}`);
    }
    
    // Generate a unique cache buster
    const uniqueCacheBuster = cacheBuster || `${Date.now()}-${Math.random()}`;
    
    // Fetch real data from backend which uses Yahoo Finance
    const response = await axios.get(`${API_BASE_URL}/v1/stocks/${symbol}/historical`, {
      params: { 
        timeframe,
        interval: adjustedInterval,
        _: uniqueCacheBuster,
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
    
    
    if (response.data.success) {
      // Transform the data to match our expected format
      return response.data.data.map((item: any) => ({
        time: item.time,
        open: item.open,
        high: item.high,
        low: item.low,
        close: item.close,
        volume: item.volume
      }));
    } else {
      throw new Error(response.data.message || 'Failed to fetch historical data');
    }
  } catch (error) {
    console.error('Error fetching historical data:', error);
    throw new Error('Failed to fetch real historical data. Please try again later.');
  }
};

// Add a function to check API health
export const checkApiHealth = async (): Promise<boolean> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/v1/stocks/health`, {
      timeout: 5000,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
    return response.data.success;
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
};

// Basic watchlist helpers (fallback-safe)
export const getWatchlist = async (): Promise<Stock[]> => {
  try {
    const resp = await axios.get(`${API_BASE_URL}/v1/stocks/watchlist`, { timeout: 10000 });
    return resp.data?.data?.watchlist ?? [];
  } catch (e) {
    console.error('getWatchlist error:', e);
    return [];
  }
};

export const addToWatchlist = async (symbol: string): Promise<boolean> => {
  try {
    const resp = await axios.post(`${API_BASE_URL}/v1/stocks/watchlist`, { symbol }, { timeout: 10000 });
    return !!resp.data?.success;
  } catch (e) {
    console.error('addToWatchlist error:', e);
    return false;
  }
};

export const removeFromWatchlist = async (symbol: string): Promise<boolean> => {
  try {
    const resp = await axios.delete(`${API_BASE_URL}/v1/stocks/watchlist/${encodeURIComponent(symbol)}`, { timeout: 10000 });
    return !!resp.data?.success;
  } catch (e) {
    console.error('removeFromWatchlist error:', e);
    return false;
  }
};