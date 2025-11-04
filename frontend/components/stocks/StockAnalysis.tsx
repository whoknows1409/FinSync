"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, Brain, Building2, Info, TrendingUp, TrendingDown, X, Loader2, Lightbulb, User, Sparkles, Wallet, TrendingDown as TrendingDownIcon, PieChart, CheckCircle, AlertTriangle, ArrowRight } from "lucide-react"
import StockChart from "@/components/stocks/StockChart"
import { Label } from "@/components/ui/label"
import { getStockAnalysisData, getStockAIAnalysis, StockAnalysisData } from "@/lib/stock-analysis-api"
import { useAuth } from "@/lib/auth-context"
import { motion, AnimatePresence } from "framer-motion"
import { useTheme } from "next-themes"

interface AnalysisData {
  overview: string
  financialHealth: string
  recommendation: string
  keyFactors: string[]
  risks: string[]
  outlook: string
  rawResponse?: string
}

interface PersonalSuggestions {
  suitability: string
  recommendedAmount: string
  riskLevel: string
  actionItems: string[]
  summary: string
  totalExpense?: number
  totalIncome?: number
  savingsRate?: number
  sharesToBuy?: string
  doNotInvest?: boolean
  doNotInvestReason?: string
}

export default function EnhancedStockAnalysis() {
  const [searchQuery, setSearchQuery] = useState('')
  const [stockData, setStockData] = useState<StockAnalysisData | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null)
  const [personalSuggestions, setPersonalSuggestions] = useState<PersonalSuggestions | null>(null)
  const [loading, setLoading] = useState(false)
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [loadingSuggestions, setLoadingSuggestions] = useState(false)
  const [error, setError] = useState('')
  const [showDetails, setShowDetails] = useState(false)
  const [showRawResponse, setShowRawResponse] = useState(false)
  const [showPersonalSuggestions, setShowPersonalSuggestions] = useState(false)
  const { user } = useAuth()
  const { theme } = useTheme()
  
  const popularStocks = [
    { symbol: 'RELIANCE.NS', name: 'Reliance Industries Ltd.' },
    { symbol: 'TCS.NS', name: 'Tata Consultancy Services' },
    { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Ltd.' },
    { symbol: 'INFY.NS', name: 'Infosys Ltd.' },
    { symbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever Ltd.' },
    { symbol: 'ICICIBANK.NS', name: 'ICICI Bank Ltd.' },
    { symbol: 'SBIN.NS', name: 'State Bank of India' },
    { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel Ltd.' },
    { symbol: 'WIPRO.NS', name: 'Wipro Ltd.' },
    { symbol: 'ITC.NS', name: 'ITC Ltd.' },
  ]

  const fetchStockData = async (symbol: string) => {
    setLoading(true)
    setError('')
    setAnalysis(null)
    setPersonalSuggestions(null)
    setShowDetails(false)
    setShowRawResponse(false)
    setShowPersonalSuggestions(false)
    
    try {
      // Use the getStockAnalysisData function from stock-analysis-api.ts
      const stock = await getStockAnalysisData(symbol)
      setStockData(stock)
      
      // Log the stock data for debugging
      console.log('Fetched stock analysis data:', stock)
      
      // Fetch analysis after getting stock data
      fetchAnalysis(stock)
    } catch (err: any) {
      console.error('Stock fetch error:', err);
      
      // Check if the error is related to invalid stock symbol
      if (err.message && (
          err.message.includes('not found') || 
          err.message.includes('Invalid symbol') ||
          err.message.includes('No data found') ||
          err.message.includes('Failed to fetch')
      )) {
        setError('Stock not found. Please enter a valid NSE stock symbol.');
      } else {
        setError(err.message || 'Error fetching stock data');
      }
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalysis = async (stock: StockAnalysisData, retryCount = 0) => {
    setAnalysisLoading(true)
    try {
      const analysisData = await getStockAIAnalysis(stock)
      
      // Check if the response has the new structure with analysis and rawResponse
      let formattedAnalysis: AnalysisData;
      
      if (analysisData.analysis && analysisData.rawResponse) {
        // New structure with both analysis and raw response
        formattedAnalysis = {
          overview: analysisData.analysis.overview || '',
          financialHealth: analysisData.analysis.financialHealth || '',
          recommendation: analysisData.analysis.recommendation || '',
          keyFactors: Array.isArray(analysisData.analysis.keyFactors) ? analysisData.analysis.keyFactors : [],
          risks: Array.isArray(analysisData.analysis.risks) ? analysisData.analysis.risks : [],
          outlook: analysisData.analysis.outlook || '',
          rawResponse: analysisData.rawResponse
        };
      } else {
        // Old structure - direct analysis
        formattedAnalysis = {
          overview: analysisData.overview || '',
          financialHealth: analysisData.financialHealth || '',
          recommendation: analysisData.recommendation || '',
          keyFactors: Array.isArray(analysisData.keyFactors) ? analysisData.keyFactors : [],
          risks: Array.isArray(analysisData.risks) ? analysisData.risks : [],
          outlook: analysisData.outlook || '',
          rawResponse: JSON.stringify(analysisData) // Use the full response as raw
        };
      }
      
      // Check if analysis is incomplete (very few key factors or risks)
      const isIncomplete = formattedAnalysis.keyFactors.length < 2 || 
                        formattedAnalysis.risks.length < 2 || 
                        !formattedAnalysis.outlook || 
                        formattedAnalysis.outlook === "Outlook unavailable";
      
      if (isIncomplete && formattedAnalysis.rawResponse) {
        // If analysis is incomplete, show raw response by default
        setShowRawResponse(true);
      }
      
      setAnalysis(formattedAnalysis)
    } catch (err: any) {
      console.error('Analysis error:', err)
      setError(err.message || 'Error generating analysis')
    } finally {
      setAnalysisLoading(false)
    }
  }

  const fetchPersonalSuggestions = async (stock: StockAnalysisData) => {
    if (!user) {
      setError('Please login to view personalized suggestions');
      return;
    }

    setLoadingSuggestions(true);
    try {
      console.log('Fetching personal suggestions for stock:', stock.symbol, 'user:', user.id);
      
      const response = await fetch('/api/stocks-analysis/personal-suggestions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ 
          stock, 
          userId: user.id 
        }),
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          // If response is not JSON, get as text
          const errorText = await response.text();
          console.error('Error response (non-JSON):', errorText);
          throw new Error(`Server returned ${response.status}: ${errorText.substring(0, 100)}`);
        }
        console.error('Error response:', errorData);
        throw new Error(errorData.error || `Failed with status ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Personal suggestions data:', data);
      
      // Ensure the data structure is correct
      if (data && data.data) {
        setPersonalSuggestions(data.data);
        // Only set showPersonalSuggestions to true after successful fetch
        setShowPersonalSuggestions(true);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error: unknown) {
      console.error('Error fetching personal suggestions:', error);
      const message = error instanceof Error ? error.message : 'Unknown error'
      setError(`Failed to fetch personal suggestions: ${message}`);
      // Don't set showPersonalSuggestions to true if there's an error
    } finally {
      setLoadingSuggestions(false);
    }
  }

  const handlePersonalSuggestionsClick = () => {
    // If we're already showing personal suggestions, just hide them
    if (showPersonalSuggestions) {
      setShowPersonalSuggestions(false);
      return;
    }
    
    // If we have personal suggestions data already, show them
    if (personalSuggestions) {
      setShowPersonalSuggestions(true);
      return;
    }
    
    // Otherwise, fetch the personal suggestions
    if (stockData) {
      fetchPersonalSuggestions(stockData);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // Basic validation for stock symbols
      const symbol = searchQuery.trim().toUpperCase()
      
      // Check if symbol contains only letters and numbers
      if (!/^[A-Z0-9]+$/.test(symbol)) {
        setError('Stock symbol should only contain letters and numbers');
        return;
      }
      
      // Add .NS suffix for NSE stocks if not present
      const fullSymbol = symbol.endsWith('.NS') ? symbol : `${symbol}.NS`;
      
      fetchStockData(fullSymbol)
    }
  }

  const handlePopularStockClick = (symbol: string) => {
    setSearchQuery(symbol.replace('.NS', ''))
    fetchStockData(symbol)
  }

  // Format currency in Indian Rupees
  const formatCurrency = (amount: number | null | undefined) => {
    if (amount === null || amount === undefined || isNaN(amount)) return '₹0.00'
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount)
  }

  // Format market cap in Indian format
  const formatMarketCap = (marketCap: number | null | undefined) => {
    if (marketCap === null || marketCap === undefined || isNaN(marketCap)) return 'N/A'
    
    // Convert to Crores (1 Crore = 10,000,000)
    const marketCapInCrores = marketCap / 10000000
    
    if (marketCapInCrores >= 100000) {
      return `₹${(marketCapInCrores / 100000).toFixed(2)} Lakh Cr`
    } else if (marketCapInCrores >= 1000) {
      return `₹${(marketCapInCrores / 1000).toFixed(2)}K Cr`
    } else {
      return `₹${marketCapInCrores.toFixed(2)} Cr`
    }
  }

  // Format volume in Indian format
  const formatVolume = (volume: number | null | undefined) => {
    if (volume === null || volume === undefined || isNaN(volume)) return 'N/A'
    
    if (volume >= 10000000) {
      return `${(volume / 10000000).toFixed(2)} Cr`
    } else if (volume >= 100000) {
      return `${(volume / 100000).toFixed(2)} L`
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(2)} K`
    } else {
      return volume.toString()
    }
  }

  // Calculate price change percentage
  const calculatePriceChange = () => {
    if (!stockData || !stockData.previousClose || stockData.previousClose === 0) return 0
    const change = stockData.currentPrice - stockData.previousClose
    const changePercent = (change / stockData.previousClose) * 100
    return changePercent
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Stock Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="stock-search">NSE Stock Symbol</Label>
              <div className="flex gap-2">
                <Input
                  id="stock-search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                  placeholder="Enter NSE stock symbol (e.g., RELIANCE, TCS, INFY)"
                  className="flex-grow"
                />
                <Button 
                  type="submit" 
                  disabled={loading}
                  className="px-3"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Only NSE stocks are supported. .NS suffix will be added automatically.
              </p>
            </div>

            {/* Popular NSE Stocks Section */}
            <div className="space-y-2">
              <Label>Popular NSE Stocks</Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
                {popularStocks.map((stock) => (
                  <Button
                    key={stock.symbol}
                    variant="outline"
                    size="sm"
                    onClick={() => handlePopularStockClick(stock.symbol)}
                    className="text-xs h-8 truncate"
                    title={`${stock.name} (${stock.symbol.replace('.NS', '')})`}
                  >
                    {stock.symbol.replace('.NS', '')}
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Click on any of these popular NSE stocks to view their analysis
              </p>
            </div>
          </form>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-2">
              <div className="text-red-600 dark:text-red-400 mt-0.5">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
              <div>
                <p className="text-red-600 dark:text-red-400 font-medium">Error</p>
                <p className="text-red-600 dark:text-red-400">{error}</p>
                {error.includes('not found') && (
                  <p className="text-red-600 dark:text-red-400 text-sm mt-1">Try searching for popular stocks like RELIANCE, TCS, or INFY</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}


      {loading && (
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            </div>
          </CardContent>
        </Card>
      )}

      {stockData && (
        <>
          <Card>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" />
                    {stockData.name} ({stockData.symbol.replace('.NS', '')})
                  </CardTitle>
                  <CardDescription>Comprehensive stock data from NSE</CardDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(true)}
                  className="p-1 h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950"
                  title="Show detailed information"
                >
                  <Info className="h-5 w-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Current Price</p>
                  <p className="text-xl font-semibold">{formatCurrency(stockData.currentPrice)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Market Cap</p>
                  <p className="text-xl font-semibold">{formatMarketCap(stockData.marketCap)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">P/E Ratio</p>
                  <p className="text-xl font-semibold">{stockData.peRatio ? stockData.peRatio.toFixed(2) : 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">52W Range</p>
                  <p className="text-xl font-semibold">
                    {formatCurrency(stockData.fiftyTwoWeekLow)} - {formatCurrency(stockData.fiftyTwoWeekHigh)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Price Trend Visualization */}
          <StockChart symbol={stockData.symbol} />

          {analysisLoading && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Investment Analysis
                </CardTitle>
                <CardDescription>Generating comprehensive financial insights</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="font-semibold mb-1">Investment Recommendation</h3>
                    <Skeleton className="h-6 w-24" />
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Overview</h3>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full mt-2" />
                    <Skeleton className="h-4 w-3/4 mt-2" />
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Financial Health</h3>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full mt-2" />
                    <Skeleton className="h-4 w-2/3 mt-2" />
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Key Factors</h3>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                      <Skeleton className="h-4 w-4/6" />
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Potential Risks</h3>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                      <Skeleton className="h-4 w-3/4" />
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Future Outlook</h3>
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full mt-2" />
                    <Skeleton className="h-4 w-3/4 mt-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {analysis && !showPersonalSuggestions && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5" />
                      Investment Analysis
                    </CardTitle>
                    <CardDescription>
                      Comprehensive financial insights and recommendations
                    </CardDescription>
                  </div>
                  <Button
                    onClick={handlePersonalSuggestionsClick}
                    disabled={loadingSuggestions}
                    className="flex items-center gap-2 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white border-0"
                  >
                    {loadingSuggestions ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Personal Suggestions
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <>
                  <div>
                    <h3 className="font-semibold mb-1">Investment Recommendation</h3>
                    <Badge variant={
                      analysis.recommendation === 'Buy' ? 'default' :
                      analysis.recommendation === 'Sell' ? 'destructive' : 'secondary'
                    }>
                      {analysis.recommendation}
                    </Badge>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Overview</h3>
                    <p className="text-muted-foreground whitespace-pre-line">{analysis.overview}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Financial Health</h3>
                    <p className="text-muted-foreground whitespace-pre-line">{analysis.financialHealth}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Key Factors</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      {(analysis.keyFactors || []).map((factor, index) => (
                        <li key={index} className="text-muted-foreground">{factor}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Potential Risks</h3>
                    <ul className="list-disc pl-5 space-y-1">
                      {(analysis.risks || []).map((risk, index) => (
                        <li key={index} className="text-muted-foreground">{risk}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h3 className="font-semibold mb-2">Future Outlook</h3>
                    <p className="text-muted-foreground whitespace-pre-line">{analysis.outlook}</p>
                  </div>
                  
                  <div className="pt-4 border-t text-sm text-muted-foreground">
                    <p>Disclaimer: This analysis is generated by AI and should not be considered as financial advice. Always consult with financial advisors before making investment decisions.</p>
                  </div>
                </>
              </CardContent>
            </Card>
          )}

          {personalSuggestions && showPersonalSuggestions && (
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-yellow-500" />
                      Personalized Investment Suggestions
                    </CardTitle>
                    <CardDescription>
                      For {stockData.name} based on your financial profile
                    </CardDescription>
                  </div>
                  <Button
                    onClick={() => setShowPersonalSuggestions(false)}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    Back to Analysis
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Error Message - Only show if there was an error fetching personal suggestions */}
                {error && error.includes('personal suggestions') && (
                  <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-yellow-800 dark:text-yellow-200 mb-1">Unable to Generate Suggestions</h3>
                        <p className="text-yellow-700 dark:text-yellow-300">
                          {error}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Financial Overview Section - Only show if no error */}
                {!error && (
                  <div>
                    <h3 className="font-semibold mb-2">Financial Overview</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Wallet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <span className="text-sm text-blue-700 dark:text-blue-300">Total Income</span>
                        </div>
                        <p className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                          {personalSuggestions.totalIncome ? formatCurrency(personalSuggestions.totalIncome) : 'N/A'}
                        </p>
                      </div>
                      
                      <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <TrendingDownIcon className="h-4 w-4 text-red-600 dark:text-red-400" />
                          <span className="text-sm text-red-700 dark:text-red-300">Total Expenses</span>
                        </div>
                        <p className="text-lg font-semibold text-red-900 dark:text-red-100">
                          {personalSuggestions.totalExpense ? formatCurrency(personalSuggestions.totalExpense) : 'N/A'}
                        </p>
                      </div>
                      
                      <div className="p-3 bg-green-50 dark:bg-green-950/30 border border-green-100 dark:border-green-800 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <PieChart className="h-4 w-4 text-green-600 dark:text-green-400" />
                          <span className="text-sm text-green-700 dark:text-green-300">Savings Rate</span>
                        </div>
                        <p className="text-lg font-semibold text-green-900 dark:text-green-100">
                          {personalSuggestions.savingsRate !== undefined ? `${personalSuggestions.savingsRate.toFixed(1)}%` : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Do Not Invest Warning - Only show if no error */}
                {!error && personalSuggestions.doNotInvest && (
                  <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-red-800 dark:text-red-200 mb-1">Do Not Invest in This Stock</h3>
                        <p className="text-red-700 dark:text-red-300">{personalSuggestions.doNotInvestReason}</p>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Suitability, Risk Level - Only show if no error */}
                {!error && (
                  <div className={`grid grid-cols-1 ${personalSuggestions.doNotInvest ? 'md:grid-cols-2' : 'md:grid-cols-3'} gap-4`}>
                    <div>
                      <h3 className="font-semibold mb-2 text-sm text-muted-foreground">Suitability</h3>
                      <Badge variant={
                        personalSuggestions.suitability === 'High' ? 'default' :
                        personalSuggestions.suitability === 'Medium' ? 'secondary' : 'destructive'
                      } className="text-sm py-1 px-3">
                        {personalSuggestions.suitability}
                      </Badge>
                    </div>
                    
                    {/* Only show Recommended Amount if risk is not high */}
                    {!personalSuggestions.doNotInvest && (
                      <div>
                        <h3 className="font-semibold mb-2 text-sm text-muted-foreground">Recommended Amount</h3>
                        <p className="font-medium text-lg">{personalSuggestions.recommendedAmount}</p>
                      </div>
                    )}
                    
                    <div>
                      <h3 className="font-semibold mb-2 text-sm text-muted-foreground">Risk Level</h3>
                      <Badge variant={
                        personalSuggestions.riskLevel === 'Low' ? 'default' :
                        personalSuggestions.riskLevel === 'Medium' ? 'secondary' : 'destructive'
                      } className="text-sm py-1 px-3">
                        {personalSuggestions.riskLevel}
                      </Badge>
                    </div>
                  </div>
                )}
                
                {/* Shares Information - Only show if no error and not a "Do Not Invest" case */}
                {!error && !personalSuggestions.doNotInvest && stockData && personalSuggestions.sharesToBuy && (
                  <div className="bg-blue-50 dark:bg-blue-950/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center gap-2 mb-2">
                      <Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <h3 className="font-semibold text-blue-900 dark:text-blue-100">Investment Details</h3>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-blue-700 dark:text-blue-300">Current Price per Share</p>
                        <p className="text-lg font-semibold text-blue-900 dark:text-blue-100">{formatCurrency(stockData.currentPrice)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-blue-700 dark:text-blue-300">Shares to Purchase</p>
                        <p className="text-lg font-semibold text-blue-900 dark:text-blue-100">{personalSuggestions.sharesToBuy} shares</p>
                      </div>
                    </div>
                    <div className="mt-3 text-sm text-blue-700 dark:text-blue-300">
                      <p>With the recommended amount of {personalSuggestions.recommendedAmount}, you can purchase {personalSuggestions.sharesToBuy} shares at the current price.</p>
                    </div>
                  </div>
                )}
                
                {/* Action Items - Only show if no error and not a "Do Not Invest" case */}
                {!error && !personalSuggestions.doNotInvest && (
                  <div>
                    <h3 className="font-semibold mb-2">Action Items</h3>
                    <div className="space-y-2">
                      {(personalSuggestions.actionItems || []).slice(0, 3).map((item, index) => (
                        <div key={index} className="flex items-start gap-2 p-3 bg-muted dark:bg-muted/50 rounded-lg">
                          <div className="mt-1">
                            <ArrowRight className="h-4 w-4 text-blue-500 dark:text-blue-400" />
                          </div>
                          <p className="text-muted-foreground dark:text-muted-foreground">{item}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Summary - Only show if no error */}
                {!error && (
                  <div>
                    <h3 className="font-semibold mb-2">Summary</h3>
                    <div className="bg-muted dark:bg-muted/20 p-4 rounded-lg">
                      <p className="text-muted-foreground dark:text-muted-foreground leading-relaxed whitespace-pre-line">
                        {personalSuggestions.summary}
                      </p>
                    </div>
                  </div>
                )}
                
                {/* Retry Button - Show if there was an error */}
                {error && error.includes('personal suggestions') && (
                  <div className="flex justify-center mt-4">
                    <Button 
                      onClick={() => fetchPersonalSuggestions(stockData!)}
                      className="flex items-center gap-2"
                    >
                      <Loader2 className="h-4 w-4" />
                      Try Again
                    </Button>
                  </div>
                )}
                
                <div className="pt-4 border-t text-sm text-muted-foreground dark:text-muted-foreground">
                  <p>Disclaimer: These suggestions are based on your financial data and AI analysis. Please consult with a financial advisor before making investment decisions.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Stock Details Modal */}
      {showDetails && stockData && (
        <div className="fixed inset-0 backdrop-blur-sm bg-background/55 dark:bg-background/80 flex items-center justify-center p-4 z-50">
          <div className="bg-card dark:bg-card border rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-bold">{stockData.name} ({stockData.symbol.replace('.NS', '')})</h2>
                  <p className="text-sm text-muted-foreground dark:text-muted-foreground">Detailed Stock Information</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDetails(false)}
                  className="p-1 h-8 w-8 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-muted-foreground">Current Price</span>
                    <span className="font-medium">{formatCurrency(stockData.currentPrice)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-muted-foreground">Previous Close</span>
                    <span className="font-medium">{formatCurrency(stockData.previousClose)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-muted-foreground">Day's Change</span>
                    <span className={`font-medium flex items-center ${calculatePriceChange() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {calculatePriceChange() >= 0 ? (
                        <TrendingUp className="h-4 w-4 mr-1" />
                      ) : (
                        <TrendingDown className="h-4 w-4 mr-1" />
                      )}
                      {formatCurrency(stockData.currentPrice - stockData.previousClose)} ({calculatePriceChange().toFixed(2)}%)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-muted-foreground">Market Cap</span>
                    <span className="font-medium">{formatMarketCap(stockData.marketCap)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-muted-foreground">P/E Ratio</span>
                    <span className="font-medium">{stockData.peRatio ? stockData.peRatio.toFixed(2) : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-muted-foreground">Dividend Yield</span>
                    <span className="font-medium">{stockData.dividendYield ? `${(stockData.dividendYield * 100).toFixed(2)}%` : 'N/A'}</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-muted-foreground">Volume</span>
                    <span className="font-medium">{formatVolume(stockData.volume)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-muted-foreground">Average Volume</span>
                    <span className="font-medium">{formatVolume(stockData.averageVolume)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-muted-foreground">Beta</span>
                    <span className="font-medium">{stockData.beta ? stockData.beta.toFixed(2) : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-muted-foreground">52W High</span>
                    <span className="font-medium">{formatCurrency(stockData.fiftyTwoWeekHigh)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-muted-foreground">52W Low</span>
                    <span className="font-medium">{formatCurrency(stockData.fiftyTwoWeekLow)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground dark:text-muted-foreground">52W Range</span>
                    <span className="font-medium text-xs">
                      {formatCurrency(stockData.fiftyTwoWeekLow)} - {formatCurrency(stockData.fiftyTwoWeekHigh)}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <Button onClick={() => setShowDetails(false)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}