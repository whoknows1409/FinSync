const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');

/**
 * Synchronizes budget categories with transaction categories for a user
 * 1. Adds new budget entries for transaction categories that don't have budgets
 * 2. Removes budget entries for categories that don't exist in any transaction
 * 3. Updates budget category names to match transaction category names
 * 
 * @param {ObjectId} userId - The ID of the user
 */
exports.syncBudgetCategories = async (userId) => {
  try {
    // Get all unique expense categories from transactions
    const transactionCategories = await Transaction.distinct('category', {
      user: userId,
      type: 'expense'
    });

    // Get all existing budgets
    const budgets = await Budget.find({
      user: userId,
      status: 'active'
    });

    // Get all unique budget categories
    const budgetCategories = [...new Set(budgets.map(budget => budget.category))];

    // 1. Add new budget entries for transaction categories that don't have budgets
    for (const category of transactionCategories) {
      if (!budgetCategories.includes(category)) {
        // Check if there's already a budget for this category with any frequency
        const existingBudget = await Budget.findOne({
          user: userId,
          category,
          status: 'active'
        });

        if (!existingBudget) {
          // Create a new budget with default values
          // Set the period to monthly as the default frequency
          const today = new Date();
          const startDate = new Date(today.getFullYear(), today.getMonth(), 1);
          const endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);

          await Budget.create({
            user: userId,
            name: `${category} Budget`,
            category,
            totalAmount: 0, // Default to 0, user can update this
            period: 'monthly',
            startDate,
            endDate,
            isRollover: false,
            status: 'active'
          });
        }
      }
    }

    // 2. Remove budget entries for categories that don't exist in any transaction
    //    But only if they have zero amount to avoid deleting user-created budgets
    for (const budget of budgets) {
      if (!transactionCategories.includes(budget.category) && budget.totalAmount === 0) {
        await Budget.deleteOne({
          _id: budget._id,
          user: userId
        });
      }
    }

    // 3. Update budget category names to match transaction category names
    //    This handles cases where category names might be different
    for (const budget of budgets) {
      // Check if the budget category exists in transaction categories
      if (transactionCategories.includes(budget.category)) {
        // Category name is already correct, no need to update
        continue;
      }
      
      // Check if there's a transaction category that might correspond to this budget category
      // This is a simple matching approach - we could implement more complex logic if needed
      const matchingTransactionCategory = transactionCategories.find(tc => 
        // Check if transaction category name contains the budget category name
        // or vice versa
        tc.toLowerCase().includes(budget.category.toLowerCase()) ||
        budget.category.toLowerCase().includes(tc.toLowerCase())
      );
      
      // If we found a matching transaction category, update the budget category name
      if (matchingTransactionCategory) {
        await Budget.findByIdAndUpdate(budget._id, {
          category: matchingTransactionCategory
        });
      }
    }
    
    console.log(`Successfully synchronized budget categories for user ${userId}`);
    return true;
  } catch (error) {
    console.error('Error synchronizing budget categories:', error);
    throw error;
  }
};

/**
 * Gets all valid expense categories from the Transaction model
 */
exports.getValidExpenseCategories = () => {
  // Get the schema path for category
  const categoryPath = Transaction.schema.path('category');
  
  // Extract the enum values
  return categoryPath.enumValues.filter(category => {
    // Assume categories that end with 'Income' are income categories
    // and others are expense categories
    return !category.toLowerCase().includes('income') && category !== 'Savings';
  });
};