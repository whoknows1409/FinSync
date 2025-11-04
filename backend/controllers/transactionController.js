const Transaction = require('../models/Transaction');
const RecurringTransaction = require('../models/RecurringTransaction');
const Activity = require('../models/Activity');
const Budget = require('../models/Budget');
const { syncBudgetCategories } = require('../utils/categorySync');

// Helper function to handle errors
const handleError = (res, error, message) => {
  console.error(message, error);
  res.status(500).json({ success: false, message: message || 'Server error' });
};

// Helper function to log activities
const logActivity = async (userId, action, type, category = null) => {
  try {
    // Include category in the action message if provided
    const actionMessage = category ? `${action} in category "${category}"` : action;
    
    await Activity.create({
      user: userId,
      action: actionMessage,
      type: type
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};

// @desc    Get all transactions for a user
// @route   GET /api/transactions
// @access  Private
exports.getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id })
      .sort({ date: -1 }); // Sort by date in descending order (newest first)

    res.json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    handleError(res, error, 'Failed to fetch transactions');
  }
};

// @desc    Add a new transaction
// @route   POST /api/transactions
// @access  Private
exports.addTransaction = async (req, res) => {
  try {
    const { type, amount, category, description, date, isRecurring, recurringId, aiCategorized } = req.body;

    // Validate required fields
    if (!type || !amount || !category || !description || !date) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    const transaction = await Transaction.create({
      user: req.user.id,
      type,
      amount: Number(amount),
      category,
      description,
      date: new Date(date),
      isRecurring: isRecurring || false,
      recurringId,
      aiCategorized: aiCategorized || false
    });

    // If this is an expense transaction, update the corresponding budget
    if (type === 'expense') {
      await updateBudgetForTransaction(req.user.id, category, new Date(date));
    }

    // Log activity with category
    await logActivity(req.user.id, 'Added transaction', 'transaction', category);

    // Synchronize budget categories after adding a transaction
    try {
      await syncBudgetCategories(req.user.id);
    } catch (syncError) {
      console.error('Category synchronization failed:', syncError);
      // Continue with the response even if sync fails
    }

    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: transaction
    });
  } catch (error) {
    handleError(res, error, 'Failed to add transaction');
  }
};

// Helper function to update budget when transactions are added, updated, or deleted
async function updateBudgetForTransaction(userId, category, transactionDate) {
  try {
    // Find all active budgets for the category where the transaction date falls within the budget period
    const budgets = await Budget.find({
      user: userId,
      category: category,
      status: 'active',
      startDate: { $lte: transactionDate },
      endDate: { $gte: transactionDate }
    });

    // Update spent amount for each relevant budget
    for (const budget of budgets) {
      await budget.updateSpentAmount();
    }
  } catch (error) {
    console.error('Failed to update budget for transaction:', error);
    // We don't throw here because we don't want to fail the transaction operation
  }
}

// @desc    Update a transaction
// @route   PUT /api/transactions/:id
// @access  Private
exports.updateTransaction = async (req, res) => {
  try {
    let transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Make sure transaction belongs to user
    if (transaction.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Save the original category and type before updating
    const originalCategory = transaction.category;
    const originalType = transaction.type;
    const originalDate = transaction.date;

    // Convert amount to number if provided
    if (req.body.amount) {
      req.body.amount = Number(req.body.amount);
    }

    // Convert date to Date object if provided
    if (req.body.date) {
      req.body.date = new Date(req.body.date);
    }

    transaction = await Transaction.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    // If this is or was an expense transaction, update the corresponding budget(s)
    if (originalType === 'expense' || transaction.type === 'expense') {
      // If category changed, we need to update both old and new category budgets
      if (originalType === 'expense' && originalCategory !== transaction.category) {
        await updateBudgetForTransaction(req.user.id, originalCategory, originalDate);
      }
      // Update the budget for the new category/date
      if (transaction.type === 'expense') {
        await updateBudgetForTransaction(req.user.id, transaction.category, transaction.date);
      }
    }

    // Log activity with category
    await logActivity(req.user.id, 'Updated transaction', 'transaction', transaction.category);

    // Synchronize budget categories after updating a transaction
    try {
      await syncBudgetCategories(req.user.id);
    } catch (syncError) {
      console.error('Category synchronization failed:', syncError);
      // Continue with the response even if sync fails
    }

    res.json({
      success: true,
      message: 'Transaction updated successfully',
      data: transaction
    });
  } catch (error) {
    handleError(res, error, 'Failed to update transaction');
  }
};

// @desc    Delete a transaction
// @route   DELETE /api/transactions/:id
// @access  Private
exports.deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id);

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Make sure transaction belongs to user
    if (transaction.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Save category, type, and date before deleting
    const { category, type, date } = transaction;

    await Transaction.deleteOne({ _id: req.params.id });

    // If this was an expense transaction, update the corresponding budget
    if (type === 'expense') {
      await updateBudgetForTransaction(req.user.id, category, date);
    }

    // Log activity with category
    await logActivity(req.user.id, 'Deleted transaction', 'transaction', category);

    // Synchronize budget categories after deleting a transaction
    try {
      await syncBudgetCategories(req.user.id);
    } catch (syncError) {
      console.error('Category synchronization failed:', syncError);
      // Continue with the response even if sync fails
    }

    res.json({
      success: true,
      message: 'Transaction deleted successfully',
      data: {}
    });
  } catch (error) {
    handleError(res, error, 'Failed to delete transaction');
  }
};

// @desc    Get all recurring transactions for a user
// @route   GET /api/transactions/recurring
// @access  Private
exports.getRecurringTransactions = async (req, res) => {
  try {
    const recurringTransactions = await RecurringTransaction.find({ user: req.user.id });

    res.json({
      success: true,
      count: recurringTransactions.length,
      data: recurringTransactions
    });
  } catch (error) {
    handleError(res, error, 'Failed to fetch recurring transactions');
  }
};

// @desc    Add a new recurring transaction
// @route   POST /api/transactions/recurring
// @access  Private
exports.addRecurringTransaction = async (req, res) => {
  try {
    const { type, amount, category, description, frequency, startDate, endDate, isActive } = req.body;

    // Validate required fields
    if (!type || !amount || !category || !description || !frequency || !startDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    const recurringTransaction = await RecurringTransaction.create({
      user: req.user.id,
      type,
      amount: Number(amount),
      category,
      description,
      frequency,
      startDate: new Date(startDate),
      endDate: endDate ? new Date(endDate) : undefined,
      isActive: isActive !== undefined ? isActive : true
    });

    // Create initial transaction if start date is today or in the past and isActive is true
    if (isActive) {
      const today = new Date();
      const start = new Date(startDate);
      
      // For start date today, use current time
      if (start.toDateString() === today.toDateString()) {
        start.setHours(today.getHours(), today.getMinutes(), today.getSeconds(), today.getMilliseconds());
      }

      if (start <= today) {
        await Transaction.create({
          user: req.user.id,
          type,
          amount: Number(amount),
          category,
          description,
          date: start,
          isRecurring: true,
          recurringId: recurringTransaction._id
        });

        // Update last processed date
        recurringTransaction.lastProcessed = start;
        await recurringTransaction.save();
      }
    }

    // If this is a recurring expense transaction, update the corresponding budget
    if (type === 'expense') {
      await updateBudgetForTransaction(req.user.id, category, new Date(startDate));
    }

    // Log activity with category
    await logActivity(req.user.id, 'Added recurring transaction', 'transaction', category);

    res.status(201).json({
      success: true,
      message: 'Recurring transaction created successfully',
      data: recurringTransaction
    });
  } catch (error) {
    handleError(res, error, 'Failed to add recurring transaction');
  }
};

// @desc    Update a recurring transaction
// @route   PUT /api/transactions/recurring/:id
// @access  Private
exports.updateRecurringTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if the ID is a valid MongoDB ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID format'
      });
    }

    // Get the user ID from the authenticated user
    const userId = req.user.id || req.user._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Convert amount to number if provided
    if (req.body.amount) {
      req.body.amount = Number(req.body.amount);
    }

    // Convert dates to Date objects if provided
    if (req.body.startDate) {
      req.body.startDate = new Date(req.body.startDate);
    }
    if (req.body.endDate) {
      req.body.endDate = new Date(req.body.endDate);
    }

    // Find the recurring transaction and verify ownership
    let recurringTransaction = await RecurringTransaction.findOne({ 
      _id: id, 
      user: userId 
    });

    if (!recurringTransaction) {
      return res.status(404).json({
        success: false,
        message: 'Recurring transaction not found or you do not have permission to update it'
      });
    }

    // Update the recurring transaction
    recurringTransaction = await RecurringTransaction.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true
    });

    // Log activity with category
    await logActivity(userId, 'Updated recurring transaction', 'transaction', recurringTransaction.category);

    res.json({
      success: true,
      message: 'Recurring transaction updated successfully',
      data: recurringTransaction
    });
  } catch (error) {
    handleError(res, error, 'Failed to update recurring transaction');
  }
};

// @desc    Delete a recurring transaction
// @route   DELETE /api/transactions/recurring/:id
// @access  Private
exports.deleteRecurringTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if the ID is a valid MongoDB ObjectId
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID format'
      });
    }

    // Get the user ID from the authenticated user
    const userId = req.user.id || req.user._id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Find the recurring transaction and verify ownership
    const recurringTransaction = await RecurringTransaction.findOne({ 
      _id: id, 
      user: userId 
    });

    if (!recurringTransaction) {
      return res.status(404).json({
        success: false,
        message: 'Recurring transaction not found or you do not have permission to delete it'
      });
    }

    // Save category before deleting
    const { category } = recurringTransaction;

    // Delete the recurring transaction
    await RecurringTransaction.deleteOne({ _id: id });

    // Log activity with category
    await logActivity(userId, 'Deleted recurring transaction', 'transaction', category);

    res.json({
      success: true,
      message: 'Recurring transaction deleted successfully',
      data: {}
    });
  } catch (error) {
    console.error('Error in deleteRecurringTransaction:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete recurring transaction',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Process recurring transactions (generate transactions for due dates)
// @route   POST /api/transactions/recurring/process
// @access  Private
exports.processRecurringTransactions = async (req, res) => {
  try {
    const today = new Date();

    // Get all active recurring transactions for the user
    const recurringTransactions = await RecurringTransaction.find({
      user: req.user.id,
      isActive: true
    });

    let processedCount = 0;

    for (const recurring of recurringTransactions) {
      // Check if end date has passed
      if (recurring.endDate && new Date(recurring.endDate) < today) {
        // Deactivate if end date has passed
        recurring.isActive = false;
        await recurring.save();
        continue;
      }

      // Calculate next due date
      let nextDue = new Date(recurring.startDate);
      if (recurring.lastProcessed) {
        nextDue = new Date(recurring.lastProcessed);
      }

      // Generate all missed occurrences until today
      while (nextDue <= today) {
        // Create transaction
        await Transaction.create({
          user: req.user.id,
          type: recurring.type,
          amount: recurring.amount,
          category: recurring.category,
          description: recurring.description,
          date: new Date(nextDue),
          isRecurring: true,
          recurringId: recurring._id
        });

        // If this is an expense transaction, update the corresponding budget
        if (recurring.type === 'expense') {
          await updateBudgetForTransaction(req.user.id, recurring.category, new Date(nextDue));
        }

        // Update last processed date
        recurring.lastProcessed = new Date(nextDue);
        await recurring.save();

        processedCount++;

        // Calculate next occurrence based on frequency while preserving time
        switch (recurring.frequency) {
          case 'daily':
            nextDue.setDate(nextDue.getDate() + 1);
            break;
          case 'weekly':
            nextDue.setDate(nextDue.getDate() + 7);
            break;
          case 'monthly':
            nextDue.setMonth(nextDue.getMonth() + 1);
            break;
          case 'yearly':
            nextDue.setFullYear(nextDue.getFullYear() + 1);
            break;
        }
      }
    }

    // Log activity
    await logActivity(req.user.id, `Processed ${processedCount} recurring transactions`, 'transaction');

    res.json({
      success: true,
      message: `Processed ${processedCount} recurring transactions`,
      processedCount
    });
  } catch (error) {
    handleError(res, error, 'Failed to process recurring transactions');
  }
};

// @desc    Get transaction analysis
// @route   GET /api/transactions/analysis
// @access  Private
exports.getTransactionAnalysis = async (req, res) => {
  try {
    const transactions = await Transaction.find({ user: req.user.id });

    // Calculate totals by category
    const categoryTotals = transactions.reduce((acc, transaction) => {
      if (!acc[transaction.category]) {
        acc[transaction.category] = { income: 0, expense: 0 };
      }
      
      if (transaction.type === "income") {
        acc[transaction.category].income += transaction.amount;
      } else {
        acc[transaction.category].expense += transaction.amount;
      }
      
      return acc;
    }, {});

    // Convert to array and sort by total amount
    const categoryData = Object.entries(categoryTotals)
      .map(([category, totals]) => ({
        category,
        income: totals.income,
        expense: totals.expense,
        total: totals.income + totals.expense,
        net: totals.income - totals.expense
      }))
      .sort((a, b) => b.total - a.total);

    // Calculate overall totals
    const totalIncome = transactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
      
    const totalExpenses = transactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);
      
    const netAmount = totalIncome - totalExpenses;

    res.json({
      success: true,
      data: {
        categoryData,
        totals: {
          totalIncome,
          totalExpenses,
          netAmount
        }
      }
    });
  } catch (error) {
    handleError(res, error, 'Failed to get transaction analysis');
  }
};