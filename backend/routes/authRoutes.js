// routes/authRoutes.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');
// const { authLimiter } = require('../middleware/rateLimiter'); // Disabled for testing

// Rate limiting disabled for easier testing
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/google', authController.googleAuth);
router.get('/me', protect, authController.getCurrentUser);

module.exports = router;