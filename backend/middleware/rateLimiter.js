const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = require('express-rate-limit');

// Requests reach the API through the Next.js server, so many users can share
// one IP address. Limits that must protect an individual account or an
// individual user's quota are therefore keyed by email or user ID, not by IP.

// Strict rate limit for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 50,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// Password guessing against one account: 10 failed attempts per 15 minutes
// for a given email address, wherever the attempts come from.
const accountLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    return email ? `account:${email}` : ipKeyGenerator(req.ip);
  },
  message: {
    success: false,
    message: 'Too many attempts for this account. Please try again in 15 minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// AI endpoints call a paid, quota-limited API. Each signed-in user gets their
// own allowance. Use after `protect`.
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  keyGenerator: (req) => (req.user ? `user:${req.user.id}` : ipKeyGenerator(req.ip)),
  message: {
    success: false,
    message: 'You have made a lot of AI requests. Please try again in a few minutes.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API rate limit
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many requests. Please try again later.'
  }
});

module.exports = { authLimiter, accountLimiter, aiLimiter, apiLimiter };
