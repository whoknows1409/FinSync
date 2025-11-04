const mongoose = require('mongoose');
const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Budget = require('../models/Budget');
const FinancialGoal = require('../models/FinancialGoal');
const Stock = require('../models/Stock');
const TradingAccount = require('../models/TradingAccount');
const logger = require('./logger');

// Sample stock data
const sampleStocks = [
  {
    symbol: 'RELIANCE',
    name: 'Reliance Industries Ltd',
    sector: 'Oil & Gas',
    industry: 'Refineries',
    currentPrice: 2456.50,
    previousClose: 2444.20,
    change: 12.30,
    changePercent: 0.50,
    volume: 1234567,
    averageVolume: 1500000,
    marketCap: 1665000,
    sharesOutstanding: 678000000,
    pe: 12.5,
    pb: 1.8,
    dividendYield: 0.8,
    eps: 196.52,
    high52Week: 2500,
    low52Week: 2100,
    isNifty50: true,
    isNifty100: true,
    isNifty500: true,
    description: 'Reliance Industries Limited is an Indian multinational conglomerate company.',
    website: 'https://www.ril.com',
    isActive: true,
  },
  {
    symbol: 'TCS',
    name: 'Tata Consultancy Services Ltd',
    sector: 'IT',
    industry: 'IT Services',
    currentPrice: 3456.75,
    previousClose: 3480.20,
    change: -23.45,
    changePercent: -0.67,
    volume: 987654,
    averageVolume: 1200000,
    marketCap: 1250000,
    sharesOutstanding: 362000000,
    pe: 25.2,
    pb: 8.5,
    dividendYield: 1.2,
    eps: 137.17,
    high52Week: 3600,
    low52Week: 3000,
    isNifty50: true,
    isNifty100: true,
    isNifty500: true,
    description: 'Tata Consultancy Services Limited is an Indian multinational information technology services and consulting company.',
    website: 'https://www.tcs.com',
    isActive: true,
  },
  {
    symbol: 'HDFCBANK',
    name: 'HDFC Bank Ltd',
    sector: 'Banking',
    industry: 'Private Sector Bank',
    currentPrice: 1654.20,
    previousClose: 1645.30,
    change: 8.90,
    changePercent: 0.54,
    volume: 2345678,
    averageVolume: 3000000,
    marketCap: 1200000,
    sharesOutstanding: 725000000,
    pe: 18.5,
    pb: 3.2,
    dividendYield: 0.9,
    eps: 89.42,
    high52Week: 1700,
    low52Week: 1400,
    isNifty50: true,
    isNifty100: true,
    isNifty500: true,
    description: 'HDFC Bank Limited is an Indian banking and financial services company.',
    website: 'https://www.hdfcbank.com',
    isActive: true,
  },
  {
    symbol: 'INFY',
    name: 'Infosys Ltd',
    sector: 'IT',
    industry: 'IT Services',
    currentPrice: 1456.80,
    previousClose: 1472.00,
    change: -15.20,
    changePercent: -1.03,
    volume: 1876543,
    averageVolume: 2000000,
    marketCap: 600000,
    sharesOutstanding: 412000000,
    pe: 22.8,
    pb: 6.2,
    dividendYield: 1.5,
    eps: 63.89,
    high52Week: 1500,
    low52Week: 1200,
    isNifty50: true,
    isNifty100: true,
    isNifty500: true,
    description: 'Infosys Limited is an Indian multinational corporation that provides business consulting, information technology and outsourcing services.',
    website: 'https://www.infosys.com',
    isActive: true,
  },
  {
    symbol: 'ICICIBANK',
    name: 'ICICI Bank Ltd',
    sector: 'Banking',
    industry: 'Private Sector Bank',
    currentPrice: 987.45,
    previousClose: 982.15,
    change: 5.30,
    changePercent: 0.54,
    volume: 3456789,
    averageVolume: 4000000,
    marketCap: 680000,
    sharesOutstanding: 688000000,
    pe: 16.2,
    pb: 2.8,
    dividendYield: 1.1,
    eps: 60.95,
    high52Week: 1050,
    low52Week: 850,
    isNifty50: true,
    isNifty100: true,
    isNifty500: true,
    description: 'ICICI Bank Limited is an Indian multinational banking and financial services company.',
    website: 'https://www.icicibank.com',
    isActive: true,
  },
];

// Sample transaction categories
const transactionCategories = [
  'Food & Dining',
  'Transportation',
  'Entertainment',
  'Utilities',
  'Shopping',
  'Healthcare',
  'Education',
  'Travel',
  'Insurance',
  'Investment',
  'Salary',
  'Freelance',
  'Business',
  'Gift',
  'Other',
];

// Sample budget data
const sampleBudgets = [
  {
    name: 'Monthly Food Budget',
    category: 'Food & Dining',
    totalAmount: 8000,
    period: 'monthly',
    isRollover: true,
    alerts: {
      enabled: true,
      threshold: 80,
    },
  },
  {
    name: 'Transportation Budget',
    category: 'Transportation',
    totalAmount: 5000,
    period: 'monthly',
    isRollover: false,
    alerts: {
      enabled: true,
      threshold: 90,
    },
  },
  {
    name: 'Entertainment Budget',
    category: 'Entertainment',
    totalAmount: 3000,
    period: 'monthly',
    isRollover: false,
    alerts: {
      enabled: true,
      threshold: 85,
    },
  },
];

// Sample financial goals
const sampleGoals = [
  {
    name: 'Emergency Fund',
    type: 'emergency_fund',
    targetAmount: 200000,
    currentAmount: 150000,
    targetDate: new Date(Date.now() + 6 * 30 * 24 * 60 * 60 * 1000), // 6 months from now
    priority: 'high',
    isRecurring: true,
    recurringAmount: 10000,
    recurringFrequency: 'monthly',
  },
  {
    name: 'Vacation Fund',
    type: 'savings',
    targetAmount: 50000,
    currentAmount: 25000,
    targetDate: new Date(Date.now() + 3 * 30 * 24 * 60 * 60 * 1000), // 3 months from now
    priority: 'medium',
    isRecurring: true,
    recurringAmount: 5000,
    recurringFrequency: 'monthly',
  },
  {
    name: 'New Laptop',
    type: 'purchase',
    targetAmount: 80000,
    currentAmount: 60000,
    targetDate: new Date(Date.now() + 2 * 30 * 24 * 60 * 60 * 1000), // 2 months from now
    priority: 'medium',
    isRecurring: false,
  },
];

// Generate sample transactions
const generateSampleTransactions = (userId, count = 50) => {
  const transactions = [];
  const now = new Date();
  
  for (let i = 0; i < count; i++) {
    const daysAgo = Math.floor(Math.random() * 90); // Last 90 days
    const date = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    
    const isIncome = Math.random() < 0.2; // 20% chance of income
    const category = isIncome ? 
      ['Salary', 'Freelance', 'Business', 'Investment'][Math.floor(Math.random() * 4)] :
      transactionCategories[Math.floor(Math.random() * transactionCategories.length)];
    
    const amount = isIncome ? 
      Math.floor(Math.random() * 50000) + 10000 : // ₹10,000 - ₹60,000
      Math.floor(Math.random() * 5000) + 100; // ₹100 - ₹5,100
    
    const descriptions = {
      'Food & Dining': ['Restaurant', 'Grocery Shopping', 'Food Delivery', 'Coffee Shop'],
      'Transportation': ['Uber Ride', 'Petrol', 'Metro Card', 'Taxi'],
      'Entertainment': ['Movie Ticket', 'Netflix Subscription', 'Concert', 'Gaming'],
      'Utilities': ['Electricity Bill', 'Water Bill', 'Internet Bill', 'Gas Bill'],
      'Shopping': ['Online Shopping', 'Clothing', 'Electronics', 'Books'],
      'Salary': ['Monthly Salary', 'Bonus', 'Overtime Pay'],
      'Freelance': ['Project Payment', 'Consulting Fee', 'Design Work'],
    };
    
    const categoryDescriptions = descriptions[category] || ['Transaction'];
    const description = categoryDescriptions[Math.floor(Math.random() * categoryDescriptions.length)];
    
    transactions.push({
      user: userId,
      description,
      amount,
      type: isIncome ? 'income' : 'expense',
      category,
      account: ['Savings Account', 'Current Account', 'Credit Card'][Math.floor(Math.random() * 3)],
      date,
      tags: [category.toLowerCase().replace(' & ', '_').replace(' ', '_')],
      notes: Math.random() < 0.3 ? 'Sample transaction for testing' : undefined,
      isRecurring: Math.random() < 0.1, // 10% chance of recurring
      aiCategorized: Math.random() < 0.7, // 70% AI categorized
      status: 'completed',
    });
  }
  
  return transactions;
};

// Seed database function
const seedDatabase = async () => {
  try {
    logger.info('Starting database seeding...');

    // Clear existing data
    await User.deleteMany({});
    await Transaction.deleteMany({});
    await Budget.deleteMany({});
    await FinancialGoal.deleteMany({});
    await Stock.deleteMany({});
    await TradingAccount.deleteMany({});

    // Create sample user
    const sampleUser = await User.create({
      name: 'John Doe',
      email: 'john@example.com',
      password: 'password123',
      phone: '9876543210',
      role: 'premium',
      isEmailVerified: true,
    });

    logger.info(`Created sample user: ${sampleUser.email}`);

    // Create stocks
    const stocks = await Stock.insertMany(sampleStocks);
    logger.info(`Created ${stocks.length} stocks`);

    // Create sample transactions
    const transactions = generateSampleTransactions(sampleUser._id, 100);
    await Transaction.insertMany(transactions);
    logger.info(`Created ${transactions.length} transactions`);

    // Create sample budgets
    const budgets = sampleBudgets.map(budget => ({
      ...budget,
      user: sampleUser._id,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      spentAmount: Math.floor(Math.random() * budget.totalAmount * 0.8), // Random spent amount
    }));
    
    await Budget.insertMany(budgets);
    logger.info(`Created ${budgets.length} budgets`);

    // Create sample financial goals
    const goals = sampleGoals.map(goal => ({
      ...goal,
      user: sampleUser._id,
      contributions: [
        {
          amount: goal.currentAmount,
          date: new Date(),
          source: 'Initial',
          notes: 'Initial contribution',
        },
      ],
    }));
    
    await FinancialGoal.insertMany(goals);
    logger.info(`Created ${goals.length} financial goals`);

    // Create trading account
    const tradingAccount = await TradingAccount.create({
      user: sampleUser._id,
      walletBalance: 1000000,
      holdings: [
        {
          stock: stocks[0]._id, // RELIANCE
          quantity: 10,
          averagePrice: 2400,
          currentPrice: stocks[0].currentPrice,
          marketValue: 10 * stocks[0].currentPrice,
          unrealizedPnL: 10 * (stocks[0].currentPrice - 2400),
          pnlPercentage: ((stocks[0].currentPrice - 2400) / 2400) * 100,
          sector: stocks[0].sector,
        },
        {
          stock: stocks[1]._id, // TCS
          quantity: 5,
          averagePrice: 3500,
          currentPrice: stocks[1].currentPrice,
          marketValue: 5 * stocks[1].currentPrice,
          unrealizedPnL: 5 * (stocks[1].currentPrice - 3500),
          pnlPercentage: ((stocks[1].currentPrice - 3500) / 3500) * 100,
          sector: stocks[1].sector,
        },
      ],
      watchlist: [
        {
          stock: stocks[2]._id, // HDFCBANK
          targetPrice: 1700,
          notes: 'Watch for buying opportunity',
        },
      ],
      orders: [
        {
          stock: stocks[0]._id,
          type: 'BUY',
          quantity: 10,
          price: 2400,
          orderType: 'MARKET',
          status: 'EXECUTED',
          executedPrice: 2400,
          executedQuantity: 10,
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          executedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        },
      ],
    });

    // Update trading account values
    await tradingAccount.updateHoldingPrices();
    logger.info('Created trading account with sample holdings');

    // Create additional users for testing
    const additionalUsers = await User.insertMany([
      {
        name: 'Jane Smith',
        email: 'jane@example.com',
        password: 'password123',
        phone: '9876543211',
        role: 'basic',
        isEmailVerified: true,
      },
      {
        name: 'Bob Johnson',
        email: 'bob@example.com',
        password: 'password123',
        phone: '9876543212',
        role: 'premium',
        isEmailVerified: true,
      },
    ]);

    // Create transactions for additional users
    for (const user of additionalUsers) {
      const userTransactions = generateSampleTransactions(user._id, 30);
      await Transaction.insertMany(userTransactions);
      
      // Create trading account for each user
      await TradingAccount.create({
        user: user._id,
        walletBalance: 1000000,
      });
    }

    logger.info(`Created ${additionalUsers.length} additional users`);

    logger.info('Database seeding completed successfully!');
    logger.info('Sample user credentials:');
    logger.info('Email: john@example.com');
    logger.info('Password: password123');
    
    return {
      users: [sampleUser, ...additionalUsers],
      stocks,
      transactions,
      budgets,
      goals,
      tradingAccount,
    };
  } catch (error) {
    logger.error('Error seeding database:', error);
    throw error;
  }
};

// Export function for manual seeding
const seedDatabaseManually = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    await seedDatabase();
    process.exit(0);
  } catch (error) {
    logger.error('Manual seeding failed:', error);
    process.exit(1);
  }
};

// Run manual seeding if this file is executed directly
if (require.main === module) {
  seedDatabaseManually();
}

module.exports = {
  seedDatabase,
  generateSampleTransactions,
  sampleStocks,
  transactionCategories,
  sampleBudgets,
  sampleGoals,
};
