const TradingAccount = require('../models/TradingAccount');
const Stock = require('../models/Stock');
const stockService = require('../services/stockService');
const logger = require('../utils/logger');

// @desc    Get trading account with improved error handling
// @route   GET /api/v1/trading/account
// @access  Private
exports.getTradingAccount = async (req, res) => {
  try {
    logger.info('Getting trading account for user:', req.user._id);
    let tradingAccount = await TradingAccount.findOne({ user: req.user._id })
      .populate('holdings.stock', 'symbol name')
      .populate('orders.stock', 'symbol name');

    if (!tradingAccount) {
      logger.info('Creating new trading account for user:', req.user._id);
      tradingAccount = new TradingAccount({
        user: req.user._id,
        walletBalance: 10000,
        holdings: [],
        orders: [],
      });
      await tradingAccount.save();
    } else if (!tradingAccount.tradingStats) {
      logger.info('Initializing missing tradingStats for user:', req.user._id);
      tradingAccount.tradingStats = {
        totalTrades: 0,
        successfulTrades: 0,
        winRate: 0,
        bestTrade: null,
        worstTrade: null,
        averageHoldingTime: 0,
        totalVolume: 0
      };
      await tradingAccount.save();
    }

    // Update holding prices with real-time data
    try {
      logger.info('Updating holding prices...');
      await tradingAccount.updateHoldingPrices();
    } catch (error) {
      logger.error('Error updating holding prices:', error);
      // Continue without updating prices
    }

    logger.info('Sending trading account response');
    res.json({
      success: true,
      data: { tradingAccount },
    });
  } catch (error) {
    logger.error('Get trading account error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trading account',
    });
  }
};

// @desc    Place order with improved error handling
// @route   POST /api/v1/trading/orders
// @access  Private
exports.placeOrder = async (req, res) => {
  try {
    logger.info('=== PLACE ORDER START ===');
    logger.info('Request body:', JSON.stringify(req.body, null, 2));
    
    const { symbol, type, quantity, price, orderType, stock } = req.body;

    // Validation
    if (!symbol) {
      logger.error('Symbol is missing');
      return res.status(400).json({
        success: false,
        message: 'Symbol is required',
      });
    }

    if (!type) {
      logger.error('Type is missing');
      return res.status(400).json({
        success: false,
        message: 'Order type is required',
      });
    }

    if (!quantity) {
      logger.error('Quantity is missing');
      return res.status(400).json({
        success: false,
        message: 'Quantity is required',
      });
    }

    if (!orderType) {
      logger.error('Order type is missing');
      return res.status(400).json({
        success: false,
        message: 'Order type (MARKET/LIMIT) is required',
      });
    }

    if (orderType !== 'MARKET' && orderType !== 'LIMIT') {
      logger.error('Invalid order type:', orderType);
      return res.status(400).json({
        success: false,
        message: 'Invalid order type. Must be MARKET or LIMIT',
      });
    }

    if (orderType === 'LIMIT' && !price) {
      logger.error('Missing price for limit order');
      return res.status(400).json({
        success: false,
        message: 'Price is required for limit orders',
      });
    }

    logger.info('Finding trading account for user:', req.user._id);
    let tradingAccount = await TradingAccount.findOne({ user: req.user._id });
    
    if (!tradingAccount) {
      logger.info('Creating new trading account for user:', req.user._id);
      tradingAccount = new TradingAccount({
        user: req.user._id,
        walletBalance: 10000,
        holdings: [],
        orders: [],
      });
      await tradingAccount.save();
    } else if (!tradingAccount.tradingStats) {
      logger.info('Initializing missing tradingStats for user:', req.user._id);
      tradingAccount.tradingStats = {
        totalTrades: 0,
        successfulTrades: 0,
        winRate: 0,
        bestTrade: null,
        worstTrade: null,
        averageHoldingTime: 0,
        totalVolume: 0
      };
      await tradingAccount.save();
    }

    // Get stock details with real-time data
    let stockData;
    try {
      logger.info('Getting stock details for:', symbol);
      
      if (stock) {
        logger.info('Using provided stock ID:', stock);
        try {
          stockData = await Stock.findById(stock);
          if (!stockData) {
            logger.error('Stock not found with provided ID:', stock);
            return res.status(400).json({
              success: false,
              message: 'Stock not found with the provided ID',
            });
          }
          logger.info('Stock found by ID:', stockData);
        } catch (idError) {
          logger.error('Error finding stock by ID:', idError);
          return res.status(400).json({
            success: false,
            message: 'Invalid stock ID format',
          });
        }
      } else {
        logger.info('No stock ID provided, looking up by symbol:', symbol);
        stockData = await Stock.findOne({ 
          $or: [
            { symbol: symbol.toUpperCase() },
            { symbol: symbol.toUpperCase() + '.NS' },
            { symbol: symbol.toUpperCase() + '.BSE' }
          ]
        });
        
        if (!stockData) {
          logger.info('Stock not found in database, creating a new one');
          try {
            const externalStock = await stockService.getStockDetails(symbol);
            
            const sector = externalStock.sector || 'Unknown';
            
            stockData = new Stock({
              symbol: externalStock.symbol,
              name: externalStock.name,
              currentPrice: externalStock.currentPrice,
              sector: sector
            });
            await stockData.save();
            logger.info('Created new stock with sector:', sector, stockData);
          } catch (createError) {
            logger.error('Error creating stock:', createError);
            stockData = new Stock({
              symbol: symbol.toUpperCase(),
              name: symbol.toUpperCase(),
              currentPrice: 100,
              sector: 'Unknown'
            });
            await stockData.save();
            logger.info('Created fallback stock with Unknown sector:', stockData);
          }
        } else {
          logger.info('Stock found by symbol:', stockData);
          
          if (!stockData.sector || stockData.sector === 'Unknown') {
            try {
              const externalStock = await stockService.getStockDetails(symbol);
              if (externalStock.sector && externalStock.sector !== 'Unknown') {
                stockData.sector = externalStock.sector;
                await stockData.save();
                logger.info('Updated stock sector to:', externalStock.sector);
              }
            } catch (updateError) {
              logger.error('Error updating stock sector:', updateError);
            }
          }
        }
      }
      
      // For market orders, update the price to current real-time price
      // but don't check for slippage
      if (orderType === 'MARKET') {
        logger.info('Getting real-time price for market order');
        try {
          const realTimePriceData = await stockService.getRealTimePrice(symbol);
          stockData.currentPrice = realTimePriceData.currentPrice;
          logger.info(`Updated market order price to: ${stockData.currentPrice}`);
        } catch (priceError) {
          logger.error('Error getting real-time price:', priceError);
          // Continue with existing price if real-time price fails
        }
      }
    } catch (error) {
      logger.error('Error fetching stock data:', error);
      return res.status(500).json({
        success: false,
        message: 'Data couldn\'t be loaded'
      });
    }

    // Place order
    try {
      logger.info('Placing order in trading account');
      logger.info('Order data:', {
        stock: stockData._id,
        symbol: stockData.symbol,
        type,
        quantity: parseInt(quantity),
        price: orderType === 'MARKET' ? stockData.currentPrice : parseFloat(price),
        orderType
      });
      
      const order = await tradingAccount.placeOrder({
        stock: stockData._id,
        symbol: stockData.symbol,
        type,
        quantity: parseInt(quantity),
        price: orderType === 'MARKET' ? stockData.currentPrice : parseFloat(price),
        orderType
      });

      logger.info('Order created:', order);

      // Execute market orders immediately
      if (orderType === 'MARKET') {
        logger.info('Executing market order immediately');
        try {
          await tradingAccount.executeOrder(order.id);
          logger.info('Order executed successfully');
        } catch (execError) {
          logger.error('Order execution error:', execError);
          
          order.status = 'CANCELLED';
          order.cancelReason = execError.message;
          logger.info('Order cancelled due to execution error');
          
          throw execError;
        }
      }

      logger.info('Saving trading account');
      await tradingAccount.save();
      logger.info('Trading account saved successfully');

      logger.info('=== PLACE ORDER SUCCESS ===');
      res.status(201).json({
        success: true,
        message: 'Order placed successfully',
        data: { order },
      });
    } catch (error) {
      logger.error('Order placement error:', error);
      return res.status(400).json({
        success: false,
        message: error.message
      });
    }
  } catch (error) {
    logger.error('Place order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to place order'
    });
  }
};

// @desc    Get holdings with improved error handling
// @route   GET /api/v1/trading/holdings
// @access  Private
exports.getHoldings = async (req, res) => {
  try {
    logger.info('Getting holdings for user:', req.user._id);
    const tradingAccount = await TradingAccount.findOne({ user: req.user._id })
      .populate('holdings.stock', 'symbol name');

    if (!tradingAccount) {
      logger.info('No trading account found');
      return res.json({
        success: true,
        data: { holdings: [] },
      });
    }

    try {
      logger.info('Updating holding prices');
      await tradingAccount.updateHoldingPrices();
    } catch (error) {
      logger.error('Error updating holding prices:', error);
      return res.status(500).json({
        success: false,
        message: 'Data couldn\'t be loaded'
      });
    }

    const formattedHoldings = tradingAccount.holdings.map(holding => ({
      symbol: holding.symbol,
      name: holding.stock.name,
      quantity: holding.quantity,
      averagePrice: holding.averagePrice,
      currentPrice: holding.currentPrice,
      marketValue: holding.marketValue,
      unrealizedPnL: holding.unrealizedPnL,
      pnlPercentage: holding.pnlPercentage,
      sector: holding.sector
    }));

    logger.info('Holdings retrieved:', formattedHoldings.length);
    res.json({
      success: true,
      data: { holdings: formattedHoldings },
    });
  } catch (error) {
    logger.error('Get holdings error:', error);
    res.status(500).json({
      success: false,
      message: 'Data couldn\'t be loaded'
    });
  }
};

// @desc    Get orders with improved error handling
// @route   GET /api/v1/trading/orders
// @access  Private
exports.getOrders = async (req, res) => {
  try {
    logger.info('Getting orders for user:', req.user._id);
    const tradingAccount = await TradingAccount.findOne({ user: req.user._id })
      .populate('orders.stock', 'symbol name');

    if (!tradingAccount) {
      logger.info('No trading account found');
      return res.json({
        success: true,
        data: { orders: [] },
      });
    }

    const formattedOrders = tradingAccount.orders.map(order => ({
      id: order.id,
      symbol: order.symbol,
      name: order.stock.name,
      type: order.type,
      quantity: order.quantity,
      price: order.price,
      orderType: order.orderType,
      status: order.status,
      timestamp: order.timestamp,
      executedAt: order.executedAt,
      executedPrice: order.executedPrice
    }));

    logger.info('Orders retrieved:', formattedOrders.length);
    res.json({
      success: true,
      data: { orders: formattedOrders },
    });
  } catch (error) {
    logger.error('Get orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch orders',
    });
  }
};

// @desc    Cancel order with improved error handling
// @route   PUT /api/v1/trading/orders/:id/cancel
// @access  Private
exports.cancelOrder = async (req, res) => {
  try {
    logger.info('Cancelling order:', req.params.id);
    const tradingAccount = await TradingAccount.findOne({ user: req.user._id });
    if (!tradingAccount) {
      logger.error('Trading account not found');
      return res.status(404).json({
        success: false,
        message: 'Trading account not found',
      });
    }

    const order = tradingAccount.orders.find(o => o.id === req.params.id);
    if (!order) {
      logger.error('Order not found');
      return res.status(404).json({
        success: false,
        message: 'Order not found',
      });
    }

    if (order.status !== 'PENDING') {
      logger.error('Order is not pending, cannot cancel');
      return res.status(400).json({
        success: false,
        message: 'Only pending orders can be cancelled',
      });
    }

    order.status = 'CANCELLED';
    order.cancelReason = req.body.reason || 'Cancelled by user';
    await tradingAccount.save();
    logger.info('Order cancelled successfully');

    res.json({
      success: true,
      message: 'Order cancelled successfully',
      data: { order },
    });
  } catch (error) {
    logger.error('Cancel order error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel order',
    });
  }
};

// @desc    Get trading stats with improved error handling
// @route   GET /api/v1/trading/stats
// @access  Private
exports.getTradingStats = async (req, res) => {
  try {
    logger.info('Getting trading stats for user:', req.user._id);
    const tradingAccount = await TradingAccount.findOne({ user: req.user._id });
    
    if (!tradingAccount) {
      logger.error('Trading account not found');
      return res.status(404).json({
        success: false,
        message: 'Trading account not found'
      });
    }
    
    // Get all executed orders
    const orders = tradingAccount.orders.filter(order => order.status === 'EXECUTED');
    
    // Process orders to create trades
    const trades = [];
    const buyOrders = orders.filter(order => order.type === 'BUY');
    const sellOrders = orders.filter(order => order.type === 'SELL');
    
    // Create a map to track quantities
    const holdings = {};
    
    // Process buy orders
    for (const buyOrder of buyOrders) {
      if (!holdings[buyOrder.symbol]) {
        holdings[buyOrder.symbol] = {
          quantity: 0,
          totalCost: 0,
          orders: []
        };
      }
      
      holdings[buyOrder.symbol].quantity += buyOrder.quantity;
      holdings[buyOrder.symbol].totalCost += buyOrder.executedPrice * buyOrder.quantity;
      holdings[buyOrder.symbol].orders.push(buyOrder);
    }
    
    // Process sell orders and create trades
    for (const sellOrder of sellOrders) {
      if (!holdings[sellOrder.symbol] || holdings[sellOrder.symbol].quantity === 0) {
        continue;
      }
      
      const holding = holdings[sellOrder.symbol];
      let remainingQuantity = sellOrder.quantity;
      
      // Find matching buy orders (FIFO)
      for (let i = 0; i < holding.orders.length && remainingQuantity > 0; i++) {
        const buyOrder = holding.orders[i];
        const tradeQuantity = Math.min(remainingQuantity, buyOrder.quantity);
        
        // Calculate profit/loss
        const buyValue = buyOrder.executedPrice * tradeQuantity;
        const sellValue = sellOrder.executedPrice * tradeQuantity;
        const profitLoss = sellValue - buyValue;
        const profitLossPercentage = (profitLoss / buyValue) * 100;
        
        // Add trade
        trades.push({
          symbol: sellOrder.symbol,
          name: sellOrder.symbol,
          buyPrice: buyOrder.executedPrice,
          buyDate: buyOrder.executedAt,
          sellPrice: sellOrder.executedPrice,
          sellDate: sellOrder.executedAt,
          quantity: tradeQuantity,
          profitLoss: profitLoss,
          profitLossPercentage: profitLossPercentage,
          status: 'CLOSED'
        });
        
        // Update holding
        holding.quantity -= tradeQuantity;
        holding.totalCost -= buyOrder.executedPrice * tradeQuantity;
        buyOrder.quantity -= tradeQuantity;
        remainingQuantity -= tradeQuantity;
        
        // Remove buy order if fully used
        if (buyOrder.quantity === 0) {
          holding.orders.splice(i, 1);
          i--;
        }
      }
    }
    
    // Add remaining holdings as open trades
    for (const symbol in holdings) {
      const holding = holdings[symbol];
      if (holding.quantity > 0) {
        const averagePrice = holding.totalCost / holding.quantity;
        
        // Get current price for the stock
        let currentPrice = averagePrice;
        
        try {
          const stockData = await stockService.getRealTimePrice(symbol);
          currentPrice = stockData.currentPrice;
        } catch (error) {
          logger.error(`Error fetching current price for ${symbol}:`, error);
        }
        
        // Calculate unrealized P&L
        const unrealizedPnL = (currentPrice - averagePrice) * holding.quantity;
        const unrealizedPnLPercentage = (unrealizedPnL / (averagePrice * holding.quantity)) * 100;
        
        trades.push({
          symbol: symbol,
          name: symbol,
          buyPrice: averagePrice,
          buyDate: holding.orders[0]?.executedAt || new Date(),
          quantity: holding.quantity,
          profitLoss: unrealizedPnL,
          profitLossPercentage: unrealizedPnLPercentage,
          status: 'OPEN'
        });
      }
    }
    
    // Calculate total P&L from trades
    const totalPnL = trades.reduce((sum, trade) => sum + (trade.profitLoss || 0), 0);
    
    // Update trading account total P&L
    tradingAccount.totalPnL = totalPnL;
    await tradingAccount.save();
    
    // Prepare response
    const stats = {
      totalTrades: tradingAccount.tradingStats.totalTrades,
      winRate: tradingAccount.tradingStats.winRate,
      totalPnL: totalPnL,
      portfolioValue: tradingAccount.totalValue,
      bestTrade: tradingAccount.tradingStats.bestTrade,
      worstTrade: tradingAccount.tradingStats.worstTrade,
      averageHoldingTime: tradingAccount.tradingStats.averageHoldingTime,
      totalVolume: tradingAccount.tradingStats.totalVolume,
      trades: trades
    };
    
    logger.info('Sending trading stats response');
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Get trading stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trading stats'
    });
  }
};

// @desc    Get portfolio allocation with improved error handling
// @route   GET /api/v1/trading/portfolio-allocation
// @access  Private
exports.getPortfolioAllocation = async (req, res) => {
  try {
    logger.info('Getting portfolio allocation for user:', req.user._id);
    const tradingAccount = await TradingAccount.findOne({ user: req.user._id });
    if (!tradingAccount) {
      logger.info('No trading account found');
      return res.json({
        success: true,
        data: { allocation: [] },
      });
    }

    try {
      logger.info('Updating holding prices for allocation');
      await tradingAccount.updateHoldingPrices();
    } catch (error) {
      logger.error('Error updating holding prices:', error);
    }

    let allocation = [];
    try {
      logger.info('Getting sector allocation');
      allocation = await tradingAccount.getSectorAllocation();
    } catch (error) {
      logger.error('Error getting sector allocation:', error);
    }

    logger.info('Portfolio allocation retrieved');
    res.json({
      success: true,
      data: { allocation },
    });
  } catch (error) {
    logger.error('Get portfolio allocation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch portfolio allocation',
    });
  }
};