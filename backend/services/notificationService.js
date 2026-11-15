// backend/services/notificationService.js
//
// Creates the in-app notifications shown under the bell. Sending a notification
// must never break the action that triggered it, so `notify` never throws.
const Notification = require('../models/Notification');
const User = require('../models/User');
const logger = require('../utils/logger');

// Which user preference switches off which kind of notification.
// Kinds not listed here are always delivered.
const PREFERENCE_FOR_CATEGORY = {
  budget: 'budgetAlerts',
  trading: 'stockAlerts',
};

async function isWanted(userId, category) {
  const preference = PREFERENCE_FOR_CATEGORY[category];
  if (!preference) return true;

  const user = await User.findById(userId).select('notificationPreferences').lean();
  return user?.notificationPreferences?.[preference] !== false;
}

// notify(userId, { category, severity, title, message, link, dedupeKey })
// Returns the notification, or null when it was skipped (switched off by the
// user, already sent, or failed).
async function notify(userId, details) {
  try {
    if (!(await isWanted(userId, details.category))) return null;

    return await Notification.create({
      user: userId,
      category: details.category,
      severity: details.severity || 'info',
      title: details.title,
      message: details.message,
      link: details.link,
      dedupeKey: details.dedupeKey,
    });
  } catch (error) {
    // Duplicate key: this event was already notified
    if (error && error.code === 11000) return null;
    logger.error(`Could not create notification: ${error.message}`);
    return null;
  }
}

const formatRupees = amount =>
  `₹${Number(amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

module.exports = { notify, formatRupees };
