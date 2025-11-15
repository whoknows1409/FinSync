const logger = require('./logger.js');
const axios = require('axios');

class GeminiAPI {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY;
    // Updated to use gemini-2.5-flash model (latest stable)
    this.baseUrl = process.env.GEMINI_API_URL || 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';
    
    if (!this.apiKey) {
      logger.warn('Gemini API key not configured');
    }
  }

  async makeRequest(messages, options = {}, retryAttempt = 0) {
    if (!this.apiKey) {
      logger.error('Gemini API key not configured');
      throw new Error('Gemini API key not configured. Please check your environment variables.');
    }

    const maxRetries = 3;
    const baseDelay = 1000; // 1 second base delay

    try {
      const requestData = {
        contents: messages,
        generationConfig: {
          temperature: options.temperature || 0.7,
          topK: options.topK || 40,
          topP: options.topP || 0.95,
          maxOutputTokens: options.maxOutputTokens || 8192,
        },
        safetySettings: [
          {
            category: 'HARM_CATEGORY_HARASSMENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_HATE_SPEECH',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
          {
            category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
            threshold: 'BLOCK_MEDIUM_AND_ABOVE',
          },
        ],
      };

      logger.info('Making request to Gemini API', { requestData });

      const response = await axios.post(`${this.baseUrl}?key=${this.apiKey}`, requestData, {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 seconds timeout
      });

      logger.info('Received response from Gemini API', { 
        status: response.status,
        data: JSON.stringify(response.data).substring(0, 500) + '...' // Log first 500 chars of response
      });

      // More flexible response structure checking
      if (response.data) {
        // Log the actual response structure for debugging
        logger.debug('Gemini API response structure:', JSON.stringify(response.data, null, 2));
        
        // Check if response has the expected structure
        if (response.data.candidates && 
            Array.isArray(response.data.candidates) && 
            response.data.candidates.length > 0 &&
            response.data.candidates[0].content &&
            response.data.candidates[0].content.parts &&
            Array.isArray(response.data.candidates[0].content.parts) &&
            response.data.candidates[0].content.parts.length > 0 &&
            response.data.candidates[0].content.parts[0].text) {
          return response.data.candidates[0].content.parts[0].text;
        }
        
        // Check if the response hit MAX_TOKENS limit
        if (response.data.candidates && 
            Array.isArray(response.data.candidates) && 
            response.data.candidates.length > 0 &&
            response.data.candidates[0].finishReason === 'MAX_TOKENS') {
          logger.warn('Gemini API response hit MAX_TOKENS limit');
          throw new Error('The response was too long and hit the token limit. Please try again with a shorter request.');
        }
        
        // If the expected structure isn't found, try to extract text from any part of the response
        logger.warn('Gemini API response does not match expected structure, attempting to extract text');
        
        // Try to find text anywhere in the response
        const responseStr = JSON.stringify(response.data);
        const textMatch = responseStr.match(/"text":"([^"\\]*(\\.[^"\\]*)*)"/);
        if (textMatch && textMatch[1]) {
          // Clean up escaped characters
          return textMatch[1].replace(/\\"/g, '"').replace(/\\\\/g, '\\');
        }
        
        // If we can't find text in the expected format, try to extract any text content
        try {
          // Convert the entire response to a string and return it
          const responseText = JSON.stringify(response.data);
          logger.warn('Returning raw response text as fallback');
          return `AI response (raw format): ${responseText}`;
        } catch (stringifyError) {
          logger.error('Failed to stringify response:', stringifyError);
          throw new Error('Unable to extract any meaningful content from Gemini API response');
        }
      } else {
        logger.error('Empty or invalid response from Gemini API');
        throw new Error('Empty or invalid response from Gemini API');
      }
    } catch (error) {
      logger.error('Gemini API Error:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data,
        retryAttempt: retryAttempt,
      });
      
      // Handle rate limit and service unavailable errors with exponential backoff
      if ((error.response?.status === 429 || error.response?.status === 503) && retryAttempt < maxRetries) {
        const retryDelay = baseDelay * Math.pow(2, retryAttempt) + Math.random() * 1000; // Add jitter
        const errorType = error.response?.status === 429 ? 'Rate limit exceeded' : 'Service unavailable (503)';
        logger.info(`${errorType}. Retrying after ${Math.round(retryDelay / 1000)} seconds...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return this.makeRequest(messages, options, retryAttempt + 1);
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (error.response?.status === 400) {
        // Log the specific error from Gemini
        if (error.response?.data?.error?.message) {
          logger.error('Gemini API error message:', error.response.data.error.message);
          throw new Error(`Invalid request to Gemini API: ${error.response.data.error.message}`);
        }
        throw new Error(`Invalid request to Gemini API: ${error.response?.data?.error || 'Unknown error'}`);
      } else if (error.response?.status === 401) {
        throw new Error('Invalid Gemini API key. Please check your configuration.');
      } else if (error.response?.status === 403) {
        throw new Error('Gemini API access forbidden. Check your API key and permissions.');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Request timeout. Please try again.');
      } else if (error.message.includes('Gemini API key not configured')) {
        throw error; // Re-throw configuration errors
      } else if (error.message.includes('The response was too long and hit the token limit')) {
        // Retry with a higher token limit
        if (retryAttempt < maxRetries) {
          logger.info('Retrying with higher token limit');
          const increasedMaxTokens = (options.maxOutputTokens || 1024) * 2;
          return this.makeRequest(messages, { ...options, maxOutputTokens: increasedMaxTokens }, retryAttempt + 1);
        }
        throw new Error('The response was too long and hit the token limit even after increasing the limit. Please try again with a shorter request.');
      } else {
        throw new Error(`Failed to get response from Gemini API: ${error.message || 'Unknown error'}`);
      }
    }
  }

  async sendMessage(userMessage, conversationHistory = []) {
    try {
      // Add system context for financial advice
      const systemMessage = {
        role: 'model',
        parts: [{ text: 'You are Finsync AI, a helpful financial assistant. You provide advice on personal finance, budgeting, investing, and stock analysis. Always be professional, accurate, and helpful. If you don\'t know something, say so rather than guessing. Keep responses concise and actionable.' }]
      };

      // Create the conversation with system context
      const messages = [
        systemMessage,
        ...conversationHistory,
        {
          role: 'user',
          parts: [{ text: userMessage }]
        }
      ];

      const response = await this.makeRequest(messages);
      
      logger.logBusiness('gemini_chat', {
        userMessage: userMessage.substring(0, 100),
        responseLength: response.length,
      });

      return response;
    } catch (error) {
      logger.error('Gemini chat error:', error);
      throw error;
    }
  }

  async analyzeStockSentiment(stockSymbol, newsData) {
    try {
      const prompt = `Analyze the sentiment of the following news articles for stock ${stockSymbol}:

 ${newsData.map((article, index) => `${index + 1}. ${article}`).join('\n')}

Please provide:
1. Overall sentiment (Bullish/Bearish/Neutral)
2. Key factors driving the sentiment
3. Potential impact on stock price
4. Risk factors to consider

Keep the analysis concise and actionable.`;

      const response = await this.makeRequest([{
        role: 'user',
        parts: [{ text: prompt }]
      }]);

      logger.logBusiness('gemini_stock_analysis', {
        stockSymbol,
        newsCount: newsData.length,
      });

      return response;
    } catch (error) {
      logger.error('Gemini stock analysis error:', error);
      throw error;
    }
  }

  async getBudgetAdvice(income, expenses, goals) {
    try {
      const prompt = `I need budgeting advice based on my financial situation:

Monthly Income: ₹${income.toLocaleString()}
Monthly Expenses: ₹${expenses.toLocaleString()}
Financial Goals: ${goals.join(', ')}

Please provide:
1. Budget allocation recommendations
2. Areas where I can save money
3. Steps to achieve my financial goals
4. Emergency fund recommendations

Make the advice practical and actionable.`;

      return await this.makeRequest([{
        role: 'user',
        parts: [{ text: prompt }]
      }]);
    } catch (error) {
      logger.error('Gemini budget advice error:', error);
      throw error;
    }
  }

  async getInvestmentAdvice(riskProfile, investmentAmount, timeHorizon) {
    try {
      const prompt = `I need investment advice:

Risk Profile: ${riskProfile}
Investment Amount: ₹${investmentAmount.toLocaleString()}
Time Horizon: ${timeHorizon}

Please provide:
1. Recommended asset allocation
2. Specific investment options to consider
3. Risk management strategies
4. Expected returns and volatility

Focus on diversified, long-term strategies.`;

      return await this.makeRequest([{
        role: 'user',
        parts: [{ text: prompt }]
      }]);
    } catch (error) {
      logger.error('Gemini investment advice error:', error);
      throw error;
    }
  }

  async categorizeTransaction(description, amount, type) {
    try {
      const prompt = `Categorize this transaction:

Description: "${description}"
Amount: ₹${amount}
Type: ${type}

Please provide:
1. Primary category (e.g., Food, Transportation, Entertainment, etc.)
2. Subcategory if applicable
3. Confidence level (High/Medium/Low)
4. Reasoning for the categorization

Respond in JSON format:
{
  "category": "category_name",
  "subcategory": "subcategory_name",
  "confidence": "high/medium/low",
  "reasoning": "explanation"
}`;

      const response = await this.makeRequest([{
        role: 'user',
        parts: [{ text: prompt }]
      }]);

      try {
        const parsed = JSON.parse(response);
        logger.logBusiness('gemini_transaction_categorization', {
          description: description.substring(0, 50),
          amount,
          type,
          category: parsed.category,
          confidence: parsed.confidence,
        });
        return parsed;
      } catch (parseError) {
        // Fallback if JSON parsing fails
        return {
          category: 'Other',
          subcategory: null,
          confidence: 'low',
          reasoning: 'Unable to parse AI response',
        };
      }
    } catch (error) {
      logger.error('Gemini transaction categorization error:', error);
      return {
        category: 'Other',
        subcategory: null,
        confidence: 'low',
        reasoning: 'AI categorization failed',
      };
    }
  }

  async generateFinancialInsights(transactions, budgets, goals) {
    try {
      const prompt = `Based on the following financial data, provide insights and recommendations:

Transactions Summary:
- Total Income: ₹${transactions.totalIncome?.toLocaleString() || 0}
- Total Expenses: ₹${transactions.totalExpenses?.toLocaleString() || 0}
- Top Categories: ${transactions.topCategories?.join(', ') || 'N/A'}

Budget Status:
- Active Budgets: ${budgets.activeCount || 0}
- Over Budget Categories: ${budgets.overBudgetCount || 0}
- Average Utilization: ${budgets.avgUtilization || 0}%

Financial Goals:
- Active Goals: ${goals.activeCount || 0}
- Total Target Amount: ₹${goals.totalTarget?.toLocaleString() || 0}
- Average Progress: ${goals.avgProgress || 0}%

Please provide:
1. Key insights about spending patterns
2. Budget optimization recommendations
3. Goal achievement strategies
4. Areas for improvement
5. Next steps to take

Keep the response actionable and specific.`;

      return await this.makeRequest([{
        role: 'user',
        parts: [{ text: prompt }]
      }]);
    } catch (error) {
      logger.error('Gemini financial insights error:', error);
      throw error;
    }
  }

  async predictStockPrice(stockSymbol, historicalData) {
    try {
      const prompt = `Based on the following historical data for ${stockSymbol}, provide a price prediction:

Historical Data (last 30 days):
 ${historicalData.map((data, index) => 
  `Day ${index + 1}: Open: ₹${data.open}, High: ₹${data.high}, Low: ₹${data.low}, Close: ₹${data.close}, Volume: ${data.volume}`
).join('\n')}

Please provide:
1. Short-term prediction (1-7 days)
2. Medium-term prediction (1-3 months)
3. Key factors influencing the prediction
4. Risk assessment
5. Confidence level

Note: This is for educational purposes only and should not be considered as investment advice.`;

      return await this.makeRequest([{
        role: 'user',
        parts: [{ text: prompt }]
      }]);
    } catch (error) {
      logger.error('Gemini stock prediction error:', error);
      throw error;
    }
  }

  async detectRecurringExpenses(expensesData) {
    try {
      const prompt = `Analyze the following expense data to identify recurring expenses:

 ${expensesData.map((expense, index) => 
  `Transaction ${index + 1}: ${expense.description}, Amount: ₹${expense.amount}, Category: ${expense.category}, Date: ${expense.date}`
).join('\n')}

Please identify recurring expenses based on patterns in descriptions, amounts, categories, and timing.

Respond in JSON format with the following structure:
{
  "recurringExpenses": [
    {
      "description": "Expense description",
      "amount": 0,
      "frequency": "monthly/weekly/quarterly/annual",
      "category": "Expense category",
      "nextExpectedDate": "YYYY-MM-DD"
    }
  ]
}`;

      const response = await this.makeRequest([{
        role: 'user',
        parts: [{ text: prompt }]
      }]);

      try {
        // Strip markdown code blocks if present
        let cleanResponse = response;
        if (cleanResponse.startsWith('```json') || cleanResponse.startsWith('```')) {
          cleanResponse = cleanResponse.replace(/^```json\s*|^```\s*|\s*```$/g, '');
        }
        
        const parsed = JSON.parse(cleanResponse);
        logger.logBusiness('gemini_detect_recurring', {
          transactionCount: expensesData.length,
          recurringCount: parsed.recurringExpenses?.length || 0,
        });
        return parsed.recurringExpenses || [];
      } catch (parseError) {
        logger.error('Error parsing recurring expenses response:', parseError);
        return [];
      }
    } catch (error) {
      logger.error('Gemini recurring expenses detection error:', error);
      throw error;
    }
  }

  async analyzeBigExpenses(expensesData) {
    try {
      const prompt = `Analyze the following top expenses:

 ${expensesData.map((expense, index) => 
  `Expense ${index + 1}: ${expense.description}, Amount: ₹${expense.amount}, Category: ${expense.category}`
).join('\n')}

Please provide:
1. Key observations about spending patterns
2. Potential savings opportunities
3. Recommendations for managing these expenses
4. Insights about categorization or merchant trends

Keep the analysis concise and actionable. Respond in JSON format:`;

      const response = await this.makeRequest([{
        role: 'user',
        parts: [{ text: prompt }]
      }]);

      try {
        // Strip markdown code blocks if present
        let cleanResponse = response;
        if (cleanResponse.startsWith('```json') || cleanResponse.startsWith('```')) {
          cleanResponse = cleanResponse.replace(/^```json\s*|^```\s*|\s*```$/g, '');
        }
        
        // Try to parse as JSON first
        return JSON.parse(cleanResponse);
      } catch (parseError) {
        // If not valid JSON, return as text in a structured format
        logger.warn('Big expenses analysis not in JSON format');
        return {
          observations: response,
          savingsOpportunities: [],
          recommendations: [],
          insights: []
        };
      }
    } catch (error) {
      logger.error('Gemini big expenses analysis error:', error);
      throw error;
    }
  }

  // Helper method to parse arrays from regex matches
  parseArray(arrayStr) {
    try {
      return JSON.parse(arrayStr);
    } catch (e) {
      // Fallback: extract individual items
      const items = arrayStr.match(/"([^"]+)"/g);
      return items ? items.map(item => item.replace(/"/g, '')) : [];
    }
  }

  // New method for stock analysis
  async analyzeStock(stock) {
    try {
      const prompt = `Provide a detailed financial analysis for ${stock.name} (${stock.symbol.replace('.NS', '')}) based on the following data:
      
      Current Price: ₹${stock.currentPrice}
      Previous Close: ₹${stock.previousClose}
      Market Cap: ₹${stock.marketCap}
      P/E Ratio: ${stock.peRatio || 'N/A'}
      Dividend Yield: ${stock.dividendYield || 'N/A'}
      52-Week High: ₹${stock.fiftyTwoWeekHigh}
      52-Week Low: ₹${stock.fiftyTwoWeekLow}
      Volume: ${stock.volume}
      Average Volume: ${stock.averageVolume}
      Beta: ${stock.beta || 'N/A'}
      
      The analysis should include:
      1. Company overview (2-3 sentences)
      2. Current financial health (2-3 sentences)
      3. Investment recommendation (Buy, Sell, Hold) with reasoning
      4. Key factors to consider (provide at least 3-5 factors)
      5. Potential risks (provide at least 3-5 risks)
      6. Future outlook (2-3 sentences)
      
      Please respond with ONLY a valid JSON object with the following structure. Do not include any markdown formatting, code blocks, or explanatory text outside the JSON. Do not use markdown formatting like **bold** or *italic* within the JSON values:
      {
        "overview": "...",
        "financialHealth": "...",
        "recommendation": "Buy/Sell/Hold",
        "keyFactors": ["factor 1", "factor 2", "factor 3"],
        "risks": ["risk 1", "risk 2", "risk 3"],
        "outlook": "..."
      }`;

      const responseText = await this.makeRequest([{
        role: 'user',
        parts: [{ text: prompt }]
      }], {
        temperature: 0.2,
        maxOutputTokens: 4096  // Increased token limit
      });
      
      // Clean and parse the response
      let cleanResponse = responseText.trim();
      
      // Remove any markdown code block markers
      cleanResponse = cleanResponse.replace(/^```json\s*|^```\s*|\s*```$/g, '');
      
      // Extract JSON object if embedded in text
      const jsonStart = cleanResponse.indexOf('{');
      const jsonEnd = cleanResponse.lastIndexOf('}');
      
      if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
        cleanResponse = cleanResponse.substring(jsonStart, jsonEnd + 1);
      }
      
      // Fix common JSON issues
      cleanResponse = cleanResponse
        .replace(/,\s*}/g, '}')  // Remove trailing commas in objects
        .replace(/,\s*]/g, ']')  // Remove trailing commas in arrays
        .replace(/\\n/g, '\n')   // Convert \\n to actual newlines
        .replace(/\\"/g, '"');   // Fix escaped quotes
      
      let analysis;
      try {
        analysis = JSON.parse(cleanResponse);
        
        // Ensure arrays have at least some default values if they're empty
        if (!analysis.keyFactors || !Array.isArray(analysis.keyFactors) || analysis.keyFactors.length === 0) {
          analysis.keyFactors = ["Market conditions", "Company performance", "Industry trends"];
        }
        
        if (!analysis.risks || !Array.isArray(analysis.risks) || analysis.risks.length === 0) {
          analysis.risks = ["Market volatility", "Economic factors", "Regulatory changes"];
        }
        
        // Ensure all required fields exist
        analysis = {
          overview: analysis.overview || "Overview unavailable",
          financialHealth: analysis.financialHealth || "Financial health information unavailable",
          recommendation: analysis.recommendation || "N/A",
          keyFactors: analysis.keyFactors,
          risks: analysis.risks,
          outlook: analysis.outlook || "Outlook information unavailable"
        };
      } catch (parseError) {
        logger.error('JSON parsing failed, attempting regex extraction:', parseError);
        
        // Fallback: Extract fields using regex
        const overviewMatch = cleanResponse.match(/"overview":\s*"([^"\\]*(\\.[^"\\]*)*)"/);
        const healthMatch = cleanResponse.match(/"financialHealth":\s*"([^"\\]*(\\.[^"\\]*)*)"/);
        const recMatch = cleanResponse.match(/"recommendation":\s*"([^"\\]+)"/);
        const outlookMatch = cleanResponse.match(/"outlook":\s*"([^"\\]*(\\.[^"\\]*)*)"/);
        
        // Extract arrays with improved regex
        const factorsMatch = cleanResponse.match(/"keyFactors":\s*\[([^\]]*)\]/);
        const risksMatch = cleanResponse.match(/"risks":\s*\[([^\]]*)\]/);
        
        // Parse array items
        const parseArrayItems = (arrayStr) => {
          if (!arrayStr) return [];
          // Extract individual items, handling escaped quotes
          const items = arrayStr.match(/"([^"\\]*(\\.[^"\\]*)*)"/g);
          return items ? items.map(item => item.replace(/^"|"$/g, '').replace(/\\"/g, '"')) : [];
        };
        
        analysis = {
          overview: overviewMatch ? overviewMatch[1] : "Overview unavailable",
          financialHealth: healthMatch ? healthMatch[1] : "Financial health unavailable",
          recommendation: recMatch ? recMatch[1] : "N/A",
          keyFactors: factorsMatch ? parseArrayItems(factorsMatch[1]) : ["Market conditions", "Company performance", "Industry trends"],
          risks: risksMatch ? parseArrayItems(risksMatch[1]) : ["Market volatility", "Economic factors", "Regulatory changes"],
          outlook: outlookMatch ? outlookMatch[1] : "Outlook unavailable"
        };
      }
      
      logger.logBusiness('gemini_stock_analysis', {
        stockSymbol: stock.symbol,
        recommendation: analysis.recommendation,
        responseLength: responseText.length,
      });
      
      // Return both the analysis and the raw response for fallback display
      return {
        analysis: analysis,
        rawResponse: responseText
      };
    } catch (error) {
      logger.error('Error generating stock analysis:', error);
      
      // Return fallback analysis with all required fields
      return {
        analysis: {
          overview: "Unable to generate detailed analysis at this time.",
          financialHealth: "Financial health information unavailable.",
          recommendation: "N/A",
          keyFactors: ["Market conditions", "Company performance"],
          risks: ["Market volatility", "Economic factors"],
          outlook: "Outlook information unavailable."
        },
        rawResponse: `Error generating analysis: ${error.message}`
      };
    }
  }

  // Updated method for comparing stocks with better error handling and increased token limit
  async compareStocks(stock1, stock2) {
    try {
      const prompt = `Compare the following two stocks based on their fundamentals and provide a brief summary:
      
      Stock 1: ${stock1.name} (${stock1.symbol.replace('.NS', '')})
      - Current Price: ₹${stock1.currentPrice}
      - Market Cap: ₹${stock1.marketCap}
      - P/E Ratio: ${stock1.peRatio || 'N/A'}
      - 52W Range: ₹${stock1.fiftyTwoWeekLow} - ₹${stock1.fiftyTwoWeekHigh}
      - 1 Month Change: ${stock1.monthlyChange?.toFixed(2) || 'N/A'}%
      
      Stock 2: ${stock2.name} (${stock2.symbol.replace('.NS', '')})
      - Current Price: ₹${stock2.currentPrice}
      - Market Cap: ₹${stock2.marketCap}
      - P/E Ratio: ${stock2.peRatio || 'N/A'}
      - 52W Range: ₹${stock2.fiftyTwoWeekLow} - ₹${stock2.fiftyTwoWeekHigh}
      - 1 Month Change: ${stock2.monthlyChange?.toFixed(2) || 'N/A'}%
      
      Provide a concise comparison summary in 2-3 sentences highlighting which stock appears more attractive based on fundamentals and recent performance.`;

      // Add logging before making the request
      logger.info('Sending request to Gemini API for stock comparison');
      logger.debug('Stock comparison prompt:', prompt);
      
      const aiSummary = await this.makeRequest([{
        role: 'user',
        parts: [{ text: prompt }]
      }], {
        temperature: 0.3,
        maxOutputTokens: 600  // Increased token limit
      });
      
      // Add logging for successful response
      logger.info('Received successful response from Gemini API');
      logger.debug('AI summary response:', aiSummary);
      
      logger.logBusiness('gemini_stock_comparison', {
        stock1Symbol: stock1.symbol,
        stock2Symbol: stock2.symbol,
        responseLength: aiSummary.length,
      });
      
      return aiSummary;
    } catch (error) {
      // Enhanced error logging
      logger.error('Error generating AI comparison summary:', error);
      logger.error('Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Return a more informative error message
      return `AI comparison unavailable at this time. Error: ${error.message || 'Unknown error'}`;
    }
  }

  // New method for generating personal suggestions
  // New method for generating personal suggestions
// New method for generating personal suggestions
// New method for generating personal suggestions
async generatePersonalSuggestions(prompt) {
  try {
    console.log('Generating personal suggestions with prompt length:', prompt.length);
    
    const responseText = await this.makeRequest([{
      role: 'user',
      parts: [{ text: prompt }]
    }], {
      temperature: 0.3,
      maxOutputTokens: 2048  // Increased token limit for better responses
    });
    
    console.log('Received response from Gemini API, length:', responseText.length);
    
    // Clean up the response - remove markdown formatting if present
    let cleanResponse = responseText.trim();
    
    // Try to extract JSON from the response, even if it's wrapped in markdown or other text
    let jsonStart = cleanResponse.indexOf('{');
    let jsonEnd = cleanResponse.lastIndexOf('}');
    
    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      // Extract just the JSON part
      cleanResponse = cleanResponse.substring(jsonStart, jsonEnd + 1);
    } else if (cleanResponse.startsWith('```json') || cleanResponse.startsWith('```')) {
      // Remove markdown code block markers
      cleanResponse = cleanResponse.replace(/^```json\s*|^```\s*|\s*```$/g, '');
    }
    
    // Try to parse as JSON
    let analysis;
    try {
      analysis = JSON.parse(cleanResponse);
      
      // Validate the structure
      if (!analysis.suitability || !analysis.recommendedAmount || !analysis.riskLevel || 
          !analysis.actionItems || !Array.isArray(analysis.actionItems) || !analysis.summary) {
        throw new Error('Invalid response structure');
      }
      
      // Ensure doNotInvest field exists
      if (analysis.doNotInvest === undefined) {
        analysis.doNotInvest = false;
      }
      
      // Ensure doNotInvestReason field exists
      if (analysis.doNotInvestReason === undefined) {
        analysis.doNotInvestReason = "";
      }
      
      // Ensure exactly 3 action items
      if (analysis.actionItems.length > 3) {
        analysis.actionItems = analysis.actionItems.slice(0, 3);
      } else if (analysis.actionItems.length < 3) {
        while (analysis.actionItems.length < 3) {
          analysis.actionItems.push('Review your investment strategy regularly');
        }
      }
      
      // Filter out any action items that mention budget
      analysis.actionItems = analysis.actionItems.filter(item => 
        !item.toLowerCase().includes('budget')
      );
      
      // Ensure we still have 3 action items after filtering
      while (analysis.actionItems.length < 3) {
        analysis.actionItems.push('Review your investment strategy regularly');
      }
      
      // Ensure summary is concise (3-4 lines)
      let summaryLines = analysis.summary.split('\n').filter(line => line.trim());
      if (summaryLines.length > 4) {
        summaryLines = summaryLines.slice(0, 4);
        analysis.summary = summaryLines.join('\n');
      }
      
      return {
        analysis: analysis,
        rawResponse: responseText
      };
    } catch (parseError) {
      console.error('JSON parsing failed:', parseError);
      console.log('Cleaned response that failed to parse:', cleanResponse);
      
      // Fallback to regex extraction if JSON parsing fails
      const suitabilityMatch = cleanResponse.match(/"suitability":\s*"([^"\\]*(\\.[^"\\]*)*)"/);
      const amountMatch = cleanResponse.match(/"recommendedAmount":\s*"([^"\\]*(\\.[^"\\]*)*)"/);
      const riskMatch = cleanResponse.match(/"riskLevel":\s*"([^"\\]*(\\.[^"\\]*)*)"/);
      const doNotInvestMatch = cleanResponse.match(/"doNotInvest":\s*(true|false)/);
      const doNotInvestReasonMatch = cleanResponse.match(/"doNotInvestReason":\s*"([^"\\]*(\\.[^"\\]*)*)"/);
      
      // Extract action items array
      let actionItems = [];
      const actionItemsMatch = cleanResponse.match(/"actionItems":\s*\[([^\]]*)\]/);
      if (actionItemsMatch) {
        // Parse array items
        const items = actionItemsMatch[1].match(/"([^"\\]*(\\.[^"\\]*)*)"/g);
        if (items) {
          actionItems = items.map(item => item.replace(/^"|"$/g, '').replace(/\\"/g, '"'));
        }
      }
      
      // Filter out any action items that mention budget
      actionItems = actionItems.filter(item => 
        !item.toLowerCase().includes('budget')
      );
      
      // Ensure exactly 3 action items
      if (actionItems.length > 3) {
        actionItems = actionItems.slice(0, 3);
      } else if (actionItems.length < 3) {
        while (actionItems.length < 3) {
          actionItems.push('Review your investment strategy regularly');
        }
      }
      
      // Extract summary
      const summaryMatch = cleanResponse.match(/"summary":\s*"([^"\\]*(\\.[^"\\]*)*)"/);
      let summary = summaryMatch ? summaryMatch[1] : 'This investment recommendation is based on your financial profile and risk tolerance.';
      
      // Ensure summary is concise (3-4 lines)
      let summaryLines = summary.split('\n').filter(line => line.trim());
      if (summaryLines.length > 4) {
        summaryLines = summaryLines.slice(0, 4);
        summary = summaryLines.join('\n');
      }
      
      analysis = {
        suitability: suitabilityMatch ? suitabilityMatch[1] : 'Medium',
        recommendedAmount: amountMatch ? amountMatch[1] : '₹5,000',
        riskLevel: riskMatch ? riskMatch[1] : 'Medium',
        doNotInvest: doNotInvestMatch ? doNotInvestMatch[1] === 'true' : false,
        doNotInvestReason: doNotInvestReasonMatch ? doNotInvestReasonMatch[1] : "",
        actionItems: actionItems,
        summary: summary
      };
      
      return {
        analysis: analysis,
        rawResponse: responseText
      };
    }
  } catch (error) {
    console.error('Error generating personal suggestions:', error);
    return {
      analysis: {
        suitability: 'Medium',
        recommendedAmount: '₹5,000',
        riskLevel: 'Medium',
        doNotInvest: false,
        doNotInvestReason: "",
        actionItems: [
          'Buy approximately X-Y shares at the current market price',
          'Research the stock thoroughly before investing',
          'Consider your long-term financial goals'
        ],
        summary: 'Based on your financial profile and transaction history, investing in this stock aligns with your investment goals and risk tolerance. The recommended amount balances growth potential with your current savings rate.'
      },
      rawResponse: `Error: ${error.message}`
    };
  }
}
}

// Export singleton instance
const geminiAPI = new GeminiAPI();

module.exports = geminiAPI;