const mongoose = require('mongoose');


const financialGoalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: [true, 'Please provide a goal name'],
    trim: true,
    maxlength: [100, 'Goal name cannot be more than 100 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot be more than 500 characters'],
  },
  type: {
    type: String,
    enum: ['savings', 'debt_payment', 'investment', 'purchase', 'emergency_fund', 'retirement', 'other'],
    required: true,
  },
  targetAmount: {
    type: Number,
    required: [true, 'Please provide a target amount'],
    min: [0, 'Target amount must be positive'],
  },
  currentAmount: {
    type: Number,
    default: 0,
    min: [0, 'Current amount cannot be negative'],
  },
  targetDate: {
    type: Date,
    required: [true, 'Please provide a target date'],
  },
  startDate: {
    type: Date,
    default: Date.now,
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
  },
  status: {
    type: String,
    enum: ['active', 'paused', 'completed', 'cancelled'],
    default: 'active',
  },
  isRecurring: {
    type: Boolean,
    default: false,
  },
  recurringAmount: {
    type: Number,
    min: [0, 'Recurring amount must be positive'],
  },
  recurringFrequency: {
    type: String,
    enum: ['weekly', 'monthly', 'quarterly', 'yearly'],
  },
  nextContributionDate: Date,
  contributions: [{
    amount: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    source: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
    },
  }],
  milestones: [{
    name: {
      type: String,
      required: true,
      trim: true,
    },
    targetAmount: {
      type: Number,
      required: true,
    },
    achievedDate: Date,
    isAchieved: {
      type: Boolean,
      default: false,
    },
  }],
  alerts: {
    enabled: {
      type: Boolean,
      default: true,
    },
    milestoneReached: {
      type: Boolean,
      default: true,
    },
    deadlineApproaching: {
      type: Boolean,
      default: true,
    },
    deadlineDays: {
      type: Number,
      default: 30,
    },
  },
  tags: [{
    type: String,
    trim: true,
  }],
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notes cannot be more than 1000 characters'],
  },
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
      enum: ['viewer', 'contributor'],
      default: 'viewer',
    },
  }],
}, {
  timestamps: true,
});

// Indexes for better query performance
financialGoalSchema.index({ user: 1, status: 1 });
financialGoalSchema.index({ user: 1, targetDate: 1 });
financialGoalSchema.index({ user: 1, type: 1 });
financialGoalSchema.index({ user: 1, priority: 1 });
financialGoalSchema.index({ user: 1, 'nextContributionDate': 1 });

// Virtual for progress percentage
financialGoalSchema.virtual('progressPercentage').get(function() {
  if (this.targetAmount === 0) return 0;
  return Math.round((this.currentAmount / this.targetAmount) * 100);
});

// Virtual for days remaining
financialGoalSchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  const target = new Date(this.targetDate);
  const diffTime = target - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
});

// Virtual for amount remaining
financialGoalSchema.virtual('amountRemaining').get(function() {
  return Math.max(0, this.targetAmount - this.currentAmount);
});

// Virtual for average daily contribution needed
financialGoalSchema.virtual('dailyContributionNeeded').get(function() {
  const daysRemaining = this.daysRemaining;
  if (daysRemaining === 0) return 0;
  return Math.ceil(this.amountRemaining / daysRemaining);
});

// Virtual for status color
financialGoalSchema.virtual('statusColor').get(function() {
  const progress = this.progressPercentage;
  const daysRemaining = this.daysRemaining;
  
  if (progress >= 100) return 'green';
  if (daysRemaining <= 30 && progress < 80) return 'red';
  if (daysRemaining <= 60 && progress < 60) return 'yellow';
  return 'blue';
});

// Method to check if goal is completed
financialGoalSchema.methods.isCompleted = function() {
  return this.currentAmount >= this.targetAmount;
};

// Method to check if goal is overdue
financialGoalSchema.methods.isOverdue = function() {
  return new Date() > this.targetDate && !this.isCompleted();
};

// Method to add contribution
financialGoalSchema.methods.addContribution = function(amount, source, notes) {
  this.contributions.push({
    amount,
    source: source || 'Manual',
    notes,
  });
  
  this.currentAmount += amount;
  
  // Check if goal is completed
  if (this.isCompleted() && this.status === 'active') {
    this.status = 'completed';
  }
  
  // Update next contribution date if recurring
  if (this.isRecurring && this.recurringFrequency) {
    this.updateNextContributionDate();
  }
  
  return this.save();
};

// Method to update next contribution date
financialGoalSchema.methods.updateNextContributionDate = function() {
  if (!this.isRecurring || !this.recurringFrequency) {
    return;
  }
  
  const now = new Date();
  const nextDate = new Date(this.nextContributionDate || now);
  
  switch (this.recurringFrequency) {
    case 'weekly':
      nextDate.setDate(nextDate.getDate() + 7);
      break;
    case 'monthly':
      nextDate.setMonth(nextDate.getMonth() + 1);
      break;
    case 'quarterly':
      nextDate.setMonth(nextDate.getMonth() + 3);
      break;
    case 'yearly':
      nextDate.setFullYear(nextDate.getFullYear() + 1);
      break;
  }
  
  this.nextContributionDate = nextDate;
  return this.save();
};

// Method to check milestone achievements
financialGoalSchema.methods.checkMilestones = function() {
  const updatedMilestones = this.milestones.map(milestone => {
    if (!milestone.isAchieved && this.currentAmount >= milestone.targetAmount) {
      milestone.isAchieved = true;
      milestone.achievedDate = new Date();
    }
    return milestone;
  });
  
  this.milestones = updatedMilestones;
  return this.save();
};

// Method to get contribution history
financialGoalSchema.methods.getContributionHistory = function(months = 12) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);
  
  return this.contributions
    .filter(contribution => contribution.date >= startDate)
    .sort((a, b) => b.date - a.date);
};

// Method to get monthly contribution summary
financialGoalSchema.methods.getMonthlyContributions = function() {
  const monthlyData = {};
  
  this.contributions.forEach(contribution => {
    const monthKey = contribution.date.toISOString().substring(0, 7); // YYYY-MM
    if (!monthlyData[monthKey]) {
      monthlyData[monthKey] = { amount: 0, count: 0 };
    }
    monthlyData[monthKey].amount += contribution.amount;
    monthlyData[monthKey].count += 1;
  });
  
  return monthlyData;
};

// Static method to get goals summary
financialGoalSchema.statics.getSummary = function(userId) {
  return this.aggregate([
    {
      $match: {
        user: new mongoose.Types.ObjectId(userId),
        status: { $in: ['active', 'paused'] },
      },
    },
    {
      $group: {
        _id: null,
        totalGoals: { $sum: 1 },
        totalTargetAmount: { $sum: '$targetAmount' },
        totalCurrentAmount: { $sum: '$currentAmount' },
        completedGoals: {
          $sum: {
            $cond: [{ $gte: ['$currentAmount', '$targetAmount'] }, 1, 0],
          },
        },
        overdueGoals: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $gt: [new Date(), '$targetDate'] },
                  { $lt: ['$currentAmount', '$targetAmount'] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
  ]);
};

// Static method to get goals by type
financialGoalSchema.statics.getByType = function(userId) {
  return this.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(userId),
        status: { $in: ['active', 'paused'] },
      },
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalTargetAmount: { $sum: '$targetAmount' },
        totalCurrentAmount: { $sum: '$currentAmount' },
        avgProgress: { $avg: { $multiply: [{ $divide: ['$currentAmount', '$targetAmount'] }, 100] } },
      },
    },
    {
      $sort: { totalTargetAmount: -1 },
    },
  ]);
};

module.exports = mongoose.model('FinancialGoal', financialGoalSchema);
