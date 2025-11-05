// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter'); // Now safe to use - it's disabled in the middleware

// Health check endpoint to verify email service configuration
router.get('/health/email', async (req, res) => {
  const emailService = require('../utils/emailService');
  const isConfigured = !!emailService.isConfigured;
  const hasApiKey = !!process.env.SENDGRID_API_KEY;
  const hasEmailFrom = !!process.env.EMAIL_FROM;
  const hasFrontendUrl = !!process.env.FRONTEND_URL;
  
  // SendGrid HTTP API doesn't need connection verification
  // It validates on first send
  const apiStatus = isConfigured && hasApiKey && hasEmailFrom ? 'Ready' : 'Not configured';
  
  res.json({
    emailServiceInitialized: isConfigured,
    sendgridConfigured: hasApiKey,
    emailFromConfigured: hasEmailFrom,
    frontendUrlConfigured: hasFrontendUrl,
    apiStatus: apiStatus,
    apiKeyPreview: hasApiKey ? '***' + process.env.SENDGRID_API_KEY.slice(-10) : 'NOT SET',
    emailFrom: process.env.EMAIL_FROM || 'NOT SET',
    frontendUrl: process.env.FRONTEND_URL || 'NOT SET',
    method: 'SendGrid HTTP API (no SMTP)',
    status: isConfigured && hasApiKey && hasEmailFrom ? 'OK' : 'MISCONFIGURED'
  });
});

// Rate limiting disabled in middleware for easier testing
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/google', authController.googleAuth);
router.get('/me', protect, authController.getCurrentUser);

// Email verification routes
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/resend-verification', authController.resendVerification);

module.exports = router;