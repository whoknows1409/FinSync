const express = require('express');
const router = express.Router();
const budgetController = require('../controllers/budgetController');
const { protect } = require('../middleware/auth');
const {
  validateBudget,
  validatePagination,
  validateDateRange,
  handleValidationErrors,
} = require('../middleware/validation');

// All budget routes are protected
router.use(protect);

// @desc    Get all budgets
// @route   GET /api/budgets
// @access  Private
router.get('/', validatePagination, handleValidationErrors, budgetController.getBudgets);

// @desc    Get single budget
// @route   GET /api/budgets/:id
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const budget = await require('../models/Budget').findOne({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!budget) {
      return res.status(404).json({
        success: false,
        message: 'Budget not found',
      });
    }

    // Add cache control headers
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');

    res.json({
      success: true,
      data: { budget },
    });
  } catch (error) {
    console.error('Get budget error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch budget',
    });
  }
});

// @desc    Create new budget
// @route   POST /api/budgets
// @access  Private
router.post('/', validateBudget.create, handleValidationErrors, budgetController.addBudget);

// @desc    Update budget
// @route   PUT /api/budgets/:id
// @access  Private
router.put('/:id', validateBudget.update, handleValidationErrors, budgetController.updateBudget);

// @desc    Delete budget
// @route   DELETE /api/budgets/:id
// @access  Private
router.delete('/:id', budgetController.deleteBudget);

// @desc    Update budget spent amount
// @route   PUT /api/budgets/:id/update-spent
// @access  Private
router.put('/:id/update-spent', budgetController.updateSpentAmount);

// @desc    Get budget summary
// @route   GET /api/budgets/summary
// @access  Private
router.get('/summary', validateDateRange, handleValidationErrors, budgetController.getBudgetSummary);

// @desc    Get category performance
// @route   GET /api/budgets/category-performance
// @access  Private
router.get('/category-performance', validateDateRange, handleValidationErrors, budgetController.getCategoryPerformance);

// @desc    Synchronize budget categories with transaction categories
// @route   POST /api/budgets/sync-categories
// @access  Private
router.post('/sync-categories', budgetController.syncCategories);

// @desc    Clean up zero amount budgets
// @route   DELETE /api/budgets/cleanup
// @access  Private
router.delete('/cleanup', budgetController.cleanupZeroAmountBudgets);

module.exports = router;
