// backend/services/orderEngine.js
//
// Fills pending limit orders. A limit order rests on the account until the live
// price reaches its limit; this is what checks for that. It runs when a user
// opens their trading account and on a schedule while the market is open.
const TradingAccount = require('../models/TradingAccount');
const logger = require('../utils/logger');
const { withLock } = require('../utils/keyedLock');

const PENDING_LIMIT_ORDER = { $elemMatch: { status: 'PENDING', orderType: 'LIMIT' } };
const NOTHING_PROCESSED = { filled: [], cancelled: [] };

// Every change to one user's trading account runs under this key
const tradingLockKey = userId => `trading:${userId}`;

async function processPendingOrdersForUser(userId) {
  // Cheap check first, so accounts with nothing pending never wait on the lock
  const hasPending = await TradingAccount.exists({ user: userId, orders: PENDING_LIMIT_ORDER });
  if (!hasPending) return NOTHING_PROCESSED;

  return withLock(tradingLockKey(userId), async () => {
    const account = await TradingAccount.findOne({ user: userId, orders: PENDING_LIMIT_ORDER });
    if (!account) return NOTHING_PROCESSED;

    const result = await account.processPendingOrders();
    if (result.filled.length > 0 || result.cancelled.length > 0) {
      logger.info('Processed pending limit orders', {
        userId: String(userId),
        filled: result.filled.length,
        cancelled: result.cancelled.length,
      });
    }
    return result;
  });
}

async function processAllPendingOrders() {
  const accounts = await TradingAccount.find({ orders: PENDING_LIMIT_ORDER }).select('user').lean();
  let filled = 0;
  let cancelled = 0;

  for (const account of accounts) {
    try {
      const result = await processPendingOrdersForUser(account.user);
      filled += result.filled.length;
      cancelled += result.cancelled.length;
    } catch (error) {
      logger.error(`Could not process pending orders for user ${account.user}: ${error.message}`);
    }
  }

  return { accounts: accounts.length, filled, cancelled };
}

module.exports = { tradingLockKey, processPendingOrdersForUser, processAllPendingOrders };
