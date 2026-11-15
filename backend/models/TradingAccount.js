const mongoose = require('mongoose');
const stockService = require('../services/stockService');

// A limit order that has not reached its price is cancelled after this many days
const LIMIT_ORDER_VALIDITY_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// A buy limit fills at the limit price or lower, a sell limit at the limit price or higher
const isLimitPriceReached = (order, currentPrice) =>
  order.type === 'BUY' ? currentPrice <= order.price : currentPrice >= order.price;

const holdingSchema = new mongoose.Schema({
  stock: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stock',
    required: true
  },
  symbol: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  averagePrice: {
    type: Number,
    required: true,
    min: [0, 'Average price cannot be negative']
  },
  currentPrice: {
    type: Number,
    required: true,
    min: [0, 'Current price cannot be negative']
  },
  marketValue: {
    type: Number,
    required: true,
    min: [0, 'Market value cannot be negative']
  },
  unrealizedPnL: {
    type: Number,
    default: 0
  },
  pnlPercentage: {
    type: Number,
    default: 0
  },
  sector: {
    type: String,
    required: true
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    index: true
  },
  stock: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stock',
    required: true
  },
  symbol: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['BUY', 'SELL'],
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
  },
  price: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative']
  },
  orderType: {
    type: String,
    enum: ['MARKET', 'LIMIT'],
    required: true
  },
  status: {
    type: String,
    enum: ['PENDING', 'EXECUTED', 'CANCELLED'],
    default: 'PENDING'
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  executedAt: {
    type: Date
  },
  executedPrice: {
    type: Number
  },
  stopLossPrice: {
    type: Number
  },
  targetPrice: {
    type: Number
  },
  cancelReason: {
    type: String
  }
}, { _id: false });

const watchlistSchema = new mongoose.Schema({
  stock: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Stock',
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  },
  targetPrice: {
    type: Number
  },
  notes: {
    type: String,
    trim: true
  }
}, { _id: false });

const tradingStatsSchema = new mongoose.Schema({
  totalTrades: {
    type: Number,
    default: 0
  },
  successfulTrades: {
    type: Number,
    default: 0
  },
  winRate: {
    type: Number,
    default: 0
  },
  bestTrade: {
    symbol: String,
    pnl: {
      type: Number,
      default: 0
    }
  },
  worstTrade: {
    symbol: String,
    pnl: {
      type: Number,
      default: 0
    }
  },
  averageHoldingTime: {
    type: Number,
    default: 0
  },
  totalVolume: {
    type: Number,
    default: 0
  }
}, { _id: false });

const tradingAccountSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  walletBalance: {
    type: Number,
    required: true,
    min: [0, 'Wallet balance cannot be negative'],
    default: 10000 // Starting with 10,000 Rs virtual money
  },
  holdings: [holdingSchema],
  orders: [orderSchema],
  watchlist: [watchlistSchema],
  tradingStats: {
    type: tradingStatsSchema,
    default: () => ({  // Add default function to ensure initialization
      totalTrades: 0,
      successfulTrades: 0,
      winRate: 0,
      bestTrade: null,
      worstTrade: null,
      averageHoldingTime: 0,
      totalVolume: 0
    })
  },
  totalValue: {
    type: Number,
    default: 0
  },
  totalPnL: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
}, {
  timestamps: true
});

// Add a pre-save hook to ensure tradingStats is always set
tradingAccountSchema.pre('save', function(next) {
  if (!this.tradingStats) {
    this.tradingStats = {
      totalTrades: 0,
      successfulTrades: 0,
      winRate: 0,
      bestTrade: null,
      worstTrade: null,
      averageHoldingTime: 0,
      totalVolume: 0
    };
  }
  next();
});

// Generate unique order ID
tradingAccountSchema.methods.generateOrderId = function() {
  const timestamp = Date.now().toString();
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `ORD-${timestamp}-${random}`;
};

// Place order method
tradingAccountSchema.methods.placeOrder = async function(orderData) {
  try {
    console.log('=== PLACE ORDER METHOD START ===');
    console.log('Order data received:', JSON.stringify(orderData, null, 2));
    
    // Ensure we have the required stock data
    if (!orderData.stock) {
      console.log('ERROR: Stock ID is missing');
      throw new Error('Stock ID is required');
    }
    
    if (!orderData.symbol) {
      console.log('ERROR: Symbol is missing');
      throw new Error('Symbol is required');
    }
    
    console.log('Order data validation passed');
    
    const order = {
      id: this.generateOrderId(),
      stock: orderData.stock,
      symbol: orderData.symbol,
      type: orderData.type,
      quantity: orderData.quantity,
      price: orderData.price,
      orderType: orderData.orderType,
      status: 'PENDING',
      timestamp: new Date()
    };

    console.log('Created order object:', order);

    // Validate wallet balance for buy orders
    if (order.type === 'BUY') {
      const totalAmount = order.price * order.quantity;
      if (this.walletBalance < totalAmount) {
        console.log('ERROR: Insufficient wallet balance');
        throw new Error('Insufficient wallet balance');
      }
    }

    // Validate holdings for sell orders
    if (order.type === 'SELL') {
      const holding = this.holdings.find(h => h.symbol === order.symbol);
      if (!holding || holding.quantity < order.quantity) {
        console.log('ERROR: Insufficient holdings');
        throw new Error('Insufficient holdings');
      }
    }

    this.orders.push(order);
    console.log('Order added to trading account');
    console.log('=== PLACE ORDER METHOD END ===');
    return order;
  } catch (error) {
    console.error('ERROR: Error in placeOrder method:', error);
    console.log('=== PLACE ORDER METHOD END ===');
    throw error;
  }
};

// Execute a pending order at the live price. Market orders fill straight away;
// limit orders fill only once the live price has reached the limit.
// Pass `options.quote` (from stockService.getRealTimePrice) to reuse a price the
// caller already fetched.
tradingAccountSchema.methods.executeOrder = async function(orderId, options = {}) {
  const order = this.orders.find(o => o.id === orderId);

  if (!order || order.status !== 'PENDING') {
    throw new Error('Order not found or already executed');
  }

  // Ensure tradingStats exists before using it
  if (!this.tradingStats) {
    this.tradingStats = {
      totalTrades: 0,
      successfulTrades: 0,
      winRate: 0,
      bestTrade: null,
      worstTrade: null,
      averageHoldingTime: 0,
      totalVolume: 0
    };
  }

  // Get real-time price
  let stockData = options.quote;
  if (!stockData) {
    try {
      stockData = await stockService.getRealTimePrice(order.symbol);
    } catch (error) {
      console.error(`Error fetching real-time price for ${order.symbol}:`, error);
      throw new Error(`Failed to execute order: ${error.message}`);
    }
  }

  const currentPrice = stockData.currentPrice;
  if (!(currentPrice > 0)) {
    throw new Error('Failed to execute order: no live price available');
  }

  if (order.orderType === 'LIMIT' && !isLimitPriceReached(order, currentPrice)) {
    throw new Error(
      order.type === 'BUY'
        ? 'Current price is higher than limit price'
        : 'Current price is lower than limit price'
    );
  }

  // Check funds and holdings before changing anything, so an order that cannot
  // be filled leaves the account exactly as it was.
  const totalAmount = currentPrice * order.quantity;
  const holdingIndex = this.holdings.findIndex(h => h.symbol === order.symbol);

  if (order.type === 'BUY' && this.walletBalance < totalAmount) {
    throw new Error('Insufficient wallet balance');
  }
  if (order.type === 'SELL') {
    if (holdingIndex === -1) {
      throw new Error('Holding not found');
    }
    if (this.holdings[holdingIndex].quantity < order.quantity) {
      throw new Error('Insufficient holding quantity');
    }
  }

  // Execute the order
  order.status = 'EXECUTED';
  order.executedAt = new Date();
  order.executedPrice = currentPrice;

  // Update trading stats with defensive checks
  this.tradingStats.totalTrades = (this.tradingStats.totalTrades || 0) + 1;
  this.tradingStats.totalVolume = (this.tradingStats.totalVolume || 0) + order.quantity;

  if (order.type === 'BUY') {
    // Deduct from wallet balance
    this.walletBalance -= totalAmount;

    // Update or add holding
    if (holdingIndex === -1) {
      // Add new holding
      // Ensure sector is set, default to 'Unknown' if not provided
      const sector = stockData.sector || 'Unknown';
      
      this.holdings.push({
        stock: order.stock,
        symbol: order.symbol,
        quantity: order.quantity,
        averagePrice: currentPrice,
        currentPrice: currentPrice,
        marketValue: currentPrice * order.quantity,
        unrealizedPnL: 0,
        pnlPercentage: 0,
        sector: sector // Explicitly set the sector
      });
      console.log(`Added new holding for ${order.symbol} with sector: ${sector}`);
    } else {
      // Update existing holding
      const holding = this.holdings[holdingIndex];
      const newQuantity = holding.quantity + order.quantity;
      const newAveragePrice = ((holding.averagePrice * holding.quantity) + (currentPrice * order.quantity)) / newQuantity;
      
      holding.quantity = newQuantity;
      holding.averagePrice = newAveragePrice;
      holding.currentPrice = currentPrice;
      holding.marketValue = currentPrice * newQuantity;
      holding.unrealizedPnL = (currentPrice - newAveragePrice) * newQuantity;
      holding.pnlPercentage = newAveragePrice > 0 
        ? ((currentPrice - newAveragePrice) / newAveragePrice) * 100 
        : 0;
      
      // Update sector if it was previously unknown
      if (!holding.sector || holding.sector === 'Unknown') {
        holding.sector = stockData.sector || 'Unknown';
        console.log(`Updated holding sector for ${order.symbol} to: ${holding.sector}`);
      }
    }
  } else if (order.type === 'SELL') {
    // Add to wallet balance
    this.walletBalance += totalAmount;

    const holding = this.holdings[holdingIndex];

    // Calculate realized P&L
    const realizedPnL = (currentPrice - holding.averagePrice) * order.quantity;
    
    if (realizedPnL > 0) {
      this.tradingStats.successfulTrades = (this.tradingStats.successfulTrades || 0) + 1;
      
      // Update best trade if this is better
      if (!this.tradingStats.bestTrade || realizedPnL > (this.tradingStats.bestTrade.pnl || 0)) {
        this.tradingStats.bestTrade = {
          symbol: order.symbol,
          pnl: realizedPnL
        };
      }
    } else {
      // Update worst trade if this is worse
      if (!this.tradingStats.worstTrade || realizedPnL < (this.tradingStats.worstTrade.pnl || 0)) {
        this.tradingStats.worstTrade = {
          symbol: order.symbol,
          pnl: realizedPnL
        };
      }
    }
    
    // Update or remove holding
    if (holding.quantity === order.quantity) {
      // Remove holding completely
      this.holdings.splice(holdingIndex, 1);
    } else {
      // Update holding quantity
      holding.quantity -= order.quantity;
      holding.marketValue = holding.quantity * currentPrice;
      holding.unrealizedPnL = (currentPrice - holding.averagePrice) * holding.quantity;
      holding.pnlPercentage = holding.averagePrice > 0 
        ? ((currentPrice - holding.averagePrice) / holding.averagePrice) * 100 
        : 0;
    }
    
    // Update total P&L
    this.totalPnL = (this.totalPnL || 0) + realizedPnL;
  }

  // Win rate is profitable sells out of all sells. Buys open a position and
  // have no profit or loss yet, so they are not part of it.
  const executedSells = this.orders.filter(o => o.status === 'EXECUTED' && o.type === 'SELL').length;
  this.tradingStats.winRate = executedSells > 0
    ? Math.min(100, ((this.tradingStats.successfulTrades || 0) / executedSells) * 100)
    : 0;

  // Update total value
  this.updateTotalValue();

  return this; // Return the account instance for chaining
};

// Fill or expire this account's pending limit orders against live prices.
// Saves the account when anything changed and reports what happened.
tradingAccountSchema.methods.processPendingOrders = async function(now = new Date()) {
  const pending = this.orders.filter(o => o.status === 'PENDING' && o.orderType === 'LIMIT');
  const filled = [];
  const cancelled = [];
  const quotes = new Map();

  for (const order of pending) {
    if (now - new Date(order.timestamp) > LIMIT_ORDER_VALIDITY_DAYS * MS_PER_DAY) {
      order.status = 'CANCELLED';
      order.cancelReason = `Expired: limit price was not reached within ${LIMIT_ORDER_VALIDITY_DAYS} days`;
      cancelled.push(order);
      continue;
    }

    let quote = quotes.get(order.symbol);
    if (!quote) {
      try {
        quote = await stockService.getRealTimePrice(order.symbol);
        quotes.set(order.symbol, quote);
      } catch (error) {
        // No live price right now; leave the order pending and try again later
        continue;
      }
    }

    if (!isLimitPriceReached(order, quote.currentPrice)) continue;

    try {
      await this.executeOrder(order.id, { quote });
      filled.push(order);
    } catch (error) {
      order.status = 'CANCELLED';
      order.cancelReason = error.message;
      cancelled.push(order);
    }
  }

  if (filled.length > 0 || cancelled.length > 0) {
    await this.save();
  }

  return { filled, cancelled };
};

tradingAccountSchema.statics.isLimitPriceReached = isLimitPriceReached;
tradingAccountSchema.statics.LIMIT_ORDER_VALIDITY_DAYS = LIMIT_ORDER_VALIDITY_DAYS;

// Update holding prices method
tradingAccountSchema.methods.updateHoldingPrices = async function() {
  for (const holding of this.holdings) {
    try {
      const stockData = await stockService.getRealTimePrice(holding.symbol);
      holding.currentPrice = stockData.currentPrice;
      holding.marketValue = holding.quantity * stockData.currentPrice;
      holding.unrealizedPnL = (stockData.currentPrice - holding.averagePrice) * holding.quantity;
      holding.pnlPercentage = holding.averagePrice > 0 
        ? ((stockData.currentPrice - holding.averagePrice) / holding.averagePrice) * 100 
        : 0;
      
      // Update sector if it was previously unknown
      if (!holding.sector || holding.sector === 'Unknown') {
        holding.sector = stockData.sector || 'Unknown';
        console.log(`Updated holding sector for ${holding.symbol} to: ${holding.sector}`);
      }
    } catch (error) {
      console.error(`Error updating price for holding ${holding.symbol}:`, error);
    }
  }
  
  // Update total value
  this.updateTotalValue();
  
  return this.save();
};

// Update total value method
tradingAccountSchema.methods.updateTotalValue = function() {
  const holdingsValue = this.holdings.reduce((sum, holding) => sum + holding.marketValue, 0);
  this.totalValue = this.walletBalance + holdingsValue;
  return this.totalValue;
};

// Add to watchlist method
tradingAccountSchema.methods.addToWatchlist = function(stockId, targetPrice, notes) {
  // Check if stock is already in watchlist
  const exists = this.watchlist.some(item => item.stock.toString() === stockId);
  
  if (exists) {
    throw new Error('Stock already in watchlist');
  }
  
  this.watchlist.push({
    stock: stockId,
    targetPrice,
    notes
  });
  
  return this.save();
};

// Remove from watchlist method
tradingAccountSchema.methods.removeFromWatchlist = function(stockId) {
  this.watchlist = this.watchlist.filter(item => item.stock.toString() !== stockId);
  return this.save();
};

// Get sector allocation method
tradingAccountSchema.methods.getSectorAllocation = async function() {
  const Stock = mongoose.model('Stock');
  const allocation = {};
  
  for (const holding of this.holdings) {
    try {
      const stock = await Stock.findById(holding.stock);
      if (stock) {
        const sector = stock.sector || 'Unknown'; // Use 'Unknown' as fallback
        if (!allocation[sector]) {
          allocation[sector] = 0;
        }
        allocation[sector] += holding.marketValue;
      }
    } catch (error) {
      console.error(`Error fetching sector for holding ${holding.stock}:`, error);
    }
  }
  
  const totalValue = Object.values(allocation).reduce((sum, value) => sum + value, 0);
  
  return Object.entries(allocation).map(([sector, value]) => ({
    sector,
    value,
    percentage: totalValue > 0 ? (value / totalValue) * 100 : 0
  }));
};

module.exports = mongoose.model('TradingAccount', tradingAccountSchema);

// Attempt to drop an existing unique index on orders.id that can cause dup null errors
// and recreate a non-unique sparse index. This runs best after connection is open.
try {
  mongoose.connection.once('open', async () => {
    try {
      const coll = mongoose.connection.collection('tradingaccounts');
      const indexes = await coll.indexes();
      const hasUniqueOrdersId = indexes.find(i => i.name === 'orders.id_1' && i.unique);
      if (hasUniqueOrdersId) {
        await coll.dropIndex('orders.id_1');
        await coll.createIndex({ 'orders.id': 1 }, { sparse: true });
        console.log('[TradingAccount] Fixed unique index on orders.id -> sparse non-unique');
      }
    } catch (e) {
      // no-op if collection not ready or index missing
    }
  });
} catch {}