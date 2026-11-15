const express = require('express');
const router = express.Router();
const {
  getGoals,
  addGoal,
  updateGoal,
  addContribution,
  deleteGoal
} = require('../controllers/goalController');
const { protect } = require('../middleware/auth');
const { validateFinancialGoal, handleValidationErrors } = require('../middleware/validation');

// All goal routes are protected
router.use(protect);

router.get('/', getGoals);
router.post('/', validateFinancialGoal.create, handleValidationErrors, addGoal);
router.put('/:id', validateFinancialGoal.update, handleValidationErrors, updateGoal);
router.delete('/:id', deleteGoal);
router.post('/:id/contributions', addContribution);

module.exports = router;
