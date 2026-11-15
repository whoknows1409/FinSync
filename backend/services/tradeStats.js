// backend/services/tradeStats.js
//
// Pure trade-matching maths for the paper trading account. Nothing in here
// touches the database: callers pass plain order data in and get plain results
// back, so stored order history is never modified by a read.

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const orderTime = order => new Date(order.executedAt || order.timestamp || 0).getTime();
const fillPrice = order => (order.executedPrice != null ? order.executedPrice : order.price);

// Match executed sells against earlier buys of the same symbol, oldest lot first
// (FIFO). Returns the closed round trips and whatever is still held.
function matchTrades(orders) {
  const executed = (orders || [])
    .filter(order => order && order.status === 'EXECUTED')
    .map((order, index) => ({
      symbol: order.symbol,
      type: order.type,
      quantity: Number(order.quantity) || 0,
      price: Number(fillPrice(order)) || 0,
      date: order.executedAt || order.timestamp || null,
      time: orderTime(order),
      index,
    }))
    .sort((a, b) => a.time - b.time || a.index - b.index);

  const lotsBySymbol = new Map();
  const closedTrades = [];

  for (const order of executed) {
    if (!lotsBySymbol.has(order.symbol)) lotsBySymbol.set(order.symbol, []);
    const lots = lotsBySymbol.get(order.symbol);

    if (order.type === 'BUY') {
      lots.push({ quantity: order.quantity, price: order.price, date: order.date });
      continue;
    }

    let remaining = order.quantity;
    while (remaining > 0 && lots.length > 0) {
      const lot = lots[0];
      const quantity = Math.min(remaining, lot.quantity);
      const profitLoss = (order.price - lot.price) * quantity;

      closedTrades.push({
        symbol: order.symbol,
        name: order.symbol,
        buyPrice: lot.price,
        buyDate: lot.date,
        sellPrice: order.price,
        sellDate: order.date,
        quantity,
        profitLoss,
        profitLossPercentage: lot.price > 0 ? ((order.price - lot.price) / lot.price) * 100 : 0,
        status: 'CLOSED',
      });

      lot.quantity -= quantity;
      remaining -= quantity;
      if (lot.quantity === 0) lots.shift();
    }
  }

  const openPositions = [];
  for (const [symbol, lots] of lotsBySymbol) {
    const quantity = lots.reduce((sum, lot) => sum + lot.quantity, 0);
    if (quantity <= 0) continue;
    const cost = lots.reduce((sum, lot) => sum + lot.quantity * lot.price, 0);
    openPositions.push({
      symbol,
      quantity,
      averagePrice: cost / quantity,
      buyDate: lots[0].date,
    });
  }

  return { closedTrades, openPositions };
}

// Headline numbers for a set of closed trades
function summarizeClosedTrades(closedTrades) {
  const realizedPnL = closedTrades.reduce((sum, trade) => sum + trade.profitLoss, 0);
  const wins = closedTrades.filter(trade => trade.profitLoss > 0).length;

  let bestTrade = null;
  let worstTrade = null;
  for (const trade of closedTrades) {
    if (!bestTrade || trade.profitLoss > bestTrade.pnl) {
      bestTrade = { symbol: trade.symbol, pnl: trade.profitLoss };
    }
    if (!worstTrade || trade.profitLoss < worstTrade.pnl) {
      worstTrade = { symbol: trade.symbol, pnl: trade.profitLoss };
    }
  }

  const holdingDays = closedTrades
    .filter(trade => trade.buyDate && trade.sellDate)
    .map(trade => (new Date(trade.sellDate) - new Date(trade.buyDate)) / MS_PER_DAY)
    .filter(days => Number.isFinite(days) && days >= 0);

  return {
    closedCount: closedTrades.length,
    realizedPnL,
    winRate: closedTrades.length > 0 ? (wins / closedTrades.length) * 100 : 0,
    bestTrade,
    worstTrade,
    // Days, averaged over closed trades
    averageHoldingTime: holdingDays.length
      ? holdingDays.reduce((sum, days) => sum + days, 0) / holdingDays.length
      : 0,
  };
}

module.exports = { matchTrades, summarizeClosedTrades };
