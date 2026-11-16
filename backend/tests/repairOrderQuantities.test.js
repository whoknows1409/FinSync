// The script module loads the TradingAccount model, which pulls in the market
// data and logging modules; none of that is needed to test the arithmetic.
jest.mock('../models/TradingAccount', () => ({}));

const { findCorrections } = require('../scripts/repairOrderQuantities');

const order = (id, type, quantity, symbol = 'TCS.NS', status = 'EXECUTED') => ({ id, type, quantity, symbol, status });

describe('findCorrections', () => {
  test('restores the shortfall to the first executed buy of the stock', () => {
    // Bought 10, sold 4, still holding 6, but the stored buy quantity was lowered to 2
    const account = {
      holdings: [{ symbol: 'TCS.NS', quantity: 6 }],
      orders: [order('ORD-1', 'BUY', 2), order('ORD-2', 'SELL', 4)],
    };

    expect(findCorrections(account)).toEqual([
      { orderId: 'ORD-1', symbol: 'TCS.NS', from: 2, to: 10 },
    ]);
  });

  test('finds nothing to change on a consistent account', () => {
    const account = {
      holdings: [{ symbol: 'TCS.NS', quantity: 6 }],
      orders: [order('ORD-1', 'BUY', 10), order('ORD-2', 'SELL', 4)],
    };
    expect(findCorrections(account)).toEqual([]);
  });

  test('a fully sold position with a lowered buy is restored', () => {
    const account = {
      holdings: [],
      orders: [order('ORD-1', 'BUY', 3), order('ORD-2', 'SELL', 10)],
    };
    expect(findCorrections(account)).toEqual([
      { orderId: 'ORD-1', symbol: 'TCS.NS', from: 3, to: 10 },
    ]);
  });

  test('ignores pending and cancelled orders and treats each stock separately', () => {
    const account = {
      holdings: [{ symbol: 'TCS.NS', quantity: 5 }, { symbol: 'INFY.NS', quantity: 4 }],
      orders: [
        order('ORD-1', 'BUY', 5, 'TCS.NS'),
        order('ORD-2', 'BUY', 9, 'TCS.NS', 'PENDING'),
        order('ORD-3', 'BUY', 1, 'INFY.NS'),
        order('ORD-4', 'SELL', 2, 'INFY.NS'),
        order('ORD-5', 'SELL', 9, 'INFY.NS', 'CANCELLED'),
      ],
    };
    expect(findCorrections(account)).toEqual([
      { orderId: 'ORD-3', symbol: 'INFY.NS', from: 1, to: 6 },
    ]);
  });
});
