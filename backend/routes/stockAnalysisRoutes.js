const express = require('express');
const router = express.Router();

let yahooFinanceInstance;
async function getYahooFinance() {
  if (!yahooFinanceInstance) {
    const mod = (await import('yahoo-finance2')).default;
    // v3 exports a class (needs `new`), v2 exports a ready-to-use object
    if (typeof mod === 'function') {
      yahooFinanceInstance = new mod();
    } else {
      yahooFinanceInstance = mod;
    }
  }
  return yahooFinanceInstance;
}
const logger = require('../utils/logger');
const geminiService = require('../services/geminiService'); // This is correct

// Helper function to format stock data with fallbacks
function formatStockData(quote) {
  return {
    symbol: quote.symbol,
    name: quote.longName || quote.shortName || quote.price?.longName || quote.price?.shortName || 'Unknown',
    currentPrice: quote.regularMarketPrice || quote.price?.regularMarketPrice || 0,
    previousClose: quote.regularMarketPreviousClose || quote.price?.regularMarketPreviousClose || 0,
    marketCap: quote.marketCap || quote.price?.marketCap || 0,
    peRatio: quote.trailingPE || quote.summaryDetail?.trailingPE || quote.price?.trailingPE || null,
    dividendYield: quote.dividendYield || quote.summaryDetail?.dividendYield || quote.price?.dividendYield || null,
    fiftyTwoWeekHigh: quote.fiftyTwoWeekHigh || quote.summaryDetail?.fiftyTwoWeekHigh || quote.price?.fiftyTwoWeekHigh || null,
    fiftyTwoWeekLow: quote.fiftyTwoWeekLow || quote.summaryDetail?.fiftyTwoWeekLow || quote.price?.fiftyTwoWeekLow || null,
    volume: quote.regularMarketVolume || quote.price?.regularMarketVolume || 0,
    averageVolume: quote.averageDailyVolume3Month || quote.averageDailyVolume10Day || quote.price?.averageDailyVolume3Month || 0,
    beta: quote.beta || quote.defaultKeyStatistics?.beta || quote.price?.beta || null
  };
}

// Route to get stock data
router.get('/stock-data', async (req, res) => {
  try {
    const { symbol } = req.query;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Stock symbol is required' });
    }

    // Fetch stock data from Yahoo Finance with enhanced modules
    const quote = await (await getYahooFinance()).quote(symbol);
    
    // Format stock data with fallbacks
    let stockData = formatStockData(quote);
    
    // If 52-week high/low are not available, fetch from historical data
    // Skip historical enrichment; not supported in current yahoo-finance2 build

    res.json(stockData);
  } catch (error) {
    logger.error('Error fetching stock data:', error);
    if (process.env.NODE_ENV === 'development') {
      // Return minimal mock to keep UI functional in dev
      const symbol = String(req.query.symbol || 'UNKNOWN').toUpperCase();
      return res.json({
        symbol,
        name: symbol,
        currentPrice: 100,
        previousClose: 100,
        marketCap: 0,
        peRatio: null,
        dividendYield: null,
        fiftyTwoWeekHigh: 0,
        fiftyTwoWeekLow: 0,
        volume: 0,
        averageVolume: 0,
        beta: null
      });
    }
    // Handle specific error for invalid stock symbols
    if (error.message.includes('Invalid symbol') || error.message.includes('No data found')) {
      return res.status(404).json({ error: 'Stock not found. Please enter a valid NSE stock symbol.' });
    }
    res.status(500).json({ error: 'Failed to fetch stock data' });
  }
});

// Route to get historical data for charts
router.get('/historical-data', async (req, res) => {
  try {
    const { symbol, period = '1mo' } = req.query;
    
    if (!symbol) {
      return res.status(400).json({ error: 'Stock symbol is required' });
    }

    // Determine the period for historical data
    let period1, period2;
    const now = new Date();
    
    switch (period) {
      case '7d':
        period1 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '1mo':
        period1 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '6mo':
        period1 = new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000);
        break;
      default:
        period1 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }
    
    period2 = now;

    // Fetch from Yahoo public chart API (no key required)
    const p1 = Math.floor(period1.getTime() / 1000);
    const p2 = Math.floor(period2.getTime() / 1000);
    const url = new URL(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`);
    url.searchParams.set('period1', String(p1));
    url.searchParams.set('period2', String(p2));
    url.searchParams.set('interval', '1d');
    url.searchParams.set('events', 'div,splits');

    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Finsync/1.0)'
      }
    });
    if (!resp.ok) {
      throw new Error(`Yahoo chart API ${resp.status}`);
    }
    const json = await resp.json();
    const result = json?.chart?.result?.[0];
    const timestamps = result?.timestamp || [];
    const closes = result?.indicators?.quote?.[0]?.close || [];
    const data = timestamps.map((ts, i) => ({
      date: new Date(ts * 1000).toISOString().split('T')[0],
      close: Number(closes[i] ?? 0)
    })).filter(p => !isNaN(p.close));
    return res.json(data);
  } catch (error) {
    logger.error('Error fetching historical data:', error);
    if (process.env.NODE_ENV === 'development') {
      // simple synthetic series
      const now = new Date();
      const points = 30;
      let base = 100;
      const mock = Array.from({ length: points }).map((_, i) => {
        const t = new Date(now.getTime() - (points - i) * 24 * 60 * 60 * 1000);
        base += (Math.random() - 0.5) * 2;
        return { date: t, close: Number(base.toFixed(2)) };
      });
      return res.json(mock);
    }
    res.status(500).json({ error: 'Failed to fetch historical data' });
  }
});

// Route to compare two stocks
router.get('/compare', async (req, res) => {
  // Set CORS headers explicitly for this endpoint
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Allow-Credentials', 'true');

  try {
    console.log('=== Stock Comparison Request ===');
    console.log('Query params:', req.query);
    console.log('Origin:', req.headers.origin);
    
    const { symbol1, symbol2 } = req.query;
    
    if (!symbol1 || !symbol2) {
      console.log('ERROR: Missing symbols in request');
      return res.status(400).json({ error: 'Both stock symbols are required' });
    }

    console.log(`Fetching data for ${symbol1} and ${symbol2}`);

    // Fetch data for both stocks with timeout and better error handling
    const fetchWithTimeout = (promise, timeout = 15000) => {
      return Promise.race([
        promise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout after 15 seconds')), timeout)
        )
      ]);
    };

    let quote1, quote2;
    try {
      const yahooFinance = await getYahooFinance();
      [quote1, quote2] = await Promise.all([
        fetchWithTimeout(yahooFinance.quote(symbol1)).catch(err => {
          console.error(`Error fetching ${symbol1}:`, err.message);
          throw new Error(`Failed to fetch data for ${symbol1}: ${err.message}`);
        }),
        fetchWithTimeout(yahooFinance.quote(symbol2)).catch(err => {
          console.error(`Error fetching ${symbol2}:`, err.message);
          throw new Error(`Failed to fetch data for ${symbol2}: ${err.message}`);
        })
      ]);
    } catch (fetchError) {
      console.error('Yahoo Finance fetch error:', fetchError);
      return res.status(500).json({ 
        error: 'Failed to fetch stock data from Yahoo Finance',
        details: fetchError.message
      });
    }

    console.log('Successfully fetched stock data from Yahoo Finance');

    // Format stock data with fallbacks
    let stock1 = formatStockData(quote1);
    let stock2 = formatStockData(quote2);

    // Calculate monthly change for both stocks (approximate as 0 in this build)
    const monthlyChange1 = 0;
    const monthlyChange2 = 0;

    // Add monthly change to stock data
    stock1.monthlyChange = monthlyChange1;
    stock2.monthlyChange = monthlyChange2;

    console.log('Generating AI comparison summary');

    // Generate AI comparison summary with error handling
    let aiSummary = '';
    try {
      aiSummary = await geminiService.compareStocks(stock1, stock2);
      aiSummary = aiSummary.trim();
      console.log('AI comparison generated successfully');
    } catch (aiError) {
      console.error('AI comparison failed, using fallback:', aiError);
      aiSummary = `Comparison between ${stock1.name} (${stock1.symbol}) and ${stock2.name} (${stock2.symbol}): 
      
${stock1.name} is trading at ₹${stock1.currentPrice.toFixed(2)} with a market cap of ₹${(stock1.marketCap / 10000000).toFixed(2)} Cr.
${stock2.name} is trading at ₹${stock2.currentPrice.toFixed(2)} with a market cap of ₹${(stock2.marketCap / 10000000).toFixed(2)} Cr.

Please analyze the detailed metrics below to make an informed investment decision.`;
    }

    console.log('Sending comparison response');

    return res.status(200).json({
      stock1,
      stock2,
      aiSummary
    });
  } catch (error) {
    console.error('=== ERROR in Stock Comparison ===');
    console.error('Error:', error);
    console.error('Stack:', error.stack);
    
    // Always return a proper JSON response
    return res.status(500).json({ 
      error: 'Failed to compare stocks',
      details: error.message,
      symbols: req.query
    });
  }
});

// Route to generate stock analysis using Gemini AI
router.post('/stock-analysis', async (req, res) => {
  try {
    const { stock } = req.body;
    
    if (!stock) {
      return res.status(400).json({ error: 'Stock data is required' });
    }

    // Validate required stock fields
    if (!stock.symbol || !stock.name || !stock.currentPrice) {
      return res.status(400).json({ 
        error: 'Invalid stock data. Required fields: symbol, name, currentPrice',
        received: stock
      });
    }

    // Ensure numeric values are properly formatted
    const formattedStock = {
      ...stock,
      currentPrice: Number(stock.currentPrice) || 0,
      previousClose: Number(stock.previousClose) || 0,
      marketCap: Number(stock.marketCap) || 0,
      peRatio: stock.peRatio ? Number(stock.peRatio) : null,
      dividendYield: stock.dividendYield ? Number(stock.dividendYield) : null,
      fiftyTwoWeekHigh: stock.fiftyTwoWeekHigh ? Number(stock.fiftyTwoWeekHigh) : null,
      fiftyTwoWeekLow: stock.fiftyTwoWeekLow ? Number(stock.fiftyTwoWeekLow) : null,
      volume: Number(stock.volume) || 0,
      averageVolume: Number(stock.averageVolume) || 0,
      beta: stock.beta ? Number(stock.beta) : null
    };

    // If 52-week high/low are missing, fetch from historical data
    if (!formattedStock.fiftyTwoWeekHigh || !formattedStock.fiftyTwoWeekLow) {
      try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setFullYear(endDate.getFullYear() - 1);
        
        const historical = await (await getYahooFinance()).historical(formattedStock.symbol, {
          period1: startDate,
          period2: endDate,
          interval: '1wk'
        });
        
        if (historical && historical.length > 0) {
          const prices = historical.map(item => item.high);
          const lowPrices = historical.map(item => item.low);
          
          formattedStock.fiftyTwoWeekHigh = Math.max(...prices);
          formattedStock.fiftyTwoWeekLow = Math.min(...lowPrices);
          
          console.log(`Fetched 52-week high/low from historical data for analysis: ${formattedStock.fiftyTwoWeekHigh}, ${formattedStock.fiftyTwoWeekLow}`);
        }
      } catch (histError) {
        console.error('Error fetching historical data for 52-week range in analysis:', histError);
      }
    }

    // Log the request for debugging
    logger.info(`Generating stock analysis for ${formattedStock.symbol}`);

    // Generate analysis using Gemini
    const analysis = await geminiService.analyzeStock(formattedStock);

    res.json(analysis);
  } catch (error) {
    logger.error('Error generating stock analysis:', error);
    
    // Provide more detailed error information
    const errorMessage = error.message || 'Failed to generate analysis';
    res.status(500).json({ 
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Route to get personal stock suggestions based on user's financial data
// Route to get personal stock suggestions based on user's financial data
// Route to get personal stock suggestions based on user's financial data
// Route to get personal stock suggestions based on user's financial data
// Route to get personal stock suggestions based on user's financial data
// Route to get personal stock suggestions based on user's financial data
// Route to get personal stock suggestions based on user's financial data
// Route to get personal stock suggestions based on user's financial data
// Route to get personal stock suggestions based on user's financial data
// Route to get personal stock suggestions based on user's financial data
router.post('/personal-suggestions', async (req, res) => {
  try {
    console.log('Personal suggestions request received:', req.body);
    
    const { stock, userId } = req.body;
    
    if (!stock || !userId) {
      return res.status(400).json({ error: 'Stock data and user ID are required' });
    }

    // Fetch user's transactions
    const Transaction = require('../models/Transaction');
    const transactions = await Transaction.find({ user: userId }).limit(50);
    console.log(`Found ${transactions.length} transactions for user ${userId}`);
    
    // Fetch user's budgets
    const Budget = require('../models/Budget');
    const budgets = await Budget.find({ user: userId, status: 'active' });
    console.log(`Found ${budgets.length} budgets for user ${userId}`);
    
    // Calculate financial summary
    const totalIncome = transactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const totalExpenses = transactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const monthlySavings = totalIncome - totalExpenses;
    
    // Get top spending categories
    const categorySpending = {};
    transactions
      .filter(t => t.type === 'expense')
      .forEach(t => {
        categorySpending[t.category] = (categorySpending[t.category] || 0) + t.amount;
      });
    
    const topCategories = Object.entries(categorySpending)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([category]) => category);
    
    // Calculate budget utilization
    const budgetUtilization = budgets.map(budget => ({
      category: budget.category,
      utilization: budget.totalAmount > 0 ? (budget.spentAmount / budget.totalAmount) * 100 : 0,
      remaining: budget.totalAmount - budget.spentAmount
    }));

    console.log('Financial data calculated:', {
      totalIncome,
      totalExpenses,
      monthlySavings,
      topCategories,
      budgetUtilization
    });

    // Format the budgets for display
    const formattedBudgets = budgets.map(budget => ({
      category: budget.category,
      amount: budget.totalAmount,
      percentage: totalIncome > 0 ? (budget.totalAmount / totalIncome) * 100 : 0
    }));

    // Determine if user has high income and low expenses
    const savingsRate = totalIncome > 0 ? (monthlySavings / totalIncome) * 100 : 0;
    const isHighSavingsRate = savingsRate > 50; // More than 50% savings rate

    // Generate personal suggestions using Gemini
    // Update the prompt to be more explicit about JSON format

const prompt = `Based on the user's financial data and the stock analysis, provide personalized investment suggestions:

User's Financial Profile:
- Monthly Income: ₹${totalIncome.toLocaleString()}
- Monthly Expenses: ₹${totalExpenses.toLocaleString()}
- Monthly Savings: ₹${monthlySavings.toLocaleString()}
- Savings Rate: ${savingsRate.toFixed(1)}% (${isHighSavingsRate ? 'High savings rate detected' : 'Normal savings rate'})
- Top Spending Categories: ${topCategories.join(', ')}

Stock Analysis for ${stock.name} (${stock.symbol.replace('.NS', '')}):
- Current Price: ₹${stock.currentPrice}
- Market Cap: ₹${stock.marketCap}
- P/E Ratio: ${stock.peRatio || 'N/A'}
- Recommendation: ${stock.recommendation || 'N/A'}
- Key Factors: ${stock.keyFactors?.join(', ') || 'N/A'}
- Risks: ${stock.risks?.join(', ') || 'N/A'}

Important considerations:
1. ${isHighSavingsRate ? 
    'The user has a high savings rate (over 50%). They might be planning for future expenses or major purchases. Recommend a conservative investment amount that doesn\'t deplete their savings significantly.' :
    'The user has a normal savings rate. Recommend an investment amount that balances growth with maintaining adequate emergency funds.'}
2. Consider the user\'s spending patterns and savings rate when making recommendations.
3. Factor in the stock\'s risk level and the user\'s apparent risk tolerance.

Please provide a detailed response in JSON format with the following structure. Do not include any markdown formatting, code blocks, or explanatory text outside the JSON. Ensure all fields are included and properly formatted:

{
  "suitability": "High/Medium/Low",
  "recommendedAmount": "₹X,XXX",
  "riskLevel": "Low/Medium/High",
  "doNotInvest": false,
  "doNotInvestReason": "",
  "actionItems": [
    "Buy approximately X-Y shares of ${stock.name} at the current price of ₹${stock.currentPrice} (do not mention budget)",
    "Specific action item 2 (do not mention budget)",
    "Specific action item 3 (do not mention budget)"
  ],
  "summary": "A concise summary (3-4 lines) explaining why the user should invest the recommended amount in this particular stock based on their financial profile and transactions. Focus on how the investment aligns with their savings rate, spending patterns, and the stock's characteristics."
}

Remember: Your response must be valid JSON only, with no additional text or formatting.`;

    console.log('Sending request to Gemini API');
    
    const response = await geminiService.generatePersonalSuggestions(prompt);
    console.log('Received response from Gemini API');
    
    // Determine if we should add a "Do Not Invest" warning
    const doNotInvest = (response.analysis.riskLevel === 'High');
    
    // If high risk, generate a reason not to invest
    let doNotInvestReason = "";
    if (doNotInvest) {
      // Generate a reason based on the stock's risks and user's profile
      const riskReasons = response.analysis.risks || [];
      const userFactors = [
        `your savings rate of ${savingsRate.toFixed(1)}%`,
        `your monthly income of ₹${totalIncome.toLocaleString()}`,
        `your expense patterns in ${topCategories.join(', ')}`
      ];
      
      doNotInvestReason = `This stock carries high risk factors including ${riskReasons.slice(0, 2).join(' and ')}. Given ${userFactors.slice(0, 2).join(' and ')}, this investment may not align with your current financial situation and risk tolerance.`;
    }
    
    // Calculate the shares range
    const recommendedAmountValue = parseInt(response.analysis.recommendedAmount.replace(/[₹,]/g, '')) || 0;
    const currentPrice = stock.currentPrice;
    
    // Calculate exact number of shares
    const exactShares = recommendedAmountValue / currentPrice;
    const lowerShares = Math.floor(exactShares);
    const upperShares = lowerShares + 1;
    
    // Format shares range as "X-Y shares"
    const sharesRange = `${lowerShares}-${upperShares}`;
    
    // Update the first action item with the shares range
    if (response.analysis.actionItems && response.analysis.actionItems.length > 0) {
      response.analysis.actionItems[0] = `Buy approximately ${sharesRange} shares of ${stock.name} at the current price of ₹${currentPrice}`;
    }
    
    // Add the financial data to the response
    response.analysis.totalIncome = totalIncome;
    response.analysis.totalExpense = totalExpenses;
    response.analysis.budgets = formattedBudgets;
    response.analysis.savingsRate = savingsRate;
    response.analysis.sharesToBuy = sharesRange;
    response.analysis.doNotInvest = doNotInvest;
    response.analysis.doNotInvestReason = doNotInvestReason;
    
    res.json({
      success: true,
      data: response.analysis
    });
  } catch (error) {
    console.error('Error generating personal suggestions:', error);
    res.status(500).json({ 
      error: 'Failed to generate personal suggestions',
      details: error.message 
    });
  }
});
module.exports = router;