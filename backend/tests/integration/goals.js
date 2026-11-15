const h = require('./harness');
const { out, check } = h;

const future = days => new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

(async () => {
  const api = await h.start();
  const FinancialGoal = h.req('models/FinancialGoal');
  const Notification = h.req('models/Notification');
  const { auth, user } = await h.makeUser();
  const other = await h.makeUser();
  let r;

  r = await api.get('/api/v1/goals').set(auth);
  check('new user has no goals (no demo data)', r.status === 200 && r.body.data.length === 0 && r.body.summary.totalGoals === 0);

  r = await api.post('/api/v1/goals').set(auth).send({ name: 'Emergency fund', type: 'emergency_fund', targetAmount: 100000, targetDate: future(200), currentAmount: 20000, priority: 'high' });
  check('create goal with a starting balance', r.status === 201 && r.body.data.currentAmount === 20000 && r.body.data.progressPercentage === 20 && r.body.data.contributions.length === 1, `HTTP ${r.status} ${JSON.stringify(r.body.errors || r.body.message || '')}`);
  const id = r.body.data._id;

  r = await api.post('/api/v1/goals').set(auth).send({ name: '', type: 'savings', targetAmount: -5, targetDate: future(-3) });
  check('invalid goal rejected with field messages', r.status === 400 && Array.isArray(r.body.errors) && r.body.errors.length >= 2, `HTTP ${r.status}`);

  r = await api.post(`/api/v1/goals/${id}/contributions`).set(auth).send({ amount: 30000, notes: 'bonus' });
  check('add money', r.status === 200 && r.body.data.currentAmount === 50000 && r.body.data.amountRemaining === 50000);
  r = await api.post(`/api/v1/goals/${id}/contributions`).set(auth).send({ amount: -10000 });
  check('take money out', r.status === 200 && r.body.data.currentAmount === 40000);
  r = await api.post(`/api/v1/goals/${id}/contributions`).set(auth).send({ amount: -999999 });
  check('cannot take out more than was saved', r.status === 400 && (await FinancialGoal.findById(id)).currentAmount === 40000, r.body.message);
  r = await api.post(`/api/v1/goals/${id}/contributions`).set(auth).send({ amount: 'abc' });
  check('non-numeric amount rejected', r.status === 400);

  r = await api.post(`/api/v1/goals/${id}/contributions`).set(auth).send({ amount: 60000 });
  check('reaching the target completes the goal', r.body.data.status === 'completed' && r.body.data.progressPercentage === 100);
  check('goal reached notification', (await Notification.countDocuments({ user: user._id, title: 'Goal reached' })) === 1);
  r = await api.post(`/api/v1/goals/${id}/contributions`).set(auth).send({ amount: -5000 });
  check('taking money out reopens the goal', r.body.data.status === 'active');

  r = await api.put(`/api/v1/goals/${id}`).set(auth).send({ name: 'Rainy day fund', targetAmount: 120000, user: String(other.user._id), currentAmount: 1, contributions: [] });
  let g = await FinancialGoal.findById(id);
  check('update changes allowed fields only', r.status === 200 && g.name === 'Rainy day fund' && g.targetAmount === 120000 && String(g.user) === String(user._id) && g.currentAmount === 95000 && g.contributions.length === 5);
  r = await api.put(`/api/v1/goals/${id}`).set(auth).send({ status: 'paused' });
  check('pause a goal', r.body.data.status === 'paused');
  r = await api.put(`/api/v1/goals/${id}`).set(auth).send({ status: 'nonsense' });
  check('invalid status rejected', r.status === 400);

  // ownership
  r = await api.put(`/api/v1/goals/${id}`).set(other.auth).send({ name: 'hacked' });
  check("cannot edit another user's goal", r.status === 404);
  r = await api.post(`/api/v1/goals/${id}/contributions`).set(other.auth).send({ amount: 1 });
  check("cannot add money to another user's goal", r.status === 404);
  r = await api.delete(`/api/v1/goals/${id}`).set(other.auth);
  check("cannot delete another user's goal", r.status === 404 && !!(await FinancialGoal.findById(id)));
  r = await api.get('/api/v1/goals');
  check('goals require login', r.status === 401);
  r = await api.put('/api/v1/goals/not-an-id').set(auth).send({ name: 'x' });
  check('malformed id handled', r.status === 400 || r.status === 404, `HTTP ${r.status}`);

  // deadline notification, sent once
  await FinancialGoal.create({ user: user._id, name: 'Trip', type: 'purchase', targetAmount: 50000, currentAmount: 1000, targetDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) });
  await api.get('/api/v1/goals').set(auth);
  await api.get('/api/v1/goals').set(auth);
  check('deadline approaching: notified exactly once', (await Notification.countDocuments({ user: user._id, title: 'Goal deadline approaching' })) === 1);

  r = await api.get('/api/v1/goals').set(auth);
  check('summary totals', r.body.summary.totalGoals === 2 && r.body.summary.totalTargetAmount === 170000 && r.body.summary.totalSavedAmount === 96000, JSON.stringify(r.body.summary));

  // other parts of the app now see the goals
  r = await api.get('/api/v1/profile/stats').set(auth);
  check('profile stats count goals', r.status === 200 && r.body.data.activeGoals === 1, JSON.stringify(r.body.data));
  r = await api.get('/api/v1/users/dashboard').set(auth);
  check('dashboard lists active goals with progress', r.status === 200 && r.body.data.activeGoals.length === 1 && r.body.data.activeGoals[0].progressPercentage === 2, `HTTP ${r.status}`);
  r = await api.get('/api/export/all').set(auth);
  const exported = JSON.parse(r.text);
  check('export includes goals with real fields', exported.goals.length === 2 && exported.goals.some(x => x.name === 'Rainy day fund' && x.targetAmount === 120000 && x.contributions.length === 5));

  r = await api.delete(`/api/v1/goals/${id}`).set(auth);
  check('delete goal', r.status === 200 && !(await FinancialGoal.findById(id)));

  // export: budgets carry real numbers, CSV is quoted
  const now = new Date();
  await api.post('/api/v1/budgets').set(auth).send({ category: 'Shopping', totalAmount: 5000, period: 'monthly' });
  await api.post('/api/v1/transactions').set(auth).send({ type: 'expense', amount: 1200, category: 'Shopping', description: 'Shoes, socks and a "belt"', date: now.toISOString() });
  await api.post('/api/v1/transactions').set(auth).send({ type: 'expense', amount: 10, category: 'Shopping', description: '=HYPERLINK("http://x")', date: now.toISOString() });
  r = await api.get('/api/export/all').set(auth);
  const data = JSON.parse(r.text);
  const b = data.budgets.find(x => x.category === 'Shopping');
  check('export: budget has totalAmount and spentAmount', b && b.totalAmount === 5000 && b.spentAmount === 1210, JSON.stringify(b));
  r = await api.get('/api/export/csv').set(auth);
  const lines = r.text.trim().split('\n');
  check('csv: commas and quotes in a description stay in one column', lines.some(l => l.includes('"Shoes, socks and a ""belt"""')) && lines.length === 3, lines[1]);
  check('csv: formula-like text is neutralised', lines.some(l => l.includes(`"'=HYPERLINK`)));

  await h.finish();
})().catch(e => { out('script error:', e.stack); process.exit(1); });
