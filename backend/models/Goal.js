const mongoose = require('mongoose');

const goalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  targetAmount: {
    type: Number,
    required: true,
    min: 0
  },
  currentAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  targetDate: {
    type: Date,
    required: true
  },
  category: {
    type: String,
    enum: ['Emergency Fund', 'Vacation', 'Car', 'Home', 'Education', 'Retirement', 'Other'],
    default: 'Other'
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'paused'],
    default: 'active'
  },
  isPublic: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Calculate progress percentage
goalSchema.virtual('progressPercentage').get(function() {
  if (this.targetAmount === 0) return 0;
  return Math.min((this.currentAmount / this.targetAmount) * 100, 100);
});

// Calculate days remaining
goalSchema.virtual('daysRemaining').get(function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(this.targetDate);
  targetDate.setHours(0, 0, 0, 0);
  
  const diffTime = targetDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : 0;
});

// Check if goal is overdue
goalSchema.virtual('isOverdue').get(function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targetDate = new Date(this.targetDate);
  targetDate.setHours(0, 0, 0, 0);
  
  return targetDate < today && this.status !== 'completed';
});

module.exports = mongoose.model('Goal', goalSchema);