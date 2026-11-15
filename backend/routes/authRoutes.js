// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter, accountLimiter, emailRequestLimiter } = require('../middleware/rateLimiter');

// Health check endpoint — protected, only accessible to authenticated users
router.get('/health/email', protect, async (req, res) => {
  const emailService = require('../utils/emailService');
  const isConfigured = !!emailService.isConfigured;
  const hasApiKey = !!process.env.SENDGRID_API_KEY;
  const hasEmailFrom = !!process.env.EMAIL_FROM;
  const hasFrontendUrl = !!process.env.FRONTEND_URL;
  
  const apiStatus = isConfigured && hasApiKey && hasEmailFrom ? 'Ready' : 'Not configured';
  
  res.json({
    emailServiceInitialized: isConfigured,
    sendgridConfigured: hasApiKey,
    emailFromConfigured: hasEmailFrom,
    frontendUrlConfigured: hasFrontendUrl,
    apiStatus: apiStatus,
    // SECURITY: No longer expose API key preview or personal email
    status: isConfigured && hasApiKey && hasEmailFrom ? 'OK' : 'MISCONFIGURED'
  });
});

// Auth routes with rate limiting
router.post('/register', authLimiter, authController.register);
router.post('/login', authLimiter, accountLimiter, authController.login);
router.post('/google', authLimiter, authController.googleAuth);
router.get('/me', protect, authController.getCurrentUser);

// Email verification routes
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/resend-verification', authLimiter, accountLimiter, authController.resendVerification);

// Passwords and account lifecycle
router.post('/forgot-password', authLimiter, emailRequestLimiter, authController.forgotPassword);
router.post('/reset-password', authLimiter, authController.resetPassword);
router.post('/change-password', protect, authLimiter, authController.changePassword);
router.post('/logout-all', protect, authController.logoutAll);
router.delete('/account', protect, authLimiter, authController.deleteAccount);

module.exports = router;