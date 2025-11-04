const mongoose = require('mongoose');

const recurringTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['income', 'expense'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    required: true,
    enum: [
      'Food & Dining',
      'Transportation',
      'Shopping',
      'Entertainment',
      'Bills & Utilities',
      'Healthcare',
      'Education',
      'Travel',
      'Investments',
      'Savings',
      'Salary',
      'Freelance',
      'Business',
      'Other Income',
      'Other Expense'
    ]
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  frequency: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'yearly'],
    required: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date
  },
  lastProcessed: {
    type: Date
  },
  isActive: {
    type: Boolean,
    default: true
  },
  nextOccurrence: {
    type: Date
  }
}, {
  timestamps: true
});

// Calculate next occurrence
recurringTransactionSchema.methods.calculateNextOccurrence = function() {
  if (!this.isActive) return null;
  
  const lastDate = this.lastProcessed || this.startDate;
  const nextDate = new Date(lastDate);
  
  switch (this.frequency) {
    case 'daily':
      nextDate.setDate(nextDate.getDate() + 1);
      break;
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
  }
  
  // Check if end date is reached
  if (this.endDate && nextDate > this.endDate) {
    return null;
  }
  
  return nextDate;
};

module.exports = mongoose.model('RecurringTransaction', recurringTransactionSchema);