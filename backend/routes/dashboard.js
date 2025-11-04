// routes/dashboard.js
const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const dashboardController = require('../controllers/dashboardController');

// Get dashboard layout
router.get('/layout', auth, dashboardController.getDashboardLayout);

// Save dashboard layout
router.post('/layout', auth, dashboardController.saveDashboardLayout);

module.exports = router;