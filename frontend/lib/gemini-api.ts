// Gemini API Integration for Finsync
// This file handles all Gemini API interactions for the AI chatbot

// Utility function to check if API key is configured
export const isGeminiConfigured = (): boolean => {
  // Check environment variable only (system-managed API key)
  return !!process.env.NEXT_PUBLIC_GEMINI_API_KEY
}

export interface GeminiMessage {
  role: 'user' | 'model'
  parts: { text: string }[]
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string
      }>
    }
    finishReason?: string
    index: number
  }>
  usageMetadata?: {
    promptTokenCount: number
    candidatesTokenCount: number
    totalTokenCount: number
  }
}

export class GeminiAPI {
  private apiKey: string
  private baseUrl: string

  constructor() {
    // Use system-managed API key from environment variable only
    this.apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';
    const model = process.env.NEXT_PUBLIC_GEMINI_MODEL || 'gemini-1.5-flash';
    this.baseUrl = process.env.NEXT_PUBLIC_GEMINI_API_URL || `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent`;
  }

  private async makeRequest(
    messages: GeminiMessage[], 
    options: {
      temperature?: number
      topK?: number
      topP?: number
      maxOutputTokens?: number
    } = {}
  ): Promise<GeminiResponse> {
    if (!this.apiKey) {
      throw new Error('Gemini API key not configured. Please contact the system administrator.')
    }

    const {
      temperature = 0.7,
      topK = 40,
      topP = 0.95,
      maxOutputTokens = 1024
    } = options;

    try {
      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: messages,
          generationConfig: {
            temperature,
            topK,
            topP,
            maxOutputTokens,
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
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        // If 404 (model not found), try fallbacks automatically
        if (response.status === 404) {
          const fallbacks = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro'];
          for (const m of fallbacks) {
            const url = `https://generativelanguage.googleapis.com/v1/models/${m}:generateContent?key=${this.apiKey}`;
            const r2 = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: messages, generationConfig: { temperature: options.temperature ?? 0.7, topK: options.topK ?? 40, topP: options.topP ?? 0.95, maxOutputTokens: options.maxOutputTokens ?? 1024 } }),
            });
            if (r2.ok) {
              const d2 = await r2.json();
              return d2;
            }
          }
        }
        throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
      }

      const data = await response.json()
      
      // Check if the response has the expected structure
      if (!data.candidates || !data.candidates.length || !data.candidates[0].content) {
        console.error('Invalid Gemini API response structure:', data)
        throw new Error('Invalid response structure from Gemini API')
      }
      
      // Check if the response has parts
      if (!data.candidates[0].content.parts || !data.candidates[0].content.parts.length) {
        console.error('No parts in Gemini API response:', data)
        throw new Error('Empty response from Gemini API')
      }
      
      // Check if the response was truncated due to max tokens
      if (data.candidates[0].finishReason === 'MAX_TOKENS') {
        // Response was truncated but we'll still return what we got
      }
      
      return data
    } catch (error) {
      console.error('Gemini API Error:', error)
      throw error
    }
  }

  async sendMessage(
    userMessage: string, 
    conversationHistory: GeminiMessage[] = [],
    options: {
      temperature?: number
      topK?: number
      topP?: number
      maxOutputTokens?: number
    } = {}
  ): Promise<string> {
    try {
      // Add system context for financial advice
      const systemMessage: GeminiMessage = {
        role: 'model',
        parts: [{ text: 'You are Finsync AI, a helpful financial assistant. You provide advice on personal finance, budgeting, investing, and stock analysis. Always be professional, accurate, and helpful. If you don\'t know something, say so rather than guessing.' }]
      }

      // Create the conversation with system context
      const messages: GeminiMessage[] = [
        systemMessage,
        ...conversationHistory,
        {
          role: 'user',
          parts: [{ text: userMessage }]
        }
      ]

      const response = await this.makeRequest(messages, options)
      
      // Validate response structure
      if (!response.candidates || !response.candidates.length) {
        throw new Error('No candidates in Gemini API response')
      }
      
      if (!response.candidates[0].content) {
        throw new Error('No content in Gemini API response')
      }
      
      if (!response.candidates[0].content.parts || !response.candidates[0].content.parts.length) {
        throw new Error('No parts in Gemini API response')
      }
      
      return response.candidates[0].content.parts[0].text
    } catch (error) {
      console.error('Gemini API Error:', error)
      throw error
    }
  }

  async generateContent(
    prompt: string, 
    options: {
      temperature?: number
      topK?: number
      topP?: number
      maxOutputTokens?: number
    } = {}
  ): Promise<string> {
    try {
      if (!this.apiKey) {
        throw new Error('Gemini API key not configured. Please contact the system administrator.')
      }

      const {
        temperature = 0.7,
        topK = 40,
        topP = 0.95,
        maxOutputTokens = 256 // Shorter response for titles
      } = options;

      const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: prompt
            }]
          }],
          generationConfig: {
            temperature,
            topK,
            topP,
            maxOutputTokens,
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
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        if (response.status === 404) {
          const fallbacks = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-1.0-pro'];
          for (const m of fallbacks) {
            const url = `https://generativelanguage.googleapis.com/v1/models/${m}:generateContent?key=${this.apiKey}`;
            const r2 = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: options.temperature ?? 0.7, topK: options.topK ?? 40, topP: options.topP ?? 0.95, maxOutputTokens: options.maxOutputTokens ?? 256 } }),
            });
            if (r2.ok) {
              const d2 = await r2.json();
              // mimic normal flow
              if (!d2.candidates || !d2.candidates.length || !d2.candidates[0].content) {
                throw new Error('Invalid response structure from Gemini API');
              }
              if (d2.candidates[0].content.parts.length > 0) {
                return d2.candidates[0].content.parts[0].text.trim();
              }
            }
          }
        }
        throw new Error(`Gemini API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`)
      }

      const data = await response.json()
      
      // Check if the response has the expected structure
      if (!data.candidates || !data.candidates.length || !data.candidates[0].content) {
        console.error('Invalid Gemini API response structure:', data)
        throw new Error('Invalid response structure from Gemini API')
      }
      
      // Check if the response has parts
      if (!data.candidates[0].content.parts || !data.candidates[0].content.parts.length) {
        console.error('No parts in Gemini API response:', data)
        throw new Error('Empty response from Gemini API')
      }
      
      // Check if the response was truncated due to max tokens
      if (data.candidates[0].finishReason === 'MAX_TOKENS') {
        // Response was truncated but we'll still return what we got
      }
      
      return data.candidates[0].content.parts[0].text.trim()
    } catch (error) {
      console.error('Gemini API Error:', error)
      throw error
    }
  }

  async analyzeStockSentiment(stockSymbol: string, newsData: string[]): Promise<string> {
    const prompt = `Analyze the sentiment of the following news articles for stock ${stockSymbol}:

 ${newsData.map((article, index) => `${index + 1}. ${article}`).join('\n')}

Please provide:
1. Overall sentiment (Bullish/Bearish/Neutral)
2. Key factors driving the sentiment
3. Potential impact on stock price
4. Risk factors to consider

Keep the analysis concise and actionable.`

    return this.sendMessage(prompt, [], { maxOutputTokens: 512 })
  }

  async getBudgetAdvice(income: number, expenses: number, goals: string[]): Promise<string> {
    const prompt = `I need budgeting advice based on my financial situation:

Monthly Income: ₹${income.toLocaleString()}
Monthly Expenses: ₹${expenses.toLocaleString()}
Financial Goals: ${goals.join(', ')}

Please provide:
1. Budget allocation recommendations
2. Areas where I can save money
3. Steps to achieve my financial goals
4. Emergency fund recommendations

Make the advice practical and actionable.`

    return this.sendMessage(prompt, [], { maxOutputTokens: 768 })
  }

  async getInvestmentAdvice(riskProfile: string, investmentAmount: number, timeHorizon: string): Promise<string> {
    const prompt = `I need investment advice:

Risk Profile: ${riskProfile}
Investment Amount: ₹${investmentAmount.toLocaleString()}
Time Horizon: ${timeHorizon}

Please provide:
1. Recommended asset allocation
2. Specific investment options to consider
3. Risk management strategies
4. Expected returns and volatility

Focus on diversified, long-term strategies.`

    return this.sendMessage(prompt, [], { maxOutputTokens: 768 })
  }

  async compareStocks(stock1: any, stock2: any): Promise<string> {
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
    
    Provide a concise comparison summary in 2-3 sentences highlighting which stock appears more attractive based on fundamentals and recent performance.`

    return this.sendMessage(prompt, [], { 
      temperature: 0.3,
      maxOutputTokens: 300 
    })
  }

  async analyzeStock(stock: any): Promise<any> {
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
    1. Company overview
    2. Current financial health
    3. Investment recommendation (Buy, Sell, Hold) with reasoning
    4. Key factors to consider
    5. Potential risks
    6. Future outlook
    
    Please respond with ONLY a valid JSON object with the following structure. Do not include any markdown formatting, code blocks, or explanatory text outside the JSON. Do not use markdown formatting like **bold** or *italic* within the JSON values:
    {
      "overview": "...",
      "financialHealth": "...",
      "recommendation": "Buy/Sell/Hold",
      "keyFactors": ["...", "..."],
      "risks": ["...", "..."],
      "outlook": "..."
    }`

    try {
      const responseText = await this.sendMessage(prompt, [], { 
        temperature: 0.2,
        maxOutputTokens: 2048 
      })
      
      // Try to parse the response as JSON
      try {
        // Clean the response to handle any formatting issues
        let cleanResponse = responseText.trim();
        
        // Remove any markdown code block markers if present
        if (cleanResponse.startsWith('```json')) {
          cleanResponse = cleanResponse.substring(7);
        }
        if (cleanResponse.startsWith('```')) {
          cleanResponse = cleanResponse.substring(3);
        }
        if (cleanResponse.endsWith('```')) {
          cleanResponse = cleanResponse.substring(0, cleanResponse.length - 3);
        }
        
        // Try to find JSON object in the text if it's embedded
        const jsonStart = cleanResponse.indexOf('{');
        const jsonEnd = cleanResponse.lastIndexOf('}');
        
        if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
          cleanResponse = cleanResponse.substring(jsonStart, jsonEnd + 1);
        }
        
        // Fix common JSON issues like trailing commas
        cleanResponse = cleanResponse.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');
        
        // Try to parse the cleaned response
        const analysis = JSON.parse(cleanResponse);
        
        // Clean up markdown formatting from the parsed data
        if (analysis.keyFactors && Array.isArray(analysis.keyFactors)) {
          analysis.keyFactors = analysis.keyFactors.map((factor: string) =>
            factor.replace(/\*\*(.*?)\*\*/g, '$1') // Remove **bold** formatting
               .replace(/\*(.*?)\*/g, '$1')     // Remove *italic* formatting
          );
        }
        
        if (analysis.risks && Array.isArray(analysis.risks)) {
          analysis.risks = analysis.risks.map((risk: string) => 
            risk.replace(/\*\*(.*?)\*\*/g, '$1') // Remove **bold** formatting
               .replace(/\*(.*?)\*/g, '$1')     // Remove *italic* formatting
          );
        }
        
        return analysis;
      } catch (parseError) {
        console.error('Error parsing Gemini stock analysis response:', parseError);
        console.error('Original response:', responseText);
        
        // If parsing fails, return a fallback analysis
        return {
          overview: "Analysis completed but couldn't be parsed into structured format.",
          financialHealth: "Financial health information unavailable.",
          recommendation: "N/A",
          keyFactors: ["Market conditions", "Company performance"],
          risks: ["Market volatility", "Economic factors"],
          outlook: responseText.substring(0, 200) + "..." // Truncate the response
        };
      }
    } catch (error) {
      console.error('Error generating stock analysis:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const geminiAPI = new GeminiAPI()

// Export a standalone function for convenience
export const generateContent = async (prompt: string, options?: {
  temperature?: number
  topK?: number
  topP?: number
  maxOutputTokens?: number
}): Promise<string> => {
  return geminiAPI.generateContent(prompt, options);
}

// Export specific functions for stock analysis
export const compareStocks = async (stock1: any, stock2: any): Promise<string> => {
  return geminiAPI.compareStocks(stock1, stock2);
}

export const analyzeStock = async (stock: any): Promise<any> => {
  return geminiAPI.analyzeStock(stock);
}