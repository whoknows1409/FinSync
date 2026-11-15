const h = require('./harness');
const { out, check } = h;

(async () => {
  const api = await h.start();
  const User = h.req('models/User');
  const emailService = h.req('utils/emailService');
  const gemini = h.req('utils/gemini');
  gemini.makeRequest = async () => JSON.stringify({ overview: 'ok', financialHealth: 'ok', recommendation: 'HOLD', keyFactors: ['a'], risks: ['b'], outlook: 'ok' });

  const { auth, user } = await h.makeUser();
  let r;

  // ---------- profile
  r = await api.put('/api/v1/profile').set(auth).send({ name: 'New <b>Name</b>', membershipType: 'Premium', bio: 'hello' });
  let fresh = await User.findById(user._id);
  check('profile: cannot self-upgrade membership', fresh.membershipType === 'Basic', fresh.membershipType);
  check('profile: name/bio updated and HTML stripped', fresh.name === 'New Name' && fresh.bio === 'hello');
  check('profile: response has no password hash or tokens', r.status === 200 && r.body.data.password === undefined && r.body.data.emailVerificationToken === undefined, Object.keys(r.body.data).join(','));
  r = await api.get('/api/auth/me').set(auth);
  check('/auth/me has no password hash', r.status === 200 && r.body.user.password === undefined && r.body.user.email === user.email);

  r = await api.put('/api/v1/profile').set(auth).send({ email: 'new@example.com' });
  check('profile: email change refused while email service is down, address unchanged', r.status === 503 && (await User.findById(user._id)).email === user.email, `HTTP ${r.status}`);

  let sent = null;
  emailService.isConfigured = true;
  emailService.sendVerificationEmail = async (to, token) => { sent = { to, token }; };
  emailService.sendWelcomeEmail = async () => { throw new Error('welcome email should not be sent for an email change'); };
  r = await api.put('/api/v1/profile').set(auth).send({ email: 'New@Example.com' });
  fresh = await User.findById(user._id);
  check('profile: new email held as pending, old one still active', r.status === 200 && r.body.emailChangePending === true && fresh.email === user.email && fresh.pendingEmail === 'new@example.com' && sent.to === 'new@example.com', r.body.message);
  r = await api.get(`/api/auth/verify-email/${sent.token}`);
  fresh = await User.findById(user._id);
  check('profile: email switches after the confirmation link', r.status === 200 && fresh.email === 'new@example.com' && !fresh.pendingEmail, r.body.message);

  const other = await h.makeUser();
  r = await api.put('/api/v1/profile').set(auth).send({ email: other.user.email });
  check('profile: cannot take an address that is in use', r.status === 400);
  const g = await h.makeUser({ authProvider: 'google', googleId: 'g-123' });
  r = await api.put('/api/v1/profile').set(g.auth).send({ email: 'x@example.com' });
  check('profile: Google accounts cannot change email here', r.status === 400);
  r = await api.put('/api/v1/profile').set(auth).send({ notificationPreferences: { budgetAlerts: false, stockAlerts: 'yes' } });
  fresh = await User.findById(user._id);
  check('profile: notification preferences saved (booleans only)', fresh.notificationPreferences.budgetAlerts === false && fresh.notificationPreferences.stockAlerts === true);

  // ---------- AI endpoints need a login
  const stock = { symbol: 'TCS.NS', name: 'TCS', currentPrice: 100, fiftyTwoWeekHigh: 120, fiftyTwoWeekLow: 80 };
  r = await api.post('/api/stocks-analysis/stock-analysis').send({ stock });
  check('stock-analysis: 401 without login', r.status === 401);
  r = await api.post('/api/stocks-analysis/stock-analysis').set(auth).send({ stock });
  check('stock-analysis: works when logged in', r.status === 200 && r.body.analysis.recommendation === 'HOLD', `HTTP ${r.status}`);
  r = await api.get('/api/stocks-analysis/compare?symbol1=TCS.NS&symbol2=INFY.NS');
  check('compare: 401 without login', r.status === 401);
  h.prices['TCS.NS'] = 100;
  r = await api.get('/api/stocks-analysis/stock-data?symbol=TCS.NS');
  check('plain stock data stays public', r.status === 200, `HTTP ${r.status}`);

  // AI allowance is per user
  let limited = 0;
  for (let i = 0; i < 62; i++) {
    r = await api.post('/api/stocks-analysis/stock-analysis').set(other.auth).send({ stock });
    if (r.status === 429) limited++;
  }
  check('AI limit: 60 per 15 min per user, then 429', limited === 2, `${limited} limited`);
  r = await api.post('/api/stocks-analysis/stock-analysis').set(auth).send({ stock });
  check('AI limit: another user is unaffected', r.status === 200);

  // ---------- body limits
  const big = 'x'.repeat(3 * 1024 * 1024);
  r = await api.post('/api/v1/transactions').set(auth).send({ description: big });
  check('3 MB JSON rejected on ordinary routes', r.status === 413, `HTTP ${r.status}`);
  r = await api.put('/api/v1/profile').set(auth).send({ profileImage: `data:image/png;base64,${big}` });
  check('3 MB JSON still accepted on profile route', r.status === 200, `HTTP ${r.status}`);
  r = await api.post('/api/v1/transactions').set(auth).set('Content-Type', 'application/json').send('{bad json');
  check('malformed JSON gives 400', r.status === 400);

  // ---------- login attempts per account
  const victim = await h.makeUser();
  const statuses = [];
  for (let i = 0; i < 12; i++) {
    r = await api.post('/api/auth/login').send({ email: victim.user.email, password: 'wrong' });
    statuses.push(r.status);
  }
  check('login: 10 wrong passwords then locked for that account', statuses.slice(0, 10).every(s => s === 401) && statuses[10] === 429 && statuses[11] === 429, statuses.join(','));
  r = await api.post('/api/auth/login').send({ email: other.user.email, password: 'Passw0rd!' });
  check('login: other accounts unaffected', r.status === 200 && !!r.body.token, `HTTP ${r.status}`);

  // ---------- token revocation
  await User.updateOne({ _id: other.user._id }, { $set: { tokensValidAfter: new Date(Date.now() + 60000) } });
  r = await api.get('/api/auth/me').set(other.auth);
  check('tokens issued before tokensValidAfter are rejected', r.status === 401 && /expired/i.test(r.body.message), r.body.message);

  // ---------- Google access token must belong to this app
  const realFetch = global.fetch;
  let tokeninfo = { aud: 'someone-else.apps.googleusercontent.com', azp: 'someone-else.apps.googleusercontent.com' };
  global.fetch = async url => {
    const body = String(url).includes('tokeninfo')
      ? tokeninfo
      : { sub: 'google-sub-1', email: 'guser@example.com', email_verified: true, name: 'G User', picture: 'https://example.com/p.png' };
    return { ok: true, status: 200, json: async () => body };
  };
  process.env.GOOGLE_CLIENT_ID = 'finsync.apps.googleusercontent.com';
  r = await api.post('/api/auth/google').send({ credential: 'access_token:abc' });
  check("google: token issued to another app is refused", r.status === 401 && !(await User.exists({ email: 'guser@example.com' })), `HTTP ${r.status}`);
  tokeninfo = { aud: 'finsync.apps.googleusercontent.com', azp: 'finsync.apps.googleusercontent.com' };
  r = await api.post('/api/auth/google').send({ credential: 'access_token:abc' });
  check('google: token issued to this app signs in', r.status === 200 && !!r.body.token, `HTTP ${r.status}`);
  delete process.env.GOOGLE_CLIENT_ID;
  tokeninfo = { aud: 'whatever' };
  r = await api.post('/api/auth/google').send({ credential: 'access_token:abc' });
  check('google: with GOOGLE_CLIENT_ID unset, sign-in still works as before', r.status === 200, `HTTP ${r.status}`);
  global.fetch = realFetch;

  await h.finish();
})().catch(e => { out('script error:', e.stack); process.exit(1); });
