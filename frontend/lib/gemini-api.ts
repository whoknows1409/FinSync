// Gemini API Integration for Finsync
// This file handles all Gemini API interactions for the AI chatbot via backend proxy

// Utility function to check if backend is configured
export const isGeminiConfigured = (): boolean => {
  // Always return true - backend handles API key management
  return true
}

export interface GeminiMessage {
  role: 'user' | 'model'
  parts: { text: string }[]
}

export interface GeminiResponse {
  candidates: Array<{
    content: {
      parts?: Array<{
        text: string
      }>
      text?: string  // Alternative structure for some API versions
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
  private backendUrl: string

  constructor() {
    // Use backend proxy - no API key on client side
    this.backendUrl = '/api/v1/chatbot'
  }

  private async makeRequestWithRetry(
    url: string,
    body: any,
    maxRetries: number = 3
  ): Promise<Response> {
    let lastError: Error | null = null
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : '',
          },
          body: JSON.stringify(body),
        })
        
        // If 503 (Service Unavailable) or 429 (Rate Limited), retry with exponential backoff
        if (response.status === 503 || response.status === 429) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000) // Max 10 seconds
          console.warn(`Attempt ${attempt + 1} failed with ${response.status}, retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          lastError = new Error(`Service unavailable (attempt ${attempt + 1}/${maxRetries})`)
          continue
        }
        
        return response
      } catch (error) {
        lastError = error as Error
        if (attempt < maxRetries - 1) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000)
          console.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms...`, error)
          await new Promise(resolve => setTimeout(resolve, delay))
        }
      }
    }
    
    throw lastError || new Error('Request failed after multiple attempts')
  }

  async sendMessage(
    userMessage: string, 
    conversationHistory: GeminiMessage[] = [],
    options: {
      temperature?: number
      generateTitle?: boolean
      isFirstMessage?: boolean
    } = {}
  ): Promise<{ response: string; title?: string }> {
    try {
      const response = await this.makeRequestWithRetry(
        `${this.backendUrl}/query`,
        {
          message: userMessage,
          conversationHistory,
          options,
        }
      )
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `Request failed with status ${response.status}`)
      }
      
      const data = await response.json()
      
      if (!data.success || !data.data) {
        throw new Error('Invalid response from server')
      }
      
      return {
        response: data.data.response,
        title: data.data.title
      }
    } catch (error) {
      console.error('Gemini API Error:', error)
      throw error
    }
  }

  // Title generation moved to backend to avoid duplicate API calls

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

// generateContent removed - title generation now happens on backend
// This eliminates duplicate API calls and improves reliability

// Export specific functions for stock analysis
export const compareStocks = async (stock1: any, stock2: any): Promise<string> => {
  return geminiAPI.compareStocks(stock1, stock2);
}

export const analyzeStock = async (stock: any): Promise<any> => {
  return geminiAPI.analyzeStock(stock);
}