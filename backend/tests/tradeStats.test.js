const { matchTrades, summarizeClosedTrades } = require('../services/tradeStats');

const order = (id, type, quantity, price, day, extra = {}) => ({
  id,
  symbol: 'TCS.NS',
  type,
  quantity,
  price,
  executedPrice: price,
  status: 'EXECUTED',
  executedAt: new Date(Date.UTC(2026, 0, day)),
  ...extra,
});

describe('matchTrades', () => {
  test('matches a partial sell against the buy and leaves the rest open', () => {
    const { closedTrades, openPositions } = matchTrades([
      order('1', 'BUY', 10, 100, 1),
      order('2', 'SELL', 4, 110, 5),
    ]);

    expect(closedTrades).toHaveLength(1);
    expect(closedTrades[0]).toMatchObject({ quantity: 4, buyPrice: 100, sellPrice: 110, profitLoss: 40, status: 'CLOSED' });
    expect(closedTrades[0].profitLossPercentage).toBeCloseTo(10);
    expect(openPositions).toEqual([
      { symbol: 'TCS.NS', quantity: 6, averagePrice: 100, buyDate: new Date(Date.UTC(2026, 0, 1)) },
    ]);
  });

  test('never changes the orders it is given', () => {
    const orders = [order('1', 'BUY', 10, 100, 1), order('2', 'SELL', 10, 110, 5)];
    const before = JSON.stringify(orders);

    matchTrades(orders);
    matchTrades(orders);

    expect(JSON.stringify(orders)).toBe(before);
  });

  test('gives the same answer every time it is called', () => {
    const orders = [order('1', 'BUY', 10, 100, 1), order('2', 'SELL', 4, 110, 5)];
    expect(matchTrades(orders)).toEqual(matchTrades(orders));
  });

  test('uses the oldest lot first (FIFO) across several buys', () => {
    const { closedTrades, openPositions } = matchTrades([
      order('1', 'BUY', 5, 100, 1),
      order('2', 'BUY', 5, 120, 2),
      order('3', 'SELL', 7, 130, 3),
    ]);

    expect(closedTrades.map(t => [t.quantity, t.buyPrice, t.profitLoss])).toEqual([
      [5, 100, 150],
      [2, 120, 20],
    ]);
    expect(openPositions[0]).toMatchObject({ quantity: 3, averagePrice: 120 });
  });

  test('processes orders in time order, not list order', () => {
    // A buy placed after the sell must not be matched against it
    const { closedTrades, openPositions } = matchTrades([
      order('3', 'BUY', 5, 200, 9),
      order('2', 'SELL', 5, 110, 5),
      order('1', 'BUY', 5, 100, 1),
    ]);

    expect(closedTrades).toHaveLength(1);
    expect(closedTrades[0]).toMatchObject({ buyPrice: 100, sellPrice: 110, profitLoss: 50 });
    expect(openPositions[0]).toMatchObject({ quantity: 5, averagePrice: 200 });
  });

  test('ignores pending and cancelled orders and keeps symbols apart', () => {
    const { closedTrades, openPositions } = matchTrades([
      order('1', 'BUY', 10, 100, 1),
      order('2', 'SELL', 10, 90, 2, { status: 'PENDING' }),
      order('3', 'SELL', 10, 90, 2, { status: 'CANCELLED' }),
      order('4', 'BUY', 2, 50, 3, { symbol: 'INFY.NS' }),
    ]);

    expect(closedTrades).toHaveLength(0);
    expect(openPositions.map(p => [p.symbol, p.quantity])).toEqual([['TCS.NS', 10], ['INFY.NS', 2]]);
  });

  test('a fully closed position leaves nothing open', () => {
    const { closedTrades, openPositions } = matchTrades([
      order('1', 'BUY', 10, 100, 1),
      order('2', 'SELL', 10, 110, 5),
    ]);
    expect(closedTrades).toHaveLength(1);
    expect(openPositions).toHaveLength(0);
  });

  test('handles an empty or missing order list', () => {
    expect(matchTrades([])).toEqual({ closedTrades: [], openPositions: [] });
    expect(matchTrades(undefined)).toEqual({ closedTrades: [], openPositions: [] });
  });
});

describe('summarizeClosedTrades', () => {
  test('win rate counts closed trades only', () => {
    const { closedTrades } = matchTrades([
      order('1', 'BUY', 10, 100, 1),
      order('2', 'SELL', 5, 110, 3), // win
      order('3', 'SELL', 5, 90, 5),  // loss
    ]);
    const summary = summarizeClosedTrades(closedTrades);

    expect(summary.closedCount).toBe(2);
    expect(summary.winRate).toBe(50);
    expect(summary.realizedPnL).toBe(0);
    expect(summary.bestTrade).toEqual({ symbol: 'TCS.NS', pnl: 50 });
    expect(summary.worstTrade).toEqual({ symbol: 'TCS.NS', pnl: -50 });
    // held 2 days and 4 days
    expect(summary.averageHoldingTime).toBe(3);
  });

  test('is all zeros with no closed trades', () => {
    expect(summarizeClosedTrades([])).toEqual({
      closedCount: 0,
      realizedPnL: 0,
      winRate: 0,
      bestTrade: null,
      worstTrade: null,
      averageHoldingTime: 0,
    });
  });
});
