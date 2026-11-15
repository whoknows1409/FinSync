// backend/scripts/repairOrderQuantities.js
//
// One-off repair for trading accounts affected by an old bug: loading the
// trading stats used to lower the stored quantity of BUY orders that had been
// matched against sells. The holdings were never affected, so the original
// quantity can be worked out again:
//
//   shares bought = shares still held + shares sold
//
// Any shortfall is restored to the first executed BUY order of that stock,
// which is the only order the bug could change.
//
// Usage (from the backend folder, with MONGODB_URI set):
//   node scripts/repairOrderQuantities.js            # report only, changes nothing
//   node scripts/repairOrderQuantities.js --apply    # write the corrections
require('dotenv').config();
const mongoose = require('mongoose');
const TradingAccount = require('../models/TradingAccount');

const apply = process.argv.includes('--apply');

// Returns the corrections needed for one account: [{ orderId, symbol, from, to }]
function findCorrections(account) {
  const bySymbol = new Map();
  const entry = symbol => {
    if (!bySymbol.has(symbol)) bySymbol.set(symbol, { bought: 0, sold: 0, held: 0, firstBuy: null });
    return bySymbol.get(symbol);
  };

  for (const order of account.orders) {
    if (order.status !== 'EXECUTED') continue;
    const totals = entry(order.symbol);
    if (order.type === 'BUY') {
      totals.bought += order.quantity;
      if (!totals.firstBuy) totals.firstBuy = order;
    } else {
      totals.sold += order.quantity;
    }
  }
  for (const holding of account.holdings) {
    entry(holding.symbol).held += holding.quantity;
  }

  const corrections = [];
  for (const [symbol, totals] of bySymbol) {
    const missing = totals.held + totals.sold - totals.bought;
    if (missing > 0 && totals.firstBuy) {
      corrections.push({
        orderId: totals.firstBuy.id,
        symbol,
        from: totals.firstBuy.quantity,
        to: totals.firstBuy.quantity + missing,
      });
    }
  }
  return corrections;
}

async function main() {
  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
  if (!mongoUri) {
    console.error('MONGODB_URI is not set.');
    process.exit(1);
  }

  await mongoose.connect(mongoUri);
  console.log(apply ? 'Applying corrections...' : 'Dry run: nothing will be changed. Re-run with --apply to write.');

  const accounts = await TradingAccount.find({});
  let affectedAccounts = 0;
  let correctedOrders = 0;

  for (const account of accounts) {
    const corrections = findCorrections(account);
    if (corrections.length === 0) continue;

    affectedAccounts++;
    for (const correction of corrections) {
      correctedOrders++;
      console.log(
        `user ${account.user}  ${correction.symbol}  order ${correction.orderId}: quantity ${correction.from} -> ${correction.to}`
      );
      if (apply) {
        await TradingAccount.updateOne(
          { _id: account._id, 'orders.id': correction.orderId },
          { $set: { 'orders.$.quantity': correction.to } }
        );
      }
    }
  }

  console.log(
    `${accounts.length} accounts checked, ${affectedAccounts} affected, ` +
    `${correctedOrders} orders ${apply ? 'corrected' : 'would be corrected'}.`
  );
  await mongoose.disconnect();
}

if (require.main === module) {
  main().catch(error => {
    console.error('Repair failed:', error);
    process.exit(1);
  });
}

module.exports = { findCorrections };
