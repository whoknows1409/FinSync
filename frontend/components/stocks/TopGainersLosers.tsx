// frontend/components/stocks/TopGainersLosers.tsx
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TrendingUp, TrendingDown, RefreshCw, PieChart, ExternalLink, AlertCircle, BarChart3 } from "lucide-react"

interface StockItem {
  symbol: string
  name: string
  currentPrice: number
  previousClose: number
  changePercent: number
  high?: number
  low?: number
  volume?: number
}

interface TopGainersLosersData {
  gainers: StockItem[]
  losers: StockItem[]
  totalStocks: number
  timestamp: string
  source?: string
}

interface DetailedStockItem extends StockItem {
  high: number
  low: number
  volume: number
}

interface DetailedTopGainersLosersData {
  gainers: DetailedStockItem[]
  losers: DetailedStockItem[]
  totalStocks: number
  timestamp: string
  source?: string
}

export default function TopGainersLosers() {
  const [data, setData] = useState<TopGainersLosersData | null>(null)
  const [detailedData, setDetailedData] = useState<DetailedTopGainersLosersData | null>(null)
  const [loading, setLoading] = useState(true)
  const [detailedLoading, setDetailedLoading] = useState(false)
  const [error, setError] = useState("")
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)
  const [activeTab, setActiveTab] = useState("overview")

  const fetchData = async () => {
    setLoading(true)
    setError("")
    
    try {
      const response = await fetch("/api/stocks-analysis/top-gainers-losers")
      if (!response.ok) {
        throw new Error("Failed to fetch market data")
      }
      const result = await response.json()
      setData(result)
      setLastUpdated(new Date(result.timestamp))
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load data'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const fetchDetailedData = async () => {
    setDetailedLoading(true)
    
    try {
      const response = await fetch("/api/stocks-analysis/top-gainers-losers-detailed")
      if (!response.ok) {
        throw new Error("Failed to fetch detailed market data")
      }
      const result = await response.json()
      setDetailedData(result)
    } catch (err) {
      console.error("Failed to fetch detailed data:", err)
      // Don't show error for detailed data, just use basic data
    } finally {
      setDetailedLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    
    // Refresh data every 5 minutes
    const interval = setInterval(fetchData, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (activeTab === "detailed") {
      fetchDetailedData()
    }
  }, [activeTab])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(amount)
  }

  const formatVolume = (volume: number) => {
    if (volume >= 10000000) {
      return `${(volume / 10000000).toFixed(2)} Cr`
    } else if (volume >= 100000) {
      return `${(volume / 100000).toFixed(2)} L`
    } else if (volume >= 1000) {
      return `${(volume / 1000).toFixed(2)} K`
    }
    return volume.toString()
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const renderStockList = (stocks: StockItem[], isGainer: boolean) => (
    <div className="space-y-3">
      {stocks.map((stock, index) => (
        <div 
          key={stock.symbol} 
          className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
          onClick={() => {
            // Navigate to stock analysis with this stock
            window.location.href = `/stocks?symbol=${stock.symbol.replace('.NS', '')}&tab=analysis`
          }}
        >
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
              <span className="text-sm font-medium">{index + 1}</span>
            </div>
            <div>
              <p className="font-medium">{stock.symbol.replace('.NS', '')}</p>
              <p className="text-sm text-muted-foreground truncate max-w-[150px]">{stock.name}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-medium">{formatCurrency(stock.currentPrice)}</p>
            <Badge
              variant={isGainer ? "default" : "destructive"}
              className="flex items-center gap-1 mt-1"
            >
              {isGainer ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {formatPercentage(stock.changePercent)}
            </Badge>
          </div>
        </div>
      ))}
    </div>
  )

  const renderDetailedStockList = (stocks: DetailedStockItem[], isGainer: boolean) => (
    <div className="space-y-3">
      {stocks.map((stock, index) => (
        <div 
          key={stock.symbol} 
          className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer"
          onClick={() => {
            // Navigate to stock analysis with this stock
            window.location.href = `/stocks?symbol=${stock.symbol.replace('.NS', '')}&tab=analysis`
          }}
        >
          <div className="flex items-center space-x-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-muted">
              <span className="text-sm font-medium">{index + 1}</span>
            </div>
            <div>
              <p className="font-medium">{stock.symbol.replace('.NS', '')}</p>
              <p className="text-sm text-muted-foreground truncate max-w-[150px]">{stock.name}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-medium">{formatCurrency(stock.currentPrice)}</p>
            <div className="flex items-center justify-end gap-2 mt-1">
              <Badge
                variant={isGainer ? "default" : "destructive"}
                className="flex items-center gap-1"
              >
                {isGainer ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                {formatPercentage(stock.changePercent)}
              </Badge>
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              H: {formatCurrency(stock.high)} L: {formatCurrency(stock.low)}
            </div>
            <div className="text-xs text-muted-foreground">
              Vol: {formatVolume(stock.volume)}
            </div>
          </div>
        </div>
      ))}
    </div>
  )

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-24 mb-2" />
                <Skeleton className="h-8 w-16" />
              </CardContent>
            </Card>
          ))}
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                Top Gainers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div>
                        <Skeleton className="h-4 w-20 mb-1" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                    <div className="text-right">
                      <Skeleton className="h-4 w-16 mb-1" />
                      <Skeleton className="h-6 w-12" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingDown className="h-5 w-5 text-red-600" />
                Top Losers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Skeleton className="h-8 w-8 rounded-full" />
                      <div>
                        <Skeleton className="h-4 w-20 mb-1" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                    </div>
                    <div className="text-right">
                      <Skeleton className="h-4 w-16 mb-1" />
                      <Skeleton className="h-6 w-12" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Error loading market data: {error}. Please try again later.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Market Overview</h2>
          <p className="text-muted-foreground">
            Real-time top performers from NSE • Official market data
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => window.open('https://www.nseindia.com/market-data/top-gainers-losers#gainers', '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View on NSE
          </Button>
        </div>
      </div>

      {data?.source && data.source.includes('Fallback') && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Currently showing data from Yahoo Finance due to NSE website accessibility issues. 
            For the most accurate data, please visit NSE India directly.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Data Source</p>
            <p className="text-lg font-semibold">
              {data?.source || 'NSE India'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Top Gainers</p>
            <p className="text-2xl font-bold text-green-600">
              {data?.gainers?.length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Top Losers</p>
            <p className="text-2xl font-bold text-red-600">
              {data?.losers?.length || 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground">Last Updated</p>
            <p className="text-lg font-semibold">
              {lastUpdated ? formatTime(data?.timestamp || '') : 'Loading...'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <PieChart className="h-4 w-4" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="detailed" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Detailed View
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  Top Gainers
                </CardTitle>
                <CardDescription>
                  Stocks with the highest gains today
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data?.gainers ? renderStockList(data.gainers, true) : <p>No data available</p>}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  Top Losers
                </CardTitle>
                <CardDescription>
                  Stocks with the highest losses today
                </CardDescription>
              </CardHeader>
              <CardContent>
                {data?.losers ? renderStockList(data.losers, false) : <p>No data available</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-6">
          {detailedLoading ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Top Gainers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <div>
                            <Skeleton className="h-4 w-20 mb-1" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                        </div>
                        <div className="text-right">
                          <Skeleton className="h-4 w-16 mb-1" />
                          <Skeleton className="h-6 w-12" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                    Top Losers
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <Skeleton className="h-8 w-8 rounded-full" />
                          <div>
                            <Skeleton className="h-4 w-20 mb-1" />
                            <Skeleton className="h-3 w-32" />
                          </div>
                        </div>
                        <div className="text-right">
                          <Skeleton className="h-4 w-16 mb-1" />
                          <Skeleton className="h-6 w-12" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Top Gainers
                  </CardTitle>
                  <CardDescription>
                    Stocks with the highest gains today with detailed metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {detailedData?.gainers ? renderDetailedStockList(detailedData.gainers, true) : 
                    data?.gainers ? renderStockList(data.gainers, true) : <p>No data available</p>}
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingDown className="h-5 w-5 text-red-600" />
                    Top Losers
                  </CardTitle>
                  <CardDescription>
                    Stocks with the highest losses today with detailed metrics
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {detailedData?.losers ? renderDetailedStockList(detailedData.losers, false) : 
                    data?.losers ? renderStockList(data.losers, false) : <p>No data available</p>}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {lastUpdated && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <p>Data updated at: {lastUpdated.toLocaleString()}</p>
          {data?.source && (
            <p>Source: {data.source}</p>
          )}
        </div>
      )}
    </div>
  )
}