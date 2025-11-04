"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useBudget } from "@/lib/budget-context"
import { useTransactions } from "@/lib/transactions-context"
import { useState, useEffect } from "react"
import { Trash2, AlertTriangle, CheckCircle, AlertCircle, Calendar, RefreshCw } from "lucide-react"
import { budgetAPI } from "@/lib/api-service"
import { toast } from "sonner"

export function BudgetOverview() {
  const { budgets, deleteBudget, refreshBudgets, error: contextError, loading } = useBudget()
  const { transactions } = useTransactions()
  const [error, setError] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  // Propagate context errors to component state
  useEffect(() => {
    if (contextError) {
      setError(contextError)
    }
  }, [contextError])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await refreshBudgets()
      toast.success('Budgets refreshed successfully')
    } catch (err) {
      toast.error('Failed to refresh budgets')
    } finally {
      setIsRefreshing(false)
    }
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
        return false;
      }
      
      // Check if budget is within its active period
      try {
        const startDate = new Date(budget.startDate);
        const endDate = budget.endDate ? new Date(budget.endDate) : undefined;
        
        return isDateWithinBudgetPeriod(currentDate, startDate, endDate);
      } catch (error) {
        return false;
      }
    });
  }

  // Calculate spending for each category based on the budget's period
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

  const handleDeleteBudget = async (id: string) => {
    if (window.confirm("Are you sure you want to delete this budget?")) {
      try {
        await deleteBudget(id)
        toast.success('Budget deleted successfully')
      } catch (err) {
        toast.error('Failed to delete budget')
      }
    }
  }

  const handleToggleCarryForward = async (budget: any) => {
    try {
      // Update carry forward setting in the backend
      await budgetAPI.updateBudget(budget._id, {
        isRollover: !budget.isRollover
      })
      
      // Force refresh of budgets to update the UI
      await refreshBudgets()
      toast.success('Carry forward setting updated')
    } catch (error) {
      console.error("Failed to update carry forward setting:", error)
      toast.error('Failed to update carry forward setting')
    }
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

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Budget Overview
            </CardTitle>
            <CardDescription>Track your spending against set budgets</CardDescription>
          </div>
          <Button 
            onClick={handleRefresh} 
            variant="outline" 
            disabled={isRefreshing || loading}
          >
            {isRefreshing ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md">
            {error}
          </div>
        )}
        
        {loading ? (
          <div className="text-center py-8">
            <RefreshCw className="h-12 w-12 text-muted-foreground mx-auto mb-2 animate-spin" />
            <p className="text-muted-foreground">Loading budgets...</p>
          </div>
        ) : getApplicableBudgets().length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No active budgets found.</p>
            <p className="text-sm text-muted-foreground mt-1">Create a budget to start tracking your spending.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {getApplicableBudgets().map((budget) => {
              // Use both 'period' and 'frequency' fields
              const period = budget.period || (budget as any).frequency
              const spent = getSpentAmount(budget.category, period, budget.startDate)
              // Use totalAmount for budgets with the updated schema
              const budgetAmount = budget.totalAmount || (budget as any).amount || 0
              const percentage = Math.min((spent / budgetAmount) * 100, 100)
              const remaining = Math.max(budgetAmount - spent, 0)
              const { status, color, icon: StatusIcon } = getBudgetStatus(spent, budgetAmount)

              return (
                <div key={budget._id} className="space-y-3 border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{budget.category}</h3>
                        <StatusIcon className={`h-4 w-4 ${color}`} />
                        <Badge variant="outline" className="capitalize">
                          {getPeriodDisplayName(period)}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(budget.startDate).toLocaleDateString()}
                        {budget.endDate && ` - ${new Date(budget.endDate).toLocaleDateString()}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={status === "over" ? "destructive" : status === "warning" ? "secondary" : "default"}
                      >
                        {percentage.toFixed(0)}%
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteBudget(budget._id!)}
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Progress value={percentage} className="h-2" />
                    <div className="flex justify-between text-sm text-muted-foreground">
                      <span>
                        Spent: ₹{spent.toLocaleString()} / ₹{budgetAmount.toLocaleString()}
                      </span>
                      <span className={remaining > 0 ? "text-green-600" : "text-red-600"}>
                        {remaining > 0
                          ? `₹${remaining.toLocaleString()} left`
                          : `₹${Math.abs(remaining).toLocaleString()} over`}
                      </span>
                    </div>
                    <div className="flex items-center justify-between space-x-2 mt-2">
                      <Label htmlFor={`carry-forward-${budget._id}`} className="text-sm">
                        Carry Forward
                      </Label>
                      <Switch
                        id={`carry-forward-${budget._id}`}
                        checked={budget.isRollover || false}
                        onCheckedChange={() => handleToggleCarryForward(budget)}
                      />
                    </div>
                  </div>
                </div>
              )
            })}

            <div className="pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Budgeted:</span>
                <span className="font-bold">
                  ₹{getApplicableBudgets()
                    .reduce((total, budget) => total + (budget.totalAmount || (budget as any).amount || 0), 0)
                    .toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Total Spent:</span>
                <span className="font-bold">
                  ₹{getApplicableBudgets()
                    .reduce((total, budget) => 
                      total + getSpentAmount(budget.category, budget.period || (budget as any).frequency, budget.startDate), 0)
                    .toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-medium">Remaining:</span>
                <span className={
                  getApplicableBudgets().reduce((total, budget) => 
                    total + ((budget.totalAmount || (budget as any).amount || 0) - 
                    getSpentAmount(budget.category, budget.period || (budget as any).frequency, budget.startDate)), 0) > 0 
                    ? "font-bold text-green-600" 
                    : "font-bold text-red-600"
                }>
                  ₹
                  {Math.max(
                    getApplicableBudgets().reduce((total, budget) => 
                      total + ((budget.totalAmount || (budget as any).amount || 0) - 
                      getSpentAmount(budget.category, budget.period || (budget as any).frequency, budget.startDate)), 0),
                    0,
                  ).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}