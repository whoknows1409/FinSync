const h = require('./harness');
const { out, prices, check } = h;

(async () => {
  const api = await h.start();
  const TradingAccount = h.req('models/TradingAccount');
  const orderEngine = h.req('services/orderEngine');
  const { auth, user } = await h.makeUser();

  prices['TCS.NS'] = 100;
  const order = body => api.post('/api/v1/trading/orders').set(auth).send(body);
  const stats = () => api.get('/api/v1/trading/stats').set(auth);
  const orders = async () => (await api.get('/api/v1/trading/orders').set(auth)).body.data.orders;
  const account = async () => (await api.get('/api/v1/trading/account').set(auth)).body.data.tradingAccount;

  await account(); // creates the account with 10000

  // ---- market buy / partial sell, stats are stable and read-only
  let r = await order({ symbol: 'TCS', type: 'BUY', quantity: 10, orderType: 'MARKET' });
  check('market buy executes', r.status === 201 && r.body.data.order.status === 'EXECUTED', `status ${r.status}`);
  prices['TCS.NS'] = 110;
  r = await order({ symbol: 'TCS', type: 'SELL', quantity: 4, orderType: 'MARKET' });
  check('market sell executes', r.status === 201 && r.body.data.order.executedPrice === 110);

  const s1 = (await stats()).body.data;
  const s2 = (await stats()).body.data;
  check('stats: P&L identical on repeated calls', s1.totalPnL === s2.totalPnL && s1.totalPnL === 100, `${s1.totalPnL} then ${s2.totalPnL}`);
  check('stats: realized 40, unrealized 60', s1.realizedPnL === 40 && s1.unrealizedPnL === 60);
  check('stats: win rate 100% (1 profitable sell of 1)', s1.winRate === 100, `winRate ${s1.winRate}`);
  let stored = await TradingAccount.findOne({ user: user._id }).lean();
  check('stats: stored BUY quantity untouched', stored.orders[0].quantity === 10, `quantity ${stored.orders[0].quantity}`);
  check('stored win rate counts sells only', stored.tradingStats.winRate === 100, `stored ${stored.tradingStats.winRate}`);

  // ---- fully closed position no longer 500s
  r = await order({ symbol: 'TCS', type: 'SELL', quantity: 6, orderType: 'MARKET' });
  const s3 = await stats();
  check('stats: works after position fully closed', s3.status === 200 && s3.body.data.trades.every(t => t.status === 'CLOSED'), `HTTP ${s3.status}`);
  check('stats: realized P&L 100 after closing', s3.body.data.realizedPnL === 100 && s3.body.data.totalPnL === 100);
  check('stats: best trade reported', s3.body.data.bestTrade && s3.body.data.bestTrade.symbol === 'TCS.NS');

  // ---- limit orders
  prices['INFY.NS'] = 200;
  r = await order({ symbol: 'INFY', type: 'BUY', quantity: 5, orderType: 'LIMIT', price: 190 });
  check('limit buy below market stays pending', r.status === 201 && r.body.data.order.status === 'PENDING', r.body.message);
  let acct = await account();
  const walletBefore = acct.walletBalance;
  check('pending limit order does not move money', acct.holdings.length === 0);

  prices['INFY.NS'] = 195;
  check('still pending while price above limit', (await orders()).find(o => o.symbol === 'INFY.NS').status === 'PENDING');

  prices['INFY.NS'] = 188;
  const list = await orders();
  const filled = list.find(o => o.symbol === 'INFY.NS');
  check('limit buy fills when price drops to/below limit', filled.status === 'EXECUTED' && filled.executedPrice === 188, `${filled.status} @ ${filled.executedPrice}`);
  acct = await account();
  check('wallet debited at fill price', Math.abs(acct.walletBalance - (walletBefore - 188 * 5)) < 1e-6, `${acct.walletBalance}`);
  check('holding created', acct.holdings.length === 1 && acct.holdings[0].quantity === 5);

  // limit sell above market: pending, then fills
  r = await order({ symbol: 'INFY', type: 'SELL', quantity: 5, orderType: 'LIMIT', price: 210 });
  check('limit sell above market stays pending', r.body.data.order.status === 'PENDING');
  prices['INFY.NS'] = 215;
  const cron = await orderEngine.processAllPendingOrders();
  check('scheduled run fills the limit sell', cron.filled === 1, JSON.stringify(cron));
  acct = await account();
  check('holding removed after limit sell', acct.holdings.length === 0);

  // marketable limit order fills immediately at the live price
  prices['INFY.NS'] = 100;
  r = await order({ symbol: 'INFY', type: 'BUY', quantity: 1, orderType: 'LIMIT', price: 120 });
  check('marketable limit buy fills at once at market price', r.body.data.order.status === 'EXECUTED' && r.body.data.order.executedPrice === 100);

  // cancel a pending order
  r = await order({ symbol: 'INFY', type: 'BUY', quantity: 1, orderType: 'LIMIT', price: 50 });
  const pendingId = r.body.data.order.id;
  r = await api.put(`/api/v1/trading/orders/${pendingId}/cancel`).set(auth).send({});
  check('pending order can be cancelled', r.status === 200 && r.body.data.order.status === 'CANCELLED');

  // order that can no longer be afforded is cancelled with a reason, not filled
  acct = await account();
  const affordable = Math.floor(acct.walletBalance / 90);
  r = await order({ symbol: 'INFY', type: 'BUY', quantity: affordable, orderType: 'LIMIT', price: 90 });
  check('large limit buy accepted as pending', r.body.data.order.status === 'PENDING');
  const bigId = r.body.data.order.id;
  r = await order({ symbol: 'INFY', type: 'BUY', quantity: 20, orderType: 'MARKET' }); // spend some of the money
  prices['INFY.NS'] = 89;
  const after = (await orders()).find(o => o.id === bigId);
  check('unaffordable limit order is cancelled with a reason', after.status === 'CANCELLED' && /Insufficient/.test(after.cancelReason || ''), `${after.status}: ${after.cancelReason}`);

  // stale pending order expires
  r = await order({ symbol: 'INFY', type: 'BUY', quantity: 1, orderType: 'LIMIT', price: 10 });
  const staleId = r.body.data.order.id;
  await TradingAccount.updateOne(
    { user: user._id, 'orders.id': staleId },
    { $set: { 'orders.$.timestamp': new Date(Date.now() - 8 * 24 * 60 * 60 * 1000) } }
  );
  const expired = (await orders()).find(o => o.id === staleId);
  check('limit order older than 7 days expires', expired.status === 'CANCELLED' && /Expired/.test(expired.cancelReason), expired.cancelReason);

  // ---- two simultaneous buys cannot both spend the same money
  const { auth: auth2, user: user2 } = await h.makeUser();
  await api.get('/api/v1/trading/account').set(auth2);
  prices['TCS.NS'] = 100;
  const both = await Promise.all([
    api.post('/api/v1/trading/orders').set(auth2).send({ symbol: 'TCS', type: 'BUY', quantity: 80, orderType: 'MARKET' }),
    api.post('/api/v1/trading/orders').set(auth2).send({ symbol: 'TCS', type: 'BUY', quantity: 80, orderType: 'MARKET' }),
  ]);
  const okCount = both.filter(x => x.status === 201).length;
  const acct2 = await TradingAccount.findOne({ user: user2._id }).lean();
  check('concurrent orders: only one of two ₹8000 buys succeeds on ₹10000', okCount === 1, `statuses ${both.map(x => x.status)}`);
  check('concurrent orders: wallet never negative, one holding', acct2.walletBalance === 2000 && acct2.holdings.length === 1, `wallet ${acct2.walletBalance}, holdings ${acct2.holdings.length}`);

  // ---- validation still rejects bad input
  r = await api.post('/api/v1/trading/orders').set(auth2).send({ symbol: 'TCS', type: 'BUY', quantity: -5, orderType: 'MARKET' });
  check('negative quantity rejected', r.status === 400);
  r = await api.post('/api/v1/trading/orders').send({ symbol: 'TCS', type: 'BUY', quantity: 1, orderType: 'MARKET' });
  check('unauthenticated order rejected', r.status === 401);

  await h.finish();
})().catch(e => { out('script error:', e.stack); process.exit(1); });
