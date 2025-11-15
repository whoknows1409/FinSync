// API base URL - Using /api since next.config.js handles the proxy to backend
const API_BASE_URL = '/api';

// Generic API request function with improved error handling and caching prevention
const apiRequest = async (endpoint, options = {}) => {
  try {
    const token = localStorage.getItem('token');
    
    const config = {
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers
      },
      cache: 'no-store',
      ...options
    };

    const response = await fetch(`${API_BASE_URL}${endpoint}`, config);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`❌ API Error: ${endpoint}`, {
        status: response.status,
        message: errorData.message || response.statusText
      });
      
      const error = new Error(errorData.message || 'API request failed');
      error.status = response.status;
      error.info = errorData;
      throw error;
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`💥 API Request Failed: ${endpoint}`, error.message || error);
    throw error;
  }
};

// Auth API
export const authAPI = {
  login: (credentials) => apiRequest('/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials)
  }),
  
  register: (userData) => apiRequest('/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData)
  }),
  
  getMe: () => apiRequest('/v1/auth/me')
};

// Profile API
export const profileAPI = {
  getProfile: () => apiRequest('/v1/profile'),
  
  updateProfile: (userData) => apiRequest('/v1/profile', {
    method: 'PUT',
    body: JSON.stringify(userData)
  }),
  
  getStats: () => apiRequest('/v1/profile/stats'),
  
  getActivities: () => apiRequest('/v1/profile/activities'),
  
  uploadProfileImage: (imageFile) => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('profileImage', imageFile);
    
    return fetch(`${API_BASE_URL}/v1/profile/image`, {
      method: 'POST',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: formData,
    }).then(response => {
      if (!response.ok) {
        throw new Error('Failed to upload profile image');
      }
      return response.json();
    });
  }
};

// Transaction API
export const transactionAPI = {
  getTransactions: () => apiRequest('/v1/transactions'),
  
  addTransaction: (transactionData) => apiRequest('/v1/transactions', {
    method: 'POST',
    body: JSON.stringify(transactionData)
  }),
  
  updateTransaction: (id, transactionData) => apiRequest(`/v1/transactions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(transactionData)
  }),
  
  deleteTransaction: (id) => apiRequest(`/v1/transactions/${id}`, {
    method: 'DELETE'
  }),
  
  getRecurringTransactions: () => apiRequest('/v1/transactions/recurring'),
  
  addRecurringTransaction: (transactionData) => apiRequest('/v1/transactions/recurring', {
    method: 'POST',
    body: JSON.stringify(transactionData)
  }),
  
  updateRecurringTransaction: (id, transactionData) => apiRequest(`/v1/transactions/recurring/${id}`, {
    method: 'PUT',
    body: JSON.stringify(transactionData)
  }),
  
  deleteRecurringTransaction: (id) => apiRequest(`/v1/transactions/recurring/${id}`, {
    method: 'DELETE'
  }),
  
  processRecurringTransactions: () => apiRequest('/v1/transactions/recurring/process', {
    method: 'POST'
  }),
  
  getAnalysis: () => apiRequest('/v1/transactions/analysis')
};

// Stock API
export const stockAPI = {
  getStockData: (symbol) => apiRequest(`/v1/stocks/${symbol}`),
  
  getRealTimeStockData: (symbol) => apiRequest(`/v1/stocks/${symbol}/real-time`),
  
  getTopGainers: () => apiRequest('/v1/stocks/gainers'),
  
  getTopLosers: () => apiRequest('/v1/stocks/losers'),
  
  getMostActiveEquities: () => apiRequest('/v1/stocks/active'),
  
  getNifty50Data: () => apiRequest('/v1/stocks/nifty50'),
  
  searchStocks: (query) => apiRequest(`/v1/stocks/search?q=${encodeURIComponent(query)}`),
  
  getStockSummary: (data) => apiRequest('/v1/stocks/summary', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  // New method for getting personalized stock suggestions
  getPersonalSuggestions: (stockData, userId) => apiRequest('/stocks-analysis/personal-suggestions', {
    method: 'POST',
    body: JSON.stringify({ stock: stockData, userId })
  })
};

// Budget API - Updated with cleanup method and improved response handling
export const budgetAPI = {
  getBudgets: async () => {
    try {
      const response = await apiRequest('/v1/budgets');
      // The backend returns data inside a data object with pagination
      return {
        success: response.success,
        count: response.count || 0,
        timestamp: response.timestamp,
        data: response.data?.budgets || response.data || []
      };
    } catch (error) {
      console.error('getBudgets error:', error);
      return {
        success: false,
        data: []
      };
    } 
  },
  
  addBudget: async (budgetData) => {
    try {
      const response = await apiRequest('/v1/budgets', {
        method: 'POST',
        body: JSON.stringify(budgetData)
      });
      return response;
    } catch (error) {
      console.error('addBudget error:', error);
      throw error;
    }
  },
  
  updateBudget: async (id, budgetData) => {
    try {
      const response = await apiRequest(`/v1/budgets/${id}`, {
        method: 'PUT',
        body: JSON.stringify(budgetData)
      });
      return response;
    } catch (error) {
      console.error('updateBudget error:', error);
      throw error;
    }
  },
  
  deleteBudget: async (id) => {
    try {
      const response = await apiRequest(`/v1/budgets/${id}`, {
        method: 'DELETE'
      });
      return response;
    } catch (error) {
      console.error('deleteBudget error:', error);
      throw error;
    }
  },
  
  syncCategories: async () => {
    try {
      // Short-circuit on unauthenticated sessions to avoid noisy 401s on public pages
      if (!isAuthenticated()) {
        return { success: true, message: 'Skipped sync (unauthenticated)' };
      }
      const response = await apiRequest('/v1/budgets/sync-categories', { 
        method: 'POST' 
      });
      return response;
    } catch (error) {
      console.error('syncCategories error:', error);
      throw error;
    }
  },
  
  // New method to clean up zero amount budgets
  cleanupZeroAmountBudgets: async () => {
    try {
      const response = await apiRequest('/v1/budgets/cleanup', {
        method: 'DELETE'
      });
      return response;
    } catch (error) {
      console.error('cleanupZeroAmountBudgets error:', error);
      throw error;
    }
  },
  
  // Additional budget API methods that might be needed
  getBudgetSummary: async (startDate, endDate) => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await apiRequest(`/v1/budgets/summary?${params.toString()}`);
      return response;
    } catch (error) {
      console.error('getBudgetSummary error:', error);
      throw error;
    }
  },
  
  getCategoryPerformance: async (startDate, endDate) => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      
      const response = await apiRequest(`/v1/budgets/category-performance?${params.toString()}`);
      return response;
    } catch (error) {
      console.error('getCategoryPerformance error:', error);
      throw error;
    }
  },
  
  updateSpentAmount: async (id) => {
    try {
      const response = await apiRequest(`/v1/budgets/${id}/update-spent`, {
        method: 'PUT'
      });
      return response;
    } catch (error) {
      console.error('updateSpentAmount error:', error);
      throw error;
    }
  }
};

// Goal API
export const goalAPI = {
  getGoals: () => apiRequest('/v1/goals'),
  
  addGoal: (goalData) => apiRequest('/v1/goals', {
    method: 'POST',
    body: JSON.stringify(goalData)
  }),
  
  updateGoal: (id, goalData) => apiRequest(`/v1/goals/${id}`, {
    method: 'PUT',
    body: JSON.stringify(goalData)
  }),
  
  deleteGoal: (id) => apiRequest(`/v1/goals/${id}`, {
    method: 'DELETE'
  })
};

// Trading API
export const tradingAPI = {
  getAccounts: () => apiRequest('/v1/trading/accounts'),
  
  addAccount: (accountData) => apiRequest('/v1/trading/accounts', {
    method: 'POST',
    body: JSON.stringify(accountData)
  }),
  
  updateAccount: (id, accountData) => apiRequest(`/v1/trading/accounts/${id}`, {
    method: 'PUT',
    body: JSON.stringify(accountData)
  }),
  
  deleteAccount: (id) => apiRequest(`/v1/trading/accounts/${id}`, {
    method: 'DELETE'
  }),
  
  getTrades: () => apiRequest('/v1/trading/trades'),
  
  addTrade: (tradeData) => apiRequest('/v1/trading/trades', {
    method: 'POST',
    body: JSON.stringify(tradeData)
  }),
  
  updateTrade: (id, tradeData) => apiRequest(`/v1/trading/trades/${id}`, {
    method: 'PUT',
    body: JSON.stringify(tradeData)
  }),
  
  deleteTrade: (id) => apiRequest(`/v1/trading/trades/${id}`, {
    method: 'DELETE'
  })
};

// Chatbot API
export const chatbotAPI = {
  sendMessage: (message, conversationHistory = [], options = {}) => apiRequest('/v1/chatbot/query', {
    method: 'POST',
    body: JSON.stringify({ message, conversationHistory, options })
  }),
  
  saveChatHistory: (chatData) => apiRequest('/v1/chatbot/save-chat', {
    method: 'POST',
    body: JSON.stringify(chatData)
  }),
  
  getChatHistory: () => apiRequest('/v1/chatbot/chat-history'),
  
  deleteChatHistory: (id) => apiRequest(`/v1/chatbot/chat-history/${id}`, {
    method: 'DELETE'
  }),
  
  clearChatHistory: () => apiRequest('/v1/chatbot/chat-history', {
    method: 'DELETE'
  })
};

// Legacy functions for backward compatibility
export const getUserProfile = profileAPI.getProfile;
export const updateUserProfile = profileAPI.updateProfile;
export const getUserStats = profileAPI.getStats;
export const getUserActivities = profileAPI.getActivities;

// Utility function to clear all cached data
export const clearAllCache = () => {
  // Clear any cached data in localStorage if needed
  const keysToRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('cache_')) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
};

// Utility function to check if the user is authenticated
export const isAuthenticated = () => {
  const token = localStorage.getItem('token');
  if (!token) return false;
  
  try {
    // Simple JWT decode to check expiration (without verification)
    const payload = JSON.parse(atob(token.split('.')[1]));
    return payload.exp * 1000 > Date.now();
  } catch (e) {
    return false;
  }
};

// Utility function to handle API errors consistently
export const handleApiError = (error, customMessage) => {
  console.error('API Error:', error);
  
  let message = customMessage || 'An error occurred';
  
  if (error.status === 401) {
    message = 'Session expired. Please log in again.';
    // Clear invalid token
    localStorage.removeItem('token');
    // Optionally redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  } else if (error.status === 403) {
    message = 'You do not have permission to perform this action.';
  } else if (error.status === 404) {
    message = 'The requested resource was not found.';
  } else if (error.status >= 500) {
    message = 'A server error occurred. Please try again later.';
  } else if (error.info && error.info.message) {
    message = error.info.message;
  }
  
  return message;
};

// Utility function to check API health
export const checkApiHealth = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
      cache: 'no-store',
    });
    
    return response.ok;
  } catch (error) {
    console.error('API health check failed:', error);
    return false;
  }
};