const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const cookieParser = require('cookie-parser');
const settingsRoutes = require('./routes/settings');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
// Configure CORS to accept requests from frontend
app.use(cors({
  origin: 'http://localhost:3000', // Changed from 3001 to 3000
  credentials: true
}));

// Increase payload size limits
app.use(express.json({ limit: '50mb' })); // Increase JSON payload limit
app.use(express.urlencoded({ limit: '50mb', extended: true })); // Increase URL-encoded payload limit
app.use(cookieParser());

// Add this line with your other routes
app.use('/api/settings', settingsRoutes);

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ 
    message: 'Backend is connected and working!',
    timestamp: new Date().toISOString(),
    server: 'Node.js/Express',
    frontend: 'Connected from localhost:3000'
  });
});

// In app.js, add this test endpoint
app.get('/api/debug', (req, res) => {
  res.json({ 
    message: 'Debug endpoint works',
    routes: {
      auth: '/api/auth',
      transactions: '/api/transactions',
      export: '/api/export',
      profile: '/api/profile',
      stocks: '/api/stocks',
      'stocks-analysis': '/api/stocks-analysis'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

module.exports = app;