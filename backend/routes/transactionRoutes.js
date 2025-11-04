const express = require('express');
const router = express.Router();
const {
  getTransactions,
  addTransaction,
  updateTransaction,
  deleteTransaction,
  getRecurringTransactions,
  addRecurringTransaction,
  updateRecurringTransaction,
  deleteRecurringTransaction,
  processRecurringTransactions,
  getTransactionAnalysis
} = require('../controllers/transactionController');
const { protect } = require('../middleware/auth');

console.log('Transaction routes loaded'); // Debug log

// Transaction routes
router.route('/')
  .get(protect, getTransactions)
  .post(protect, addTransaction);

router.route('/:id')
  .put(protect, updateTransaction)
  .delete(protect, deleteTransaction);

// Recurring transaction routes
router.route('/recurring')
  .get(protect, getRecurringTransactions)
  .post(protect, addRecurringTransaction);

router.route('/recurring/:id')
  .put(protect, updateRecurringTransaction)
  .delete(protect, deleteRecurringTransaction);

router.route('/recurring/process')
  .post(protect, processRecurringTransactions);

// Analysis route
router.route('/analysis')
  .get(protect, getTransactionAnalysis);

module.exports = router;