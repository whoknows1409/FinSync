const h = require('./harness');
const { out, check } = h;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

(async () => {
  const api = await h.start();
  const User = h.req('models/User');
  const Transaction = h.req('models/Transaction');
  const Budget = h.req('models/Budget');
  const FinancialGoal = h.req('models/FinancialGoal');
  const Notification = h.req('models/Notification');
  const TradingAccount = h.req('models/TradingAccount');
  const emailService = h.req('utils/emailService');
  let r;

  const { user, auth } = await h.makeUser();
  const login = (email, password) => api.post('/api/auth/login').send({ email, password });

  // ---------- forgot / reset
  r = await api.post('/api/auth/forgot-password').send({ email: user.email });
  check('forgot: refused clearly when email service is down', r.status === 503);

  let sent = null;
  emailService.isConfigured = true;
  emailService.sendPasswordResetEmail = async (to, token) => { sent = { to, token }; };

  r = await api.post('/api/auth/forgot-password').send({ email: 'nobody@example.com' });
  const unknownMessage = r.body.message;
  check('forgot: unknown address gets the generic answer and no email', r.status === 200 && sent === null);
  r = await api.post('/api/auth/forgot-password').send({ email: user.email.toUpperCase() });
  check('forgot: known address gets the same answer, and an email', r.status === 200 && r.body.message === unknownMessage && sent && sent.to === user.email);
  const stored = await User.findById(user._id);
  check('forgot: only a hash of the token is stored', stored.passwordResetToken && stored.passwordResetToken !== sent.token && stored.passwordResetToken.length === 64);

  r = await api.post('/api/auth/reset-password').send({ token: 'wrong-token', password: 'NewPassw0rd!' });
  check('reset: wrong token rejected', r.status === 400);
  r = await api.post('/api/auth/reset-password').send({ token: sent.token, password: 'short' });
  check('reset: short password rejected', r.status === 400);

  await sleep(1100); // so the old token is clearly older than the reset
  r = await api.post('/api/auth/reset-password').send({ token: sent.token, password: 'NewPassw0rd!' });
  check('reset: valid token sets the new password', r.status === 200, r.body.message);
  r = await api.post('/api/auth/reset-password').send({ token: sent.token, password: 'Another1234' });
  check('reset: link works only once', r.status === 400);
  check('reset: old password no longer works', (await login(user.email, 'Passw0rd!')).status === 401);
  r = await login(user.email, 'NewPassw0rd!');
  check('reset: new password works', r.status === 200 && !!r.body.token);
  let token = r.body.token;
  r = await api.get('/api/auth/me').set(auth);
  check('reset: sessions from before the reset are signed out', r.status === 401);

  // expired link
  sent = null;
  await api.post('/api/auth/forgot-password').send({ email: user.email });
  await User.updateOne({ _id: user._id }, { $set: { passwordResetExpires: new Date(Date.now() - 1000) } });
  r = await api.post('/api/auth/reset-password').send({ token: sent.token, password: 'Another1234' });
  check('reset: expired link rejected', r.status === 400);

  // email flood limit: 3 per hour per address
  const statuses = [];
  for (let i = 0; i < 3; i++) statuses.push((await api.post('/api/auth/forgot-password').send({ email: user.email })).status);
  check('forgot: after 3 requests in an hour for one address, more are refused', statuses.every(x => x === 429), statuses.join(','));

  // google account: generic answer, no email
  const g = await h.makeUser({ authProvider: 'google', googleId: 'g-1' });
  sent = null;
  r = await api.post('/api/auth/forgot-password').send({ email: g.user.email });
  check('forgot: Google account gets no reset email', r.status === 200 && sent === null);

  // ---------- change password
  const bearer = t => ({ Authorization: `Bearer ${t}` });
  r = await api.post('/api/auth/change-password').set(bearer(token)).send({ currentPassword: 'nope', newPassword: 'Changed12345' });
  check('change: wrong current password rejected', r.status === 400);
  r = await api.post('/api/auth/change-password').set(bearer(token)).send({ currentPassword: 'NewPassw0rd!', newPassword: 'short' });
  check('change: short new password rejected', r.status === 400);
  await sleep(1100);
  r = await api.post('/api/auth/change-password').set(bearer(token)).send({ currentPassword: 'NewPassw0rd!', newPassword: 'Changed12345' });
  check('change: succeeds and returns a fresh token', r.status === 200 && !!r.body.token, r.body.message);
  const fresh = r.body.token;
  check('change: the old token stops working', (await api.get('/api/auth/me').set(bearer(token))).status === 401);
  check('change: the fresh token works', (await api.get('/api/auth/me').set(bearer(fresh))).status === 200);
  check('change: can sign in with the new password', (await login(user.email, 'Changed12345')).status === 200);
  r = await api.post('/api/auth/change-password').set(g.auth).send({ currentPassword: 'x', newPassword: 'Changed12345' });
  check('change: Google accounts are told there is no password', r.status === 400);

  // ---------- sign out everywhere
  r = await api.post('/api/auth/logout-all').set(bearer(fresh));
  check('logout-all: succeeds', r.status === 200);
  check('logout-all: this token is rejected afterwards', (await api.get('/api/auth/me').set(bearer(fresh))).status === 401);
  await sleep(1100);
  r = await login(user.email, 'Changed12345');
  check('logout-all: can sign in again', r.status === 200);
  token = r.body.token;

  // ---------- delete account
  const now = new Date().toISOString();
  await api.post('/api/v1/transactions').set(bearer(token)).send({ type: 'expense', amount: 9000, category: 'Shopping', description: 'tv', date: now });
  await api.post('/api/v1/budgets').set(bearer(token)).send({ category: 'Shopping', totalAmount: 100, period: 'monthly' });
  await api.post('/api/v1/goals').set(bearer(token)).send({ name: 'Bike', type: 'purchase', targetAmount: 1000, targetDate: new Date(Date.now() + 864e5 * 40).toISOString().slice(0, 10) });
  await api.get('/api/v1/trading/account').set(bearer(token));
  const counts = async id => ({
    transactions: await Transaction.countDocuments({ user: id }),
    budgets: await Budget.countDocuments({ user: id }),
    goals: await FinancialGoal.countDocuments({ user: id }),
    notifications: await Notification.countDocuments({ user: id }),
    trading: await TradingAccount.countDocuments({ user: id }),
  });
  const before = await counts(user._id);
  check('delete: test data exists first', Object.values(before).every(n => n > 0), JSON.stringify(before));

  const bystander = await h.makeUser();
  await api.post('/api/v1/transactions').set(bystander.auth).send({ type: 'income', amount: 5, category: 'Salary', description: 'keep me', date: now });

  r = await api.delete('/api/auth/account').set(bearer(token)).send({ password: 'wrong' });
  check('delete: wrong password rejected, nothing removed', r.status === 400 && !!(await User.findById(user._id)));
  r = await api.delete('/api/auth/account').set(bearer(token)).send({ password: 'Changed12345' });
  const after = await counts(user._id);
  check('delete: account and all of its data removed', r.status === 200 && !(await User.findById(user._id)) && Object.values(after).every(n => n === 0), JSON.stringify(after));
  check("delete: other users' data untouched", (await Transaction.countDocuments({ user: bystander.user._id })) === 1 && !!(await User.findById(bystander.user._id)));
  check('delete: token no longer works', (await api.get('/api/auth/me').set(bearer(token))).status === 401);
  check('delete: cannot sign in afterwards', (await login(user.email, 'Changed12345')).status === 401);

  r = await api.delete('/api/auth/account').set(g.auth).send({});
  check('delete: Google account must type DELETE', r.status === 400);
  r = await api.delete('/api/auth/account').set(g.auth).send({ confirm: 'DELETE' });
  check('delete: Google account deleted after confirming', r.status === 200 && !(await User.findById(g.user._id)));

  await h.finish();
})().catch(e => { out('script error:', e.stack); process.exit(1); });
