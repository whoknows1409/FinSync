const Budget = require('../models/Budget');
const Activity = require('../models/Activity');

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

// @desc    Get all budgets for a user
// @route   GET /api/budgets
// @access  Private
exports.getBudgets = async (req, res) => {
  try {
    // Add cache control headers to prevent browser caching
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    
    // Add a timestamp to force fresh data
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] Fetching budgets for user ${req.user.id}`);
    
    const budgets = await Budget.find({ user: req.user.id })
      .sort({ createdAt: -1 })
      .lean(); // Use lean() for better performance

    console.log(`[${timestamp}] Found ${budgets.length} budgets for user ${req.user.id}`);

    res.json({
      success: true,
      count: budgets.length,
      timestamp,
      data: budgets
    });
  } catch (error) {
    handleError(res, error, 'Failed to fetch budgets');
  }
};

// @desc    Add a new budget
// @route   POST /api/budgets
// @access  Private
exports.addBudget = async (req, res) => {
  try {
    // Accept both legacy and simplified payloads from frontend
    const incoming = req.body || {};
    const category = incoming.category;
    const period = incoming.period || 'monthly';
    const totalAmount = incoming.totalAmount != null ? incoming.totalAmount : incoming.amount;
    const isRollover = incoming.isRollover != null ? incoming.isRollover : incoming.carryForward;
    const name = incoming.name || (category ? `${category} Budget` : undefined);
    const alerts = incoming.alerts; // ensure defined if provided

    // Compute default start/end if not provided
    let startDate = incoming.startDate ? new Date(incoming.startDate) : undefined;
    let endDate = incoming.endDate ? new Date(incoming.endDate) : undefined;
    if (!startDate || !endDate) {
      const now = new Date();
      if (period === 'daily') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        endDate.setHours(23, 59, 59, 999);
      } else if (period === 'weekly') {
        const day = now.getDay();
        const diffToMonday = (day + 6) % 7; // 0=Sun -> 6; 1=Mon -> 0
        startDate = new Date(now);
        startDate.setDate(now.getDate() - diffToMonday);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(startDate.getDate() + 6);
        endDate.setHours(23, 59, 59, 999);
      } else if (period === 'quarterly') {
        const q = Math.floor(now.getMonth() / 3); // 0..3
        startDate = new Date(now.getFullYear(), q * 3, 1);
        endDate = new Date(now.getFullYear(), q * 3 + 3, 0);
      } else if (period === 'yearly') {
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear(), 12, 0);
      } else {
        // monthly default
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }
    }

    // Validate required fields
    if (!name || !category || totalAmount == null || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, category, totalAmount, startDate, and endDate'
      });
    }

    // Validate totalAmount is greater than zero
    if (Number(totalAmount) <= 0) {
      return res.status(400).json({
        success: false,
        message: 'Budget amount must be greater than zero'
      });
    }

    // Validate period input
    const validPeriods = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
    if (period && !validPeriods.includes(period)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid period. Must be one of: daily, weekly, monthly, quarterly, yearly'
      });
    }

    // Check if budget already exists for this category and period
    const existingBudget = await Budget.findOne({
      user: req.user.id,
      category,
      period: period || 'monthly'
    });

    if (existingBudget) {
      // Idempotent: update existing instead of erroring
      existingBudget.name = name;
      existingBudget.totalAmount = Number(totalAmount);
      existingBudget.startDate = startDate;
      existingBudget.endDate = endDate;
      if (typeof isRollover !== 'undefined') existingBudget.isRollover = !!isRollover;
      if (incoming.alerts) existingBudget.alerts = incoming.alerts;
      await existingBudget.save();
      await logActivity(req.user.id, 'Updated budget', 'budget', category);
      return res.status(200).json({ success: true, data: existingBudget });
    }

    const budget = await Budget.create({
      user: req.user.id,
      name,
      category,
      totalAmount: Number(totalAmount),
      period: period || 'monthly',
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      isRollover: !!isRollover,
      alerts: alerts || {
        enabled: true,
        threshold: 80,
        exceeded: false
      },
      status: 'active'
    });

    // Log activity with category
    await logActivity(req.user.id, 'Added budget', 'budget', category);

    res.status(201).json({
      success: true,
      data: budget
    });
  } catch (error) {
    handleError(res, error, 'Failed to add budget');
  }
};

// @desc    Update a budget
// @route   PUT /api/budgets/:id
// @access  Private
exports.updateBudget = async (req, res) => {
  try {
    let budget = await Budget.findById(req.params.id);

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    // Make sure budget belongs to user
    if (budget.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    // Validate period input if provided
    if (req.body.period) {
      const validPeriods = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
      if (!validPeriods.includes(req.body.period)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid period. Must be one of: daily, weekly, monthly, quarterly, yearly'
        });
      }
    }

    // Convert totalAmount to number if provided
    if (req.body.totalAmount) {
      req.body.totalAmount = Number(req.body.totalAmount);
      
      // Validate totalAmount is greater than zero
      if (req.body.totalAmount <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Budget amount must be greater than zero'
        });
      }
    }

    // Convert date strings to Date objects if provided
    if (req.body.startDate) {
      req.body.startDate = new Date(req.body.startDate);
    }
    if (req.body.endDate) {
      req.body.endDate = new Date(req.body.endDate);
    }

    // Check if user is trying to change category or period to one that already exists
    if ((req.body.category && req.body.category !== budget.category) || 
        (req.body.period && req.body.period !== budget.period)) {
      const existingBudget = await Budget.findOne({
        user: req.user.id,
        category: req.body.category || budget.category,
        period: req.body.period || budget.period,
        _id: { $ne: req.params.id } // Exclude current budget
      });

      if (existingBudget) {
        return res.status(400).json({
          success: false,
          message: `Budget already exists for ${req.body.category || budget.category} (${req.body.period || budget.period})`
        });
      }
    }

    budget = await Budget.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    // Log activity with category
    await logActivity(req.user.id, 'Updated budget', 'budget', budget.category);

    res.json({
      success: true,
      data: budget
    });
  } catch (error) {
    handleError(res, error, 'Failed to update budget');
  }
};

// @desc    Delete a budget
// @route   DELETE /api/budgets/:id
// @access  Private
exports.deleteBudget = async (req, res) => {
  try {
    // Find the budget by ID and check if it belongs to the user
    const budget = await Budget.findOne({
      _id: req.params.id,
      user: req.user.id
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    // Save category before deleting
    const { category } = budget;

    // Use deleteOne instead of the deprecated remove method
    await Budget.deleteOne({ _id: req.params.id });

    // Log activity with category
    await logActivity(req.user.id, 'Deleted budget', 'budget', category);

    res.json({
      success: true,
      data: {}
    });
  } catch (error) {
    handleError(res, error, 'Failed to delete budget');
  }
};

// @desc    Update budget spent amount
// @route   PUT /api/budgets/:id/update-spent
// @access  Private
exports.updateSpentAmount = async (req, res) => {
  try {
    const budget = await Budget.findById(req.params.id);

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found'
      });
    }

    // Make sure budget belongs to user
    if (budget.user.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized'
      });
    }

    await budget.updateSpentAmount();

    res.json({
      success: true,
      data: budget
    });
  } catch (error) {
    handleError(res, error, 'Failed to update spent amount');
  }
};

// @desc    Get budget summary
// @route   GET /api/budgets/summary
// @access  Private
exports.getBudgetSummary = async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    const summary = await Budget.getSummary(req.user.id, startDate, endDate);

    res.json({
      success: true,
      data: { summary: summary[0] || {} },
    });
  } catch (error) {
    handleError(res, error, 'Failed to fetch budget summary');
  }
};

// @desc    Get category performance
// @route   GET /api/budgets/category-performance
// @access  Private
exports.getCategoryPerformance = async (req, res) => {
  try {
    const startDate = req.query.startDate ? new Date(req.query.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();

    const performance = await Budget.getCategoryPerformance(req.user.id, startDate, endDate);

    res.json({
      success: true,
      data: { performance },
    });
  } catch (error) {
    handleError(res, error, 'Failed to fetch category performance');
  }
};

// @desc    Synchronize budget categories with transaction categories
// @route   POST /api/budgets/sync-categories
// @access  Private
exports.syncCategories = async (req, res) => {
  try {
    // This is a placeholder for category synchronization logic
    // In a real implementation, you would fetch transaction categories
    // and ensure budget categories match
    
    console.log(`[${new Date().toISOString()}] Syncing categories for user ${req.user.id}`);
    
    res.json({
      success: true,
      message: 'Budget categories synchronized successfully'
    });
  } catch (error) {
    handleError(res, error, 'Failed to synchronize budget categories');
  }
};

// @desc    Clean up zero amount budgets
// @route   DELETE /api/budgets/cleanup
// @access  Private
exports.cleanupZeroAmountBudgets = async (req, res) => {
  try {
    console.log(`[${new Date().toISOString()}] Cleaning up zero amount budgets for user ${req.user.id}`);
    
    // Find all budgets with zero amount
    const zeroAmountBudgets = await Budget.find({
      user: req.user.id,
      totalAmount: 0
    });
    
    if (zeroAmountBudgets.length === 0) {
      return res.json({
        success: true,
        message: 'No zero amount budgets found',
        count: 0
      });
    }
    
    // Delete all zero amount budgets
    const result = await Budget.deleteMany({
      user: req.user.id,
      totalAmount: 0
    });
    
    // Log activity
    await logActivity(req.user.id, `Cleaned up ${result.deletedCount} zero amount budgets`, 'budget');
    
    res.json({
      success: true,
      message: `Cleaned up ${result.deletedCount} zero amount budgets`,
      count: result.deletedCount
    });
  } catch (error) {
    handleError(res, error, 'Failed to clean up zero amount budgets');
  }
};