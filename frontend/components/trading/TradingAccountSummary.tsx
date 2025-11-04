// components/trading/TradingAccountSummary.tsx
"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, DollarSign, PieChart, BarChart3, RefreshCw } from "lucide-react"

interface TradingAccountSummaryProps {
  walletBalance: number
  holdingsValue: number
  activeOrders: number
  totalTrades: number
  portfolioValue: number
  totalPnL: number
  totalProfit?: number
  totalLoss?: number
  isLoading: boolean
  isRefreshing?: boolean
}

export default function TradingAccountSummary({
  walletBalance,
  holdingsValue,
  activeOrders,
  totalTrades,
  portfolioValue,
  totalPnL,
  totalProfit = 0,
  totalLoss = 0,
  isLoading,
  isRefreshing = false
}: TradingAccountSummaryProps) {
  // Format currency to 2 decimal places
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const isPositive = totalPnL >= 0

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card className="transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Wallet Balance</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(walletBalance)}</div>
          <p className="text-xs text-muted-foreground">Available for trading</p>
        </CardContent>
      </Card>

      <Card className="transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
          <PieChart className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{formatCurrency(portfolioValue)}</div>
          <p className="text-xs text-muted-foreground">
            Holdings: {formatCurrency(holdingsValue)}
          </p>
        </CardContent>
      </Card>

      <Card className="transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
          {isPositive ? (
            <TrendingUp className="h-4 w-4 text-green-600" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600" />
          )}
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(totalPnL)}
          </div>
          <p className="text-xs text-muted-foreground">
            Profit: {formatCurrency(totalProfit)}, Loss: {formatCurrency(totalLoss)}
          </p>
        </CardContent>
      </Card>

      <Card className="transition-all duration-300">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Activity</CardTitle>
          <BarChart3 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Badge variant="outline">
              {activeOrders} Active
            </Badge>
            <Badge variant="outline">
              {totalTrades} Trades
            </Badge>
            {isRefreshing && (
              <RefreshCw className="h-3 w-3 animate-spin text-blue-500" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Trading activity
          </p>
        </CardContent>
      </Card>
    </div>
  )
}