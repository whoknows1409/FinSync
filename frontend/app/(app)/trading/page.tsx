// app/(app)/trading/page.tsx
"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import TradingAccountSummary from "@/components/trading/TradingAccountSummary"
import TradingPortfolio from "@/components/trading/TradingPortfolio"
import TradingOrderForm from "@/components/trading/TradingOrderForm"
import TradingOrderHistory from "@/components/trading/TradingOrderHistory"
import TradingAnalytics from "@/components/trading/TradingAnalytics"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, DollarSign } from "lucide-react"
import { toast } from "sonner"
import { 
  getTradingAccount, 
  getHoldings, 
  getOrders, 
  getTradingStats 
} from "@/lib/stock-api"

interface Holding {
  symbol: string
  name: string
  quantity: number
  averagePrice: number
  currentPrice: number
  marketValue: number
  unrealizedPnL: number
  pnlPercentage: number
  sector: string
}

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

interface SectorAllocation {
  sector: string
  value: number
  percentage: number
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
  sectorAllocation: SectorAllocation[]
}

export default function TradingPage() {
  const [activeTab, setActiveTab] = useState("portfolio")
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [accountData, setAccountData] = useState<any>(null)
  const [holdings, setHoldings] = useState<Holding[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [sectorAllocation, setSectorAllocation] = useState<SectorAllocation[]>([])
  const [tradingStats, setTradingStats] = useState<TradingStats>({
    totalTrades: 0,
    winRate: 0,
    totalPnL: 0,
    portfolioValue: 0,
    bestTrade: null,
    worstTrade: null,
    averageHoldingTime: 0,
    totalVolume: 0,
    sectorAllocation: []
  })
  
  // Use refs to prevent multiple concurrent requests and track state
  const isFetchingRef = useRef(false)
  const isMountedRef = useRef(true)
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Format currency to 2 decimal places
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  // Calculate P&L from orders
  const calculatePnLFromOrders = useCallback((orders: Order[]) => {
    // Ensure orders is an array
    if (!Array.isArray(orders)) {
      console.error('orders is not an array:', orders);
      return 0;
    }
    
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
    
    // Process sell orders and calculate P&L
    let totalPnL = 0;
    
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
        
        totalPnL += profitLoss;
        
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
    
    return totalPnL;
  }, []);

  // Calculate profit and loss separately
  const calculateProfitAndLoss = useCallback((orders: Order[]) => {
    // Ensure orders is an array
    if (!Array.isArray(orders)) {
      console.error('orders is not an array:', orders);
      return { totalProfit: 0, totalLoss: 0 };
    }
    
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
    
    // Process sell orders and calculate P&L
    let totalProfit = 0;
    let totalLoss = 0;
    
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
        
        if (profitLoss > 0) {
          totalProfit += profitLoss;
        } else {
          totalLoss += Math.abs(profitLoss);
        }
        
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
    
    return { totalProfit, totalLoss };
  }, []);

  // Memoized fetch function to prevent recreation
  const fetchTradingData = useCallback(async () => {
    // Clear any existing timeout
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current)
    }

    // Prevent multiple concurrent requests
    if (isFetchingRef.current) {
      return
    }
    
    // Check if component is still mounted
    if (!isMountedRef.current) {
      return
    }
    
    isFetchingRef.current = true
    setIsLoading(true)
    
    try {
      // Fetch account data
      const tradingAccountResponse = await getTradingAccount()
      if (isMountedRef.current) {
        setAccountData(tradingAccountResponse.data?.tradingAccount || tradingAccountResponse.tradingAccount)
      }

      // Fetch holdings
      const holdingsResponse = await getHoldings()
      if (isMountedRef.current) {
        const hr: any = holdingsResponse as any
        const normalizedHoldings = Array.isArray(hr) ? hr : (hr?.data?.holdings ?? hr?.holdings ?? [])
        setHoldings(normalizedHoldings as Holding[])
      }

      // Fetch orders
      const ordersResponse = await getOrders()
      if (isMountedRef.current) {
        const orr: any = ordersResponse as any
        const normalizedOrders = Array.isArray(orr) ? orr : (orr?.data?.orders ?? orr?.orders ?? [])
        setOrders(normalizedOrders as Order[])
      }

      // Fetch portfolio allocation
      try {
        const allocationResponse = await fetch('/api/v1/trading/portfolio-allocation', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })

        if (allocationResponse.ok && isMountedRef.current) {
          const allocationData = await allocationResponse.json()
          setSectorAllocation(allocationData.data?.allocation || allocationData || [])
        } else {
          console.error('Failed to fetch portfolio allocation data')
          if (isMountedRef.current) setSectorAllocation([])
        }
      } catch (error) {
        console.error('Error fetching portfolio allocation:', error)
        if (isMountedRef.current) setSectorAllocation([])
      }

      // Fetch trading stats
      try {
        const statsResponse = await getTradingStats()
        if (isMountedRef.current) {
          const sr: any = statsResponse as any
          const normalizedStats = sr?.data ?? sr
          setTradingStats(normalizedStats as TradingStats)
        }
      } catch (error) {
        console.error('Error fetching trading stats:', error)
        // Keep default stats
      }
    } catch (error) {
      console.error('Fetch trading data error:', error)
      if (isMountedRef.current) {
        toast.error('Failed to fetch trading data')
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false)
      }
      isFetchingRef.current = false
    }
  }, [])

  // Add refresh function for holdings
  const refreshHoldings = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const holdingsResponse = await getHoldings();
      const hr: any = holdingsResponse as any;
      const holdingsData = Array.isArray(hr) ? hr : (hr?.data?.holdings ?? hr?.holdings ?? []);
      setHoldings(holdingsData as Holding[]);
      
      // Update account data with new total value
      if (accountData) {
        const holdingsValue = (holdingsData as Holding[]).reduce((sum: number, h: Holding) => sum + h.marketValue, 0);
        const newTotalValue = accountData.walletBalance + holdingsValue;
        setAccountData((prev: any) => ({
          ...prev,
          totalValue: newTotalValue
        }));
      }
    } catch (error) {
      console.error('Error refreshing holdings:', error);
      toast.error('Failed to refresh holdings');
    } finally {
      setIsRefreshing(false);
    }
  }, [accountData]);

  // Effect for initial data fetch
  useEffect(() => {
    isMountedRef.current = true
    
    // Initial fetch with a small delay to ensure everything is ready
    fetchTimeoutRef.current = setTimeout(() => {
      fetchTradingData()
    }, 100)
    
    // Cleanup function
    return () => {
      isMountedRef.current = false
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current)
      }
    }
  }, [fetchTradingData])

  // Debounced handler for order placement
  const handleOrderPlaced = useCallback(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current)
    }
    
    fetchTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current && !isFetchingRef.current) {
        fetchTradingData()
      }
    }, 1000) // Increased debounce time
  }, [fetchTradingData])

  // Debounced handler for order cancellation
  const handleOrderCancelled = useCallback(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current)
    }
    
    fetchTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current && !isFetchingRef.current) {
        fetchTradingData()
      }
    }, 1000) // Increased debounce time
  }, [fetchTradingData])

  // Calculate P&L from orders
  const calculatedPnL = calculatePnLFromOrders(orders);
  const { totalProfit, totalLoss } = calculateProfitAndLoss(orders);

  if (isLoading && !accountData) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex justify-center items-center h-96">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-4 sm:py-6 space-y-4 sm:space-y-6 px-4 sm:px-6">
      <TradingAccountSummary
        walletBalance={accountData?.walletBalance || 0}
        holdingsValue={holdings.reduce((sum, h) => sum + h.marketValue, 0)}
        activeOrders={orders.filter(o => o.status === 'PENDING').length}
        totalTrades={orders.filter(o => o.status === 'EXECUTED').length}
        portfolioValue={accountData?.totalValue || 0}
        totalPnL={calculatedPnL}
        totalProfit={totalProfit}
        totalLoss={totalLoss}
        isLoading={isLoading}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4 sm:space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto sm:h-10">
          <TabsTrigger value="portfolio" className="text-xs sm:text-sm py-2">Portfolio</TabsTrigger>
          <TabsTrigger value="trade" className="text-xs sm:text-sm py-2">Trade</TabsTrigger>
          <TabsTrigger value="orders" className="text-xs sm:text-sm py-2">Orders</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs sm:text-sm py-2">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="portfolio" className="space-y-4 sm:space-y-6">
          <TradingPortfolio 
            holdings={holdings} 
            isLoading={isLoading}
            isRefreshing={isRefreshing}
            onRefresh={refreshHoldings}
          />
        </TabsContent>

        <TabsContent value="trade" className="space-y-4 sm:space-y-6">
          <TradingOrderForm 
            walletBalance={accountData?.walletBalance || 0}
            holdings={holdings} // Pass holdings to the form
            onOrderPlaced={handleOrderPlaced}
          />
        </TabsContent>

        <TabsContent value="orders" className="space-y-4 sm:space-y-6">
          <TradingOrderHistory 
            orders={orders}
            onOrderCancelled={handleOrderCancelled}
            isLoading={isLoading}
          />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4 sm:space-y-6">
          <TradingAnalytics 
            tradingStats={tradingStats}
            orders={orders}
            isLoading={isLoading}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}