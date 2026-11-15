// backend/services/recurringService.js
//
// Turns recurring transactions (rent, salary, subscriptions) into real
// transactions when they fall due. Used by the nightly job, at startup, when a
// user loads their transactions and by the "process now" button, so they all
// behave the same way.
const RecurringTransaction = require('../models/RecurringTransaction');
const Transaction = require('../models/Transaction');
const logger = require('../utils/logger');
const budgetService = require('./budgetService');
const { notify } = require('./notificationService');
const { endOfUtcDay, startOfLocalDay, nextOccurrence } = require('../utils/schedule');

// Upper bound on occurrences created for one item in one run
const MAX_OCCURRENCES_PER_RUN = 366;

// Create every occurrence of one recurring item that has fallen due.
// Returns the transactions created.
async function processOne(recurring, now) {
  const created = [];
  const lastDay = recurring.endDate ? endOfUtcDay(recurring.endDate) : null;

  let due = recurring.lastProcessed
    ? nextOccurrence(recurring.lastProcessed, recurring.frequency, recurring.startDate)
    : new Date(recurring.startDate);

  // An occurrence is due once its calendar day (in IST) has started
  while (startOfLocalDay(due) <= now && created.length < MAX_OCCURRENCES_PER_RUN) {
    if (lastDay && due > lastDay) break;

    // Claim this occurrence first. If another run got there before us the
    // update matches nothing and we stop, so nothing is ever created twice.
    const previous = recurring.lastProcessed || null;
    const claimed = await RecurringTransaction.findOneAndUpdate(
      { _id: recurring._id, isActive: true, lastProcessed: previous },
      { $set: { lastProcessed: due } },
      { new: true }
    );
    if (!claimed) break;

    try {
      const transaction = await Transaction.create({
        user: recurring.user,
        type: recurring.type,
        amount: recurring.amount,
        category: recurring.category,
        description: recurring.description,
        date: due,
        isRecurring: true,
        recurringId: recurring._id,
      });
      created.push(transaction);
    } catch (error) {
      // Give the occurrence back so a later run can try again
      await RecurringTransaction.updateOne(
        { _id: recurring._id, lastProcessed: due },
        { $set: { lastProcessed: previous } }
      );
      logger.error(`Could not create recurring transaction ${recurring._id}: ${error.message}`);
      break;
    }

    recurring.lastProcessed = due;
    due = nextOccurrence(due, recurring.frequency, recurring.startDate);
  }

  // Nothing further will fall due once the end date has passed
  if (lastDay && due > lastDay && now > lastDay) {
    await RecurringTransaction.updateOne({ _id: recurring._id }, { $set: { isActive: false } });
  }

  return created;
}

// The most recent occurrence that has already fallen due, without creating
// anything. Used when a paused item is switched back on, so the time it spent
// paused is skipped instead of being filled in with back-dated transactions.
function lastOccurrenceBefore(recurring, now = new Date()) {
  let last = recurring.lastProcessed || null;
  let due = last
    ? nextOccurrence(last, recurring.frequency, recurring.startDate)
    : new Date(recurring.startDate);

  for (let steps = 0; steps < 5000 && startOfLocalDay(due) <= now; steps++) {
    last = due;
    due = nextOccurrence(due, recurring.frequency, recurring.startDate);
  }
  return last;
}

// Process everything that is due. With a userId only that user's items are
// processed. Returns how many transactions were created.
async function processDueTransactions(userId = null, now = new Date()) {
  const filter = { isActive: true };
  if (userId) filter.user = userId;

  const recurringItems = await RecurringTransaction.find(filter);
  const createdByUser = new Map();

  for (const recurring of recurringItems) {
    try {
      const created = await processOne(recurring, now);
      if (created.length === 0) continue;
      const key = String(recurring.user);
      createdByUser.set(key, [...(createdByUser.get(key) || []), ...created]);
    } catch (error) {
      logger.error(`Could not process recurring transaction ${recurring._id}: ${error.message}`);
    }
  }

  let processedCount = 0;
  for (const [user, transactions] of createdByUser) {
    processedCount += transactions.length;

    // Recalculate each affected budget once, not once per transaction
    const touched = new Map();
    for (const transaction of transactions) {
      if (transaction.type !== 'expense') continue;
      const day = transaction.date.toISOString().slice(0, 10);
      touched.set(`${transaction.category}|${day}`, transaction);
    }
    for (const transaction of touched.values()) {
      try {
        await budgetService.refreshBudgetsFor(transaction.user, transaction.category, transaction.date);
      } catch (error) {
        logger.error(`Could not update budget after recurring transaction: ${error.message}`);
      }
    }

    const latest = transactions[transactions.length - 1];
    await notify(user, {
      category: 'recurring',
      severity: 'info',
      title: transactions.length === 1 ? 'Recurring transaction added' : 'Recurring transactions added',
      message: transactions.length === 1
        ? `${latest.description} was added to your transactions.`
        : `${transactions.length} recurring transactions were added, including ${latest.description}.`,
      link: '/transactions',
      dedupeKey: `recurring:${latest._id}`,
    });
  }

  return { processedCount };
}

module.exports = { processDueTransactions, lastOccurrenceBefore };
