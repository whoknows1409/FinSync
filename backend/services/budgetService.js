// backend/services/budgetService.js
//
// Keeps budgets current: starts the next period when one ends, and keeps the
// stored spent amounts in step with transactions.
const Budget = require('../models/Budget');
const logger = require('../utils/logger');
const { withLock } = require('../utils/keyedLock');
const { startOfUtcDay, endOfUtcDay, currentBudgetPeriod } = require('../utils/schedule');

const budgetLockKey = userId => `budgets:${userId}`;

// Renew one user's ended budgets.
//
// The number of database round trips here does not grow with the number of
// budgets: this runs while a page is loading, and each round trip to a hosted
// database can take a tenth of a second or more.
async function rollOverUserBudgets(userId, now) {
  const today = startOfUtcDay(now);

  const expired = await Budget.find({ user: userId, status: 'active', endDate: { $lt: today } });
  if (expired.length === 0) return { expired: 0, created: 0 };

  // Categories that already have a budget for the current period need no new one
  const current = await Budget.find({ user: userId, status: 'active', endDate: { $gte: today } })
    .select('category period')
    .lean();
  const hasCurrent = new Set(current.map(budget => `${budget.category}|${budget.period}`));

  // Several ended budgets can exist for the same category and period (older
  // periods, or copies left by an earlier bug). Only the most recent one is
  // carried forward.
  const latestByKey = new Map();
  for (const budget of expired) {
    const key = `${budget.category}|${budget.period}`;
    const latest = latestByKey.get(key);
    if (!latest || budget.endDate > latest.endDate ||
        (budget.endDate.getTime() === latest.endDate.getTime() && budget.createdAt > latest.createdAt)) {
      latestByKey.set(key, budget);
    }
  }
  const latest = [...latestByKey.entries()];

  // Final figure for each finished period, all fetched at once
  const totals = await Promise.all(latest.map(([, budget]) => budget.calculateSpent()));

  const successors = [];
  const updates = [];
  latest.forEach(([key, budget], index) => {
    budget.spentAmount = totals[index];

    // Placeholder budgets with no amount are not carried forward
    if (budget.totalAmount > 0 && !hasCurrent.has(key)) {
      const next = budget.buildNextPeriod(currentBudgetPeriod(budget.period, budget.endDate, now));
      const invalid = next.validateSync();
      if (invalid) {
        logger.error(`Could not renew budget ${budget._id}: ${invalid.message}`);
      } else {
        successors.push(next);
      }
    }

    updates.push({
      updateOne: {
        filter: { _id: budget._id },
        update: {
          $set: {
            status: 'completed',
            spentAmount: budget.spentAmount,
            'alerts.exceeded': budget.spentAmount > budget.totalAmount,
          },
        },
      },
    });
  });

  const carriedForward = new Set(latest.map(([, budget]) => String(budget._id)));
  const superseded = expired.filter(budget => !carriedForward.has(String(budget._id))).map(budget => budget._id);
  if (superseded.length > 0) {
    updates.push({
      updateMany: { filter: { _id: { $in: superseded } }, update: { $set: { status: 'completed' } } },
    });
  }

  // New periods first: if this stops half way, the next run sees them and
  // only has the closing left to do, so nothing is ever created twice.
  if (successors.length > 0) await Budget.insertMany(successors);
  await Budget.bulkWrite(updates, { ordered: false });

  return { expired: expired.length, created: successors.length };
}

// Start the next period for every active budget whose period has ended.
// With a userId only that user's budgets are checked.
async function rollOverExpiredBudgets(userId = null, now = new Date()) {
  const filter = { status: 'active', endDate: { $lt: startOfUtcDay(now) } };
  if (userId) filter.user = userId;

  // Usually nothing has ended, and this single check is all that happens
  const users = userId
    ? ((await Budget.exists(filter)) ? [userId] : [])
    : await Budget.distinct('user', filter);

  let expired = 0;
  let created = 0;

  for (const user of users) {
    try {
      // One at a time per user, so two runs can never both create the new period
      const result = await withLock(budgetLockKey(user), () => rollOverUserBudgets(user, now));
      expired += result.expired;
      created += result.created;
    } catch (error) {
      logger.error(`Could not roll over budgets for user ${user}: ${error.message}`);
    }
  }

  return { expired, created };
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
