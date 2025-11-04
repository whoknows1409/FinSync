const express = require('express');
const router = express.Router();
const {
  getTradingAccount,
  getHoldings,
  getOrders,
  placeOrder, 
  cancelOrder,  
  getTradingStats,
  getPortfolioAllocation
} = require('../controllers/tradingController');
const { protect } = require('../middleware/auth');
const { validateTrading, handleValidationErrors } = require('../middleware/validation');

// All trading routes are protected
router.use(protect);

// @desc    Get trading account
// @route   GET /api/v1/trading/account
router.get('/account', getTradingAccount);

// @desc    Get holdings
// @route   GET /api/v1/trading/holdings
router.get('/holdings', getHoldings);

// @desc    Get orders
// @route   GET /api/v1/trading/orders
router.get('/orders', getOrders);

// @desc    Place order
// @route   POST /api/v1/trading/orders
router.post('/orders', validateTrading.placeOrder, handleValidationErrors, placeOrder);

// @desc    Cancel order
// @route   PUT /api/v1/trading/orders/:id/cancel
router.put('/orders/:id/cancel', cancelOrder);

// @desc    Get trading stats
// @route   GET /api/v1/trading/stats
router.get('/stats', getTradingStats);

// @desc    Get portfolio allocation
// @route   GET /api/v1/trading/portfolio-allocation
router.get('/portfolio-allocation', getPortfolioAllocation);

module.exports = router;