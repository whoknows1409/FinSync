const mongoose = require('mongoose');
const FinancialGoal = require('../models/FinancialGoal');
const Activity = require('../models/Activity');
const { notify, formatRupees } = require('../services/notificationService');

const handleError = (res, error, message) => {
  console.error(message, error);
  if (error && error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: Object.values(error.errors).map(e => e.message).join(', ')
    });
  }
  res.status(500).json({ success: false, message });
};

const logActivity = async (userId, action) => {
  try {
    await Activity.create({ user: userId, action, type: 'goal' });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};

// The fields a user may set on a goal
const GOAL_FIELDS = ['name', 'description', 'type', 'targetAmount', 'targetDate', 'priority', 'notes'];
const GOAL_STATUSES = ['active', 'paused', 'completed', 'cancelled'];

const findOwnGoal = (req) =>
  mongoose.Types.ObjectId.isValid(req.params.id)
    ? FinancialGoal.findOne({ _id: req.params.id, user: req.user._id })
    : null;

// Tell the user once when a goal's deadline is close and it is not on track
async function notifyApproachingDeadlines(userId, goals) {
  for (const goal of goals) {
    if (goal.status !== 'active' || goal.alerts?.enabled === false || goal.alerts?.deadlineApproaching === false) continue;
    if (goal.isCompleted()) continue;

    const daysLeft = Math.ceil((new Date(goal.targetDate) - Date.now()) / (24 * 60 * 60 * 1000));
    const warnWithin = goal.alerts?.deadlineDays || 30;

    if (daysLeft < 0) {
      await notify(userId, {
        category: 'goal',
        severity: 'warning',
        title: 'Goal deadline passed',
        message: `"${goal.name}" reached its target date with ${formatRupees(goal.amountRemaining)} still to go.`,
        link: '/goals',
        dedupeKey: `goal:${goal._id}:overdue`,
      });
    } else if (daysLeft <= warnWithin) {
      await notify(userId, {
        category: 'goal',
        severity: 'info',
        title: 'Goal deadline approaching',
        message: `"${goal.name}" is due in ${daysLeft} day${daysLeft === 1 ? '' : 's'} and needs ${formatRupees(goal.amountRemaining)} more.`,
        link: '/goals',
        dedupeKey: `goal:${goal._id}:deadline`,
      });
    }
  }
}

// @desc    Get all goals for the user, with totals
// @route   GET /api/v1/goals
// @access  Private
exports.getGoals = async (req, res) => {
  try {
    const goals = await FinancialGoal.find({ user: req.user._id }).sort({ status: 1, targetDate: 1 });

    await notifyApproachingDeadlines(req.user._id, goals);

    const open = goals.filter(goal => goal.status === 'active' || goal.status === 'paused');
    res.set('Cache-Control', 'no-store');
    res.json({
      success: true,
      count: goals.length,
      data: goals,
      summary: {
        totalGoals: goals.length,
        activeGoals: goals.filter(goal => goal.status === 'active').length,
        completedGoals: goals.filter(goal => goal.status === 'completed').length,
        totalTargetAmount: open.reduce((sum, goal) => sum + goal.targetAmount, 0),
        totalSavedAmount: open.reduce((sum, goal) => sum + goal.currentAmount, 0),
      },
    });
  } catch (error) {
    handleError(res, error, 'Failed to fetch goals');
  }
};

// @desc    Create a goal
// @route   POST /api/v1/goals
// @access  Private
exports.addGoal = async (req, res) => {
  try {
    const goal = new FinancialGoal({ user: req.user._id });
    for (const field of GOAL_FIELDS) {
      if (req.body[field] !== undefined) goal[field] = req.body[field];
    }

    // Money already put aside when the goal is created
    const startingAmount = Number(req.body.currentAmount) || 0;
    if (startingAmount > 0) {
      goal.currentAmount = startingAmount;
      goal.contributions.push({ amount: startingAmount, source: 'Starting balance' });
    }
    if (goal.isCompleted()) goal.status = 'completed';

    await goal.save();
    await logActivity(req.user._id, `Created goal "${goal.name}"`);

    res.status(201).json({ success: true, data: goal });
  } catch (error) {
    handleError(res, error, 'Failed to create goal');
  }
};

// @desc    Update a goal
// @route   PUT /api/v1/goals/:id
// @access  Private
exports.updateGoal = async (req, res) => {
  try {
    const goal = await findOwnGoal(req);
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    for (const field of GOAL_FIELDS) {
      if (req.body[field] !== undefined) goal[field] = req.body[field];
    }

    if (req.body.status !== undefined) {
      if (!GOAL_STATUSES.includes(req.body.status)) {
        return res.status(400).json({ success: false, message: 'Invalid goal status' });
      }
      goal.status = req.body.status;
    }

    // A changed target can complete the goal or reopen a completed one
    if (goal.status === 'active' && goal.isCompleted()) goal.status = 'completed';
    if (goal.status === 'completed' && !goal.isCompleted() && req.body.status === undefined) goal.status = 'active';

    await goal.save();
    await logActivity(req.user._id, `Updated goal "${goal.name}"`);

    res.json({ success: true, data: goal });
  } catch (error) {
    handleError(res, error, 'Failed to update goal');
  }
};

// @desc    Add money to a goal, or take it out with a negative amount
// @route   POST /api/v1/goals/:id/contributions
// @access  Private
exports.addContribution = async (req, res) => {
  try {
    const goal = await findOwnGoal(req);
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    const amount = Number(req.body.amount);
    if (!Number.isFinite(amount) || amount === 0) {
      return res.status(400).json({ success: false, message: 'Please enter an amount' });
    }
    if (goal.currentAmount + amount < 0) {
      return res.status(400).json({
        success: false,
        message: `You can take out at most ${formatRupees(goal.currentAmount)} from this goal`
      });
    }

    const wasCompleted = goal.isCompleted();

    goal.contributions.push({
      amount,
      source: req.body.source ? String(req.body.source).trim().slice(0, 50) : (amount > 0 ? 'Manual' : 'Withdrawal'),
      notes: req.body.notes ? String(req.body.notes).trim().slice(0, 200) : undefined,
    });
    goal.currentAmount += amount;

    if (goal.isCompleted() && goal.status === 'active') goal.status = 'completed';
    if (!goal.isCompleted() && goal.status === 'completed') goal.status = 'active';

    for (const milestone of goal.milestones) {
      if (!milestone.isAchieved && goal.currentAmount >= milestone.targetAmount) {
        milestone.isAchieved = true;
        milestone.achievedDate = new Date();
      }
    }

    await goal.save();
    await logActivity(
      req.user._id,
      `${amount > 0 ? 'Added' : 'Withdrew'} ${formatRupees(Math.abs(amount))} ${amount > 0 ? 'to' : 'from'} goal "${goal.name}"`
    );

    if (!wasCompleted && goal.isCompleted()) {
      await notify(req.user._id, {
        category: 'goal',
        severity: 'success',
        title: 'Goal reached',
        message: `You have saved ${formatRupees(goal.currentAmount)} and reached your "${goal.name}" goal.`,
        link: '/goals',
        dedupeKey: `goal:${goal._id}:reached:${goal.contributions.length}`,
      });
    }

    res.json({ success: true, data: goal });
  } catch (error) {
    handleError(res, error, 'Failed to update goal');
  }
};

// @desc    Delete a goal
// @route   DELETE /api/v1/goals/:id
// @access  Private
exports.deleteGoal = async (req, res) => {
  try {
    const goal = await findOwnGoal(req);
    if (!goal) {
      return res.status(404).json({ success: false, message: 'Goal not found' });
    }

    await goal.deleteOne();
    await logActivity(req.user._id, `Deleted goal "${goal.name}"`);

    res.json({ success: true, data: {} });
  } catch (error) {
    handleError(res, error, 'Failed to delete goal');
  }
};
