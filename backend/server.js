// Import the Express app from app.js
const app = require('./app');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const exportRoutes = require('./routes/exportRoutes');
const stockRoutes = require('./routes/stockRoutes');
const stockAnalysisRoutes = require('./routes/stockAnalysisRoutes');
const profileRoutes = require('./routes/profileRoutes');
const analysisRoutes = require('./routes/analysisRoutes');
const budgetRoutes = require('./routes/budgetRoutes');
const chatbotRoutes = require('./routes/chatbotRoutes');
const settingsRoutes = require('./routes/settings');
const tradingRoutes = require('./routes/tradingRoutes');
const userRoutes = require('./routes/userRoutes');

// Import cron jobs
require('./utils/cronJobs');

// Connect to MongoDB
const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/finsync';
console.log('Connecting to MongoDB...');
mongoose.connect(mongoUri)
.then(() => console.log('✅ MongoDB connected successfully'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  console.error('MongoDB URI (first 20 chars):', mongoUri.substring(0, 20) + '...');
});

// Debug log to check route loading
console.log('Setting up routes...');

// Routes
app.use('/api/auth', authRoutes);
console.log('Auth routes registered at /api/v1/auth');

app.use('/api/v1/transactions', transactionRoutes);
console.log('Transaction routes registered at /api/v1/transactions');

app.use('/api/export', exportRoutes);
console.log('Export routes registered at /api/export');

app.use('/api/v1/stocks', stockRoutes);
console.log('Stock routes registered at /api/v1/stocks');

app.use('/api/stocks-analysis', stockAnalysisRoutes);
console.log('Stock analysis routes registered at /api/stocks-analysis');

app.use('/api/v1/profile', profileRoutes);
console.log('Profile routes registered at /api/profile');

app.use('/api/analysis', analysisRoutes);
app.use('/api/v1/budgets', budgetRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/v1/chatbot', chatbotRoutes);
app.use('/api/v1/trading', tradingRoutes);
console.log('Trading routes registered at /api/v1/trading');

app.use('/api/v1/users', userRoutes);
console.log('User routes registered at /api/v1/users');

// Static files are already served from app.js

// 404 handler - must be before error handler
app.use((req, res, next) => {
  res.status(404).json({ 
    success: false, 
    message: `Route ${req.method} ${req.originalUrl} not found` 
  });
});

// Global error handling middleware (should be last)
app.use((err, req, res, next) => {
  console.error('❌ Global error handler caught:', err);
  console.error('Error stack:', err.stack);
  
  // Ensure we always send JSON response
  res.status(err.status || 500).json({ 
    success: false,
    message: err.message || 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? {
      message: err.message,
      stack: err.stack
    } : undefined
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));