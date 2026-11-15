const mongoose = require('mongoose');
const Notification = require('../models/Notification');

const MAX_LISTED = 100;

const handleError = (res, error, message) => {
  console.error(message, error);
  res.status(500).json({ success: false, message });
};

const isValidId = id => mongoose.Types.ObjectId.isValid(id);

// @desc    List the user's notifications, newest first
// @route   GET /api/v1/notifications
// @access  Private
exports.getNotifications = async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 50, 1), MAX_LISTED);

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(limit),
      Notification.countDocuments({ user: req.user._id, read: false }),
    ]);

    res.set('Cache-Control', 'no-store');
    res.json({
      success: true,
      data: { notifications, unreadCount },
    });
  } catch (error) {
    handleError(res, error, 'Failed to fetch notifications');
  }
};

// @desc    Mark one notification as read
// @route   PUT /api/v1/notifications/:id/read
// @access  Private
exports.markAsRead = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid notification ID' });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      { $set: { read: true, readAt: new Date() } },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, data: notification });
  } catch (error) {
    handleError(res, error, 'Failed to update notification');
  }
};

// @desc    Mark all notifications as read
// @route   PUT /api/v1/notifications/read-all
// @access  Private
exports.markAllAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { user: req.user._id, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    res.json({ success: true, data: { updated: result.modifiedCount } });
  } catch (error) {
    handleError(res, error, 'Failed to update notifications');
  }
};

// @desc    Delete one notification
// @route   DELETE /api/v1/notifications/:id
// @access  Private
exports.deleteNotification = async (req, res) => {
  try {
    if (!isValidId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid notification ID' });
    }

    const result = await Notification.deleteOne({ _id: req.params.id, user: req.user._id });
    if (result.deletedCount === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    res.json({ success: true, data: {} });
  } catch (error) {
    handleError(res, error, 'Failed to delete notification');
  }
};

// @desc    Delete all of the user's notifications
// @route   DELETE /api/v1/notifications
// @access  Private
exports.clearNotifications = async (req, res) => {
  try {
    const result = await Notification.deleteMany({ user: req.user._id });
    res.json({ success: true, data: { deleted: result.deletedCount } });
  } catch (error) {
    handleError(res, error, 'Failed to clear notifications');
  }
};
