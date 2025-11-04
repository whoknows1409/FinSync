const Activity = require('../models/Activity');

// Log user activities
const logActivity = (action, type) => {
  return async (req, res, next) => {
    // Only proceed if user is authenticated
    if (req.user) {
      try {
        await Activity.create({
          user: req.user.id,
          action: action,
          type: type
        });
      } catch (error) {
        console.error('Failed to log activity:', error);
      }
    }
    next();
  };
};

module.exports = logActivity;