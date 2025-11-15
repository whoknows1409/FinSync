// backend/controllers/chatbotController.js

const geminiAPI = require('../utils/gemini');
const logger = require('../utils/logger');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const FinancialGoal = require('../models/FinancialGoal');
const ChatHistory = require('../models/ChatHistory');
const TradingAccount = require('../models/TradingAccount');
const RecurringTransaction = require('../models/RecurringTransaction');
const mongoose = require('mongoose');

// Dynamically require gemini module to avoid duplicate declaration issues
let geminiModule;
try {
  geminiModule = require('../utils/gemini');
} catch (error) {
  logger.error('Failed to load gemini module:', error);
  // Create a mock gemini module for error handling
  geminiModule = {
    sendMessage: async () => { throw new Error('Gemini module not available'); },
    generateFinancialInsights: async () => { throw new Error('Gemini module not available'); },
    getBudgetAdvice: async () => { throw new Error('Gemini module not available'); },
    getInvestmentAdvice: async () => { throw new Error('Gemini module not available'); },
    analyzeStockSentiment: async () => { throw new Error('Gemini module not available'); },
    categorizeTransaction: async () => { throw new Error('Gemini module not available'); },
    predictStockPrice: async () => { throw new Error('Gemini module not available'); }
  };
}

// @desc    Send message to chatbot
// @route   POST /api/v1/chatbot/query
// @access  Private
const sendMessage = async (req, res) => {
  try {
    const { message, conversationHistory = [], options = {} } = req.body;

    if (!message || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Message is required',
      });
    }

    // Get user's financial context for better responses
    const userContext = await getUserFinancialContext(req.user._id);

    // Enhance the message with user context if relevant
    const enhancedMessage = enhanceMessageWithContext(message, userContext);

    // Send to Gemini API with retry logic built-in
    const response = await geminiModule.sendMessage(enhancedMessage, conversationHistory);

    // Generate title only on first user message if requested
    let title = null;
    if (options.generateTitle && conversationHistory.length <= 2) {
      try {
        // Generate title from the conversation
        const messages = [
          { role: 'user', content: message },
          { role: 'assistant', content: response }
        ];
        const prompt = `Based on the following conversation, generate a concise title (4-5 words) that summarizes the main topic. The title should be related to finance, budgeting, investing, or financial planning. Only return the title, nothing else.\n\nConversation:\n${messages.map(msg => `${msg.role}: ${msg.content}`).join('\n')}`;
        
        title = await geminiModule.sendMessage(prompt, []);
        
        // Clean the title
        title = title.trim().replace(/[\"'`]/g, '');
        const words = title.split(' ');
        if (words.length > 5) {
          title = words.slice(0, 5).join(' ');
        }
      } catch (titleError) {
        logger.error('Error generating title:', titleError);
        // Fallback to first few words of message
        const words = message.split(' ');
        title = words.slice(0, 4).join(' ');
      }
    }

    logger.logBusiness('chatbot_query', {
      userId: req.user._id,
      messageLength: message.length,
      responseLength: response.length,
      titleGenerated: !!title,
    });

    res.json({
      success: true,
      data: {
        response,
        title,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.logError(error, req);
    
    // Handle specific Gemini API errors
    if (error.message.includes('Rate limit') || error.message.includes('429')) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again in a moment.',
      });
    }
    
    if (error.message.includes('503') || error.message.includes('Service unavailable')) {
      return res.status(503).json({
        success: false,
        message: 'AI service temporarily unavailable. Please try again.',
      });
    }
    
    if (error.message.includes('API key')) {
      return res.status(500).json({
        success: false,
        message: 'AI service configuration error. Please contact support.',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to get AI response. Please try again.',
    });
  }
};

// @desc    Get financial insights
// @route   POST /api/v1/chatbot/insights
// @access  Private
const getFinancialInsights = async (req, res) => {
  try {
    const userContext = await getUserFinancialContext(req.user._id);
    
    const insights = await geminiModule.generateFinancialInsights(
      userContext.transactions,
      userContext.budgets,
      userContext.goals
    );

    logger.logBusiness('financial_insights', {
      userId: req.user._id,
    });

    res.json({
      success: true,
      data: {
        insights,
        context: userContext,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({
      success: false,
      message: 'Failed to generate financial insights',
    });
  }
};

// @desc    Get budget advice
// @route   POST /api/v1/chatbot/budget-advice
// @access  Private
const getBudgetAdvice = async (req, res) => {
  try {
    const { income, expenses, goals } = req.body;

    if (!income || !expenses) {
      return res.status(400).json({
        success: false,
        message: 'Income and expenses are required',
      });
    }

    const advice = await geminiModule.getBudgetAdvice(income, expenses, goals || []);

    logger.logBusiness('budget_advice', {
      userId: req.user._id,
      income,
      expenses,
    });

    res.json({
      success: true,
      data: {
        advice,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({
      success: false,
      message: 'Failed to get budget advice',
    });
  }
};

// @desc    Get investment advice
// @route   POST /api/v1/chatbot/investment-advice
// @access  Private
const getInvestmentAdvice = async (req, res) => {
  try {
    const { riskProfile, investmentAmount, timeHorizon } = req.body;

    if (!riskProfile || !investmentAmount || !timeHorizon) {
      return res.status(400).json({
        success: false,
        message: 'Risk profile, investment amount, and time horizon are required',
      });
    }

    const advice = await geminiModule.getInvestmentAdvice(
      riskProfile,
      investmentAmount,
      timeHorizon
    );

    logger.logBusiness('investment_advice', {
      userId: req.user._id,
      riskProfile,
      investmentAmount,
      timeHorizon,
    });

    res.json({
      success: true,
      data: {
        advice,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({
      success: false,
      message: 'Failed to get investment advice',
    });
  }
};

// @desc    Analyze stock sentiment
// @route   POST /api/v1/chatbot/stock-sentiment
// @access  Private
const analyzeStockSentiment = async (req, res) => {
  try {
    const { stockSymbol, newsData } = req.body;

    if (!stockSymbol || !newsData || !Array.isArray(newsData)) {
      return res.status(400).json({
        success: false,
        message: 'Stock symbol and news data array are required',
      });
    }

    const sentiment = await geminiModule.analyzeStockSentiment(stockSymbol, newsData);

    logger.logBusiness('stock_sentiment_analysis', {
      userId: req.user._id,
      stockSymbol,
      newsCount: newsData.length,
    });

    res.json({
      success: true,
      data: {
        stockSymbol,
        sentiment,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({
      success: false,
      message: 'Failed to analyze stock sentiment',
    });
  }
};

// @desc    Categorize transaction
// @route   POST /api/v1/chatbot/categorize-transaction
// @access  Private
const categorizeTransaction = async (req, res) => {
  try {
    const { description, amount, type } = req.body;

    if (!description || !amount || !type) {
      return res.status(400).json({
        success: false,
        message: 'Description, amount, and type are required',
      });
    }

    const categorization = await geminiModule.categorizeTransaction(description, amount, type);

    logger.logBusiness('transaction_categorization', {
      userId: req.user._id,
      description: description.substring(0, 50),
      amount,
      type,
      category: categorization.category,
      confidence: categorization.confidence,
    });

    res.json({
      success: true,
      data: {
        categorization,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({
      success: false,
      message: 'Failed to categorize transaction',
    });
  }
};

// @desc    Predict stock price
// @route   POST /api/v1/chatbot/stock-prediction
// @access  Private
const predictStockPrice = async (req, res) => {
  try {
    const { stockSymbol, historicalData } = req.body;

    if (!stockSymbol || !historicalData || !Array.isArray(historicalData)) {
      return res.status(400).json({
        success: false,
        message: 'Stock symbol and historical data array are required',
      });
    }

    const prediction = await geminiModule.predictStockPrice(stockSymbol, historicalData);

    logger.logBusiness('stock_prediction', {
      userId: req.user._id,
      stockSymbol,
      dataPoints: historicalData.length,
    });

    res.json({
      success: true,
      data: {
        stockSymbol,
        prediction,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({
      success: false,
      message: 'Failed to predict stock price',
    });
  }
};

// @desc    Save chat history
// @route   POST /api/v1/chatbot/save-chat
// @access  Private
const saveChatHistory = async (req, res) => {
  try {
    const { title, messages, promptCount, chatId } = req.body;

    // If chatId is provided, check if it's a valid ObjectId or a timestamp
    if (chatId) {
      let chat;
      
      // Check if chatId is a valid ObjectId
      if (mongoose.Types.ObjectId.isValid(chatId)) {
        chat = await ChatHistory.findOne({ _id: chatId, user: req.user._id });
      } else {
        // If not a valid ObjectId, it's a timestamp, so we need to find by a custom field
        // We'll use a timestamp field to store the original timestamp
        chat = await ChatHistory.findOne({ user: req.user._id, timestamp: chatId });
      }
      
      if (chat) {
        // Update existing chat
        chat.title = title;
        chat.messages = messages;
        chat.promptCount = promptCount;
        await chat.save();

        logger.logBusiness('chat_history_updated', {
          userId: req.user._id,
          chatId: chat._id,
          messageCount: messages.length,
        });

        return res.json({
          success: true,
          data: chat,
        });
      }
    }

    // Create new chat history
    const chatHistory = await ChatHistory.create({
      user: req.user._id,
      title,
      messages,
      promptCount,
      timestamp: chatId || Date.now().toString() // Store the original timestamp
    });

    logger.logBusiness('chat_history_created', {
      userId: req.user._id,
      chatId: chatHistory._id,
      messageCount: messages.length,
    });

    res.status(201).json({
      success: true,
      data: chatHistory,
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({
      success: false,
      message: 'Failed to save chat history',
    });
  }
};

// @desc    Get user's chat history
// @route   GET /api/v1/chatbot/chat-history
// @access  Private
const getChatHistory = async (req, res) => {
  try {
    const chatHistory = await ChatHistory.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .limit(5);

    logger.logBusiness('chat_history_retrieved', {
      userId: req.user._id,
      chatCount: chatHistory.length,
    });

    res.json({
      success: true,
      data: chatHistory,
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({
      success: false,
      message: 'Failed to get chat history',
    });
  }
};

// @desc    Delete chat history
// @route   DELETE /api/v1/chatbot/chat-history/:id
// @access  Private
const deleteChatHistory = async (req, res) => {
  try {
    const { id } = req.params;
    let chat;
    
    // Check if id is a valid ObjectId
    if (mongoose.Types.ObjectId.isValid(id)) {
      chat = await ChatHistory.findOne({ _id: id, user: req.user._id });
    } else {
      // If not a valid ObjectId, find by timestamp
      chat = await ChatHistory.findOne({ user: req.user._id, timestamp: id });
    }
    
    if (!chat) {
      return res.status(404).json({
        success: false,
        message: 'Chat not found',
      });
    }

    await chat.deleteOne();

    logger.logBusiness('chat_history_deleted', {
      userId: req.user._id,
      chatId: chat._id,
    });

    res.json({
      success: true,
      message: 'Chat deleted successfully',
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({
      success: false,
      message: 'Failed to delete chat history',
    });
  }
};

// @desc    Clear all chat history for user
// @route   DELETE /api/v1/chatbot/chat-history
// @access  Private
const clearChatHistory = async (req, res) => {
  try {
    const result = await ChatHistory.deleteMany({ user: req.user._id });

    logger.logBusiness('chat_history_cleared', {
      userId: req.user._id,
      deletedCount: result.deletedCount,
    });

    res.json({
      success: true,
      message: 'All chat history cleared',
    });
  } catch (error) {
    logger.logError(error, req);
    res.status(500).json({
      success: false,
      message: 'Failed to clear chat history',
    });
  }
};

// Helper function to get user's financial context
const getUserFinancialContext = async (userId) => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    // Get dates for past 3 months
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);
    const twoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1);
    const oneMonthAgo = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    const endOfThreeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 0);
    const endOfTwoMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 1, 0);
    const endOfOneMonthAgo = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get all transactions
    const allTransactions = await Transaction.find({ user: userId });
    
    // Get current month transactions
    const currentMonthTransactions = await Transaction.find({
      user: userId,
      date: { $gte: startOfMonth, $lte: endOfMonth },
    }).sort({ date: -1 });
    
    // Get past months transactions
    const threeMonthsAgoTransactions = await Transaction.find({
      user: userId,
      date: { $gte: threeMonthsAgo, $lte: endOfThreeMonthsAgo },
    });
    
    const twoMonthsAgoTransactions = await Transaction.find({
      user: userId,
      date: { $gte: twoMonthsAgo, $lte: endOfTwoMonthsAgo },
    });
    
    const oneMonthAgoTransactions = await Transaction.find({
      user: userId,
      date: { $gte: oneMonthAgo, $lte: endOfOneMonthAgo },
    });

    // Calculate income and expenses
    const calculateFinancials = (transactions) => {
      const income = transactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0);
      
      const expenses = transactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0);
      
      return { income, expenses };
    };

    const allFinancials = calculateFinancials(allTransactions);
    const currentMonthFinancials = calculateFinancials(currentMonthTransactions);
    const threeMonthsAgoFinancials = calculateFinancials(threeMonthsAgoTransactions);
    const twoMonthsAgoFinancials = calculateFinancials(twoMonthsAgoTransactions);
    const oneMonthAgoFinancials = calculateFinancials(oneMonthAgoTransactions);

    const topCategories = await Transaction.aggregate([
      {
        $match: {
          user: userId,
          date: { $gte: startOfMonth, $lte: endOfMonth },
          type: 'expense',
        },
      },
      {
        $group: {
          _id: '$category',
          total: { $sum: '$amount' },
        },
      },
      {
        $sort: { total: -1 },
      },
      {
        $limit: 5,
      },
    ]);

    // Get active budgets
    const budgets = await Budget.find({
      user: userId,
      status: 'active',
      startDate: { $lte: endOfMonth },
      endDate: { $gte: startOfMonth },
    });

    const overBudgetCount = budgets.filter(b => b.spentAmount > b.totalAmount).length;
    const avgUtilization = budgets.length > 0 ? 
      budgets.reduce((sum, b) => sum + (b.spentAmount / b.totalAmount * 100), 0) / budgets.length : 0;

    // Get active goals
    const goals = await FinancialGoal.find({
      user: userId,
      status: 'active',
    });

    const totalTarget = goals.reduce((sum, g) => sum + g.targetAmount, 0);
    const avgProgress = goals.length > 0 ?
      goals.reduce((sum, g) => sum + g.progressPercentage, 0) / goals.length : 0;

    // Get paper trading portfolio data
    let tradingData = {
      hasAccount: false,
      walletBalance: 0,
      totalValue: 0,
      totalPnL: 0,
      holdingsCount: 0,
      holdings: [],
      pendingOrders: 0,
      executedOrders: 0,
      watchlistCount: 0,
      sectorAllocation: [],
      tradingStats: {
        totalTrades: 0,
        successfulTrades: 0,
        winRate: 0,
        bestTrade: null,
        worstTrade: null,
      },
    };

    try {
      const tradingAccount = await TradingAccount.findOne({ user: userId }).populate('holdings.stock');
      
      if (tradingAccount) {
        // Update holding prices to get latest data
        await tradingAccount.updateHoldingPrices();
        
        // Calculate unrealized P&L from holdings
        const unrealizedPnL = tradingAccount.holdings.reduce((sum, h) => sum + h.unrealizedPnL, 0);
        
        tradingData = {
          hasAccount: true,
          walletBalance: tradingAccount.walletBalance,
          totalValue: tradingAccount.totalValue,
          totalPnL: tradingAccount.totalPnL + unrealizedPnL, // Include unrealized P&L
          realizedPnL: tradingAccount.totalPnL,
          unrealizedPnL: unrealizedPnL,
          holdingsCount: tradingAccount.holdings.length,
          holdings: tradingAccount.holdings.map(h => ({
            symbol: h.symbol,
            quantity: h.quantity,
            averagePrice: h.averagePrice,
            currentPrice: h.currentPrice,
            marketValue: h.marketValue,
            unrealizedPnL: h.unrealizedPnL,
            pnlPercentage: h.pnlPercentage,
            sector: h.sector,
          })),
          pendingOrders: tradingAccount.orders.filter(o => o.status === 'PENDING').length,
          executedOrders: tradingAccount.orders.filter(o => o.status === 'EXECUTED').length,
          watchlistCount: tradingAccount.watchlist.length,
          sectorAllocation: await tradingAccount.getSectorAllocation(),
          tradingStats: {
            totalTrades: tradingAccount.tradingStats.totalTrades || 0,
            successfulTrades: tradingAccount.tradingStats.successfulTrades || 0,
            winRate: tradingAccount.tradingStats.winRate || 0,
            bestTrade: tradingAccount.tradingStats.bestTrade,
            worstTrade: tradingAccount.tradingStats.worstTrade,
            totalVolume: tradingAccount.tradingStats.totalVolume || 0,
          },
        };
      }
    } catch (error) {
      logger.error('Error fetching trading account data:', error);
    }

    // Get recurring transactions (subscriptions, bills, etc.)
    let recurringData = {
      count: 0,
      activeCount: 0,
      totalMonthlyExpenses: 0,
      totalMonthlyIncome: 0,
      expenses: [],
      income: [],
    };

    try {
      const recurringTransactions = await RecurringTransaction.find({
        user: userId,
        isActive: true,
      });

      const recurringExpenses = recurringTransactions.filter(r => r.type === 'expense');
      const recurringIncome = recurringTransactions.filter(r => r.type === 'income');

      // Calculate monthly equivalent amounts
      const getMonthlyAmount = (amount, frequency) => {
        switch (frequency) {
          case 'daily': return amount * 30;
          case 'weekly': return amount * 4;
          case 'monthly': return amount;
          case 'yearly': return amount / 12;
          default: return amount;
        }
      };

      const totalMonthlyExpenses = recurringExpenses.reduce(
        (sum, r) => sum + getMonthlyAmount(r.amount, r.frequency), 0
      );

      const totalMonthlyIncome = recurringIncome.reduce(
        (sum, r) => sum + getMonthlyAmount(r.amount, r.frequency), 0
      );

      recurringData = {
        count: recurringTransactions.length,
        activeCount: recurringTransactions.length,
        totalMonthlyExpenses: Math.round(totalMonthlyExpenses),
        totalMonthlyIncome: Math.round(totalMonthlyIncome),
        expenses: recurringExpenses.map(r => ({
          description: r.description,
          amount: r.amount,
          frequency: r.frequency,
          category: r.category,
          monthlyEquivalent: Math.round(getMonthlyAmount(r.amount, r.frequency)),
        })),
        income: recurringIncome.map(r => ({
          description: r.description,
          amount: r.amount,
          frequency: r.frequency,
          category: r.category,
          monthlyEquivalent: Math.round(getMonthlyAmount(r.amount, r.frequency)),
        })),
      };
    } catch (error) {
      logger.error('Error fetching recurring transactions:', error);
    }

    return {
      transactions: {
        count: currentMonthTransactions.length,
        totalIncome: currentMonthFinancials.income,
        totalExpenses: currentMonthFinancials.expenses,
        topCategories: topCategories.map(c => c._id),
      },
      budgets: {
        count: budgets.length,
        activeCount: budgets.length,
        overBudgetCount,
        avgUtilization: Math.round(avgUtilization),
      },
      goals: {
        count: goals.length,
        activeCount: goals.length,
        totalTarget,
        avgProgress: Math.round(avgProgress),
      },
      recurring: recurringData,
      trading: tradingData,
      historicalData: {
        allTime: {
          income: allFinancials.income,
          expenses: allFinancials.expenses,
        },
        threeMonthsAgo: {
          income: threeMonthsAgoFinancials.income,
          expenses: threeMonthsAgoFinancials.expenses,
        },
        twoMonthsAgo: {
          income: twoMonthsAgoFinancials.income,
          expenses: twoMonthsAgoFinancials.expenses,
        },
        oneMonthAgo: {
          income: oneMonthAgoFinancials.income,
          expenses: oneMonthAgoFinancials.expenses,
        },
        currentMonth: {
          income: currentMonthFinancials.income,
          expenses: currentMonthFinancials.expenses,
        },
      },
    };
  } catch (error) {
    logger.error('Error getting user financial context:', error);
    return {
      transactions: { count: 0, totalIncome: 0, totalExpenses: 0, topCategories: [] },
      budgets: { count: 0, activeCount: 0, overBudgetCount: 0, avgUtilization: 0 },
      goals: { count: 0, activeCount: 0, totalTarget: 0, avgProgress: 0 },
      recurring: {
        count: 0,
        activeCount: 0,
        totalMonthlyExpenses: 0,
        totalMonthlyIncome: 0,
        expenses: [],
        income: [],
      },
      trading: {
        hasAccount: false,
        walletBalance: 0,
        totalValue: 0,
        totalPnL: 0,
        holdingsCount: 0,
        holdings: [],
        pendingOrders: 0,
        executedOrders: 0,
        watchlistCount: 0,
        sectorAllocation: [],
        tradingStats: { totalTrades: 0, successfulTrades: 0, winRate: 0, bestTrade: null, worstTrade: null },
      },
      historicalData: {
        allTime: { income: 0, expenses: 0 },
        threeMonthsAgo: { income: 0, expenses: 0 },
        twoMonthsAgo: { income: 0, expenses: 0 },
        oneMonthAgo: { income: 0, expenses: 0 },
        currentMonth: { income: 0, expenses: 0 },
      },
    };
  }
};

// Helper function to enhance message with user context
const enhanceMessageWithContext = (message, context) => {
  const lowerMessage = message.toLowerCase();
  
  // Add relevant context based on message content
  if (lowerMessage.includes('budget') || lowerMessage.includes('spending')) {
    let recurringInfo = '';
    if (context.recurring.count > 0) {
      recurringInfo = ` I have ${context.recurring.activeCount} recurring transactions: ${context.recurring.totalMonthlyExpenses > 0 ? `monthly recurring expenses ₹${context.recurring.totalMonthlyExpenses.toLocaleString()}` : ''}${context.recurring.totalMonthlyIncome > 0 ? `, monthly recurring income ₹${context.recurring.totalMonthlyIncome.toLocaleString()}` : ''}.`;
    }
    return `${message}\n\nMy current financial situation: Monthly income ₹${context.transactions.totalIncome.toLocaleString()}, expenses ₹${context.transactions.totalExpenses.toLocaleString()}, with ${context.budgets.overBudgetCount} categories over budget.${recurringInfo} All-time income: ₹${context.historicalData.allTime.income.toLocaleString()}, all-time expenses: ₹${context.historicalData.allTime.expenses.toLocaleString()}.`;
  }
  
  if (lowerMessage.includes('income') || lowerMessage.includes('expense')) {
    return `${message}\n\nMy financial history: Current month - Income: ₹${context.historicalData.currentMonth.income.toLocaleString()}, Expenses: ₹${context.historicalData.currentMonth.expenses.toLocaleString()}. Previous month - Income: ₹${context.historicalData.oneMonthAgo.income.toLocaleString()}, Expenses: ₹${context.historicalData.oneMonthAgo.expenses.toLocaleString()}. All-time - Income: ₹${context.historicalData.allTime.income.toLocaleString()}, Expenses: ₹${context.historicalData.allTime.expenses.toLocaleString()}.`;
  }
  
  if (lowerMessage.includes('trend') || lowerMessage.includes('history') || lowerMessage.includes('past')) {
    return `${message}\n\nMy financial trends: 
    - 3 months ago: Income ₹${context.historicalData.threeMonthsAgo.income.toLocaleString()}, Expenses ₹${context.historicalData.threeMonthsAgo.expenses.toLocaleString()}
    - 2 months ago: Income ₹${context.historicalData.twoMonthsAgo.income.toLocaleString()}, Expenses ₹${context.historicalData.twoMonthsAgo.expenses.toLocaleString()}
    - 1 month ago: Income ₹${context.historicalData.oneMonthAgo.income.toLocaleString()}, Expenses ₹${context.historicalData.oneMonthAgo.expenses.toLocaleString()}
    - Current month: Income ₹${context.historicalData.currentMonth.income.toLocaleString()}, Expenses ₹${context.historicalData.currentMonth.expenses.toLocaleString()}`;
  }
  
  if (lowerMessage.includes('goal') || lowerMessage.includes('save')) {
    return `${message}\n\nI have ${context.goals.activeCount} active financial goals with an average progress of ${context.goals.avgProgress}%.`;
  }
  
  if (lowerMessage.includes('category') || lowerMessage.includes('categorize')) {
    return `${message}\n\nMy top spending categories are: ${context.transactions.topCategories.join(', ')}.`;
  }
  
  // Add recurring expenses context for subscription and bill queries
  if (lowerMessage.includes('subscription') || lowerMessage.includes('recurring') || 
      lowerMessage.includes('bill') || lowerMessage.includes('monthly payment')) {
    if (context.recurring.count > 0) {
      const topExpenses = context.recurring.expenses
        .sort((a, b) => b.monthlyEquivalent - a.monthlyEquivalent)
        .slice(0, 5)
        .map(r => `${r.description} (₹${r.monthlyEquivalent.toLocaleString()}/${r.frequency === 'monthly' ? 'month' : r.frequency})`)
        .join(', ');
      
      return `${message}\n\nMy recurring transactions: Total monthly recurring expenses ₹${context.recurring.totalMonthlyExpenses.toLocaleString()}, monthly recurring income ₹${context.recurring.totalMonthlyIncome.toLocaleString()}. I have ${context.recurring.activeCount} active recurring transactions${topExpenses ? `: ${topExpenses}` : ''}.`;
    } else {
      return `${message}\n\nNote: I don't have any recurring transactions set up yet.`;
    }
  }
  
  // Add trading/portfolio context for investment and stock queries
  if (lowerMessage.includes('stock') || lowerMessage.includes('invest') || lowerMessage.includes('trade') || 
      lowerMessage.includes('portfolio') || lowerMessage.includes('holding') || lowerMessage.includes('share')) {
    if (context.trading.hasAccount) {
      const topHoldings = context.trading.holdings
        .sort((a, b) => b.marketValue - a.marketValue)
        .slice(0, 5)
        .map(h => `${h.symbol} (₹${h.marketValue.toLocaleString()}, P&L: ${h.pnlPercentage.toFixed(2)}%)`)
        .join(', ');
      
      const sectorInfo = context.trading.sectorAllocation
        .sort((a, b) => b.percentage - a.percentage)
        .slice(0, 3)
        .map(s => `${s.sector}: ${s.percentage.toFixed(1)}%`)
        .join(', ');
      
      return `${message}\n\nMy paper trading portfolio: Wallet balance ₹${context.trading.walletBalance.toLocaleString()}, Total value ₹${context.trading.totalValue.toLocaleString()}, Total P&L ₹${context.trading.totalPnL.toLocaleString()} (Realized: ₹${context.trading.realizedPnL.toLocaleString()}, Unrealized: ₹${context.trading.unrealizedPnL.toLocaleString()}). I have ${context.trading.holdingsCount} holdings${topHoldings ? `: ${topHoldings}` : ''}. Sector allocation: ${sectorInfo || 'No allocations yet'}. Trading stats: ${context.trading.tradingStats.totalTrades} trades, ${context.trading.tradingStats.winRate.toFixed(1)}% win rate${context.trading.tradingStats.bestTrade ? `, best trade: ${context.trading.tradingStats.bestTrade.symbol} (₹${context.trading.tradingStats.bestTrade.pnl.toLocaleString()})` : ''}.`;
    } else {
      return `${message}\n\nNote: I don't have a paper trading account yet.`;
    }
  }
  
  return message;
};

module.exports = {
  sendMessage,
  getFinancialInsights,
  getBudgetAdvice,
  getInvestmentAdvice,
  analyzeStockSentiment,
  categorizeTransaction,
  predictStockPrice,
  saveChatHistory,
  getChatHistory,
  deleteChatHistory,
  clearChatHistory,
};