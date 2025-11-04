// Stock Data Utility for Finsync
// This file handles stock data, mock NSE stocks, and trading functionality

export interface Stock {
  symbol: string
  name: string
  sector: string
  currentPrice: number
  previousClose: number
  change: number
  changePercent: number
  volume: number
  marketCap: number
  pe: number
  pb: number
  dividendYield: number
  high52Week: number
  low52Week: number
  isNifty50: boolean
  isNifty100: boolean
}

export interface StockPrediction {
  prediction: "BUY" | "SELL" | "HOLD"
  targetPrice: number
  confidence: number
  timeframe: string
  reasoning: string[]
}

export interface StockPrice {
  symbol: string
  price: number
  timestamp: Date
  volume: number
}

export interface HistoricalData {
  date: string
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface TradingOrder {
  id: string
  symbol: string
  type: 'BUY' | 'SELL'
  quantity: number
  price: number
  status: 'PENDING' | 'EXECUTED' | 'CANCELLED'
  timestamp: Date
  orderType: 'MARKET' | 'LIMIT' | 'STOP_LOSS'
}

export interface PortfolioHolding {
  symbol: string
  quantity: number
  averagePrice: number
  currentPrice: number
  marketValue: number
  unrealizedPnL: number
  pnlPercentage: number
  sector: string
}

// Mock NSE Stock Data (2000+ stocks)
export const NSE_STOCKS: Stock[] = [
  // Nifty 50 Stocks
  { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', sector: 'Oil & Gas', currentPrice: 2456.50, previousClose: 2444.20, change: 12.30, changePercent: 0.50, volume: 1234567, marketCap: 1665000, pe: 12.5, pb: 1.8, dividendYield: 0.8, high52Week: 2500, low52Week: 2100, isNifty50: true, isNifty100: true },
  { symbol: 'TCS', name: 'Tata Consultancy Services Ltd', sector: 'IT', currentPrice: 3456.75, previousClose: 3480.20, change: -23.45, changePercent: -0.67, volume: 987654, marketCap: 1250000, pe: 25.2, pb: 8.5, dividendYield: 1.2, high52Week: 3600, low52Week: 3000, isNifty50: true, isNifty100: true },
  { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', sector: 'Banking', currentPrice: 1654.20, previousClose: 1645.30, change: 8.90, changePercent: 0.54, volume: 2345678, marketCap: 1200000, pe: 18.5, pb: 3.2, dividendYield: 0.9, high52Week: 1700, low52Week: 1400, isNifty50: true, isNifty100: true },
  { symbol: 'INFY', name: 'Infosys Ltd', sector: 'IT', currentPrice: 1456.80, previousClose: 1472.00, change: -15.20, changePercent: -1.03, volume: 1876543, marketCap: 600000, pe: 22.8, pb: 6.2, dividendYield: 1.5, high52Week: 1500, low52Week: 1200, isNifty50: true, isNifty100: true },
  { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', sector: 'Banking', currentPrice: 987.45, previousClose: 982.15, change: 5.30, changePercent: 0.54, volume: 3456789, marketCap: 680000, pe: 16.2, pb: 2.8, dividendYield: 1.1, high52Week: 1050, low52Week: 850, isNifty50: true, isNifty100: true },
  { symbol: 'HINDUNILVR', name: 'Hindustan Unilever Ltd', sector: 'FMCG', currentPrice: 2345.60, previousClose: 2326.90, change: 18.70, changePercent: 0.80, volume: 456789, marketCap: 550000, pe: 65.2, pb: 12.5, dividendYield: 1.8, high52Week: 2400, low52Week: 2000, isNifty50: true, isNifty100: true },
  { symbol: 'ITC', name: 'ITC Ltd', sector: 'FMCG', currentPrice: 456.30, previousClose: 458.40, change: -2.10, changePercent: -0.46, volume: 2345678, marketCap: 570000, pe: 18.5, pb: 4.2, dividendYield: 3.2, high52Week: 480, low52Week: 400, isNifty50: true, isNifty100: true },
  { symbol: 'SBIN', name: 'State Bank of India', sector: 'Banking', currentPrice: 567.80, previousClose: 555.40, change: 12.40, changePercent: 2.23, volume: 5678901, marketCap: 500000, pe: 12.8, pb: 1.5, dividendYield: 2.1, high52Week: 600, low52Week: 450, isNifty50: true, isNifty100: true },
  { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd', sector: 'Telecom', currentPrice: 1234.50, previousClose: 1208.90, change: 25.60, changePercent: 2.12, volume: 1234567, marketCap: 700000, pe: 28.5, pb: 3.8, dividendYield: 0.7, high52Week: 1300, low52Week: 1000, isNifty50: true, isNifty100: true },
  { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank Ltd', sector: 'Banking', currentPrice: 1789.20, previousClose: 1798.10, change: -8.90, changePercent: -0.49, volume: 987654, marketCap: 350000, pe: 20.5, pb: 4.2, dividendYield: 0.8, high52Week: 1850, low52Week: 1500, isNifty50: true, isNifty100: true },

  // Additional Nifty 100 and other stocks
  { symbol: 'ASIANPAINT', name: 'Asian Paints Ltd', sector: 'Paints', currentPrice: 3456.80, previousClose: 3411.60, change: 45.20, changePercent: 1.33, volume: 234567, marketCap: 330000, pe: 55.2, pb: 15.8, dividendYield: 0.9, high52Week: 3600, low52Week: 2800, isNifty50: true, isNifty100: true },
  { symbol: 'MARUTI', name: 'Maruti Suzuki India Ltd', sector: 'Automobile', currentPrice: 9876.50, previousClose: 10000.00, change: -123.40, changePercent: -1.23, volume: 345678, marketCap: 290000, pe: 22.5, pb: 3.2, dividendYield: 1.2, high52Week: 10500, low52Week: 8500, isNifty50: true, isNifty100: true },
  { symbol: 'LT', name: 'Larsen & Toubro Ltd', sector: 'Engineering', currentPrice: 2345.60, previousClose: 2326.90, change: 18.70, changePercent: 0.80, volume: 456789, marketCap: 320000, pe: 18.5, pb: 2.8, dividendYield: 1.5, high52Week: 2500, low52Week: 2000, isNifty50: true, isNifty100: true },
  { symbol: 'AXISBANK', name: 'Axis Bank Ltd', sector: 'Banking', currentPrice: 987.45, previousClose: 982.15, change: 5.30, changePercent: 0.54, volume: 2345678, marketCap: 300000, pe: 16.2, pb: 2.8, dividendYield: 1.1, high52Week: 1050, low52Week: 850, isNifty50: true, isNifty100: true },
  { symbol: 'NESTLEIND', name: 'Nestle India Ltd', sector: 'FMCG', currentPrice: 19876.50, previousClose: 19642.00, change: 234.50, changePercent: 1.19, volume: 12345, marketCap: 190000, pe: 75.2, pb: 18.5, dividendYield: 1.8, high52Week: 21000, low52Week: 17000, isNifty50: true, isNifty100: true },

  // More stocks to reach 2000+
  ...Array.from({ length: 1985 }, (_, i) => {
    const sectors = ['IT', 'Banking', 'FMCG', 'Pharma', 'Auto', 'Steel', 'Cement', 'Power', 'Oil & Gas', 'Telecom', 'Media', 'Real Estate', 'Textiles', 'Chemicals', 'Metals', 'Capital Goods', 'Consumer Durables', 'Healthcare', 'Education', 'Agriculture']
    const sector = sectors[i % sectors.length]
    const basePrice = 50 + (i % 1000) * 2
    const change = (Math.random() - 0.5) * 20
    const changePercent = (change / basePrice) * 100
    
    return {
      symbol: `STOCK${String(i + 1).padStart(4, '0')}`,
      name: `Stock ${i + 1} Ltd`,
      sector,
      currentPrice: basePrice,
      previousClose: basePrice - change,
      change: parseFloat(change.toFixed(2)),
      changePercent: parseFloat(changePercent.toFixed(2)),
      volume: Math.floor(Math.random() * 1000000),
      marketCap: Math.floor(Math.random() * 100000),
      pe: parseFloat((10 + Math.random() * 40).toFixed(1)),
      pb: parseFloat((1 + Math.random() * 5).toFixed(1)),
      dividendYield: parseFloat((Math.random() * 3).toFixed(1)),
      high52Week: basePrice * 1.2,
      low52Week: basePrice * 0.8,
      isNifty50: false,
      isNifty100: i < 100,
    }
  })
]

// Mock historical data generator
export const generateHistoricalData = (symbol: string, days: number = 365): HistoricalData[] => {
  const data: HistoricalData[] = []
  let currentPrice = NSE_STOCKS.find(s => s.symbol === symbol)?.currentPrice || 100
  
  for (let i = days; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    
    const volatility = 0.02 // 2% daily volatility
    const change = (Math.random() - 0.5) * volatility * currentPrice
    const open = currentPrice
    const close = currentPrice + change
    const high = Math.max(open, close) + Math.random() * Math.abs(change)
    const low = Math.min(open, close) - Math.random() * Math.abs(change)
    const volume = Math.floor(Math.random() * 1000000)
    
    data.push({
      date: date.toISOString().split('T')[0],
      open: parseFloat(open.toFixed(2)),
      high: parseFloat(high.toFixed(2)),
      low: parseFloat(low.toFixed(2)),
      close: parseFloat(close.toFixed(2)),
      volume
    })
    
    currentPrice = close
  }
  
  return data
}

// Stock search function
export const searchStocks = (query: string): Stock[] => {
  const lowercaseQuery = query.toLowerCase()
  return NSE_STOCKS.filter(stock => 
    stock.symbol.toLowerCase().includes(lowercaseQuery) ||
    stock.name.toLowerCase().includes(lowercaseQuery) ||
    stock.sector.toLowerCase().includes(lowercaseQuery)
  ).slice(0, 50) // Limit to 50 results
}

// Get stock by symbol
export const getStockBySymbol = (symbol: string): Stock | undefined => {
  return NSE_STOCKS.find(stock => stock.symbol === symbol)
}

// Get top gainers
export const getTopGainers = (limit: number = 10): Stock[] => {
  return [...NSE_STOCKS]
    .filter(stock => stock.changePercent > 0)
    .sort((a, b) => b.changePercent - a.changePercent)
    .slice(0, limit)
}

// Get top losers
export const getTopLosers = (limit: number = 10): Stock[] => {
  return [...NSE_STOCKS]
    .filter(stock => stock.changePercent < 0)
    .sort((a, b) => a.changePercent - b.changePercent)
    .slice(0, limit)
}

// Get stocks by sector
export const getStocksBySector = (sector: string): Stock[] => {
  return NSE_STOCKS.filter(stock => stock.sector === sector)
}

// Get all sectors
export const getAllSectors = (): string[] => {
  return [...new Set(NSE_STOCKS.map(stock => stock.sector))].sort()
}

// Generate AI-powered stock prediction based on symbol
export function getStockPrediction(symbol: string): StockPrediction {
  const stock = NSE_STOCKS.find(s => s.symbol === symbol);
  if (!stock) {
    // Default prediction if stock not found
    return {
      prediction: "HOLD",
      targetPrice: 0,
      confidence: 50,
      timeframe: "1 month",
      reasoning: [
        "Insufficient data for detailed analysis",
        "Market conditions are neutral",
        "Waiting for more information"
      ]
    };
  }

  // Mock prediction logic based on stock attributes
  let prediction: "BUY" | "SELL" | "HOLD" = "HOLD";
  let targetPrice = stock.currentPrice;
  let confidence = 70;
  let reasoning: string[] = [];

  // Make prediction based on various factors
  if (stock.changePercent > 2 && stock.pe < 20 && stock.volume > 1000000) {
    prediction = "BUY";
    targetPrice = stock.currentPrice * (1 + (Math.random() * 0.1 + 0.05)); // 5-15% upside
    confidence = Math.min(90, 70 + stock.changePercent * 2);
    reasoning = [
      `Strong price momentum with ${stock.changePercent.toFixed(2)}% gain today`,
      `Attractive valuation with P/E ratio of ${stock.pe}`,
      `High trading volume indicates strong interest`,
      `Market sentiment is positive for the ${stock.sector} sector`
    ];
  } else if (stock.changePercent < -2 && stock.pe > 30 && stock.dividendYield < 1) {
    prediction = "SELL";
    targetPrice = stock.currentPrice * (1 - (Math.random() * 0.1 + 0.03)); // 3-13% downside
    confidence = Math.min(85, 70 + Math.abs(stock.changePercent) * 1.5);
    reasoning = [
      `Negative price action with ${Math.abs(stock.changePercent).toFixed(2)}% loss today`,
      `Expensive valuation with P/E ratio of ${stock.pe}`,
      `Low dividend yield provides limited downside protection`,
      `Technical indicators suggest further weakness`
    ];
  } else {
    prediction = "HOLD";
    targetPrice = stock.currentPrice * (1 + (Math.random() * 0.04 - 0.02)); // -2% to +2% range
    confidence = 65;
    reasoning = [
      `Neutral short-term outlook`,
      `Current valuation is fair relative to peers`,
      `Waiting for clearer market direction`,
      `${stock.name} remains fundamentally sound`
    ];
  }

  return {
    prediction,
    targetPrice: Math.round(targetPrice * 100) / 100, // Round to 2 decimal places
    confidence: Math.round(confidence),
    timeframe: "1 month",
    reasoning
  };
}

// Define the news sentiment interface
export interface NewsSentimentResult {
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
  score: number;
  articles: NewsArticle[];
}

export interface NewsArticle {
  title: string;
  source: string;
  publishedAt: string;
  sentiment: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL';
}

// Mock news sentiment data
export function getNewsSentiment(symbol: string): NewsSentimentResult {
  // Mock sentiment data for demonstration
  const baseSentiment = {
    'TCS': { sentiment: 'POSITIVE' as const, score: 0.75 },
    'RELIANCE': { sentiment: 'POSITIVE' as const, score: 0.62 },
    'INFY': { sentiment: 'NEUTRAL' as const, score: 0.10 },
    'HDFCBANK': { sentiment: 'NEGATIVE' as const, score: -0.35 },
    'ICICIBANK': { sentiment: 'NEUTRAL' as const, score: -0.05 },
    'KOTAKBANK': { sentiment: 'POSITIVE' as const, score: 0.45 },
    'SBIN': { sentiment: 'NEGATIVE' as const, score: -0.25 },
    'BHARTIARTL': { sentiment: 'NEUTRAL' as const, score: 0.20 },
    'HINDUNILVR': { sentiment: 'POSITIVE' as const, score: 0.55 },
    'ITC': { sentiment: 'NEUTRAL' as const, score: 0.15 }
  };

  // Get sentiment for the given symbol or use neutral as default
  const stockSentiment = baseSentiment[symbol as keyof typeof baseSentiment] || 
    { sentiment: 'NEUTRAL' as const, score: 0 };

  // Generate mock articles based on the stock sentiment
  const generateMockArticles = (count: number): NewsArticle[] => {
    const articleSentiments: ('POSITIVE' | 'NEGATIVE' | 'NEUTRAL')[] = [];
    
    // Bias article sentiments based on overall stock sentiment
    if (stockSentiment.sentiment === 'POSITIVE') {
      articleSentiments.push('POSITIVE', 'POSITIVE', 'NEUTRAL');
    } else if (stockSentiment.sentiment === 'NEGATIVE') {
      articleSentiments.push('NEGATIVE', 'NEGATIVE', 'NEUTRAL');
    } else {
      articleSentiments.push('NEUTRAL', 'NEUTRAL', 'NEUTRAL');
    }

    const sources = ['Economic Times', 'Business Standard', 'Moneycontrol', 'Livemint', 'CNBC-TV18'];
    const industries = ['Technology', 'Banking', 'Telecom', 'FMCG', 'Energy'];
    const trends = ['growth', 'expansion', 'innovation', 'restructuring', 'partnership'];
    
    return Array.from({ length: count }, (_, i) => {
      const sentiment = articleSentiments[i % articleSentiments.length];
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      let titlePrefix = '';
      if (sentiment === 'POSITIVE') {
        titlePrefix = `${symbol} Reports Strong Q${Math.floor(Math.random() * 4) + 1} Results, `;
      } else if (sentiment === 'NEGATIVE') {
        titlePrefix = `${symbol} Faces Headwinds in ${industries[Math.floor(Math.random() * industries.length)]} Sector, `;
      } else {
        titlePrefix = `${symbol} Maintains Steady Performance Amid ${industries[Math.floor(Math.random() * industries.length)]} Volatility, `;
      }
      
      return {
        title: titlePrefix + `Shows ${trends[Math.floor(Math.random() * trends.length)]} Potential`,
        source: sources[Math.floor(Math.random() * sources.length)],
        publishedAt: date.toISOString().split('T')[0],
        sentiment
      };
    });
  };

  return {
    sentiment: stockSentiment.sentiment,
    score: stockSentiment.score,
    articles: generateMockArticles(3)
  };
}

// Mock portfolio data
export const MOCK_PORTFOLIO: PortfolioHolding[] = [
  {
    symbol: 'RELIANCE',
    quantity: 10,
    averagePrice: 2400,
    currentPrice: 2456.50,
    marketValue: 24565,
    unrealizedPnL: 565,
    pnlPercentage: 2.35,
    sector: 'Oil & Gas'
  },
  {
    symbol: 'TCS',
    quantity: 5,
    averagePrice: 3500,
    currentPrice: 3456.75,
    marketValue: 17283.75,
    unrealizedPnL: -216.25,
    pnlPercentage: -1.24,
    sector: 'IT'
  },
  {
    symbol: 'HDFCBANK',
    quantity: 20,
    averagePrice: 1600,
    currentPrice: 1654.20,
    marketValue: 33084,
    unrealizedPnL: 1084,
    pnlPercentage: 3.39,
    sector: 'Banking'
  }
]

// Mock trading orders
export const MOCK_ORDERS: TradingOrder[] = [
  {
    id: '1',
    symbol: 'RELIANCE',
    type: 'BUY',
    quantity: 5,
    price: 2450,
    status: 'EXECUTED',
    timestamp: new Date(Date.now() - 86400000),
    orderType: 'MARKET'
  },
  {
    id: '2',
    symbol: 'TCS',
    type: 'SELL',
    quantity: 2,
    price: 3460,
    status: 'PENDING',
    timestamp: new Date(Date.now() - 3600000),
    orderType: 'LIMIT'
  }
]

// Paper trading functions
export class PaperTrading {
  private static virtualWallet = 1000000 // ₹10,00,000
  private static holdings: PortfolioHolding[] = [...MOCK_PORTFOLIO]
  private static orders: TradingOrder[] = [...MOCK_ORDERS]

  static getWalletBalance(): number {
    return this.virtualWallet
  }

  static getHoldings(): PortfolioHolding[] {
    return this.holdings
  }

  static getOrders(): TradingOrder[] {
    return this.orders
  }

  static placeOrder(order: Omit<TradingOrder, 'id' | 'timestamp' | 'status'>): TradingOrder {
    const newOrder: TradingOrder = {
      ...order,
      id: Date.now().toString(),
      timestamp: new Date(),
      status: 'PENDING'
    }

    // Simulate order execution for market orders
    if (order.orderType === 'MARKET') {
      setTimeout(() => {
        this.executeOrder(newOrder.id)
      }, 1000)
    }

    this.orders.push(newOrder)
    return newOrder
  }

  static executeOrder(orderId: string): void {
    const order = this.orders.find(o => o.id === orderId)
    if (!order) return

    const stock = getStockBySymbol(order.symbol)
    if (!stock) return

    const executionPrice = order.orderType === 'MARKET' ? stock.currentPrice : order.price
    const totalAmount = executionPrice * order.quantity

    if (order.type === 'BUY') {
      if (this.virtualWallet >= totalAmount) {
        this.virtualWallet -= totalAmount
        
        // Update or add holding
        const existingHolding = this.holdings.find(h => h.symbol === order.symbol)
        if (existingHolding) {
          const newQuantity = existingHolding.quantity + order.quantity
          const newAveragePrice = ((existingHolding.averagePrice * existingHolding.quantity) + totalAmount) / newQuantity
          existingHolding.quantity = newQuantity
          existingHolding.averagePrice = newAveragePrice
          existingHolding.marketValue = newQuantity * stock.currentPrice
          existingHolding.unrealizedPnL = existingHolding.marketValue - (newAveragePrice * newQuantity)
          existingHolding.pnlPercentage = (existingHolding.unrealizedPnL / (newAveragePrice * newQuantity)) * 100
        } else {
          this.holdings.push({
            symbol: order.symbol,
            quantity: order.quantity,
            averagePrice: executionPrice,
            currentPrice: stock.currentPrice,
            marketValue: order.quantity * stock.currentPrice,
            unrealizedPnL: order.quantity * (stock.currentPrice - executionPrice),
            pnlPercentage: ((stock.currentPrice - executionPrice) / executionPrice) * 100,
            sector: stock.sector
          })
        }
        
        order.status = 'EXECUTED'
        order.price = executionPrice
      }
    } else if (order.type === 'SELL') {
      const holding = this.holdings.find(h => h.symbol === order.symbol)
      if (holding && holding.quantity >= order.quantity) {
        this.virtualWallet += totalAmount
        holding.quantity -= order.quantity
        
        if (holding.quantity === 0) {
          this.holdings = this.holdings.filter(h => h.symbol !== order.symbol)
        } else {
          holding.marketValue = holding.quantity * stock.currentPrice
          holding.unrealizedPnL = holding.marketValue - (holding.averagePrice * holding.quantity)
          holding.pnlPercentage = (holding.unrealizedPnL / (holding.averagePrice * holding.quantity)) * 100
        }
        
        order.status = 'EXECUTED'
        order.price = executionPrice
      }
    }
  }

  static getPortfolioValue(): number {
    const holdingsValue = this.holdings.reduce((sum, holding) => sum + holding.marketValue, 0)
    return this.virtualWallet + holdingsValue
  }

  static getTotalPnL(): number {
    return this.holdings.reduce((sum, holding) => sum + holding.unrealizedPnL, 0)
  }
}