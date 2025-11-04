const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');

// All user routes are protected
router.use(protect);

// @desc    Get user dashboard data
// @route   GET /api/v1/users/dashboard
// @access  Private
router.get('/dashboard', async (req, res) => {
  try {
    const Transaction = require('../models/Transaction');
    const Budget = require('../models/Budget');
    const FinancialGoal = require('../models/FinancialGoal');
    const TradingAccount = require('../models/TradingAccount');

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Compute current month totals via aggregation (faster, less memory)
    const [currentAgg] = await Promise.all([
      Transaction.aggregate([
        { $match: { user: req.user._id, date: { $gte: startOfMonth, $lte: endOfMonth } } },
        { $group: { _id: '$type', total: { $sum: '$amount' } } }
      ]),
    ]);

    let totalIncome = 0;
    let totalExpenses = 0;
    if (Array.isArray(currentAgg)) {
      for (const g of currentAgg) {
        if (g._id === 'income') totalIncome = g.total || 0;
        else if (g._id === 'expense') totalExpenses = g.total || 0;
      }
    }

    // If no current-month data, fallback to last 30 days using aggregation
    if (totalIncome === 0 && totalExpenses === 0) {
      const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const last30Agg = await Transaction.aggregate([
        { $match: { user: req.user._id, date: { $gte: last30, $lte: now } } },
        { $group: { _id: '$type', total: { $sum: '$amount' } } }
      ]);
      for (const g of last30Agg) {
        if (g._id === 'income') totalIncome = g.total || 0;
        else if (g._id === 'expense') totalExpenses = g.total || 0;
      }
    }

    // Last month for comparison
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    const lastMonthAgg = await Transaction.aggregate([
      { $match: { user: req.user._id, date: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
      { $group: { _id: '$type', total: { $sum: '$amount' } } }
    ]);

    let lastMonthIncome = 0;
    let lastMonthExpenses = 0;
    for (const g of lastMonthAgg) {
      if (g._id === 'income') lastMonthIncome = g.total || 0;
      else if (g._id === 'expense') lastMonthExpenses = g.total || 0;
    }

    // Calculate percentage changes
    const incomeChange = lastMonthIncome > 0 
      ? ((totalIncome - lastMonthIncome) / lastMonthIncome) * 100 
      : (totalIncome > 0 ? 100 : 0);
    const expensesChange = lastMonthExpenses > 0 
      ? ((totalExpenses - lastMonthExpenses) / lastMonthExpenses) * 100 
      : (totalExpenses > 0 ? 100 : 0);

    // Portfolio will be computed after we fetch tradingAccount in parallel

    // Get savings rate
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0;
    const lastMonthSavings = lastMonthIncome > 0 ? ((lastMonthIncome - lastMonthExpenses) / lastMonthIncome) * 100 : 0;
    const savingsRateChange = lastMonthSavings > 0 
      ? ((savingsRate - lastMonthSavings) / lastMonthSavings) * 100 
      : (savingsRate > 0 ? 100 : 0);

    // Run remaining queries in parallel
    const [recentTransactions, activeBudgets, activeGoals, tradingAccount] = await Promise.all([
      Transaction.find({ user: req.user._id })
        .select('amount category type date description')
        .sort({ date: -1 })
        .limit(5)
        .lean(),
      Budget.find({
        user: req.user._id,
        status: 'active',
        startDate: { $lte: endOfMonth },
        endDate: { $gte: startOfMonth },
      }).select('name category totalAmount period startDate endDate spentAmount status').lean(),
      FinancialGoal.find({ user: req.user._id, status: 'active' })
        .select('name targetAmount currentAmount targetDate progressPercentage status')
        .lean(),
      TradingAccount.findOne({ user: req.user._id }).select('totalValue tradingStats totalPnL').lean(),
    ]);
    const portfolioValue = tradingAccount ? tradingAccount.totalValue : 0;
    // Note: You may need to store historical portfolio values to calculate change
    const portfolioChange = 0; // TODO: Implement portfolio history tracking
    // Get notifications
    const notifications = [];
    
    // Budget exceeded notifications
    const overBudgetCategories = activeBudgets.filter(b => b.spentAmount > b.totalAmount);
    overBudgetCategories.forEach(budget => {
      notifications.push({
        type: 'warning',
        message: `Budget exceeded in ${budget.category} category`,
        timestamp: new Date(),
      });
    });

    // Goal progress notifications
    const nearDeadlineGoals = activeGoals.filter(g => {
      const daysRemaining = Math.ceil((g.targetDate - now) / (1000 * 60 * 60 * 24));
      return daysRemaining <= 30 && g.progressPercentage < 80;
    });
    nearDeadlineGoals.forEach(goal => {
      notifications.push({
        type: 'info',
        message: `${goal.name} goal is ${goal.progressPercentage}% complete with ${Math.ceil((goal.targetDate - now) / (1000 * 60 * 60 * 24))} days remaining`,
        timestamp: new Date(),
      });
    });

    res.json({
      success: true,
      data: {
        summary: {
          totalIncome,
          totalExpenses,
          netSavings: totalIncome - totalExpenses,
          savingsRate: Math.round(savingsRate * 100) / 100,
          portfolioValue,
          changes: {
            income: Math.round(incomeChange * 10) / 10,
            expenses: Math.round(expensesChange * 10) / 10,
            savingsRate: Math.round(savingsRateChange * 10) / 10,
            portfolio: portfolioChange,
          },
        },
        recentTransactions,
        activeBudgets,
        activeGoals,
        notifications,
      },
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data',
    });
  }
});

// @desc    Get user statistics
// @route   GET /api/v1/users/stats
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    const Transaction = require('../models/Transaction');
    const Budget = require('../models/Budget');
    const FinancialGoal = require('../models/FinancialGoal');
    const TradingAccount = require('../models/TradingAccount');

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear(), 11, 31);

    // Transaction statistics
    const totalTransactions = await Transaction.countDocuments({ user: req.user._id });
    const yearlyTransactions = await Transaction.countDocuments({
      user: req.user._id,
      date: { $gte: startOfYear, $lte: endOfYear },
    });

    // Budget statistics
    const totalBudgets = await Budget.countDocuments({ user: req.user._id });
    const activeBudgets = await Budget.countDocuments({
      user: req.user._id,
      status: 'active',
    });

    // Goal statistics
    const totalGoals = await FinancialGoal.countDocuments({ user: req.user._id });
    const completedGoals = await FinancialGoal.countDocuments({
      user: req.user._id,
      status: 'completed',
    });

    // Trading statistics
    const tradingAccount = await TradingAccount.findOne({ user: req.user._id });
    const tradingStats = tradingAccount ? {
      totalTrades: tradingAccount.tradingStats.totalTrades,
      winRate: tradingAccount.tradingStats.winRate,
      totalPnL: tradingAccount.totalPnL,
      portfolioValue: tradingAccount.totalValue,
    } : {
      totalTrades: 0,
      winRate: 0,
      totalPnL: 0,
      portfolioValue: 0,
    };

    res.json({
      success: true,
      data: {
        transactions: {
          total: totalTransactions,
          yearly: yearlyTransactions,
        },
        budgets: {
          total: totalBudgets,
          active: activeBudgets,
        },
        goals: {
          total: totalGoals,
          completed: completedGoals,
        },
        trading: tradingStats,
      },
    });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics',
    });
  }
});

module.exports = router;
