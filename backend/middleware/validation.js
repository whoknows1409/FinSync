const { body, param, query, validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(error => ({
        field: error.path,
        message: error.msg,
        value: error.value,
      })),
    });
  }
  next();
};

// User validation rules
const validateUser = {
  signup: [
    body('name')
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters'),
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
    body('phone')
      .optional()
      .isMobilePhone('en-IN')
      .withMessage('Please provide a valid Indian phone number'),
  ],
  
  login: [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email'),
    body('password')
      .notEmpty()
      .withMessage('Password is required'),
  ],
  
  updateProfile: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage('Name must be between 2 and 50 characters'),
    body('phone')
      .optional()
      .isMobilePhone('en-IN')
      .withMessage('Please provide a valid Indian phone number'),
    body('preferences.currency')
      .optional()
      .isIn(['INR', 'USD', 'EUR', 'GBP'])
      .withMessage('Invalid currency'),
    body('preferences.timezone')
      .optional()
      .isLength({ min: 1 })
      .withMessage('Timezone is required'),
  ],
  
  changePassword: [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 6 })
      .withMessage('New password must be at least 6 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),
    body('confirmPassword')
      .custom((value, { req }) => {
        if (value !== req.body.newPassword) {
          throw new Error('Password confirmation does not match');
        }
        return true;
      }),
  ],
};

// Transaction validation rules
const validateTransaction = {
  create: [
    body('description')
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Description must be between 1 and 200 characters'),
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be a positive number'),
    body('type')
      .isIn(['income', 'expense', 'transfer'])
      .withMessage('Type must be income, expense, or transfer'),
    body('category')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Category must be between 1 and 50 characters'),
    body('account')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Account must be between 1 and 50 characters'),
    body('date')
      .optional()
      .isISO8601()
      .withMessage('Date must be a valid ISO 8601 date'),
    body('tags')
      .optional()
      .isArray()
      .withMessage('Tags must be an array'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Notes cannot exceed 500 characters'),
    body('isRecurring')
      .optional()
      .isBoolean()
      .withMessage('isRecurring must be a boolean'),
    body('recurringPattern.frequency')
      .optional()
      .isIn(['daily', 'weekly', 'monthly', 'yearly'])
      .withMessage('Recurring frequency must be daily, weekly, monthly, or yearly'),
    body('recurringPattern.interval')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Recurring interval must be a positive integer'),
  ],
  
  update: [
    param('id')
      .isMongoId()
      .withMessage('Invalid transaction ID'),
    body('description')
      .optional()
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage('Description must be between 1 and 200 characters'),
    body('amount')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('Amount must be a positive number'),
    body('type')
      .optional()
      .isIn(['income', 'expense', 'transfer'])
      .withMessage('Type must be income, expense, or transfer'),
    body('category')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Category must be between 1 and 50 characters'),
  ],
  
  query: [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100'),
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
    query('type')
      .optional()
      .isIn(['income', 'expense', 'transfer'])
      .withMessage('Type must be income, expense, or transfer'),
    query('category')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Category must be between 1 and 50 characters'),
  ],
};

// Budget validation rules
const validateBudget = {
  create: [
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Budget name must be between 1 and 100 characters'),
    body('category')
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Category must be between 1 and 50 characters'),
    body('totalAmount')
      .isFloat({ min: 0.01 })
      .withMessage('Total amount must be a positive number'),
    body('period')
      .optional()
      .isIn(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'])
      .withMessage('Period must be daily, weekly, monthly, quarterly, or yearly'),
    // Allow controller to default dates when not provided
    body('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    body('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date')
      .custom((value, { req }) => {
        if (req.body.startDate) {
          const end = new Date(value)
          const start = new Date(req.body.startDate)
          // Allow same-day ranges (>=) to support daily budgets even if period is missing
          if (end < start) {
            throw new Error('End date cannot be before start date')
          }
        }
        return true;
      }),
    body('alerts.threshold')
      .optional()
      .isFloat({ min: 0, max: 100 })
      .withMessage('Alert threshold must be between 0 and 100'),
  ],
  
  update: [
    param('id')
      .isMongoId()
      .withMessage('Invalid budget ID'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Budget name must be between 1 and 100 characters'),
    body('totalAmount')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('Total amount must be a positive number'),
  ],
};

// Financial Goal validation rules
const validateFinancialGoal = {
  create: [
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Goal name must be between 1 and 100 characters'),
    body('type')
      .isIn(['savings', 'debt_payment', 'investment', 'purchase', 'emergency_fund', 'retirement', 'other'])
      .withMessage('Invalid goal type'),
    body('targetAmount')
      .isFloat({ min: 0.01 })
      .withMessage('Target amount must be a positive number'),
    body('targetDate')
      .isISO8601()
      .withMessage('Target date must be a valid ISO 8601 date')
      .custom((value) => {
        if (new Date(value) <= new Date()) {
          throw new Error('Target date must be in the future');
        }
        return true;
      }),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'critical'])
      .withMessage('Priority must be low, medium, high, or critical'),
    body('recurringAmount')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('Recurring amount must be a positive number'),
    body('recurringFrequency')
      .optional()
      .isIn(['weekly', 'monthly', 'quarterly', 'yearly'])
      .withMessage('Recurring frequency must be weekly, monthly, quarterly, or yearly'),
  ],
  
  update: [
    param('id')
      .isMongoId()
      .withMessage('Invalid goal ID'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Goal name must be between 1 and 100 characters'),
    body('targetAmount')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('Target amount must be a positive number'),
  ],
  
  addContribution: [
    param('id')
      .isMongoId()
      .withMessage('Invalid goal ID'),
    body('amount')
      .isFloat({ min: 0.01 })
      .withMessage('Contribution amount must be a positive number'),
    body('source')
      .optional()
      .trim()
      .isLength({ min: 1, max: 50 })
      .withMessage('Source must be between 1 and 50 characters'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage('Notes cannot exceed 200 characters'),
  ],
};

// Trading validation rules - UPDATED
// Trading validation rules - UPDATED
const validateTrading = {
  placeOrder: [
    body('symbol')
      .trim()
      .isLength({ min: 1, max: 20 })
      .withMessage('Symbol is required and must be between 1 and 20 characters'),
    body('stock')
      .optional()
      .isMongoId()
      .withMessage('Invalid stock ID'),
    body('type')
      .isIn(['BUY', 'SELL'])
      .withMessage('Order type must be BUY or SELL'),
    body('quantity')
      .isInt({ min: 1 })
      .withMessage('Quantity must be a positive integer'),
    body('price')
      .if(body('orderType').equals('LIMIT'))
      .isFloat({ min: 0.01 })
      .withMessage('Price must be a positive number for limit orders'),
    body('orderType')
      .isIn(['MARKET', 'LIMIT'])
      .withMessage('Order type must be MARKET or LIMIT'),
    body('stopLossPrice')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('Stop loss price must be a positive number'),
    body('targetPrice')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('Target price must be a positive number'),
    // Custom validation to ensure either stock ID or symbol is provided
    body().custom((value) => {
      if (!value.symbol && !value.stock) {
        throw new Error('Either symbol or stock ID must be provided');
      }
      return true;
    }),
  ],
  
  addToWatchlist: [
    body('stock')
      .isMongoId()
      .withMessage('Invalid stock ID'),
    body('targetPrice')
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage('Target price must be a positive number'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage('Notes must be less than 500 characters'),
  ],
  
  cancelOrder: [
    param('id')
      .isMongoId()
      .withMessage('Invalid order ID'),
  ],
};

// Stock validation rules
const validateStock = {
  search: [
    query('q')
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Search query must be between 1 and 100 characters'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('Limit must be between 1 and 50'),
  ],
  
  getById: [
    param('id')
      .isMongoId()
      .withMessage('Invalid stock ID'),
  ],
  
  getHistorical: [
    param('symbol')
      .trim()
      .isLength({ min: 1, max: 20 })
      .withMessage('Symbol must be between 1 and 20 characters'),
    query('period')
      .optional()
      .isIn(['1d', '5d', '1mo', '3mo', '6mo', '1y', '2y', '5y', '10y', 'ytd', 'max'])
      .withMessage('Invalid period'),
    query('interval')
      .optional()
      .isIn(['1m', '2m', '5m', '15m', '30m', '60m', '90m', '1h', '1d', '5d', '1wk', '1mo', '3mo'])
      .withMessage('Invalid interval'),
  ],
  
  getAnalysis: [
    param('symbol')
      .trim()
      .isLength({ min: 1, max: 20 })
      .withMessage('Symbol must be between 1 and 20 characters'),
    body('query')
      .optional()
      .trim()
      .isLength({ min: 1, max: 500 })
      .withMessage('Query must be between 1 and 500 characters'),
  ],
};

// Chatbot validation rules
const validateChatbot = {
  query: [
    body('message')
      .trim()
      .isLength({ min: 1, max: 1000 })
      .withMessage('Message must be between 1 and 1000 characters'),
    body('conversationHistory')
      .optional()
      .isArray()
      .withMessage('Conversation history must be an array'),
  ],
};

// Export validation rules
const validateExport = {
  transactions: [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
    query('format')
      .optional()
      .isIn(['excel', 'pdf'])
      .withMessage('Format must be excel or pdf'),
  ],
  
  budget: [
    query('startDate')
      .optional()
      .isISO8601()
      .withMessage('Start date must be a valid ISO 8601 date'),
    query('endDate')
      .optional()
      .isISO8601()
      .withMessage('End date must be a valid ISO 8601 date'),
    query('format')
      .optional()
      .isIn(['excel', 'pdf'])
      .withMessage('Format must be excel or pdf'),
  ],
};

// MongoDB ObjectId validation
const validateObjectId = (paramName) => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName}`),
];

// Pagination validation
const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

// Date range validation
const validateDateRange = [
  query('startDate')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid ISO 8601 date'),
  query('endDate')
    .optional()
    .isISO8601()
    .withMessage('End date must be a valid ISO 8601 date')
    .custom((value, { req }) => {
      if (req.query.startDate && new Date(value) <= new Date(req.query.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
];

module.exports = {
  handleValidationErrors,
  validateUser,
  validateTransaction,
  validateBudget,
  validateFinancialGoal,
  validateTrading,
  validateStock,
  validateChatbot,
  validateExport,
  validateObjectId,
  validatePagination,
  validateDateRange,
};