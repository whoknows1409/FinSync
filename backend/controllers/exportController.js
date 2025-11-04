const Transaction = require('../models/Transaction');
const User = require('../models/User');
const Budget = require('../models/Budget');
const Goal = require('../models/Goal');
const RecurringTransaction = require('../models/RecurringTransaction');
const Activity = require('../models/Activity');
const ChatHistory = require('../models/ChatHistory');
const TradingAccount = require('../models/TradingAccount');
const Stock = require('../models/Stock');

// @desc    Export all user data to JSON
// @route   GET /api/export/all
// @access  Private
exports.exportAllData = async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Fetch all user data
    const [
      user,
      transactions,
      budgets,
      goals,
      recurringTransactions,
      activities,
      chatHistory,
      tradingAccounts,
      stocks
    ] = await Promise.all([
      User.findById(userId).select('-password'),
      Transaction.find({ user: userId }).sort({ date: -1 }),
      Budget.find({ user: userId }),
      Goal.find({ user: userId }),
      RecurringTransaction.find({ user: userId }),
      Activity.find({ user: userId }).sort({ timestamp: -1 }).limit(100),
      ChatHistory.find({ user: userId }).sort({ createdAt: -1 }),
      TradingAccount.find({ user: userId }),
      Stock.find({ user: userId })
    ]);
    
    // Compile all data
    const exportData = {
      exportDate: new Date().toISOString(),
      exportType: 'complete',
      user: {
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      },
      transactions: transactions.map(t => ({
        date: t.date,
        description: t.description,
        category: t.category,
        type: t.type,
        amount: t.amount,
        paymentMethod: t.paymentMethod,
        tags: t.tags,
        createdAt: t.createdAt
      })),
      budgets: budgets.map(b => ({
        category: b.category,
        amount: b.amount,
        month: b.month,
        spent: b.spent,
        createdAt: b.createdAt
      })),
      goals: goals.map(g => ({
        name: g.name,
        targetAmount: g.targetAmount,
        currentAmount: g.currentAmount,
        deadline: g.deadline,
        category: g.category,
        priority: g.priority,
        createdAt: g.createdAt
      })),
      recurringTransactions: recurringTransactions.map(rt => ({
        description: rt.description,
        amount: rt.amount,
        category: rt.category,
        type: rt.type,
        frequency: rt.frequency,
        startDate: rt.startDate,
        endDate: rt.endDate,
        isActive: rt.isActive
      })),
      activities: activities.map(a => ({
        type: a.type,
        description: a.description,
        timestamp: a.timestamp,
        metadata: a.metadata
      })),
      chatHistory: chatHistory.map(ch => ({
        title: ch.title,
        messages: ch.messages,
        createdAt: ch.createdAt
      })),
      tradingAccounts: tradingAccounts.map(ta => ({
        accountName: ta.accountName,
        balance: ta.balance,
        stockHoldings: ta.stockHoldings
      })),
      stocks: stocks.map(s => ({
        symbol: s.symbol,
        name: s.name,
        quantity: s.quantity,
        averagePrice: s.averagePrice
      })),
      summary: {
        totalTransactions: transactions.length,
        totalBudgets: budgets.length,
        totalGoals: goals.length,
        totalRecurringTransactions: recurringTransactions.length,
        totalActivities: activities.length,
        totalChatHistory: chatHistory.length
      }
    };
    
    // Return as JSON download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=finsync-complete-data-${new Date().toISOString().split('T')[0]}.json`);
    
    res.send(JSON.stringify(exportData, null, 2));
  } catch (error) {
    console.error('Export all data error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Export transactions to CSV
// @route   GET /api/export/csv
// @access  Private
exports.exportToCSV = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build query
    const query = { user: req.user.id };
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const transactions = await Transaction.find(query).sort({ date: -1 });
    
    // Create CSV content
    let csvContent = "Date,Description,Category,Type,Amount\n";
    
    transactions.forEach(transaction => {
      csvContent += `${transaction.date},${transaction.description},${transaction.category},${transaction.type},${transaction.amount}\n`;
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=transactions-${new Date().toISOString().split('T')[0]}.csv`);
    
    res.send(csvContent);
  } catch (error) {
    console.error('Export CSV error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Export transactions to Excel
// @route   GET /api/export/excel
// @access  Private
exports.exportToExcel = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build query
    const query = { user: req.user.id };
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const transactions = await Transaction.find(query).sort({ date: -1 });
    
    // Create Excel data
    const excelData = [
      ['Date', 'Description', 'Category', 'Type', 'Amount'],
      ...transactions.map(transaction => [
        transaction.date,
        transaction.description,
        transaction.category,
        transaction.type,
        transaction.amount
      ])
    ];
    
    // Use a library like exceljs to create Excel file
    // For simplicity, we'll return CSV format here
    // In a real app, you would use a proper Excel library
    
    let csvContent = "Date,Description,Category,Type,Amount\n";
    
    transactions.forEach(transaction => {
      csvContent += `${transaction.date},${transaction.description},${transaction.category},${transaction.type},${transaction.amount}\n`;
    });
    
    res.setHeader('Content-Type', 'application/vnd.ms-excel');
    res.setHeader('Content-Disposition', `attachment; filename=transactions-${new Date().toISOString().split('T')[0]}.xlsx`);
    
    res.send(csvContent);
  } catch (error) {
    console.error('Export Excel error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc    Export transactions to PDF
// @route   GET /api/export/pdf
// @access  Private
exports.exportToPDF = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Build query
    const query = { user: req.user.id };
    
    if (startDate && endDate) {
      query.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const transactions = await Transaction.find(query).sort({ date: -1 });
    
    // Use a library like pdfkit to create PDF
    // For simplicity, we'll return JSON format here
    // In a real app, you would use a proper PDF library
    
    res.json({
      success: true,
      data: {
        transactions,
        exportDate: new Date().toISOString(),
        dateRange: {
          startDate,
          endDate
        }
      }
    });
  } catch (error) {
    console.error('Export PDF error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};