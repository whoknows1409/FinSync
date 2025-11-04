// backend/models/ChatHistory.js

const mongoose = require('mongoose');

const chatHistorySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  title: {
    type: String,
    required: true,
    trim: true,
  },
  messages: [
    {
      role: {
        type: String,
        enum: ['user', 'assistant'],
        required: true,
      },
      content: {
        type: String,
        required: true,
      },
      timestamp: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  promptCount: {
    type: Number,
    default: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // Add a timestamp field to store the original timestamp from frontend
  timestamp: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

// Create a compound index for user and timestamp to ensure faster lookups
chatHistorySchema.index({ user: 1, timestamp: 1 });

// Keep only the last 5 chats per user
chatHistorySchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await this.constructor.countDocuments({ user: this.user });
    if (count >= 5) {
      // Find the oldest chat and delete it
      const oldestChat = await this.constructor.findOne({ user: this.user }).sort({ createdAt: 1 });
      if (oldestChat) {
        await oldestChat.deleteOne();
      }
    }
  }
  next();
});

module.exports = mongoose.model('ChatHistory', chatHistorySchema);