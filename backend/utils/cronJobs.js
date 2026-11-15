const cron = require('node-cron');
const logger = require('./logger');
const budgetService = require('../services/budgetService');
const recurringService = require('../services/recurringService');
const orderEngine = require('../services/orderEngine');

// Run a job and log its outcome. A failing job must never crash the server.
async function runJob(name, job) {
  try {
    const result = await job();
    console.log(`[jobs] ${name}: ${JSON.stringify(result)}`);
    return result;
  } catch (error) {
    console.error(`[jobs] ${name} failed:`, error);
    logger.error(`Scheduled job "${name}" failed: ${error.message}`);
    return null;
  }
}

// Recurring transactions: shortly after midnight IST, when a new day's items fall due
cron.schedule('5 0 * * *', () => {
  runJob('recurring transactions', () => recurringService.processDueTransactions());
}, { timezone: 'Asia/Kolkata' });

// Budgets: shortly after midnight UTC, which is when a budget's last day ends
cron.schedule('10 0 * * *', () => {
  runJob('budget rollover', () => budgetService.rollOverExpiredBudgets());
}, { timezone: 'Etc/UTC' });

// Fill pending limit orders every two minutes while the NSE is open
// (Mon-Fri, 09:00-15:59 IST). Outside those hours prices do not move, and
// orders are also checked whenever a user opens their trading account.
cron.schedule('*/2 9-15 * * 1-5', async () => {
  try {
    const result = await orderEngine.processAllPendingOrders();
    if (result.filled > 0 || result.cancelled > 0) {
      console.log(`[jobs] pending limit orders: ${result.filled} filled, ${result.cancelled} cancelled`);
    }
  } catch (error) {
    console.error('[jobs] pending limit orders failed:', error);
  }
}, { timezone: 'Asia/Kolkata' });

// The scheduled times above are missed whenever the server is asleep or
// restarting, so everything is also brought up to date once at startup.
async function runStartupTasks() {
  await runJob('budget rollover (startup)', () => budgetService.rollOverExpiredBudgets());
  await runJob('recurring transactions (startup)', () => recurringService.processDueTransactions());
  await runJob('budget totals (startup)', () => budgetService.refreshCurrentBudgets());
  await runJob('pending limit orders (startup)', () => orderEngine.processAllPendingOrders());
}

console.log('Scheduled jobs registered');

module.exports = { runStartupTasks };
