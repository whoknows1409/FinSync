"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, TrendingUp, TrendingDown, Brain, Building2, BarChart3, ArrowRightLeft, Calendar } from "lucide-react"
import StockComparisonChart from "@/components/stocks/StockComparisonChart"
import { useTheme } from "next-themes"

interface StockData {
  symbol: string
  name: string
  currentPrice: number
  previousClose: number
  marketCap: number
  peRatio?: number
  fiftyTwoWeekHigh: number
  fiftyTwoWeekLow: number
  monthlyChange?: number
}

interface ComparisonData {
  stock1: StockData | null
  stock2: StockData | null
  aiSummary: string
}

export default function StockComparison() {
  const [symbol1, setSymbol1] = useState('')
  const [symbol2, setSymbol2] = useState('')
  const [comparisonData, setComparisonData] = useState<ComparisonData | null>(null)
  const [loading, setLoading] = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [error, setError] = useState('')
  const [timeRange, setTimeRange] = useState<'7d' | '1mo' | '6mo'>('1mo')
  const { theme } = useTheme()

  const fetchComparisonData = async () => {
    if (!symbol1.trim() || !symbol2.trim()) {
      setError('Please enter both stock symbols')
      return
    }

    setLoading(true)
    setAiLoading(true)
    setError('')
    
    try {
      // Format symbols
      const formattedSymbol1 = symbol1.trim().toUpperCase() + (symbol1.trim().toUpperCase().endsWith('.NS') ? '' : '.NS')
      const formattedSymbol2 = symbol2.trim().toUpperCase() + (symbol2.trim().toUpperCase().endsWith('.NS') ? '' : '.NS')
      
      const response = await fetch(
        `/api/stocks-analysis/compare?symbol1=${formattedSymbol1}&symbol2=${formattedSymbol2}`
      )
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch comparison data')
      }
      
      const data = await response.json()
      setComparisonData(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error fetching comparison data'
      setError(message)
      setComparisonData(null)
    } finally {
      setLoading(false)
      // Add a small delay to show the AI loading state
      setTimeout(() => setAiLoading(false), 1000)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatMarketCap = (marketCap: number) => {
    if (!marketCap) return 'N/A'
    
    const marketCapInCrores = marketCap / 10000000
    
    if (marketCapInCrores >= 100000) {
      return `₹${(marketCapInCrores / 100000).toFixed(2)} Lakh Cr`
    } else if (marketCapInCrores >= 1000) {
      return `₹${(marketCapInCrores / 1000).toFixed(2)}K Cr`
    } else {
      return `₹${marketCapInCrores.toFixed(2)} Cr`
    }
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  return (
    <div className="space-y-6">
      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <ArrowRightLeft className="h-6 w-6" />
            Stock Comparison Tool
          </CardTitle>
          <CardDescription className="text-base">
            Compare two NSE stocks side-by-side
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 mb-6">
            <Input
              placeholder="Stock 1 (e.g., RELIANCE)"
              value={symbol1}
              onChange={(e) => setSymbol1(e.target.value)}
              className="flex-grow"
            />
            <Input
              placeholder="Stock 2 (e.g., TCS)"
              value={symbol2}
              onChange={(e) => setSymbol2(e.target.value)}
              className="flex-grow"
            />
            <Button 
              onClick={fetchComparisonData} 
              disabled={loading}
              className="px-6"
            >
              {loading ? 'Comparing...' : 'Compare'}
            </Button>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-600 rounded-md border border-red-200 dark:bg-red-900/30 dark:text-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          {loading && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2].map((item) => (
                  <Card key={item} className="border border-gray-200 dark:border-gray-800">
                    <CardContent className="p-4">
                      <Skeleton className="h-6 w-3/4 mb-3" />
                      <div className="space-y-3">
                        {[...Array(5)].map((_, i) => (
                          <div key={i} className="flex justify-between">
                            <Skeleton className="h-4 w-1/3" />
                            <Skeleton className="h-4 w-1/3" />
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {comparisonData && (
        <div className="space-y-6">
          {/* Stock Data Comparison */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {comparisonData.stock1 && (
              <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg mb-1">
                        {comparisonData.stock1.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {comparisonData.stock1.symbol.replace('.NS', '')}
                      </p>
                    </div>
                    <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium dark:bg-blue-900/40 dark:text-blue-200">
                      Stock 1
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b">
                      <span className="text-sm text-muted-foreground">Current Price</span>
                      <span className="font-semibold text-xl">{formatCurrency(comparisonData.stock1.currentPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Market Cap</span>
                      <span className="font-medium">{formatMarketCap(comparisonData.stock1.marketCap)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">P/E Ratio</span>
                      <span className="font-medium">{comparisonData.stock1.peRatio?.toFixed(2) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">52W Range</span>
                      <span className="font-medium text-xs">
                        {formatCurrency(comparisonData.stock1.fiftyTwoWeekLow)} - {formatCurrency(comparisonData.stock1.fiftyTwoWeekHigh)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t">
                      <span className="text-sm text-muted-foreground">1M Change</span>
                      <span className={`font-medium flex items-center ${comparisonData.stock1.monthlyChange && comparisonData.stock1.monthlyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {comparisonData.stock1.monthlyChange && comparisonData.stock1.monthlyChange >= 0 ? (
                          <TrendingUp className="h-4 w-4 mr-1" />
                        ) : (
                          <TrendingDown className="h-4 w-4 mr-1" />
                        )}
                        {formatPercentage(comparisonData.stock1.monthlyChange || 0)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {comparisonData.stock2 && (
              <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-bold text-lg mb-1">
                        {comparisonData.stock2.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {comparisonData.stock2.symbol.replace('.NS', '')}
                      </p>
                    </div>
                    <div className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs font-medium dark:bg-green-900/40 dark:text-green-200">
                      Stock 2
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-3 border-b">
                      <span className="text-sm text-muted-foreground">Current Price</span>
                      <span className="font-semibold text-xl">{formatCurrency(comparisonData.stock2.currentPrice)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Market Cap</span>
                      <span className="font-medium">{formatMarketCap(comparisonData.stock2.marketCap)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">P/E Ratio</span>
                      <span className="font-medium">{comparisonData.stock2.peRatio?.toFixed(2) || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">52W Range</span>
                      <span className="font-medium text-xs">
                        {formatCurrency(comparisonData.stock2.fiftyTwoWeekLow)} - {formatCurrency(comparisonData.stock2.fiftyTwoWeekHigh)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center pt-3 border-t">
                      <span className="text-sm text-muted-foreground">1M Change</span>
                      <span className={`font-medium flex items-center ${comparisonData.stock2.monthlyChange && comparisonData.stock2.monthlyChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {comparisonData.stock2.monthlyChange && comparisonData.stock2.monthlyChange >= 0 ? (
                          <TrendingUp className="h-4 w-4 mr-1" />
                        ) : (
                          <TrendingDown className="h-4 w-4 mr-1" />
                        )}
                        {formatPercentage(comparisonData.stock2.monthlyChange || 0)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Time Range Selector */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <h3 className="font-medium flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Select Time Range for Charts
                </h3>
                <div className="flex gap-2">
                  {(['7d', '1mo', '6mo'] as const).map((range) => (
                    <Button
                      key={range}
                      variant={timeRange === range ? "default" : "outline"}
                      size="sm"
                      onClick={() => setTimeRange(range)}
                      className="h-8 text-xs"
                    >
                      {range === '7d' ? '7 Days' : range === '1mo' ? '1 Month' : '6 Months'}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stock Comparison Chart */}
          {comparisonData.stock1 && comparisonData.stock2 && (
            <StockComparisonChart
              stock1Symbol={comparisonData.stock1.symbol}
              stock1Name={comparisonData.stock1.name}
              stock2Symbol={comparisonData.stock2.symbol}
              stock2Name={comparisonData.stock2.name}
              timeRange={timeRange}
            />
          )}

          {/* AI Comparison Summary */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI Comparison Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {aiLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                  <Skeleton className="h-4 w-4/6" />
                </div>
              ) : (
                <div className={`prose prose-sm max-w-none ${theme === 'dark' ? 'prose-invert prose-dark' : ''}`}>
                  {comparisonData.aiSummary.includes("AI comparison unavailable") || 
                   comparisonData.aiSummary.includes("Unable to generate AI comparison") ? (
                    <div className={`p-4 rounded-md border ${theme === 'dark' ? 'bg-yellow-900/30 border-yellow-800' : 'bg-yellow-50 border-yellow-200'}`}>
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className={`h-5 w-5 ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-400'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-yellow-300' : 'text-yellow-800'}`}>AI Analysis Unavailable</h3>
                          <div className={`mt-2 text-sm ${theme === 'dark' ? 'text-yellow-200' : 'text-yellow-700'}`}>
                            <p>
                              We're unable to generate the AI comparison at this time. 
                              Error: {comparisonData.aiSummary.replace("AI comparison unavailable at this time. Error: ", "")}
                            </p>
                            <p className="mt-2">
                              This could be due to API limitations or temporary service issues.
                            </p>
                          </div>
                          <div className="mt-4">
                            <Button 
                              onClick={fetchComparisonData} 
                              disabled={loading}
                              variant="outline"
                              size="sm"
                            >
                              Retry
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : comparisonData.aiSummary.includes("AI response (raw format)") ? (
                    <div className={`p-4 rounded-md border ${theme === 'dark' ? 'bg-blue-900/30 border-blue-800' : 'bg-blue-50 border-blue-200'}`}>
                      <div className="flex items-start">
                        <div className="flex-shrink-0">
                          <svg className={`h-5 w-5 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-400'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="ml-3">
                          <h3 className={`text-sm font-medium ${theme === 'dark' ? 'text-blue-300' : 'text-blue-800'}`}>AI Analysis (Raw Format)</h3>
                          <div className={`mt-2 text-sm ${theme === 'dark' ? 'text-blue-200' : 'text-blue-700'}`}>
                            <p className="whitespace-pre-wrap break-words">
                              {comparisonData.aiSummary.replace("AI response (raw format): ", "")}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <p className={`leading-relaxed ${theme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>{comparisonData.aiSummary}</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}