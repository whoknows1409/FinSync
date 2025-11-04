const Transaction = require('../models/Transaction');
const Transaction = require('../models/Transaction');
const RecurringTransaction = require('../models/RecurringTransaction');
const Budget = require('../models/Budget');

// Helper function to handle errors
const handleError = (res, error, message) => {
  console.error(message, error);
  res.status(500).json({ success: false, message: message || 'Server error' });
};

// @desc    Get comprehensive analysis data
// @route   GET /api/analysis
// @access  Private
exports.getAnalysis = async (req, res) => {
  try {
    // Get current month and year
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    // Get all transactions for the user
    const transactions = await Transaction.find({ user: req.user.id });
    
    // Get recurring transactions
    const recurringTransactions = await RecurringTransaction.find({ 
      user: req.user.id,
      isActive: true 
    });
    
    // Get budgets
    const budgets = await Budget.find({ user: req.user.id });
    
    // Filter current month transactions
    const currentMonthTransactions = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      return transactionDate.getMonth() === currentMonth && 
             transactionDate.getFullYear() === currentYear;
    });
    
    // Calculate current month expenses by category
    const currentMonthExpenses = currentMonthTransactions
      .filter(t => t.type === 'expense')
      .reduce((acc, transaction) => {
        if (!acc[transaction.category]) {
          acc[transaction.category] = 0;
        }
        acc[transaction.category] += transaction.amount;
        return acc;
      }, {});
    
    // Find biggest expense category for current month
    let biggestExpenseCategory = '';
    let biggestExpenseAmount = 0;
    
    Object.entries(currentMonthExpenses).forEach(([category, amount]) => {
      if (amount > biggestExpenseAmount) {
        biggestExpenseAmount = amount;
        biggestExpenseCategory = category;
      }
    });
    
    // Calculate budget vs actual
    const budgetVsActual = budgets.map(budget => {
      const actualSpending = currentMonthExpenses[budget.category] || 0;
      const percentage = (actualSpending / budget.amount) * 100;
      return {
        category: budget.category,
        budget: budget.amount,
        actual: actualSpending,
        percentage,
        isOver: actualSpending > budget.amount
      };
    });
    
    // Detect recurring expenses (simplified algorithm)
    const detectedRecurringExpenses = [];
    
    // Group transactions by category and description
    const transactionGroups = {};
    transactions
      .filter(t => t.type === 'expense' && !t.isRecurring)
      .forEach(transaction => {
        const key = `${transaction.category}_${transaction.description.toLowerCase()}`;
        if (!transactionGroups[key]) {
          transactionGroups[key] = [];
        }
        transactionGroups[key].push(transaction);
      });
    
    // Analyze groups for recurring patterns
    Object.values(transactionGroups).forEach(group => {
      if (group.length >= 3) { // Need at least 3 transactions to establish pattern
        // Sort by date
        group.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // Calculate average interval between transactions
        let totalInterval = 0;
        for (let i = 1; i < group.length; i++) {
          const prevDate = new Date(group[i-1].date);
          const currDate = new Date(group[i].date);
          totalInterval += (currDate - prevDate) / (1000 * 60 * 60 * 24); // days
        }
        
        const avgInterval = totalInterval / (group.length - 1);
        
        // Determine frequency based on average interval
        let frequency = '';
        if (avgInterval >= 27 && avgInterval <= 33) {
          frequency = 'monthly';
        } else if (avgInterval >= 6 && avgInterval <= 8) {
          frequency = 'weekly';
        } else if (avgInterval >= 27 && avgInterval <= 365) {
          frequency = 'yearly';
        }
        
        if (frequency) {
          // Calculate average amount
          const avgAmount = group.reduce((sum, t) => sum + t.amount, 0) / group.length;
          
          detectedRecurringExpenses.push({
            category: group[0].category,
            description: group[0].description,
            frequency,
            avgAmount,
            count: group.length
          });
        }
      }
    });
    
    // Get user-defined recurring expenses
    const userRecurringExpenses = recurringTransactions.map(rt => ({
      category: rt.category,
      description: rt.description,
      frequency: rt.frequency,
      amount: rt.amount,
      isUserDefined: true
    }));
    
    // Combine detected and user-defined recurring expenses
    const allRecurringExpenses = [...userRecurringExpenses, ...detectedRecurringExpenses];
    
    res.json({
      success: true,
      data: {
        biggestExpense: {
          category: biggestExpenseCategory,
          amount: biggestExpenseAmount
        },
        budgetVsActual,
        recurringExpenses: allRecurringExpenses,
        currentMonthExpenses
      }
    });
  } catch (error) {
    handleError(res, error, 'Failed to get analysis data');
  }
};