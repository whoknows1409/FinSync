const h = require('./harness');
const { out, check } = h;

const day = (offsetDays = 0) => {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d;
};
const iso = d => d.toISOString().slice(0, 10);

(async () => {
  const api = await h.start();
  const Budget = h.req('models/Budget');
  const Transaction = h.req('models/Transaction');
  const RecurringTransaction = h.req('models/RecurringTransaction');
  const Notification = h.req('models/Notification');
  const budgetService = h.req('services/budgetService');
  const recurringService = h.req('services/recurringService');
  const { auth, user } = await h.makeUser();

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const monthEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0));
  const addTxn = body => api.post('/api/v1/transactions').set(auth).send(body);
  const notifications = async () => (await api.get('/api/v1/notifications').set(auth)).body.data;

  // ---------- budget spent amount keeps saving past 50% and alerts once
  let r = await api.post('/api/v1/budgets').set(auth).send({
    name: 'Food', category: 'Food & Dining', totalAmount: 1000, period: 'monthly',
    startDate: iso(monthStart), endDate: iso(monthEnd),
  });
  check('budget created', r.status === 201, `HTTP ${r.status}`);
  const budgetId = r.body.data._id;
  const stored = async () => Budget.findById(budgetId).lean();

  await addTxn({ type: 'expense', amount: 300, category: 'Food & Dining', description: 'groceries', date: now.toISOString() });
  check('spent 300 saved', (await stored()).spentAmount === 300);
  await addTxn({ type: 'expense', amount: 300, category: 'Food & Dining', description: 'dinner', date: now.toISOString() });
  check('spent 600 saved (used to stop saving at 50%)', (await stored()).spentAmount === 600, `stored ${(await stored()).spentAmount}`);
  check('no alert below the 80% threshold', (await notifications()).notifications.filter(n => n.category === 'budget').length === 0);

  r = await addTxn({ type: 'expense', amount: 250, category: 'Food & Dining', description: 'party', date: now.toISOString() });
  const txnId = r.body.data._id;
  let n = await notifications();
  check('spent 850 saved', (await stored()).spentAmount === 850);
  check('one alert at 85%', n.notifications.filter(x => x.category === 'budget').length === 1 && n.unreadCount >= 1, n.notifications.map(x => x.title).join(' | '));

  await addTxn({ type: 'expense', amount: 10, category: 'Food & Dining', description: 'tea', date: now.toISOString() });
  check('no repeat alert while still between 80% and 100%', (await notifications()).notifications.filter(x => x.category === 'budget').length === 1);

  await addTxn({ type: 'expense', amount: 200, category: 'Food & Dining', description: 'more', date: now.toISOString() });
  n = await notifications();
  check('exceeded alert at 106%', n.notifications.some(x => x.title === 'Budget exceeded') && (await stored()).alerts.exceeded === true);

  // editing a transaction to another category refreshes both budgets
  r = await api.put(`/api/v1/transactions/${txnId}`).set(auth).send({ category: 'Shopping' });
  check('moving a transaction out lowers the old budget', (await stored()).spentAmount === 810, `stored ${(await stored()).spentAmount}`);

  // mass assignment: owner cannot be changed through the update
  const other = await h.makeUser();
  r = await api.put(`/api/v1/transactions/${txnId}`).set(auth).send({ user: String(other.user._id), amount: 251 });
  const t = await Transaction.findById(txnId).lean();
  check('update ignores "user" field but applies amount', String(t.user) === String(user._id) && t.amount === 251);
  r = await api.put(`/api/v1/budgets/${budgetId}`).set(auth).send({ user: String(other.user._id), spentAmount: 0, totalAmount: 2000 });
  let b = await stored();
  check('budget update ignores owner and spentAmount', String(b.user) === String(user._id) && b.spentAmount === 810 && b.totalAmount === 2000, `spent ${b.spentAmount}`);
  r = await api.put(`/api/v1/budgets/${budgetId}`).set(auth).send({ status: 'inactive' });
  check('switching a budget off works (inactive -> paused)', r.status === 200 && (await stored()).status === 'paused', `HTTP ${r.status}`);
  await api.put(`/api/v1/budgets/${budgetId}`).set(auth).send({ status: 'active' });
  r = await api.put(`/api/v1/transactions/${txnId}`).set(other.auth).send({ amount: 1 });
  check("another user cannot edit someone else's transaction", r.status === 401);

  // ---------- fixed budget routes are reachable
  r = await api.get('/api/v1/budgets/summary').set(auth);
  check('GET /budgets/summary reachable', r.status === 200 && r.body.data.summary !== undefined, `HTTP ${r.status}`);
  r = await api.get('/api/v1/budgets/category-performance').set(auth);
  check('GET /budgets/category-performance reachable', r.status === 200 && Array.isArray(r.body.data.performance), `HTTP ${r.status}`);
  r = await api.delete('/api/v1/budgets/cleanup').set(auth);
  check('DELETE /budgets/cleanup reachable', r.status === 200, `HTTP ${r.status}`);
  r = await api.get(`/api/v1/budgets/${budgetId}`).set(auth);
  check('GET /budgets/:id still works', r.status === 200 && r.body.data.budget._id === budgetId);

  // ---------- rollover: ended budget -> one new current period, no duplicates
  const u2 = await h.makeUser();
  const old = await Budget.create({
    user: u2.user._id, name: 'Rent', category: 'Housing', totalAmount: 5000, period: 'monthly',
    startDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, 1)),
    endDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 2, 0)),
    isRollover: true, status: 'active',
  });
  await Transaction.create({ user: u2.user._id, type: 'expense', amount: 4000, category: 'Housing', description: 'rent', date: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 3, 5)) });

  for (let i = 0; i < 3; i++) await budgetService.rollOverExpiredBudgets();
  await Promise.all([budgetService.rollOverExpiredBudgets(), budgetService.rollOverExpiredBudgets(u2.user._id)]);
  const all = await Budget.find({ user: u2.user._id }).sort({ startDate: 1 }).lean();
  const active = all.filter(x => x.status === 'active');
  check('rollover: exactly one active budget after repeated runs', active.length === 1 && all.length === 2, `${all.length} budgets, ${active.length} active`);
  check('rollover: old period marked completed with final spent', all[0].status === 'completed' && all[0].spentAmount === 4000);
  check('rollover: new period is the current month', iso(active[0].startDate) === iso(monthStart) && iso(active[0].endDate) === iso(monthEnd), `${iso(active[0].startDate)}..${iso(active[0].endDate)}`);
  check('rollover: unspent 1000 carried forward once', active[0].totalAmount === 6000 && active[0].rolloverAmount === 1000, `total ${active[0].totalAmount}`);
  r = await api.get('/api/v1/budgets').set(u2.auth);
  check('GET /budgets lists both, UI-visible one is current', r.body.data.filter(x => x.status === 'active').length === 1);

  // creating a budget for the same category updates the active one, not the completed one
  r = await api.post('/api/v1/budgets').set(u2.auth).send({ category: 'Housing', totalAmount: 7000, period: 'monthly' });
  const after = await Budget.find({ user: u2.user._id }).lean();
  check('re-adding updates the active budget only', after.length === 2 && after.find(x => x.status === 'active').totalAmount === 7000 && after.find(x => x.status === 'completed').totalAmount === 5000);

  // ---------- recurring transactions
  const u3 = await h.makeUser();
  const rec = await RecurringTransaction.create({
    user: u3.user._id, type: 'expense', amount: 100, category: 'Entertainment', description: 'Streaming',
    frequency: 'daily', startDate: day(-10), lastProcessed: day(-5), isActive: true,
  });
  // Occurrences are dated at UTC midnight and fall due when that day starts in IST,
  // so late in the UTC evening tomorrow's (already today's in India) is due too.
  const { startOfLocalDay } = h.req('utils/schedule');
  let expected = 0;
  while (startOfLocalDay(day(-4 + expected)) <= new Date()) expected++;
  out(`      (expecting ${expected} occurrences at this time of day)`);
  r = await api.post('/api/v1/transactions/recurring/process').set(u3.auth);
  check('process: catches up every missed day exactly once', r.body.processedCount === expected && expected >= 5, `processed ${r.body.processedCount}`);
  r = await api.post('/api/v1/transactions/recurring/process').set(u3.auth);
  check('process: second run creates nothing (used to duplicate)', r.body.processedCount === 0, `processed ${r.body.processedCount}`);
  const both = await Promise.all([recurringService.processDueTransactions(), recurringService.processDueTransactions(u3.user._id)]);
  let count = await Transaction.countDocuments({ user: u3.user._id });
  check('process: concurrent runs create no duplicates', count === expected, `${count} transactions`);
  const dates = (await Transaction.find({ user: u3.user._id }).sort({ date: 1 }).lean()).map(x => iso(x.date));
  check('process: one per day, back-dated correctly', new Set(dates).size === expected && dates[0] === iso(day(-4)) && dates[expected - 1] === iso(day(expected - 5)), dates.join(','));
  check('recurring notification created', (await Notification.countDocuments({ user: u3.user._id, category: 'recurring' })) === 1);

  // pause, time passes, resume: the paused time is not back-filled
  await api.put(`/api/v1/transactions/recurring/${rec._id}`).set(u3.auth).send({ isActive: false });
  await RecurringTransaction.updateOne({ _id: rec._id }, { $set: { lastProcessed: day(-30) } });
  await api.put(`/api/v1/transactions/recurring/${rec._id}`).set(u3.auth).send({ isActive: true });
  await api.get('/api/v1/transactions').set(u3.auth);
  count = await Transaction.countDocuments({ user: u3.user._id });
  check('resume after pause does not back-fill the paused period', count === expected, `${count} transactions`);

  // monthly on the 31st does not drift
  const { nextOccurrence } = h.req('utils/schedule');
  const start = new Date(Date.UTC(2026, 0, 31));
  const feb = nextOccurrence(start, 'monthly', start);
  const mar = nextOccurrence(feb, 'monthly', start);
  check('monthly from Jan 31: Feb 28 then back to Mar 31', iso(feb) === '2026-02-28' && iso(mar) === '2026-03-31', `${iso(feb)}, ${iso(mar)}`);

  // GET /transactions adds due recurring items
  const u4 = await h.makeUser();
  await RecurringTransaction.create({ user: u4.user._id, type: 'income', amount: 50000, category: 'Salary', description: 'Salary', frequency: 'monthly', startDate: day(-1), isActive: true });
  r = await api.get('/api/v1/transactions').set(u4.auth);
  check('opening transactions adds a due recurring item', r.body.count === 1 && r.body.data[0].isRecurring === true);

  // ended recurring item is deactivated
  const ended = await RecurringTransaction.create({ user: u4.user._id, type: 'expense', amount: 10, category: 'Shopping', description: 'old', frequency: 'daily', startDate: day(-20), endDate: day(-18), isActive: true });
  await recurringService.processDueTransactions(u4.user._id);
  check('item past its end date: 3 occurrences then deactivated', (await Transaction.countDocuments({ recurringId: ended._id })) === 3 && (await RecurringTransaction.findById(ended._id)).isActive === false);

  // ---------- notifications API
  n = await notifications();
  const first = n.notifications[0];
  r = await api.put(`/api/v1/notifications/${first.id}/read`).set(auth);
  check('mark one read', r.status === 200 && r.body.data.read === true);
  r = await api.put('/api/v1/notifications/read-all').set(auth);
  check('mark all read', (await notifications()).unreadCount === 0);
  r = await api.put(`/api/v1/notifications/${first.id}/read`).set(other.auth);
  check("cannot touch another user's notification", r.status === 404);
  r = await api.delete(`/api/v1/notifications/${first.id}`).set(auth);
  check('delete one', r.status === 200);
  r = await api.get('/api/v1/notifications');
  check('notifications require login', r.status === 401);

  // large expense notification
  await addTxn({ type: 'expense', amount: 9000, category: 'Shopping', description: 'phone', date: now.toISOString() });
  check('large expense notification', (await notifications()).notifications.some(x => x.title === 'Large expense recorded'));

  // preference off -> no budget alerts
  const User = h.req('models/User');
  const u5 = await h.makeUser();
  await User.updateOne({ _id: u5.user._id }, { $set: { 'notificationPreferences.budgetAlerts': false } });
  await api.post('/api/v1/budgets').set(u5.auth).send({ category: 'Travel', totalAmount: 100, period: 'monthly' });
  await api.post('/api/v1/transactions').set(u5.auth).send({ type: 'expense', amount: 500, category: 'Travel', description: 'cab', date: now.toISOString() });
  check('budget alerts respect the user preference', (await Notification.countDocuments({ user: u5.user._id, category: 'budget' })) === 0);

  await h.finish();
})().catch(e => { out('script error:', e.stack); process.exit(1); });
