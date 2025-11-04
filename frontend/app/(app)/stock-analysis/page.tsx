// frontend/app/(app)/stock-analysis/page.tsx
"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Search, TrendingUp, TrendingDown, Brain, Building2 } from "lucide-react"

type StockData = {
  name: string
  symbol: string
  currentPrice?: number
  marketCap: number
  peRatio?: number
  fiftyTwoWeekLow?: number
  fiftyTwoWeekHigh?: number
}

type AnalysisResult = {
  recommendation: 'Buy' | 'Sell' | 'Hold' | string
  overview: string
  financialHealth: string
  keyFactors: string[]
  risks: string[]
  outlook: string
}

export default function StockAnalysisPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [stockData, setStockData] = useState<StockData | null>(null)
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const popularStocks: { symbol: string; name: string }[] = [
    { symbol: 'AAPL', name: 'Apple Inc.' },
    { symbol: 'MSFT', name: 'Microsoft Corporation' },
    { symbol: 'GOOGL', name: 'Alphabet Inc.' },
    { symbol: 'AMZN', name: 'Amazon.com Inc.' },
    { symbol: 'TSLA', name: 'Tesla Inc.' },
    { symbol: 'META', name: 'Meta Platforms Inc.' },
    { symbol: 'NVDA', name: 'NVIDIA Corporation' },
    { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
  ]

  const fetchStockData = async (symbol: string) => {
    setLoading(true)
    setError('')
    setAnalysis(null)
    
    try {
      const response = await fetch(`/api/stocks-analysis/stock-data?symbol=${symbol}`)
      if (!response.ok) {
        throw new Error('Failed to fetch stock data')
      }
      const data = await response.json()
      setStockData(data)
      
      // Fetch analysis after getting stock data
      fetchAnalysis(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error fetching stock data'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const fetchAnalysis = async (stock: any) => {
    try {
      const response = await fetch('/api/stocks-analysis/stock-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stock }),
      })
      
      if (!response.ok) {
        throw new Error('Failed to generate analysis')
      }
      
      const data = await response.json()
      setAnalysis(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error generating analysis'
      setError(message)
    }
  }

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      fetchStockData(searchQuery.trim().toUpperCase())
    }
  }

  const handlePopularStockClick = (symbol: string) => {
    setSearchQuery(symbol)
    fetchStockData(symbol)
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold">Stock Analysis with Gemini AI</h1>
        <p className="text-muted-foreground">Get real-time financial insights powered by Google's Gemini AI</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Stocks</CardTitle>
          <CardDescription>Enter a stock symbol to analyze</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2 mb-6">
            <Input
              placeholder="Enter stock symbol (e.g., AAPL)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-grow"
            />
            <Button type="submit" disabled={loading}>
              {loading ? 'Searching...' : 'Analyze'}
            </Button>
          </form>

          <div>
            <h3 className="font-medium mb-3">Popular Stocks</h3>
            <div className="flex flex-wrap gap-2">
              {popularStocks.map((stock) => (
                <Button
                  key={stock.symbol}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePopularStockClick(stock.symbol)}
                >
                  {stock.symbol}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4">
            <p className="text-red-600">{error}</p>
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              {stockData.name} ({stockData.symbol})
            </CardTitle>
            <CardDescription>Real-time stock data</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Current Price</p>
                <p className="text-xl font-semibold">${stockData.currentPrice?.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Market Cap</p>
                <p className="text-xl font-semibold">${(stockData.marketCap / 1000000000).toFixed(2)}B</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">P/E Ratio</p>
                <p className="text-xl font-semibold">{stockData.peRatio?.toFixed(2) || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">52W Range</p>
                <p className="text-xl font-semibold">
                  ${stockData.fiftyTwoWeekLow?.toFixed(2)} - ${stockData.fiftyTwoWeekHigh?.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {analysis && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Gemini AI Analysis
            </CardTitle>
            <CardDescription>AI-powered financial insights</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
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
              <p className="text-muted-foreground">{analysis.overview}</p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Financial Health</h3>
              <p className="text-muted-foreground">{analysis.financialHealth}</p>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Key Factors</h3>
              <ul className="list-disc pl-5 space-y-1">
                {analysis.keyFactors.map((factor, index) => (
                  <li key={index} className="text-muted-foreground">{factor}</li>
                ))}
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Potential Risks</h3>
              <ul className="list-disc pl-5 space-y-1">
                {analysis.risks.map((risk, index) => (
                  <li key={index} className="text-muted-foreground">{risk}</li>
                ))}
              </ul>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">Future Outlook</h3>
              <p className="text-muted-foreground">{analysis.outlook}</p>
            </div>
            
            <div className="pt-4 border-t text-sm text-muted-foreground">
              <p>Disclaimer: This analysis is generated by AI and should not be considered as financial advice. Always consult with financial advisors before making investment decisions.</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}