const cron = require('node-cron');
const RecurringTransaction = require('../models/RecurringTransaction');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');

// Process recurring transactions daily at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('Processing recurring transactions...');
  
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all active recurring transactions
    const recurringTransactions = await RecurringTransaction.find({
      isActive: true
    });

    for (const recurring of recurringTransactions) {
      // Check if end date has passed
      if (recurring.endDate && new Date(recurring.endDate) < today) {
        // Deactivate if end date has passed
        recurring.isActive = false;
        await recurring.save();
        continue;
      }

      // Calculate next due date
      let nextDue = new Date(recurring.startDate);
      if (recurring.lastProcessed) {
        nextDue = new Date(recurring.lastProcessed);
      }

      // Calculate next occurrence based on frequency
      switch (recurring.frequency) {
        case 'daily':
          nextDue.setDate(nextDue.getDate() + 1);
          break;
        case 'weekly':
          nextDue.setDate(nextDue.getDate() + 7);
          break;
        case 'monthly':
          nextDue.setMonth(nextDue.getMonth() + 1);
          break;
        case 'yearly':
          nextDue.setFullYear(nextDue.getFullYear() + 1);
          break;
      }

      // If next due date is today or in the past, create a transaction
      if (nextDue <= today) {
        // Create transaction
        await Transaction.create({
          user: recurring.user,
          type: recurring.type,
          amount: recurring.amount,
          category: recurring.category,
          description: recurring.description,
          date: nextDue,
          isRecurring: true,
          recurringId: recurring._id
        });

        // If this is an expense transaction, update the corresponding budget
        if (recurring.type === 'expense') {
          try {
            // Find all active budgets for the category where the transaction date falls within the budget period
            const budgets = await Budget.find({
              user: recurring.user,
              category: recurring.category,
              status: 'active',
              startDate: { $lte: nextDue },
              endDate: { $gte: nextDue }
            });

            // Update spent amount for each relevant budget
            for (const budget of budgets) {
              await budget.updateSpentAmount();
            }
          } catch (budgetError) {
            console.error('Failed to update budget for recurring transaction:', budgetError);
            // We don't throw here because we don't want to fail the recurring transaction processing
          }
        }

        // Update last processed date
        recurring.lastProcessed = nextDue;
        await recurring.save();
      }
    }

    console.log('Recurring transactions processed successfully');
  } catch (error) {
    console.error('Error processing recurring transactions:', error);
  }
});

// Process recurring budgets daily at midnight
cron.schedule('0 0 * * *', async () => {
  console.log('Processing recurring budgets...');
  
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get all active budgets that are due for recurrence
    const activeBudgets = await Budget.find({
      status: 'active',
      endDate: { $lte: today }
    });

    for (const budget of activeBudgets) {
      // Check if budget should be rolled over
      if (budget.isRollover) {
        // Use the existing createNextPeriod method to create a new budget
        const nextBudget = budget.createNextPeriod();
        if (nextBudget) {
          await nextBudget.save();
          console.log(`Created next period budget for user ${budget.user}, category ${budget.category}`);
        }
      } else {
        // For non-rollover budgets, create a new budget with the same settings
        const nextStartDate = new Date(budget.endDate);
        nextStartDate.setDate(nextStartDate.getDate() + 1);
        
        const nextEndDate = new Date(nextStartDate);
        switch (budget.period) {
          case 'daily':
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

        // Create new budget
        await Budget.create({
          user: budget.user,
          name: budget.name,
          category: budget.category,
          subcategories: budget.subcategories.map(sub => ({
            name: sub.name,
            amount: sub.amount,
            spent: 0,
          })),
          totalAmount: budget.totalAmount,
          spentAmount: 0,
          period: budget.period,
          startDate: nextStartDate,
          endDate: nextEndDate,
          isRollover: budget.isRollover,
          alerts: budget.alerts,
          status: 'active',
          notes: budget.notes,
          tags: budget.tags,
          isShared: budget.isShared,
          sharedWith: budget.sharedWith,
        });
        
        console.log(`Created new budget period for user ${budget.user}, category ${budget.category}`);
      }
    }

    console.log('Recurring budgets processed successfully');
  } catch (error) {
    console.error('Error processing recurring budgets:', error);
  }
});

console.log('Cron job for recurring transactions scheduled');