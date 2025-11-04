const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: [true, 'Please provide a budget name'],
    trim: true,
    maxlength: [100, 'Budget name cannot be more than 100 characters'],
  },
  category: {
    type: String,
    required: [true, 'Please provide a category'],
    trim: true,
  },
  subcategories: [{
    name: {
      type: String,
      required: true,
      trim: true,
    },
    amount: {
      type: Number,
      required: true,
      min: [0, 'Subcategory amount must be positive'],
    },
    spent: {
      type: Number,
      default: 0,
    },
  }],
  totalAmount: {
    type: Number,
    required: [true, 'Please provide a budget amount'],
    min: [0, 'Budget amount must be positive'],
  },
  spentAmount: {
    type: Number,
    default: 0,
  },
  period: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
    default: 'monthly',
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  isRollover: {
    type: Boolean,
    default: false,
  },
  rolloverAmount: {
    type: Number,
    default: 0,
  },
  alerts: {
    enabled: {
      type: Boolean,
      default: true,
    },
    threshold: {
      type: Number,
      default: 80, // Alert when 80% of budget is used
    },
    exceeded: {
      type: Boolean,
      default: false,
    },
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'cancelled'],
    default: 'active',
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot be more than 500 characters'],
  },
  tags: [{
    type: String,
    trim: true,
  }],
  isShared: {
    type: Boolean,
    default: false,
  },
  sharedWith: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    role: {
      type: String,
      enum: ['viewer', 'editor'],
      default: 'viewer',
    },
  }],
}, {
  timestamps: true,
});

// Indexes for better query performance
budgetSchema.index({ user: 1, startDate: -1 });
budgetSchema.index({ user: 1, category: 1 });
budgetSchema.index({ user: 1, status: 1 });
budgetSchema.index({ user: 1, 'alerts.exceeded': 1 });

// Virtual for remaining amount
budgetSchema.virtual('remainingAmount').get(function() {
  return this.totalAmount - this.spentAmount;
});

// Virtual for percentage used
budgetSchema.virtual('percentageUsed').get(function() {
  if (this.totalAmount === 0) return 0;
  return Math.round((this.spentAmount / this.totalAmount) * 100);
});

// Virtual for status color
budgetSchema.virtual('statusColor').get(function() {
  const percentage = this.percentageUsed;
  if (percentage >= 100) return 'red';
  if (percentage >= 80) return 'yellow';
  return 'green';
});

// Virtual for days remaining
budgetSchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  const end = new Date(this.endDate);
  const diffTime = end - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
});

// Method to check if budget is exceeded
budgetSchema.methods.isExceeded = function() {
  return this.spentAmount > this.totalAmount;
};

// Method to check if budget is near limit
budgetSchema.methods.isNearLimit = function() {
  const percentage = this.percentageUsed;
  return percentage >= this.alerts.threshold && percentage < 100;
}

// Method to get current threshold level
budgetSchema.methods.getCurrentThresholdLevel = function() {
  const percentage = this.percentageUsed;
  if (percentage >= 100) return 100;
  if (percentage >= 75) return 75;
  if (percentage >= 50) return 50;
  return 0;
}

// Method to check if a new notification should be triggered
budgetSchema.methods.shouldTriggerNotification = function() {
  const currentLevel = this.getCurrentThresholdLevel();
  const lastNotifiedLevel = this.alerts.lastNotifiedLevel || 0;
  
  // If we've reached a new threshold that we haven't been notified about yet
  if (currentLevel > lastNotifiedLevel && currentLevel > 0) {
    return currentLevel;
  }
  return null;
};

// Method to update spent amount
budgetSchema.methods.updateSpentAmount = async function() {
  const Transaction = mongoose.model('Transaction');
  const Activity = mongoose.model('Activity'); // For notifications
  
  const transactions = await Transaction.find({
    user: this.user,
    category: this.category,
    type: 'expense',
    date: {
      $gte: this.startDate,
      $lte: this.endDate,
    },
  });

  this.spentAmount = transactions.reduce((sum, transaction) => sum + transaction.amount, 0);
  
  // Update alert status
  this.alerts.exceeded = this.isExceeded();
  
  // Check if we need to trigger a notification
  const notificationLevel = this.shouldTriggerNotification();
  
  if (notificationLevel) {
    // Update the last notified level
    this.alerts.lastNotifiedLevel = notificationLevel;
    
    // Create a notification activity
    await Activity.create({
      user: this.user,
      type: 'budget_notification',
      message: `Your ${this.category} budget is at ${notificationLevel}% of its limit.`,
      details: {
        budgetId: this._id,
        budgetName: this.name,
        category: this.category,
        spent: this.spentAmount,
        total: this.totalAmount,
        percentage: this.percentageUsed
      }
    });
  }
  
  return this.save();
};

// Method to add subcategory
budgetSchema.methods.addSubcategory = function(name, amount) {
  this.subcategories.push({ name, amount });
  this.totalAmount += amount;
  return this.save();
};

// Method to remove subcategory
budgetSchema.methods.removeSubcategory = function(subcategoryId) {
  const subcategory = this.subcategories.id(subcategoryId);
  if (subcategory) {
    this.totalAmount -= subcategory.amount;
    this.subcategories.pull(subcategoryId);
    return this.save();
  }
  throw new Error('Subcategory not found');
};

// Method to create next period budget (for rollover)
budgetSchema.methods.createNextPeriod = function() {
  if (!this.isRollover) {
    return null;
  }

  const nextStartDate = new Date(this.endDate);
  nextStartDate.setDate(nextStartDate.getDate() + 1);
  
  const nextEndDate = new Date(nextStartDate);
  switch (this.period) {
    case 'daily':
      // same calendar day
      nextEndDate.setDate(nextEndDate.getDate());
      break;
    case 'weekly':
      nextEndDate.setDate(nextEndDate.getDate() + 6);
      break;
    case 'monthly':
      nextEndDate.setMonth(nextEndDate.getMonth() + 1);
      nextEndDate.setDate(0); // end of month
      break;
    case 'quarterly':
      nextEndDate.setMonth(nextEndDate.getMonth() + 3);
      nextEndDate.setDate(0); // end of quarter month
      break;
    case 'yearly':
      nextEndDate.setFullYear(nextEndDate.getFullYear() + 1);
      nextEndDate.setMonth(11);
      nextEndDate.setDate(31);
      break;
  }

  const rolloverAmount = this.isExceeded() ? 0 : this.remainingAmount;

  const nextBudget = new this.constructor({
    user: this.user,
    name: this.name,
    category: this.category,
    subcategories: this.subcategories.map(sub => ({
      name: sub.name,
      amount: sub.amount,
    })),
    totalAmount: this.totalAmount + rolloverAmount,
    period: this.period,
    startDate: nextStartDate,
    endDate: nextEndDate,
    isRollover: this.isRollover,
    rolloverAmount: rolloverAmount,
    alerts: this.alerts,
    notes: this.notes,
    tags: this.tags,
  });

  return nextBudget;
};

// Static method to get budget summary
budgetSchema.statics.getSummary = function(userId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        startDate: { $lte: endDate },
        endDate: { $gte: startDate },
        status: 'active',
      },
    },
    {
      $group: {
        _id: null,
        totalBudgeted: { $sum: '$totalAmount' },
        totalSpent: { $sum: '$spentAmount' },
        totalRemaining: { $sum: { $subtract: ['$totalAmount', '$spentAmount'] } },
        count: { $sum: 1 },
        exceededCount: {
          $sum: {
            $cond: [{ $gt: ['$spentAmount', '$totalAmount'] }, 1, 0],
          },
        },
      },
    },
  ]);
};

// Static method to get category-wise budget performance
budgetSchema.statics.getCategoryPerformance = function(userId, startDate, endDate) {
  return this.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        startDate: { $lte: endDate },
        endDate: { $gte: startDate },
        status: 'active',
      },
    },
    {
      $group: {
        _id: '$category',
        totalBudgeted: { $sum: '$totalAmount' },
        totalSpent: { $sum: '$spentAmount' },
        count: { $sum: 1 },
        avgUtilization: { $avg: { $multiply: [{ $divide: ['$spentAmount', '$totalAmount'] }, 100] } },
      },
    },
    {
      $addFields: {
        remaining: { $subtract: ['$totalBudgeted', '$totalSpent'] },
        utilization: { $multiply: [{ $divide: ['$totalSpent', '$totalBudgeted'] }, 100] },
      },
    },
    {
      $sort: { utilization: -1 },
    },
  ]);
};

// Add virtuals to JSON output
budgetSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Budget', budgetSchema);
