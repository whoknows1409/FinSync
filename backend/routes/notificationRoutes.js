const express = require('express');
const router = express.Router();
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearNotifications
} = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

// All notification routes are protected
router.use(protect);

router.get('/', getNotifications);
router.delete('/', clearNotifications);

// Fixed paths before /:id so they are not read as an ID
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);
router.delete('/:id', deleteNotification);

module.exports = router;
