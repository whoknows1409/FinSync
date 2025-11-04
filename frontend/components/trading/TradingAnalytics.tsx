// TradingAnalytics.tsx
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { TrendingUp, TrendingDown, BarChart3, Target, AlertTriangle, DollarSign, Calendar, PieChart, Award } from "lucide-react"

interface Order {
  id: string
  symbol: string
  name: string
  type: 'BUY' | 'SELL'
  quantity: number
  price: number
  status: 'PENDING' | 'EXECUTED' | 'CANCELLED'
  timestamp: string
  orderType: 'MARKET' | 'LIMIT'
  executedAt?: string
  executedPrice?: number
}

interface Trade {
  symbol: string
  name: string
  buyPrice: number
  buyDate: string
  sellPrice?: number
  sellDate?: string
  quantity: number
  profitLoss?: number
  profitLossPercentage?: number
  status: 'OPEN' | 'CLOSED'
}

interface TradingStats {
  totalTrades: number
  winRate: number
  totalPnL: number
  portfolioValue: number
  bestTrade: {
    symbol: string
    pnl: number
  } | null
  worstTrade: {
    symbol: string
    pnl: number
  } | null
  averageHoldingTime: number
  totalVolume: number
  sectorAllocation: Array<{
    sector: string
    value: number
    percentage: number
  }>
}

interface TradingAnalyticsProps {
  tradingStats: TradingStats
  orders: Order[]
  isLoading: boolean
}

export default function TradingAnalytics({ tradingStats, orders, isLoading }: TradingAnalyticsProps) {
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

  // Format date to readable format
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Process orders to create trades
  const processOrdersToTrades = (orders: Order[]): Trade[] => {
    // Only process executed orders
    const executedOrders = orders.filter(order => order.status === 'EXECUTED');
    
    // Separate buy and sell orders
    const buyOrders = executedOrders.filter(order => order.type === 'BUY');
    const sellOrders = executedOrders.filter(order => order.type === 'SELL');
    
    // Create a map to track holdings
    const holdings: Record<string, {
      quantity: number;
      totalCost: number;
      orders: Order[];
    }> = {};
    
    // Process buy orders
    buyOrders.forEach(order => {
      if (!holdings[order.symbol]) {
        holdings[order.symbol] = {
          quantity: 0,
          totalCost: 0,
          orders: []
        };
      }
      
      holdings[order.symbol].quantity += order.quantity;
      holdings[order.symbol].totalCost += (order.executedPrice || order.price) * order.quantity;
      holdings[order.symbol].orders.push({...order}); // Create a copy to avoid modifying original
    });
    
    // Process sell orders and create trades
    const trades: Trade[] = [];
    
    sellOrders.forEach(sellOrder => {
      if (!holdings[sellOrder.symbol] || holdings[sellOrder.symbol].quantity === 0) {
        return; // Skip if no holdings
      }
      
      const holding = holdings[sellOrder.symbol];
      let remainingQuantity = sellOrder.quantity;
      
      // Find matching buy orders (FIFO - First In, First Out)
      for (let i = 0; i < holding.orders.length && remainingQuantity > 0; i++) {
        const buyOrder = holding.orders[i];
        const tradeQuantity = Math.min(remainingQuantity, buyOrder.quantity);
        
        // Calculate profit/loss
        const buyPrice = buyOrder.executedPrice || buyOrder.price;
        const sellPrice = sellOrder.executedPrice || sellOrder.price;
        const buyValue = buyPrice * tradeQuantity;
        const sellValue = sellPrice * tradeQuantity;
        const profitLoss = sellValue - buyValue;
        const profitLossPercentage = (profitLoss / buyValue) * 100;
        
        // Add trade
        trades.push({
          symbol: sellOrder.symbol,
          name: sellOrder.name,
          buyPrice,
          buyDate: buyOrder.executedAt || buyOrder.timestamp,
          sellPrice,
          sellDate: sellOrder.executedAt || sellOrder.timestamp,
          quantity: tradeQuantity,
          profitLoss,
          profitLossPercentage,
          status: 'CLOSED'
        });
        
        // Update holding
        holding.quantity -= tradeQuantity;
        holding.totalCost -= buyPrice * tradeQuantity;
        buyOrder.quantity -= tradeQuantity;
        remainingQuantity -= tradeQuantity;
        
        // Remove buy order if fully used
        if (buyOrder.quantity === 0) {
          holding.orders.splice(i, 1);
          i--;
        }
      }
    });
    
    // Add remaining holdings as open trades
    Object.entries(holdings).forEach(([symbol, holding]) => {
      if (holding.quantity > 0) {
        const averagePrice = holding.totalCost / holding.quantity;
        
        // Find the earliest buy date
        const buyDate = holding.orders.reduce((earliest, order) => {
          const orderDate = new Date(order.executedAt || order.timestamp);
          const earliestDate = new Date(earliest.executedAt || earliest.timestamp);
          return orderDate < earliestDate ? order : earliest;
        }, holding.orders[0]);
        
        trades.push({
          symbol,
          name: holding.orders[0]?.name || symbol,
          buyPrice: averagePrice,
          buyDate: buyDate.executedAt || buyDate.timestamp,
          quantity: holding.quantity,
          status: 'OPEN'
        });
      }
    });
    
    return trades;
  };
  
  // Get trades from orders
  const trades = processOrdersToTrades(orders);
  
  // Calculate additional metrics
  const profitableTrades = trades.filter(trade => trade.profitLoss && trade.profitLoss > 0).length;
  const lossTrades = trades.filter(trade => trade.profitLoss && trade.profitLoss < 0).length;
  const breakevenTrades = trades.filter(trade => trade.profitLoss === 0).length;
  
  // Calculate total profit and loss
  const totalProfit = trades.reduce((sum, trade) => {
    if (trade.profitLoss && trade.profitLoss > 0) {
      return sum + trade.profitLoss;
    }
    return sum;
  }, 0);
  
  const totalLoss = Math.abs(trades.reduce((sum, trade) => {
    if (trade.profitLoss && trade.profitLoss < 0) {
      return sum + trade.profitLoss;
    }
    return sum;
  }, 0));
  
  // Calculate average profit and loss
  const averageProfit = profitableTrades > 0 ? totalProfit / profitableTrades : 0;
  const averageLoss = lossTrades > 0 ? totalLoss / lossTrades : 0;
  
  // Calculate profit factor
  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;
  
  // Calculate total P&L from trades
  const calculatedTotalPnL = trades.reduce((sum, trade) => {
    return sum + (trade.profitLoss || 0);
  }, 0);
  
  // Use calculated P&L instead of the one from tradingStats
  const totalPnL = calculatedTotalPnL;
  
  // Calculate win rate
  const closedTrades = trades.filter(trade => trade.status === 'CLOSED');
  const winRate = closedTrades.length > 0 ? (profitableTrades / closedTrades.length) * 100 : 0;
  
  // Calculate best and worst trades from trade history
  const closedTradesWithPnL = trades.filter(trade => 
    trade.status === 'CLOSED' && trade.profitLossPercentage !== undefined
  );
  
  const bestTrade = closedTradesWithPnL.length > 0 
    ? closedTradesWithPnL.reduce((best, trade) => 
        (trade.profitLossPercentage || 0) > (best.profitLossPercentage || 0) ? trade : best
      )
    : null;
      
  const worstTrade = closedTradesWithPnL.length > 0 
    ? closedTradesWithPnL.reduce((worst, trade) => 
        (trade.profitLossPercentage || 0) < (worst.profitLossPercentage || 0) ? trade : worst
      )
    : null;
  
  // Calculate average holding period for closed trades
  const calculateAverageHoldingPeriod = () => {
    const closedTradesWithDates = trades.filter(trade => 
      trade.status === 'CLOSED' && trade.buyDate && trade.sellDate
    );
    
    if (closedTradesWithDates.length === 0) return 0;
    
    const totalDays = closedTradesWithDates.reduce((sum, trade) => {
      const buyDate = new Date(trade.buyDate);
      const sellDate = new Date(trade.sellDate!);
      const days = Math.floor((sellDate.getTime() - buyDate.getTime()) / (1000 * 60 * 60 * 24));
      return sum + days;
    }, 0);
    
    return totalDays / closedTradesWithDates.length;
  };
  
  const averageHoldingPeriod = calculateAverageHoldingPeriod();
  
  // Calculate largest win and largest loss
  const largestWin = profitableTrades > 0 
    ? Math.max(...trades.filter(t => t.profitLoss && t.profitLoss > 0).map(t => t.profitLoss || 0))
    : 0;
    
  const largestLoss = lossTrades > 0 
    ? Math.min(...trades.filter(t => t.profitLoss && t.profitLoss < 0).map(t => t.profitLoss || 0))
    : 0;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Trading Analytics</CardTitle>
            <CardDescription>Your trading performance and trade history</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center items-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Best and Worst Trades */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Best Performing Trade
            </CardTitle>
          </CardHeader>
          <CardContent>
            {bestTrade ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Symbol</span>
                  <span>{bestTrade.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Profit</span>
                  <span className="text-green-600 font-medium">
                    {formatCurrency(bestTrade.profitLoss || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Profit %</span>
                  <span className="text-green-600 font-medium">
                    {formatPercentage(bestTrade.profitLossPercentage || 0)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No profitable trades yet</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingDown className="h-5 w-5 text-red-600" />
              Worst Performing Trade
            </CardTitle>
          </CardHeader>
          <CardContent>
            {worstTrade ? (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Symbol</span>
                  <span>{worstTrade.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Loss</span>
                  <span className="text-red-600 font-medium">
                    {formatCurrency(worstTrade.profitLoss || 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Loss %</span>
                  <span className="text-red-600 font-medium">
                    {formatPercentage(worstTrade.profitLossPercentage || 0)}
                  </span>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">No losing trades yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trade History Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Trade History
          </CardTitle>
          <CardDescription>Your complete trading history with profit/loss calculations</CardDescription>
        </CardHeader>
        <CardContent>
          {trades.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No trades yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Start trading to see your trade history here
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Symbol</th>
                    <th className="text-left py-3 px-4">Name</th>
                    <th className="text-right py-3 px-4">Buy Price</th>
                    <th className="text-right py-3 px-4">Sell Price</th>
                    <th className="text-right py-3 px-4">Quantity</th>
                    <th className="text-right py-3 px-4">P&L</th>
                    <th className="text-right py-3 px-4">P&L %</th>
                    <th className="text-left py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.map((trade, index) => (
                    <tr key={index} className="border-b hover:bg-muted/50">
                      <td className="py-3 px-4 font-medium">{trade.symbol}</td>
                      <td className="py-3 px-4">{trade.name}</td>
                      <td className="py-3 px-4 text-right">{formatCurrency(trade.buyPrice)}</td>
                      <td className="py-3 px-4 text-right">
                        {trade.sellPrice ? formatCurrency(trade.sellPrice) : '-'}
                      </td>
                      <td className="py-3 px-4 text-right">{trade.quantity}</td>
                      <td className={`py-3 px-4 text-right font-medium ${
                        trade.profitLoss && trade.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {trade.profitLoss !== undefined ? formatCurrency(trade.profitLoss) : '-'}
                      </td>
                      <td className={`py-3 px-4 text-right font-medium ${
                        trade.profitLossPercentage && trade.profitLossPercentage >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {trade.profitLossPercentage !== undefined ? formatPercentage(trade.profitLossPercentage) : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={trade.status === 'CLOSED' ? 'default' : 'secondary'}>
                          {trade.status === 'CLOSED' ? 'Closed' : 'Open'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Trading Metrics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PieChart className="h-5 w-5" />
            Trading Metrics
          </CardTitle>
          <CardDescription>Additional insights into your trading performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Win Rate</span>
                <span className="font-medium">{formatPercentage(winRate)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Profit Factor</span>
                <span className="font-medium">
                  {profitFactor === Infinity ? '∞' : profitFactor.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Average Holding Period</span>
                <span className="font-medium">{averageHoldingPeriod.toFixed(1)} days</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Profitable Trades</span>
                <span className="font-medium">{profitableTrades}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Loss Trades</span>
                <span className="font-medium">{lossTrades}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Breakeven Trades</span>
                <span className="font-medium">{breakevenTrades}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Largest Win</span>
                <span className="font-medium text-green-600">{formatCurrency(largestWin)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Largest Loss</span>
                <span className="font-medium text-red-600">{formatCurrency(largestLoss)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Total Volume</span>
                <span className="font-medium">{tradingStats.totalVolume}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}