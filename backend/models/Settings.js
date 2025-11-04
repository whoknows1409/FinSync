const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema({
  logo: {
    data: Buffer,
    contentType: String
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Settings', SettingsSchema);