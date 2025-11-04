const express = require('express');
const router = express.Router();
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const FinancialGoal = require('../models/FinancialGoal');
const TradingAccount = require('../models/TradingAccount');
const { protect } = require('../middleware/auth');
const {
  validatePagination,
  validateDateRange,
  handleValidationErrors,
} = require('../middleware/validation');
const geminiAPI = require('../utils/gemini');

// All analysis routes are protected
router.use(protect);

// @desc    Get AI-powered financial insights
// @route   GET /api/v1/analysis/ai-insights
// @access  Private
router.get('/ai-insights', validateDateRange, handleValidationErrors, async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    // Get transactions for the date range
    const transactions = await Transaction.find({
      user: req.user._id,
      date: { $gte: startDate, $lte: endDate },
    });

    // Get budgets
    const budgets = await Budget.find({
      user: req.user._id,
    });

    // Get financial goals
    const goals = await FinancialGoal.find({
      user: req.user._id,
    });

    // Calculate spending patterns
    const expenseBreakdown = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          type: 'expense',
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { totalAmount: -1 },
      },
    ]);

    // Calculate total income and expenses
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
    
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);

    // Get top merchants
    const topMerchants = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          type: 'expense',
          date: { $gte: startDate, $lte: endDate },
          merchant: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: '$merchant',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { totalAmount: -1 },
      },
      {
        $limit: 5,
      },
    ]);

    // Prepare data for Gemini API
    const financialData = {
      timePeriod: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      summary: {
        totalIncome,
        totalExpenses,
        netCashFlow: totalIncome - totalExpenses,
      },
      topExpenseCategories: expenseBreakdown.slice(0, 5),
      topMerchants,
      budgetCount: budgets.length,
      goalCount: goals.length,
    };

    // Use Gemini API to generate insights
    const insights = await geminiAPI.getFinancialInsights(financialData);

    res.json({
      success: true,
      data: {
        insights,
        financialData,
      },
    });
  } catch (error) {
    console.error('Get AI insights error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch AI insights',
    });
  }
});

// @desc    Detect recurring expenses
// @route   GET /api/v1/analysis/detect-recurring
// @access  Private
router.get('/detect-recurring', validateDateRange, handleValidationErrors, async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000); // 90 days
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    // Get expense transactions for the date range
    const transactions = await Transaction.find({
      user: req.user._id,
      type: 'expense',
      date: { $gte: startDate, $lte: endDate },
    }).sort({ date: 1 });

    // Prepare data for Gemini API
    const expensesData = transactions.map(t => ({
      description: t.description,
      amount: t.amount,
      category: t.category,
      date: t.date.toISOString(),
      merchant: t.merchant,
    }));

    // Use Gemini API to detect recurring expenses
    const recurringExpenses = await geminiAPI.detectRecurringExpenses(expensesData);

    res.json({
      success: true,
      data: {
        recurringExpenses,
      },
    });
  } catch (error) {
    console.error('Detect recurring expenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to detect recurring expenses',
    });
  }
});

// @desc    Get biggest expenses
// @route   GET /api/v1/analysis/biggest-expenses
// @access  Private
router.get('/biggest-expenses', validateDateRange, handleValidationErrors, async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    // Get top 10 expenses by amount
    const topExpenses = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          type: 'expense',
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $sort: { amount: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    // Prepare data for Gemini API
    const expensesData = topExpenses.map(t => ({
      description: t.description,
      amount: t.amount,
      category: t.category,
      date: t.date.toISOString(),
    }));

    // Use Gemini API to analyze these expenses
    const analysis = await geminiAPI.analyzeBigExpenses(expensesData);

    res.json({
      success: true,
      data: {
        topExpenses,
        analysis,
      },
    });
  } catch (error) {
    console.error('Get biggest expenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch biggest expenses',
    });
  }
});

// @desc    Get budget vs actual comparison
// @route   GET /api/v1/analysis/budget-vs-actual
// @access  Private
router.get('/budget-vs-actual', validateDateRange, handleValidationErrors, async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    // Get active budgets
    const budgets = await Budget.find({
      user: req.user._id,
      status: 'active',
    });

    // Prepare budget vs actual data
    const budgetComparison = [];
    
    for (const budget of budgets) {
      // Get transactions for this budget category
      const categoryTransactions = await Transaction.find({
        user: req.user._id,
        type: 'expense',
        category: budget.category,
        date: { $gte: startDate, $lte: endDate },
      });

      const actualSpent = categoryTransactions.reduce((sum, t) => sum + t.amount, 0);
      const variance = actualSpent - budget.totalAmount;
      const utilization = budget.totalAmount > 0 ? (actualSpent / budget.totalAmount) * 100 : 0;
      
      // Determine trend (simplified version - in real app would compare to previous periods)
      let trend = 'stable';
      if (utilization > 120) trend = 'increasing';
      if (utilization < 80) trend = 'decreasing';
      
      // Simple insights based on spending patterns
      const insights = [];
      if (utilization > 100) {
        insights.push(`You've exceeded your budget for ${budget.category} by ${(utilization - 100).toFixed(1)}%`);
      } else if (utilization > 80) {
        insights.push(`You're approaching your budget limit for ${budget.category}`);
      } else {
        insights.push(`You're doing well with ${budget.category} spending, staying within ${utilization.toFixed(1)}% of your budget`);
      }
      
      // Simple recommendations
      const recommendations = [];
      if (utilization > 100) {
        recommendations.push(`Consider reducing spending on ${budget.category} or increasing your budget allocation`);
        recommendations.push(`Review recent transactions to identify areas where you can cut back`);
      } else if (utilization < 50) {
        recommendations.push(`You have flexibility to increase spending on ${budget.category} or reallocate funds to other categories`);
      }
      
      // Suggested budget based on actual spending patterns
      const suggestedBudget = Math.round(actualSpent * 1.1); // Suggest 10% more than actual spent
      
      budgetComparison.push({
        category: budget.category,
        budgeted: budget.totalAmount,
        actual: actualSpent,
        variance,
        utilization,
        trend,
        insights,
        recommendations,
        suggestedBudget,
        isOverBudget: utilization > 100
      });
    }

    // Calculate summary statistics
    const totalBudgeted = budgetComparison.reduce((sum, item) => sum + item.budgeted, 0);
    const totalActual = budgetComparison.reduce((sum, item) => sum + item.actual, 0);
    const overallVariance = totalActual - totalBudgeted;
    const overBudgetCount = budgetComparison.filter(item => item.isOverBudget).length;
    const underBudgetCount = budgetComparison.filter(item => !item.isOverBudget).length;
    
    // Overall insight
    let overallInsight = '';
    if (overBudgetCount > underBudgetCount) {
      overallInsight = `You're exceeding your budget in ${overBudgetCount} categories. Review your spending to identify areas for improvement.`;
    } else if (underBudgetCount > overBudgetCount) {
      overallInsight = `Great job! You're staying within budget in ${underBudgetCount} categories. Consider reallocating unused funds to savings or other goals.`;
    } else {
      overallInsight = `You're balancing your budget across categories. Continue monitoring your spending to maintain financial stability.`;
    }
    
    // Overall recommendations
    const overallRecommendations = [];
    if (overallVariance > 0) {
      overallRecommendations.push(`Your total spending exceeds your budget by ₹${overallVariance.toLocaleString()}. Consider adjusting your budget allocations or reducing discretionary spending.`);
      overallRecommendations.push(`Review your largest over-budget categories first to make the biggest impact on reducing your spending.`);
    } else if (overallVariance < 0) {
      overallRecommendations.push(`You're saving ₹${Math.abs(overallVariance).toLocaleString()} compared to your budget. Consider increasing your savings rate or investing these extra funds.`);
      overallRecommendations.push(`Evaluate if any budget categories are consistently under-utilized and adjust your allocations accordingly.`);
    } else {
      overallRecommendations.push(`You're perfectly balancing your spending with your budget. Continue tracking your expenses regularly to maintain this discipline.`);
      overallRecommendations.push(`Consider setting up automatic savings transfers to make progress toward your financial goals.`);
    }

    // Prepare AI analysis data for Gemini API if needed
    // const comparisonData = {
    //   timePeriod: {
    //     startDate: startDate.toISOString(),
    //     endDate: endDate.toISOString(),
    //   },
    //   budgets: budgetComparison.map(b => ({
    //     category: b.category,
    //     budgetAmount: b.budgeted,
    //     actualSpent: b.actual,
    //     difference: b.variance,
    //     percentageUsed: b.utilization
    //   })),
    // };

    // Use Gemini API to analyze budget vs actual if needed
    // const geminiInsights = await geminiAPI.analyzeBudgetVsActual(comparisonData);

    res.json({
      success: true,
      data: {
        insights: budgetComparison,
        summary: {
          totalBudgeted,
          totalActual,
          overallVariance,
          overBudgetCount,
          underBudgetCount
        },
        overallInsight,
        overallRecommendations
      },
    });
  } catch (error) {
    console.error('Get budget vs actual error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch budget vs actual comparison',
    });
  }
});

// @desc    Get expense breakdown
// @route   GET /api/v1/analysis/expense-breakdown
// @access  Private
router.get('/expense-breakdown', validateDateRange, handleValidationErrors, async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    const breakdown = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          type: 'expense',
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
          avgAmount: { $avg: '$amount' },
        },
      },
      {
        $sort: { totalAmount: -1 },
      },
    ]);

    const totalExpenses = breakdown.reduce((sum, item) => sum + item.totalAmount, 0);

    // Calculate percentages
    const breakdownWithPercentages = breakdown.map(item => ({
      category: item._id,
      amount: item.totalAmount,
      count: item.count,
      avgAmount: Math.round(item.avgAmount * 100) / 100,
      percentage: totalExpenses > 0 ? Math.round((item.totalAmount / totalExpenses) * 100 * 100) / 100 : 0,
    }));

    res.json({
      success: true,
      data: {
        breakdown: breakdownWithPercentages,
        totalExpenses,
        period: { startDate, endDate },
      },
    });
  } catch (error) {
    console.error('Get expense breakdown error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expense breakdown',
    });
  }
});

// @desc    Get income vs expense trends
// @route   GET /api/v1/analysis/income-expense-trends
// @access  Private
router.get('/income-expense-trends', validateDateRange, handleValidationErrors, async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    const trends = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type',
          },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
    ]);

    // Group by month
    const monthlyData = {};
    trends.forEach(trend => {
      const monthKey = `${trend._id.year}-${String(trend._id.month).padStart(2, '0')}`;
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = {
          month: monthKey,
          income: 0,
          expense: 0,
          net: 0,
        };
      }
      monthlyData[monthKey][trend._id.type] = trend.totalAmount;
    });

    // Calculate net amounts
    Object.values(monthlyData).forEach(month => {
      month.net = month.income - month.expense;
    });

    const monthlyTrends = Object.values(monthlyData).sort((a, b) => a.month.localeCompare(b.month));

    res.json({
      success: true,
      data: {
        trends: monthlyTrends,
        period: { startDate, endDate },
      },
    });
  } catch (error) {
    console.error('Get income expense trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch income expense trends',
    });
  }
});

// @desc    Get savings growth
// @route   GET /api/v1/analysis/savings-growth
// @access  Private
router.get('/savings-growth', validateDateRange, handleValidationErrors, async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    // Get monthly income and expenses
    const monthlyData = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            type: '$type',
          },
          totalAmount: { $sum: '$amount' },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1 },
      },
    ]);

    // Calculate cumulative savings
    const monthlySavings = {};
    monthlyData.forEach(data => {
      const monthKey = `${data._id.year}-${String(data._id.month).padStart(2, '0')}`;
      if (!monthlySavings[monthKey]) {
        monthlySavings[monthKey] = {
          month: monthKey,
          income: 0,
          expense: 0,
          savings: 0,
        };
      }
      monthlySavings[monthKey][data._id.type] = data.totalAmount;
    });

    // Calculate monthly savings and cumulative savings
    let cumulativeSavings = 0;
    const savingsGrowth = Object.values(monthlySavings)
      .sort((a, b) => a.month.localeCompare(b.month))
      .map(month => {
        month.savings = month.income - month.expense;
        cumulativeSavings += month.savings;
        return {
          ...month,
          cumulativeSavings,
        };
      });

    res.json({
      success: true,
      data: {
        savingsGrowth,
        period: { startDate, endDate },
      },
    });
  } catch (error) {
    console.error('Get savings growth error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch savings growth',
    });
  }
});

// @desc    Get financial summary
// @route   GET /api/v1/analysis/summary
// @access  Private
router.get('/summary', validateDateRange, handleValidationErrors, async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    // Get transaction summary
    const transactionSummary = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: '$type',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
    ]);

    const totalIncome = transactionSummary.find(t => t._id === 'income')?.totalAmount || 0;
    const totalExpenses = transactionSummary.find(t => t._id === 'expense')?.totalAmount || 0;
    const netSavings = totalIncome - totalExpenses;
    const savingsRate = totalIncome > 0 ? (netSavings / totalIncome) * 100 : 0;

    // Get budget summary
    const budgetSummary = await Budget.getSummary(req.user._id, startDate, endDate);
    const budgetData = budgetSummary[0] || {};

    // Get goal summary
    const goalSummary = await FinancialGoal.getSummary(req.user._id);
    const goalData = goalSummary[0] || {};

    // Get trading summary
    const tradingAccount = await TradingAccount.findOne({ user: req.user._id });
    const tradingData = tradingAccount ? {
      portfolioValue: tradingAccount.totalValue,
      totalPnL: tradingAccount.totalPnL,
      winRate: tradingAccount.tradingStats.winRate,
    } : {
      portfolioValue: 0,
      totalPnL: 0,
      winRate: 0,
    };

    res.json({
      success: true,
      data: {
        transactions: {
          totalIncome,
          totalExpenses,
          netSavings,
          savingsRate: Math.round(savingsRate * 100) / 100,
        },
        budgets: budgetData,
        goals: goalData,
        trading: tradingData,
        period: { startDate, endDate },
      },
    });
  } catch (error) {
    console.error('Get financial summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch financial summary',
    });
  }
});

// @desc    Get category trends
// @route   GET /api/v1/analysis/category-trends
// @access  Private
router.get('/category-trends', validateDateRange, handleValidationErrors, async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
    const category = req.query.category;

    if (!category) {
      return res.status(400).json({
        success: false,
        message: 'Category parameter is required',
      });
    }

    const trends = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          category: category,
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: {
            year: { $year: '$date' },
            month: { $month: '$date' },
            week: { $week: '$date' },
          },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
          avgAmount: { $avg: '$amount' },
        },
      },
      {
        $sort: { '_id.year': 1, '_id.month': 1, '_id.week': 1 },
      },
    ]);

    res.json({
      success: true,
      data: {
        category,
        trends,
        period: { startDate, endDate },
      },
    });
  } catch (error) {
    console.error('Get category trends error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch category trends',
    });
  }
});

// @desc    Get spending patterns
// @route   GET /api/v1/analysis/spending-patterns
// @access  Private
router.get('/spending-patterns', validateDateRange, handleValidationErrors, async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    // Get spending by day of week
    const dayOfWeekSpending = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          type: 'expense',
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { $dayOfWeek: '$date' },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Get spending by hour of day
    const hourOfDaySpending = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          type: 'expense',
          date: { $gte: startDate, $lte: endDate },
        },
      },
      {
        $group: {
          _id: { $hour: '$date' },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { _id: 1 },
      },
    ]);

    // Get top merchants
    const topMerchants = await Transaction.aggregate([
      {
        $match: {
          user: req.user._id,
          type: 'expense',
          date: { $gte: startDate, $lte: endDate },
          merchant: { $exists: true, $ne: null },
        },
      },
      {
        $group: {
          _id: '$merchant',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
        },
      },
      {
        $sort: { totalAmount: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    res.json({
      success: true,
      data: {
        dayOfWeekSpending,
        hourOfDaySpending,
        topMerchants,
        period: { startDate, endDate },
      },
    });
  } catch (error) {
    console.error('Get spending patterns error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch spending patterns',
    });
  }
});

module.exports = router;
