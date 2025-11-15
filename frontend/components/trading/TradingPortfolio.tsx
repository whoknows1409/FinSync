// components/trading/TradingPortfolio.tsx
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, MoreHorizontal, RefreshCw } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"

interface Holding {
  symbol: string
  name: string
  quantity: number
  averagePrice: number  // This is the buying price
  currentPrice: number
  marketValue: number
  unrealizedPnL: number
  pnlPercentage: number
  sector: string
}

interface TradingPortfolioProps {
  holdings: Holding[]
  isLoading: boolean
  isRefreshing?: boolean
  onRefresh?: () => void
}

export default function TradingPortfolio({ 
  holdings, 
  isLoading, 
  isRefreshing = false,
  onRefresh
}: TradingPortfolioProps) {
  const router = useRouter()
  const [previousPrices, setPreviousPrices] = useState<Record<string, number>>({})
  const [priceChanges, setPriceChanges] = useState<Record<string, 'up' | 'down' | 'same'>>({})
  const [localHoldings, setLocalHoldings] = useState<Holding[]>(holdings)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Handle selling stock from portfolio
  const handleSellStock = (holding: Holding) => {
    // Navigate to trade tab with pre-filled sell order
    router.push(`/trading?action=sell&symbol=${holding.symbol}&quantity=${holding.quantity}`)
  }

  // Handle viewing stock details
  const handleViewDetails = (holding: Holding) => {
    router.push(`/stocks/${holding.symbol}`)
  }

  // Update local holdings when props change
  useEffect(() => {
    setLocalHoldings(holdings)
    if (holdings.length > 0) {
      setLastUpdated(new Date())
    }
  }, [holdings])

  // Format currency to 2 decimal places
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  // Format percentage to 2 decimal places
  const formatPercentage = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`
  }

  // Update previous prices and detect changes
  useEffect(() => {
    if (localHoldings.length > 0) {
      setPreviousPrices(prevPreviousPrices => {
        const newPreviousPrices = { ...prevPreviousPrices }
        const newPriceChanges: Record<string, 'up' | 'down' | 'same'> = {}
        
        localHoldings.forEach(holding => {
          const prevPrice = prevPreviousPrices[holding.symbol]
          if (prevPrice !== undefined) {
            if (holding.currentPrice > prevPrice) {
              newPriceChanges[holding.symbol] = 'up'
            } else if (holding.currentPrice < prevPrice) {
              newPriceChanges[holding.symbol] = 'down'
            } else {
              newPriceChanges[holding.symbol] = 'same'
            }
          }
          newPreviousPrices[holding.symbol] = holding.currentPrice
        })
        
        setPriceChanges(newPriceChanges)
        return newPreviousPrices
      })
      
      // Clear price change indicators after 2 seconds
      const timer = setTimeout(() => {
        setPriceChanges({})
      }, 2000)
      
      return () => clearTimeout(timer)
    }
  }, [localHoldings]) // Removed previousPrices from dependencies

  if (isLoading && !isRefreshing) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Holdings</CardTitle>
          <CardDescription>Your current stock holdings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (localHoldings.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Portfolio Holdings</CardTitle>
          <CardDescription>Your current stock holdings</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">You don't have any holdings yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Start trading to build your portfolio.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Portfolio Holdings</CardTitle>
            <CardDescription>Your current stock holdings</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="text-xs text-muted-foreground">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </span>
            )}
            {isRefreshing ? (
              <RefreshCw className="h-4 w-4 animate-spin text-blue-500" />
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onRefresh}
                disabled={isRefreshing}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Average Buying Price</TableHead>
              <TableHead className="text-right">Current Price</TableHead>
              <TableHead className="text-right">Market Value</TableHead>
              <TableHead className="text-right">P&L</TableHead>
              <TableHead className="text-right">P&L %</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {localHoldings.map((holding) => {
              const isPositive = holding.unrealizedPnL >= 0
              const priceChange = priceChanges[holding.symbol]
              
              return (
                <TableRow key={holding.symbol} className="transition-all duration-300">
                  <TableCell className="font-medium">{holding.symbol}</TableCell>
                  <TableCell>{holding.name}</TableCell>
                  <TableCell className="text-right">{holding.quantity}</TableCell>
                  <TableCell className="text-right">{formatCurrency(holding.averagePrice)}</TableCell>
                  <TableCell className={`text-right font-medium transition-all duration-300 ${
                    priceChange === 'up' ? 'text-green-600' : 
                    priceChange === 'down' ? 'text-red-600' : ''
                  }`}>
                    {formatCurrency(holding.currentPrice)}
                    {priceChange === 'up' && <TrendingUp className="inline h-3 w-3 ml-1" />}
                    {priceChange === 'down' && <TrendingDown className="inline h-3 w-3 ml-1" />}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(holding.marketValue)}</TableCell>
                  <TableCell className={`text-right font-medium transition-all duration-300 ${
                    isPositive ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(holding.unrealizedPnL)}
                  </TableCell>
                  <TableCell className={`text-right font-medium transition-all duration-300 ${
                    isPositive ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatPercentage(holding.pnlPercentage)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleSellStock(holding)}>
                          Sell Stock
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleViewDetails(holding)}>
                          View Details
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-muted-foreground">Total Holdings</p>
              <p className="text-lg font-semibold">{localHoldings.length} stocks</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Total Value</p>
              <p className="text-lg font-semibold">
                {formatCurrency(localHoldings.reduce((sum, h) => sum + h.marketValue, 0))}
              </p>
            </div>
          </div>
        </div>
      </CardContent> 
    </Card>
  )
}