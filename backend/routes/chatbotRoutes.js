// backend/routes/chatbotRoutes.js

const express = require('express');
const router = express.Router();
const {
  sendMessage,
  getFinancialInsights,
  getBudgetAdvice,
  getInvestmentAdvice,
  analyzeStockSentiment,
  categorizeTransaction,
  predictStockPrice,
  saveChatHistory,
  getChatHistory,
  deleteChatHistory,
  clearChatHistory,
} = require('../controllers/chatbotController');
const { protect } = require('../middleware/auth');
const { aiLimiter } = require('../middleware/rateLimiter');
const {
  validateChatbot,
  handleValidationErrors,
} = require('../middleware/validation');

// All chatbot routes are protected
router.use(protect);

// Chatbot query endpoint
router.post('/query', aiLimiter, validateChatbot.query, handleValidationErrors, sendMessage);

// Financial insights
router.post('/insights', aiLimiter, getFinancialInsights);

// Budget advice
router.post('/budget-advice', aiLimiter, getBudgetAdvice);

// Investment advice
router.post('/investment-advice', aiLimiter, getInvestmentAdvice);

// Stock sentiment analysis
router.post('/stock-sentiment', aiLimiter, analyzeStockSentiment);

// Transaction categorization
router.post('/categorize-transaction', aiLimiter, categorizeTransaction);

// Stock price prediction
router.post('/stock-prediction', aiLimiter, predictStockPrice);

// Chat history endpoints
router.post('/save-chat', saveChatHistory);
router.get('/chat-history', getChatHistory);
router.delete('/chat-history/:id', deleteChatHistory);
router.delete('/chat-history', clearChatHistory);

module.exports = router;