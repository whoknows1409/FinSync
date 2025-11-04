// models/DashboardLayout.js
const mongoose = require('mongoose');

const dashboardLayoutSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  layout: [{
    id: String,
    type: String,
    position: {
      x: Number,
      y: Number,
      w: Number,
      h: Number
    }
  }],
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('DashboardLayout', dashboardLayoutSchema);