// components/dashboard/dashboard-widgets.tsx
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, DollarSign, Target, Download, Plus, Eye, AlertTriangle, AlertCircle, CheckCircle } from "lucide-react"
import { exportFinancialReport } from "@/lib/excel-export"
import { PaperTrading } from "@/lib/stock-data"
import { useTransactions } from "@/lib/transactions-context"
import { useBudget } from "@/lib/budget-context"
import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { profileAPI, transactionAPI } from "@/lib/api-service" // Added transactionAPI
import { useRouter } from "next/navigation"

interface WidgetProps {
  id: string
  title: string
  description?: string
  children: React.ReactNode
  className?: string
}

export function Widget({ id, title, description, children, className = "" }: WidgetProps) {
  return (
    <Card className={`h-full ${className}`} data-widget-id={id}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

interface FinancialData {
  totalIncome: number
  totalExpenses: number
  netSavings: number
  savingsRate: number
}

interface DashboardData {
  summary: {
    totalIncome: number
    totalExpenses: number
    netSavings: number
    savingsRate: number
    portfolioValue: number
    changes: {
      income: number
      expenses: number
      savingsRate: number
      portfolio: number
    }
  }
}

export function SummaryCardsWidget() {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  
  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
        
        // Fetch from dashboard endpoint which includes month-over-month comparisons
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        const response = await fetch('/api/v1/users/dashboard', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
        
        if (!response.ok) {
          throw new Error('Failed to fetch dashboard data')
        }
        
        const data = await response.json()
        setDashboardData(data.data)
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to fetch financial summary.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [toast])
  
  // Use real data if available, otherwise use default values
  const totalIncome = dashboardData?.summary.totalIncome || 0
  const totalExpenses = dashboardData?.summary.totalExpenses || 0
  const savingsRate = dashboardData?.summary.savingsRate || 0
  const portfolioValue = dashboardData?.summary.portfolioValue || 0
  
  // Get percentage changes from API
  const incomeChange = dashboardData?.summary.changes.income || 0
  const expensesChange = dashboardData?.summary.changes.expenses || 0
  const savingsRateChange = dashboardData?.summary.changes.savingsRate || 0
  const portfolioChange = dashboardData?.summary.changes.portfolio || 0
  
  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : ''
    return `${sign}${change.toFixed(1)}%`
  }
  
  const summaryData = [
    {
      title: "Total Income",
      value: loading ? "Loading..." : `₹${totalIncome.toLocaleString()}`,
      change: formatChange(incomeChange),
      changeType: incomeChange >= 0 ? "positive" as const : "negative" as const,
      icon: TrendingUp,
    },
    {
      title: "Total Expenses",
      value: loading ? "Loading..." : `₹${totalExpenses.toLocaleString()}`,
      change: formatChange(expensesChange),
      changeType: expensesChange <= 0 ? "positive" as const : "negative" as const, // Lower expenses is positive
      icon: TrendingDown,
    },
    {
      title: "Portfolio Value",
      value: portfolioValue >= 100000 
        ? `₹${(portfolioValue / 100000).toFixed(1)}L`
        : `₹${portfolioValue.toLocaleString()}`,
      change: formatChange(portfolioChange),
      changeType: portfolioChange >= 0 ? "positive" as const : "negative" as const,
      icon: DollarSign,
    },
    {
      title: "Savings Rate",
      value: loading ? "Loading..." : `${savingsRate.toFixed(1)}%`,
      change: formatChange(savingsRateChange),
      changeType: savingsRateChange >= 0 ? "positive" as const : "negative" as const,
      icon: Target,
    },
  ]

  return (
    <Widget id="summary-cards" title="Financial Summary" description="Your key financial metrics">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {summaryData.map((item, index) => (
          <div key={index} className="p-4 rounded-lg bg-muted/50">
            <div className="flex items-center justify-between mb-2">
              <item.icon className="h-5 w-5 text-blue-600" />
              <Badge 
                variant={item.changeType === "positive" ? "default" : "destructive"}
                className="text-xs"
              >
                {item.change}
              </Badge>
            </div>
            <p className="text-2xl font-bold">{item.value}</p>
            <p className="text-sm text-muted-foreground">{item.title}</p>
          </div>
        ))}
      </div>
    </Widget>
  )
}

// The rest of the file remains unchanged
export function RecentTransactionsWidget() {
  const { transactions, loading, error } = useTransactions()
  const router = useRouter()

  // Function to format date and time in Indian Standard Time (IST)
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    
    // Convert to IST (UTC+5:30)
    const istOffset = 5.5 * 60; // 5 hours 30 minutes in minutes
    const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000); // Convert to UTC
    const istTime = new Date(utcTime + (istOffset * 60000)); // Add IST offset
    
    // Format date as "15 Jan, 2024" (Indian format)
    const formattedDate = istTime.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
    
    // Format time as "10:30 PM" (12-hour format)
    const formattedTime = istTime.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    return { date: formattedDate, time: formattedTime };
  };

  // Get the 5 most recent transactions or use mock data if none available
  const recentTransactions = transactions.slice(0, 5) || [
    { id: 1, description: "Salary Credit", amount: 85000, type: "income", date: "2024-01-15" },
    { id: 2, description: "Grocery Shopping", amount: -2500, type: "expense", date: "2024-01-14" },
    { id: 3, description: "Electricity Bill", amount: -1200, type: "expense", date: "2024-01-13" },
    { id: 4, description: "Freelance Payment", amount: 15000, type: "income", date: "2024-01-12" },
    { id: 5, description: "Restaurant", amount: -800, type: "expense", date: "2024-01-11" },
  ]

  return (
    <Widget id="recent-transactions" title="Recent Transactions" description="Your latest financial activities">
      <div className="space-y-3">
        {loading ? (
          // Show loading skeleton
          Array(5).fill(0).map((_, index) => (
            <div key={`transaction-skeleton-${index}`} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 animate-pulse">
              <div className="min-w-0 flex-1">
                <div className="h-4 w-32 bg-gray-300 rounded mb-1"></div>
                <div className="h-3 w-20 bg-gray-200 rounded"></div>
              </div>
              <div className="h-4 w-16 bg-gray-300 rounded ml-2"></div>
            </div>
          ))
        ) : (
          recentTransactions.map((transaction) => {
            const { date, time } = formatDateTime(transaction.date);
            return (
              <div key={`transaction-${transaction._id}`} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{transaction.description}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-muted-foreground">{date}</p>
                    <p className="text-xs text-muted-foreground">•</p>
                    <p className="text-xs text-muted-foreground">{time}</p>
                  </div>
                </div>
                <p className={`font-semibold ml-2 ${transaction.type === "income" ? "text-green-600" : "text-red-600"}`}>
                  {transaction.type === "income" ? "+" : ""}₹{Math.abs(transaction.amount).toLocaleString('en-IN')}
                </p>
              </div>
            );
          })
        )}
        <Button variant="outline" className="w-full mt-4" onClick={() => router.push('/transactions')}>
          <Eye className="h-4 w-4 mr-2" />
          View All Transactions
        </Button>
      </div>
    </Widget>
  )
}

export function BudgetOverviewWidget() {
  const { budgets, loading, error } = useBudget()
  const { transactions } = useTransactions()
  const router = useRouter()
  
  // Function to calculate spent amount for a budget
  const getSpentAmount = (category: string, period: string, startDate: string) => {
    if (!Array.isArray(transactions) || !category || !period || !startDate) {
      return 0
    }
    
    let start = new Date(startDate)
    let end = new Date()
    
    // Set end date based on budget period
    switch (period) {
      case 'daily':
        // Today only
        end.setHours(23, 59, 59, 999)
        break
      case 'weekly':
        // Current week starting from the budget's start date
        const daysSinceStart = Math.floor((new Date().getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
        const weeksSinceStart = Math.floor(daysSinceStart / 7)
        const weekStart = new Date(start)
        weekStart.setDate(start.getDate() + (weeksSinceStart * 7))
        end = new Date(weekStart)
        end.setDate(weekStart.getDate() + 6)
        end.setHours(23, 59, 59, 999)
        break
      case 'monthly':
        // Current month
        end = new Date(start.getFullYear(), start.getMonth() + 1, 0)
        end.setHours(23, 59, 59, 999)
        break
      case 'yearly':
        // Current year
        end = new Date(start.getFullYear(), 11, 31)
        end.setHours(23, 59, 59, 999)
        break
      default:
        // Default to current date
        break
    }
    
    // Filter transactions by category and date range
    return transactions
      .filter(
        (transaction) =>
          transaction &&
          transaction.type === "expense" &&
          transaction.category === category &&
          transaction.date &&
          new Date(transaction.date) >= start &&
          new Date(transaction.date) <= end
      )
      .reduce((total, transaction) => total + (transaction?.amount || 0), 0)
  }

  // Helper function to check if a date is within a budget's active period
  const isDateWithinBudgetPeriod = (date: Date, budgetStartDate: Date, budgetEndDate?: Date) => {
    // Normalize dates to avoid timezone issues
    const normalizedDate = new Date(date.toISOString().split('T')[0]);
    const normalizedStartDate = new Date(budgetStartDate.toISOString().split('T')[0]);
    
    if (budgetEndDate) {
      const normalizedEndDate = new Date(budgetEndDate.toISOString().split('T')[0]);
      return normalizedDate >= normalizedStartDate && normalizedDate <= normalizedEndDate;
    }
    
    return normalizedDate >= normalizedStartDate;
  }

  // Get applicable budgets based on their period
  const getApplicableBudgets = () => {
    if (!Array.isArray(budgets)) {
      console.warn("Budgets is not an array:", budgets);
      return [];
    }
    
    const currentDate = new Date();
    return budgets.filter(budget => {
      // Skip budgets with zero amount
      if (budget.totalAmount === 0) {
        return false;
      }
      
      // More flexible status check
      if (budget.status && budget.status !== 'active') return false;
      
      // Check both period and frequency for compatibility
      const period = budget.period || (budget as any).frequency;
      if (!period || !['daily', 'weekly', 'monthly', 'yearly'].includes(period)) {
        console.warn(`Budget ${budget._id} has invalid period:`, period);
        return false;
      }
      
      // Check if budget is within its active period
      try {
        const startDate = new Date(budget.startDate);
        const endDate = budget.endDate ? new Date(budget.endDate) : undefined;
        
        return isDateWithinBudgetPeriod(currentDate, startDate, endDate);
      } catch (error) {
        console.error(`Error processing dates for budget ${budget._id}:`, error);
        return false;
      }
    });
  }

  const getBudgetStatus = (spent: number, budget: number) => {
    const percentage = (spent / budget) * 100
    if (percentage >= 100) return { status: "over", color: "text-red-600", icon: AlertTriangle }
    if (percentage >= 80) return { status: "warning", color: "text-yellow-600", icon: AlertCircle }
    return { status: "good", color: "text-green-600", icon: CheckCircle }
  }

  // Get display name for budget period
  const getPeriodDisplayName = (period: string) => {
    switch (period) {
      case 'daily': return 'Daily'
      case 'weekly': return 'Weekly'
      case 'monthly': return 'Monthly'
      case 'yearly': return 'Yearly'
      default: return 'Custom'
    }
  }

  // Format budget data or use mock data if none available
  const budgetData = getApplicableBudgets().map(budget => {
    const period = budget.period || (budget as any).frequency
    const spent = getSpentAmount(budget.category, period, budget.startDate)
    const budgetAmount = budget.totalAmount || (budget as any).amount || 0
    const percentage = Math.min((spent / budgetAmount) * 100, 100)
    const remaining = Math.max(budgetAmount - spent, 0)
    const { status, color, icon: StatusIcon } = getBudgetStatus(spent, budgetAmount)

    return {
      id: budget._id,
      category: budget.category,
      budgeted: budgetAmount,
      spent: spent,
      percentage: percentage,
      remaining: remaining,
      status: status,
      color: color,
      icon: StatusIcon,
      period: period,
      startDate: budget.startDate,
      endDate: budget.endDate
    }
  })

  return (
    <Widget id="budget-overview" title="Budget Overview" description="Your spending vs budget this month">
      <div className="space-y-6">
        {loading ? (
          // Show loading skeleton
          Array(5).fill(0).map((_, index) => (
            <div key={`budget-skeleton-${index}`} className="space-y-3 border rounded-lg p-4 animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-24 bg-gray-300 rounded"></div>
                    <div className="h-4 w-12 bg-gray-300 rounded"></div>
                  </div>
                  <div className="h-3 w-32 bg-gray-200 rounded mt-1"></div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-6 w-10 bg-gray-300 rounded"></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-2 bg-gray-200 rounded"></div>
                <div className="flex justify-between text-sm">
                  <div className="h-3 w-24 bg-gray-200 rounded"></div>
                  <div className="h-3 w-24 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ))
        ) : budgetData.length > 0 ? (
          budgetData.map((item) => (
            <div key={`budget-${item.id}`} className="space-y-3 border rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{item.category}</h3>
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                    <Badge variant="outline" className="capitalize">
                      {getPeriodDisplayName(item.period)}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(item.startDate).toLocaleDateString()}
                    {item.endDate && ` - ${new Date(item.endDate).toLocaleDateString()}`}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant={item.status === "over" ? "destructive" : item.status === "warning" ? "secondary" : "default"}
                  >
                    {item.percentage.toFixed(0)}%
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                <Progress value={item.percentage} className="h-2" />
                <div className="flex justify-between text-sm text-muted-foreground">
                  <span>
                    Spent: ₹{item.spent.toLocaleString('en-IN')} / ₹{item.budgeted.toLocaleString('en-IN')}
                  </span>
                  <span className={item.remaining > 0 ? "text-green-600" : "text-red-600"}>
                    {item.remaining > 0
                      ? `₹${item.remaining.toLocaleString('en-IN')} left`
                      : `₹${Math.abs(item.remaining).toLocaleString('en-IN')} over`}
                  </span>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No active budgets found.</p>
            <p className="text-sm text-muted-foreground mt-1">Create a budget to start tracking your spending.</p>
          </div>
        )}
        <Button variant="outline" className="w-full mt-4" onClick={() => router.push('/budget')}>
          <Target className="h-4 w-4 mr-2" />
          Manage Budget
        </Button>
      </div>
    </Widget>
  )
}

interface Activity {
  action: string
  time: string
}

export function NotificationsWidget() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const fetchActivities = async () => {
      try {
        setLoading(true)
        const response = await profileAPI.getActivities()
        
        // Use the data directly from the response
        setActivities(response.data)
      } catch (err) {
        toast({
          title: "Error",
          description: "Failed to fetch notifications.",
          variant: "destructive",
        })
        
        // Set empty array on error instead of mock data
        setActivities([])
      } finally {
        setLoading(false)
      }
    }

    fetchActivities()
  }, [toast])

  return (
    <Widget id="notifications" title="Notifications" description="Important updates and alerts">
      <div className="space-y-3">
        {loading ? (
          // Show loading skeleton
          Array(5).fill(0).map((_, index) => (
            <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/30 animate-pulse">
              <div className="min-w-0 flex-1">
                <div className="h-4 w-48 bg-gray-300 rounded mb-1"></div>
                <div className="h-3 w-24 bg-gray-200 rounded"></div>
              </div>
            </div>
          ))
        ) : activities.length > 0 ? (
          // Show only the first 5 activities
          activities.slice(0, 5).map((activity, index) => (
            <div key={`activity-${(activity as any).id || index}`} className="flex items-start p-3 rounded-lg bg-muted/30">
              <div className="min-w-0 flex-1">
                <p className="text-sm">{activity.action}</p>
                <p className="text-xs text-muted-foreground">{activity.time}</p>
              </div>
            </div>
          ))
        ) : (
          // Show empty state when no activities
          <div className="text-center py-4 text-muted-foreground">
            No notifications available
          </div>
        )}
        <Button variant="outline" className="w-full mt-4" onClick={() => router.push('/notifications')}>
          View All Notifications
        </Button>
      </div>
    </Widget>
  )
}

export function QuickActionsWidget() {
  const router = useRouter()
  const { toast } = useToast()
  
  const handleExportReport = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      
      if (!token) {
        toast({
          title: "Error",
          description: "Please login to export reports",
          variant: "destructive",
        })
        return
      }
      
      // Fetch real dashboard data
      const response = await fetch('/api/v1/users/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data')
      }
      
      const dashboardData = await response.json()
      
      // Properly format data for export
      const exportData = {
        summary: {
          totalIncome: dashboardData.data?.summary?.totalIncome || 0,
          totalExpenses: dashboardData.data?.summary?.totalExpenses || 0,
          netSavings: dashboardData.data?.summary?.netSavings || 0,
          savingsRate: dashboardData.data?.summary?.savingsRate || 0,
          portfolioValue: dashboardData.data?.summary?.portfolioValue || 0,
        },
        transactions: (dashboardData.data?.recentTransactions || []).map((t: any) => ({
          date: t.date,
          description: t.description,
          category: t.category,
          amount: t.amount,
          type: t.type,
        })),
        budgets: (dashboardData.data?.activeBudgets || []).map((b: any) => ({
          category: b.category,
          budgetedAmount: b.totalAmount || b.amount || 0,
          actualAmount: b.spent || 0,
        })),
        goals: (dashboardData.data?.activeGoals || []).map((g: any) => ({
          name: g.name || g.title,
          targetAmount: g.targetAmount || g.target || 0,
          currentAmount: g.currentAmount || g.saved || 0,
          progress: g.progress || 0,
          targetDate: g.targetDate || g.deadline,
        }))
      }
      
      exportFinancialReport(exportData)
      
      toast({
        title: "Success",
        description: "Financial report exported successfully",
      })
    } catch (err) {
      console.error('Export error:', err)
      toast({
        title: "Error",
        description: "Failed to export report. Please try again.",
        variant: "destructive",
      })
    }
  }

  return (
    <Widget id="quick-actions" title="Quick Actions" description="Common tasks and shortcuts">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Button variant="outline" className="h-20 flex flex-col" onClick={() => router.push('/transactions')}>
          <Plus className="h-5 w-5 mb-1" />
          <span className="text-xs">Add Transaction</span>
        </Button>
        <Button variant="outline" className="h-20 flex flex-col" onClick={() => router.push('/budget')}>
          <Target className="h-5 w-5 mb-1" />
          <span className="text-xs">Set Budget</span>
        </Button>
        <Button variant="outline" className="h-20 flex flex-col" onClick={handleExportReport}>
          <Download className="h-5 w-5 mb-1" />
          <span className="text-xs">Export Report</span>
        </Button>
        <Button variant="outline" className="h-20 flex flex-col" onClick={() => router.push('/analysis')}>
          <Eye className="h-5 w-5 mb-1" />
          <span className="text-xs">View Analysis</span>
        </Button>
      </div>
    </Widget>
  )
}

export function PortfolioWidget() {
  const [portfolioData, setPortfolioData] = useState<{
    totalValue: number
    totalPnL: number
    holdings: Array<{ symbol: string; quantity: number; marketValue: number; unrealizedPnL: number; pnlPercentage: number }>
  }>({
    totalValue: 0,
    totalPnL: 0,
    holdings: []
  })
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const router = useRouter()

  useEffect(() => {
    const fetchPortfolioData = async () => {
      try {
        setLoading(true)
        const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
        
        // Fetch trading account data
        const response = await fetch('/api/v1/trading/account', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        })
        
        if (!response.ok) {
          throw new Error('Failed to fetch portfolio data')
        }
        
        const data = await response.json()
        
        if (data.success && data.data && data.data.tradingAccount) {
          const account = data.data.tradingAccount
          setPortfolioData({
            totalValue: account.totalValue || 0,
            totalPnL: account.totalPnL || 0,
            holdings: account.holdings || []
          })
        }
      } catch (err) {
        console.error('Failed to fetch portfolio data:', err)
        // Don't show toast for missing trading account as it's optional
        setPortfolioData({
          totalValue: 0,
          totalPnL: 0,
          holdings: []
        })
      } finally {
        setLoading(false)
      }
    }

    fetchPortfolioData()
  }, [toast])

  const { totalValue, totalPnL, holdings } = portfolioData

  return (
    <Widget id="portfolio" title="Portfolio Overview" description="Your stock holdings and performance">
      <div className="space-y-4">
        {loading ? (
          <div className="text-center p-4 rounded-lg bg-muted/50 animate-pulse">
            <div className="h-8 w-24 bg-gray-300 rounded mx-auto mb-2"></div>
            <div className="h-4 w-20 bg-gray-200 rounded mx-auto mb-1"></div>
            <div className="h-4 w-24 bg-gray-200 rounded mx-auto"></div>
          </div>
        ) : (
          <div className="text-center p-4 rounded-lg bg-muted/50">
            <p className="text-2xl font-bold">
              {totalValue >= 100000 
                ? `₹${(totalValue / 100000).toFixed(1)}L`
                : `₹${totalValue.toLocaleString('en-IN')}`}
            </p>
            <p className="text-sm text-muted-foreground">Total Value</p>
            <p className={`text-sm font-medium ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalPnL >= 0 ? '+' : ''}₹{Math.abs(totalPnL).toLocaleString('en-IN')} P&L
            </p>
          </div>
        )}
        
        <div className="space-y-2">
          {loading ? (
            Array(3).fill(0).map((_, index) => (
              <div key={`holding-skeleton-${index}`} className="flex items-center justify-between p-2 rounded-lg bg-muted/30 animate-pulse">
                <div className="min-w-0 flex-1">
                  <div className="h-4 w-20 bg-gray-300 rounded mb-1"></div>
                  <div className="h-3 w-16 bg-gray-200 rounded"></div>
                </div>
                <div className="text-right ml-2">
                  <div className="h-4 w-16 bg-gray-300 rounded mb-1"></div>
                  <div className="h-3 w-12 bg-gray-200 rounded"></div>
                </div>
              </div>
            ))
          ) : holdings.length > 0 ? (
            holdings.slice(0, 3).map((holding) => (
              <div key={holding.symbol} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-sm truncate">{holding.symbol}</p>
                  <p className="text-xs text-muted-foreground">{holding.quantity} shares</p>
                </div>
                <div className="text-right ml-2">
                  <p className="font-medium text-sm">₹{holding.marketValue.toLocaleString('en-IN')}</p>
                  <p className={`text-xs ${holding.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {holding.pnlPercentage >= 0 ? '+' : ''}{holding.pnlPercentage.toFixed(1)}%
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-4 text-muted-foreground">
              No holdings found
            </div>
          )}
        </div>
        
        <Button variant="outline" className="w-full" onClick={() => router.push('/trading')}>
          <TrendingUp className="h-4 w-4 mr-2" />
          View Full Portfolio
        </Button>
      </div>
    </Widget>
  )
}

// Widget registry without Financial Goals
export const WIDGET_TYPES = {
  'summary-cards': SummaryCardsWidget,
  'recent-transactions': RecentTransactionsWidget,
  'budget-overview': BudgetOverviewWidget,
  'notifications': NotificationsWidget,
  'quick-actions': QuickActionsWidget,
  'portfolio': PortfolioWidget,
} as const

export type WidgetType = keyof typeof WIDGET_TYPES