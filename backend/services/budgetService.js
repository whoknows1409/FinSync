// backend/services/budgetService.js
//
// Keeps budgets current: starts the next period when one ends, and keeps the
// stored spent amounts in step with transactions.
const Budget = require('../models/Budget');
const logger = require('../utils/logger');
const { withLock } = require('../utils/keyedLock');
const { startOfUtcDay, endOfUtcDay, currentBudgetPeriod } = require('../utils/schedule');

const budgetLockKey = userId => `budgets:${userId}`;

// Close one ended budget and open its successor for the period containing `now`.
// Returns the new budget, or null if none was needed.
async function rollOverBudget(budgetId, now) {
  const today = startOfUtcDay(now);
  const budget = await Budget.findOne({ _id: budgetId, status: 'active', endDate: { $lt: today } });
  if (!budget) return null; // already handled by another run

  // Final figure for the finished period, without alerting about a period that is over
  await budget.updateSpentAmount({ notify: false });

  let created = null;

  // Placeholder budgets with no amount are not carried forward
  if (budget.totalAmount > 0) {
    const range = currentBudgetPeriod(budget.period, budget.endDate, now);

    const alreadyCurrent = await Budget.exists({
      user: budget.user,
      category: budget.category,
      period: budget.period,
      status: 'active',
      endDate: { $gte: today },
    });

    if (!alreadyCurrent) {
      created = await budget.buildNextPeriod(range).save();
    }
  }

  budget.status = 'completed';
  await budget.save();

  return created;
}

// Start the next period for every active budget whose period has ended.
// With a userId only that user's budgets are checked.
async function rollOverExpiredBudgets(userId = null, now = new Date()) {
  const filter = { status: 'active', endDate: { $lt: startOfUtcDay(now) } };
  if (userId) filter.user = userId;

  const expired = await Budget.find(filter).select('_id user').sort({ endDate: 1 }).lean();
  let created = 0;

  for (const { _id, user } of expired) {
    try {
      const next = await withLock(budgetLockKey(user), () => rollOverBudget(_id, now));
      if (next) created++;
    } catch (error) {
      logger.error(`Could not roll over budget ${_id}: ${error.message}`);
    }
  }

  return { expired: expired.length, created };
}

// Recalculate the spent amount of every active budget whose period covers
// `date` for the given categories. Called after transactions change.
async function refreshBudgetsFor(userId, category, date) {
  const budgets = await Budget.find({
    user: userId,
    category,
    status: 'active',
    startDate: { $lte: endOfUtcDay(date) },
    endDate: { $gte: startOfUtcDay(date) },
  });

  for (const budget of budgets) {
    await budget.updateSpentAmount();
  }
}

// Recalculate every active budget that covers today. Run at startup so stored
// amounts recover from anything that was missed while the server was asleep.
async function refreshCurrentBudgets(now = new Date()) {
  const budgets = await Budget.find({
    status: 'active',
    startDate: { $lte: endOfUtcDay(now) },
    endDate: { $gte: startOfUtcDay(now) },
  });

  let refreshed = 0;
  for (const budget of budgets) {
    try {
      await budget.updateSpentAmount();
      refreshed++;
    } catch (error) {
      logger.error(`Could not refresh budget ${budget._id}: ${error.message}`);
    }
  }
  return { refreshed };
}

module.exports = { rollOverExpiredBudgets, refreshBudgetsFor, refreshCurrentBudgets };
