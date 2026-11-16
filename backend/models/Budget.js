const mongoose = require('mongoose');
const { startOfUtcDay, endOfUtcDay } = require('../utils/schedule');

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
    // Highest alert level (percent used) already sent for this period, so the
    // same alert is not sent again every time the budget is recalculated
    lastNotifiedLevel: {
      type: Number,
      default: 0,
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

// The alert level this budget has reached: 100 once the limit is used up,
// otherwise the budget's own threshold (80% unless changed), otherwise 0.
budgetSchema.methods.getCurrentThresholdLevel = function() {
  if (this.totalAmount <= 0) return 0;
  const percentage = (this.spentAmount / this.totalAmount) * 100;
  const threshold = this.alerts?.threshold > 0 ? this.alerts.threshold : 80;
  if (percentage >= 100) return 100;
  if (percentage >= threshold) return threshold;
  return 0;
}

// Returns the alert level to notify about, or null if nothing new was reached
budgetSchema.methods.shouldTriggerNotification = function() {
  if (this.alerts?.enabled === false) return null;
  const currentLevel = this.getCurrentThresholdLevel();
  const lastNotifiedLevel = this.alerts?.lastNotifiedLevel || 0;
  return currentLevel > lastNotifiedLevel ? currentLevel : null;
};

// Total of the expense transactions that count against this budget.
// Reads only; nothing is saved.
budgetSchema.methods.calculateSpent = async function() {
  const Transaction = mongoose.model('Transaction');

  const [totals] = await Transaction.aggregate([
    {
      $match: {
        user: this.user,
        category: this.category,
        type: 'expense',
        // The end date is a calendar day, so it counts through the end of that day
        date: { $gte: startOfUtcDay(this.startDate), $lte: endOfUtcDay(this.endDate) },
      },
    },
    { $group: { _id: null, total: { $sum: '$amount' } } },
  ]);

  return totals ? totals.total : 0;
};

// Recalculate what has been spent against this budget from its transactions.
// Pass { notify: false } to recalculate without sending a budget alert.
budgetSchema.methods.updateSpentAmount = async function(options = {}) {
  this.spentAmount = await this.calculateSpent();
  this.alerts.exceeded = this.isExceeded();

  const notificationLevel = options.notify === false ? null : this.shouldTriggerNotification();
  if (notificationLevel) {
    this.alerts.lastNotifiedLevel = notificationLevel;
  } else if (this.getCurrentThresholdLevel() < (this.alerts.lastNotifiedLevel || 0)) {
    // Spending dropped back (a transaction was edited or deleted), so the
    // alert may be sent again if the level is reached again
    this.alerts.lastNotifiedLevel = this.getCurrentThresholdLevel();
  }

  const saved = await this.save();

  // Notify after saving. notify() never throws, so an alert problem can no
  // longer stop the spent amount from being stored.
  if (notificationLevel) {
    const { notify, formatRupees } = require('../services/notificationService');
    const exceeded = notificationLevel >= 100;
    await notify(this.user, {
      category: 'budget',
      severity: exceeded ? 'error' : 'warning',
      title: exceeded ? 'Budget exceeded' : 'Budget alert',
      message: exceeded
        ? `You have spent ${formatRupees(this.spentAmount)} of your ${formatRupees(this.totalAmount)} ${this.category} budget.`
        : `You have used ${Math.round((this.spentAmount / this.totalAmount) * 100)}% of your ${this.category} budget (${formatRupees(this.spentAmount)} of ${formatRupees(this.totalAmount)}).`,
      link: '/budget',
      dedupeKey: `budget:${this._id}:${notificationLevel}`,
    });
  }

  return saved;
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

// Build (without saving) the budget for a later period, given its dates.
// A carry-forward budget adds whatever was left unspent to the next period.
budgetSchema.methods.buildNextPeriod = function({ startDate, endDate }) {
  // What the user set, without any amount carried in from an earlier period
  const baseAmount = Math.max(0, this.totalAmount - (this.rolloverAmount || 0));
  const rolloverAmount = this.isRollover ? Math.max(0, this.totalAmount - this.spentAmount) : 0;

  return new this.constructor({
    user: this.user,
    name: this.name,
    category: this.category,
    subcategories: this.subcategories.map(sub => ({
      name: sub.name,
      amount: sub.amount,
      spent: 0,
    })),
    totalAmount: baseAmount + rolloverAmount,
    spentAmount: 0,
    period: this.period,
    startDate,
    endDate,
    isRollover: this.isRollover,
    rolloverAmount,
    alerts: {
      enabled: this.alerts?.enabled !== false,
      threshold: this.alerts?.threshold || 80,
      exceeded: false,
      lastNotifiedLevel: 0,
    },
    status: 'active',
    notes: this.notes,
    tags: this.tags,
    isShared: this.isShared,
    sharedWith: this.sharedWith,
  });
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
        // Budgets with no amount set count as 0% used rather than dividing by zero
        avgUtilization: {
          $avg: {
            $cond: [
              { $gt: ['$totalAmount', 0] },
              { $multiply: [{ $divide: ['$spentAmount', '$totalAmount'] }, 100] },
              0,
            ],
          },
        },
      },
    },
    {
      $addFields: {
        remaining: { $subtract: ['$totalBudgeted', '$totalSpent'] },
        utilization: {
          $cond: [
            { $gt: ['$totalBudgeted', 0] },
            { $multiply: [{ $divide: ['$totalSpent', '$totalBudgeted'] }, 100] },
            0,
          ],
        },
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
