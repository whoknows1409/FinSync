// Shared setup for the integration checks in this folder.
//
// They load the real Express app and talk to a real MongoDB, with live stock
// prices replaced by values the test sets, so nothing reaches the network.
//
// THE DATABASE IS WIPED before and after each run. To make it impossible to
// point this at real data by accident, the database name must end in "_test".
//
//   MONGODB_TEST_URI=mongodb://127.0.0.1:27017/finsync_test npm run test:integration
const path = require('path');

const backend = path.join(__dirname, '..', '..');
const uri = process.env.MONGODB_TEST_URI;

if (!uri) {
  console.error('Set MONGODB_TEST_URI to a throwaway database, for example:');
  console.error('  MONGODB_TEST_URI=mongodb://127.0.0.1:27017/finsync_test npm run test:integration');
  process.exit(2);
}

const databaseName = (() => {
  try {
    return new URL(uri).pathname.replace(/^\//, '');
  } catch {
    return '';
  }
})();

if (!/_test$/.test(databaseName)) {
  console.error(`Refusing to run: these checks wipe the database, and "${databaseName}" does not end in "_test".`);
  process.exit(2);
}

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.MONGODB_URI = uri;
process.env.LOG_LEVEL = 'error';
delete process.env.SENDGRID_API_KEY;
delete process.env.GOOGLE_CLIENT_ID;

const req = p => require(path.join(backend, p));
const mongoose = req('node_modules/mongoose');
const jwt = req('node_modules/jsonwebtoken');
const supertest = req('node_modules/supertest');

// Silence the app's console output; checks print through `out`
const out = (...args) => process.stdout.write(args.join(' ') + '\n');
console.log = () => {};
console.error = () => {};
console.warn = () => {};
console.info = () => {};

// Live prices come from here instead of Yahoo Finance: prices['TCS.NS'] = 100
const prices = {};
const marketData = req('services/marketDataService');
marketData.getQuote = async rawSymbol => {
  const symbol = String(rawSymbol).toUpperCase();
  const key = prices[symbol] != null ? symbol : (prices[`${symbol}.NS`] != null ? `${symbol}.NS` : null);
  if (!key) {
    const err = new Error('Stock not found');
    err.status = 404;
    throw err;
  }
  return {
    symbol: key, name: `${key} Ltd`, currentPrice: prices[key], previousClose: prices[key],
    change: 0, changePercent: 0, volume: 1000, marketCap: 1e9, marketState: 'REGULAR',
    lastUpdated: new Date().toISOString(),
  };
};

let failures = 0;
const check = (label, condition, detail = '') => {
  if (!condition) failures++;
  out(`${condition ? 'PASS' : 'FAIL'}  ${label}${detail ? `  [${detail}]` : ''}`);
};

async function start() {
  await mongoose.connect(uri);
  await mongoose.connection.dropDatabase();
  return supertest(req('app'));
}

// A verified user with a login token, ready to make requests
async function makeUser(overrides = {}) {
  const User = req('models/User');
  const user = await User.create({
    name: 'Test User', email: `user${Date.now()}${Math.floor(Math.random() * 1e6)}@example.com`,
    password: 'Passw0rd!', isEmailVerified: true, ...overrides,
  });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
  return { user, token, auth: { Authorization: `Bearer ${token}` } };
}

async function finish() {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
  out(failures === 0 ? '\nALL PASSED' : `\n${failures} FAILED`);
  process.exit(failures === 0 ? 0 : 1);
}

module.exports = { req, mongoose, out, prices, check, start, makeUser, finish, backend };
