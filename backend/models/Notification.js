const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // What the notification is about; also decides which preference switches it off
  category: {
    type: String,
    enum: ['budget', 'transaction', 'recurring', 'trading', 'goal', 'account'],
    required: true
  },
  severity: {
    type: String,
    enum: ['info', 'success', 'warning', 'error'],
    default: 'info'
  },
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 120
  },
  message: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  // Page in the app that the notification points to, e.g. "/budget"
  link: {
    type: String,
    trim: true
  },
  // Identifies the event. A second notification with the same key for the same
  // user is ignored, so repeated checks never produce duplicates.
  dedupeKey: {
    type: String
  },
  read: {
    type: Boolean,
    default: false
  },
  readAt: {
    type: Date
  }
}, {
  timestamps: true
});

notificationSchema.index({ user: 1, createdAt: -1 });
notificationSchema.index({ user: 1, read: 1 });
notificationSchema.index(
  { user: 1, dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } }
);
// Notifications are removed automatically after 90 days
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

notificationSchema.set('toJSON', {
  transform: (doc, ret) => {
    ret.id = ret._id;
    delete ret.__v;
    delete ret.dedupeKey;
    return ret;
  }
});

module.exports = mongoose.model('Notification', notificationSchema);
