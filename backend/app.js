const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const path = require('path');
const cookieParser = require('cookie-parser');

// Load environment variables
dotenv.config();

const app = express();

// Trust first proxy (Render's load balancer) so req.ip returns the real client IP.
// Required for rate limiting to work correctly per-user instead of per-proxy.
app.set('trust proxy', 1);

// Middleware
// Configure CORS to accept requests from frontend
const allowedOrigins = [
  'http://localhost:3000',
  'https://finsync-w6ce.onrender.com',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      // Reject unknown origins in production, allow in development
      if (process.env.NODE_ENV === 'production') {
        callback(new Error('CORS: Origin not allowed'));
      } else {
        callback(null, true);
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// Security middleware
app.use(helmet());                  // Set security HTTP headers

// Increase payload size limits
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cookieParser());

// Catch JSON parse errors and return generic message
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ success: false, message: 'Invalid JSON in request body' });
  }
  next(err);
});

// Custom NoSQL injection sanitizer (Express 5 compatible)
// express-mongo-sanitize tries to overwrite req.query which is read-only in Express 5,
// so we sanitize req.body and req.params manually instead.
const sanitizeValue = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  for (const key of Object.keys(obj)) {
    if (key.startsWith('$')) {
      delete obj[key];
    } else if (typeof obj[key] === 'object') {
      sanitizeValue(obj[key]);
    }
  }
  return obj;
};

app.use((req, res, next) => {
  if (req.body) sanitizeValue(req.body);
  if (req.params) sanitizeValue(req.params);
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    message: 'Backend is awake and ready',
    timestamp: new Date().toISOString()
  });
});

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/v1/transactions', require('./routes/transactionRoutes'));
app.use('/api/export', require('./routes/exportRoutes'));
app.use('/api/v1/stocks', require('./routes/stockRoutes'));
app.use('/api/stocks-analysis', require('./routes/stockAnalysisRoutes'));
app.use('/api/v1/profile', require('./routes/profileRoutes'));
app.use('/api/analysis', require('./routes/analysisRoutes'));
app.use('/api/v1/budgets', require('./routes/budgetRoutes'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/v1/chatbot', require('./routes/chatbotRoutes'));
app.use('/api/v1/trading', require('./routes/tradingRoutes'));
app.use('/api/v1/users', require('./routes/userRoutes'));
app.use('/api/v1/notifications', require('./routes/notificationRoutes'));

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

module.exports = app;