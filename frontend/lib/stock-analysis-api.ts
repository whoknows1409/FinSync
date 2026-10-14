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
  previousClose: number | null;
  marketCap: number | null;
  peRatio?: number | null;
  dividendYield?: number | null;
  fiftyTwoWeekHigh?: number | null;
  fiftyTwoWeekLow?: number | null;
  volume: number;
  averageVolume?: number | null;
  beta?: number | null;
  sector?: string;
  lastUpdated?: string;
  change?: number | null;
  changePercent?: number | null;
  monthlyChange?: number | null;
  marketState?: 'REGULAR' | 'CLOSED';
}

// Get stock analysis data with all required fields
export const getStockAnalysisData = async (symbol: string): Promise<StockAnalysisData> => {
  try {
    const response = await axios.get(`${API_BASE_URL}/stocks-analysis/stock-data`, {
      params: { symbol, _: Date.now() },
      timeout: 15000,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    return response.data;
  } catch (error) {
    console.error('Error fetching stock analysis data:', error);
    // Surface the server's message (e.g. "Stock not found...") rather than showing placeholder data
    const message = axios.isAxiosError(error) && error.response?.data?.error
      ? error.response.data.error
      : 'Could not load stock data. Please try again.';
    throw new Error(message);
  }
};

// Get stock analysis using AI
export const getStockAIAnalysis = async (stock: StockAnalysisData) => {
  try {
    
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