"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useCallback } from "react"
import { useTransactions } from "./transactions-context"
import { budgetAPI } from './api-service'
import { toast } from "sonner"
import { useAuth } from "./auth-context"

export interface Budget {
  _id?: string
  user?: string
  name?: string
  category: string
  subcategories?: {
    name: string
    amount: number
    spent: number
  }[]
  totalAmount: number
  spentAmount?: number
  period: string
  startDate: string
  endDate: string
  isRollover?: boolean
  rolloverAmount?: number
  alerts?: {
    enabled: boolean
    threshold: number
    exceeded: boolean
  }
  status?: string
  notes?: string
  tags?: string[]
  isShared?: boolean
  sharedWith?: {
    user: string
    role: string
  }[]
  createdAt?: string
  updatedAt?: string
}

export interface BudgetAnalysis {
  category: string
  budgeted: number
  spent: number
  remaining: number
  percentage: number
  trend: "up" | "down" | "stable"
  previousMonth: number
  variance: number
}

interface BudgetContextType {
  budgets: Budget[]
  loading: boolean
  error: string | null
  setBudget: (
    name: string,
    category: string,
    totalAmount: number,
    period: string,
    options?: { alertThreshold?: number; rollover?: boolean; startDate?: Date; endDate?: Date },
  ) => Promise<void>
  getBudgetForCategory: (category: string, month: string) => Budget | undefined
  getBudgetsForMonth: (month: string) => Budget[]
  deleteBudget: (id: string) => Promise<void>
  getBudgetAnalysis: (month: string) => BudgetAnalysis[]
  getSpendingTrends: (category: string, months: number) => { month: string; spent: number; budgeted: number }[]
  predictNextMonthBudget: (category: string) => number
  refreshBudgets: () => Promise<void>
  forceRefresh: () => Promise<void>
}

const BudgetContext = createContext<BudgetContextType | undefined>(undefined)

// Helper function to format date for API requests
const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
}

export function BudgetProvider({ children }: { children: React.ReactNode }) {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)
  const { transactions } = useTransactions()
  const { user, isLoading: authLoading } = useAuth()

  // Fetch budgets from API on component mount
  useEffect(() => {
    const initializeBudgets = async () => {
      // Prevent multiple initializations or running before auth is ready
      if (isInitialized || authLoading) return;
      // Skip initialization for unauthenticated visitors (e.g., landing page)
      if (!user) {
        setLoading(false)
        return
      }
      
      try {
        setLoading(true)
        setBudgets([])
        setError(null)
        
        // Synchronize categories before loading budgets
        await budgetAPI.syncCategories();
        
        // Then load budgets
        await refreshBudgetsInternal()
        setIsInitialized(true)
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Failed to initialize budgets"
        setError(errorMessage)
        console.error('Initialize budgets error:', error)
        setBudgets([])
        // Avoid noisy toasts for unauthenticated/access errors on public pages
        if (!(error instanceof Error && /Not authorized|Unauthorized|401/.test(error.message))) {
          toast.error(errorMessage)
        }
      } finally {
        setLoading(false)
      }
    };

    initializeBudgets();
  }, [isInitialized, user, authLoading]) // Re-run when auth state becomes ready

  // Internal refresh function without state management
  const refreshBudgetsInternal = useCallback(async () => {
    try {
      const response = await budgetAPI.getBudgets()
      
      // Handle both success and error cases
      if (response.success && Array.isArray(response.data)) {
        setBudgets(response.data)
        setError(null)
      } else {
        // Handle case where API returns success=false but has valid data
        if (Array.isArray(response.data)) {
          setBudgets(response.data)
          setError((response as any).message || "Budgets loaded with warnings")
        } else {
          setBudgets([])
          setError((response as any).message || "Failed to load budgets. Please try again later.")
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to refresh budgets"
      setError(errorMessage)
      console.error('Refresh budgets error:', err)
      setBudgets([]) // Ensure budgets is always an array
    }
  }, [])

  // Public refresh function with loading state
  const refreshBudgets = useCallback(async () => {
    setLoading(true)
    try {
      await refreshBudgetsInternal()
    } finally {
      setLoading(false)
    }
  }, [refreshBudgetsInternal])

  // Force refresh function with loading state
  const forceRefresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      // Clear the budgets first
      setBudgets([])
      
      // Add a small delay to ensure state is cleared
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Then fetch fresh budgets
      await refreshBudgetsInternal()
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to force refresh budgets"
      setError(errorMessage)
      console.error('Force refresh error:', err)
      setBudgets([]) // Ensure budgets is always an array
    } finally {
      setLoading(false)
    }
  }, [refreshBudgetsInternal])

  const setBudget = async (
    name: string,
    category: string,
    totalAmount: number,
    period: string = 'monthly',
    options?: {
      alertThreshold?: number;
      rollover?: boolean;
      startDate?: Date;
      endDate?: Date;
    },
  ) => {
    try {
      setLoading(true)
      setError(null)

      // Calculate start and end dates based on period
      const startDate = options?.startDate || new Date()
      const endDate = options?.endDate || new Date()

      switch (period) {
        case 'daily':
          endDate.setHours(23, 59, 59, 999)
          break
        case 'weekly':
          endDate.setDate(startDate.getDate() + 6)
          endDate.setHours(23, 59, 59, 999)
          break
        case 'monthly':
          endDate.setMonth(startDate.getMonth() + 1)
          endDate.setDate(0)
          endDate.setHours(23, 59, 59, 999)
          break
        case 'quarterly':
          endDate.setMonth(startDate.getMonth() + 3)
          endDate.setDate(0)
          endDate.setHours(23, 59, 59, 999)
          break
        case 'yearly':
          endDate.setFullYear(startDate.getFullYear() + 1)
          endDate.setMonth(11)
          endDate.setDate(31)
          endDate.setHours(23, 59, 59, 999)
          break
      }

      // Check if a budget already exists for this category and frequency
      const existingBudget = budgets.find(budget => 
        budget.category === category && 
        budget.period === period && 
        budget.status === 'active' &&
        ((new Date(budget.startDate) <= endDate && new Date(budget.endDate) >= startDate))
      )

      if (existingBudget) {
        // Update existing budget instead of erroring (idempotent UX)
        const updatePayload = {
          name,
          category,
          totalAmount,
          period,
          startDate: formatDate(startDate),
          endDate: formatDate(endDate),
          isRollover: options?.rollover || false,
          alerts: {
            enabled: true,
            threshold: options?.alertThreshold || 80,
            exceeded: false,
          },
          status: 'active',
        }
        const updated = await budgetAPI.updateBudget(existingBudget._id as string, updatePayload)
        if (!updated.success) {
          throw new Error(updated.message || 'Failed to update budget')
        }
        setBudgets(prev => prev.map(b => (b._id === existingBudget._id ? updated.data : b)))
        toast.success('Budget updated successfully!')
        return
      }

      const budgetData = {
        name,
        category,
        totalAmount,
        period,
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        isRollover: options?.rollover || false,
        alerts: {
          enabled: true,
          threshold: options?.alertThreshold || 80,
          exceeded: false
        },
        status: 'active'
      }

      // Save budget to backend
      const savedBudget = await budgetAPI.addBudget(budgetData)
      
      if (!savedBudget.success) {
        throw new Error(savedBudget.message || 'Failed to create budget')
      }
      
      // Update local state
      setBudgets(prev => [...prev, savedBudget.data])
      
      // Show success message
      toast.success('Budget created successfully!')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to set budget"
      setError(errorMessage)
      toast.error(errorMessage)
      console.error('Budget creation error:', err)
    } finally {
      setLoading(false)
    }
  }

  const getBudgetForCategory = (category: string, month: string) => {
    if (!Array.isArray(budgets)) {
      return undefined
    }
    return budgets.find((budget) => budget.category === category && budget.startDate?.startsWith(month))
  }

  const getBudgetsForMonth = (month: string) => {
    if (!Array.isArray(budgets)) {
      return []
    }
    return budgets.filter((budget) => budget.startDate?.startsWith(month))
  }

  const deleteBudget = async (id: string) => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await budgetAPI.deleteBudget(id)
      if (!response.success) {
        throw new Error(response.message || 'Failed to delete budget')
      }
      
      // Update local state
      setBudgets(prev => prev.filter(budget => budget._id !== id))
      
      // Show success message
      toast.success('Budget deleted successfully')
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to delete budget"
      setError(errorMessage)
      console.error('Delete budget error:', err)
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const getBudgetAnalysis = (month: string): BudgetAnalysis[] => {
    const monthBudgets = getBudgetsForMonth(month)
    const monthTransactions = transactions.filter((t) => 
      t.type === "expense" && t.date.startsWith(month)
    )

    // Group budgets by category and sum their amounts
    const categoryBudgets = monthBudgets.reduce((acc, budget) => {
      const category = budget.category
      if (!acc[category]) {
        acc[category] = 0
      }
      acc[category] += budget.totalAmount || 0
      return acc
    }, {} as Record<string, number>)

    // Get previous month for trend analysis
    const prevMonth = getPreviousMonth(month)

    // Create analysis for each unique category
    return Object.entries(categoryBudgets).map(([category, budgetedAmount]) => {
      const spent = monthTransactions
        .filter((t) => t.category === category)
        .reduce((sum, t) => sum + t.amount, 0)

      const remaining = budgetedAmount - spent
      const percentage = budgetedAmount > 0 ? (spent / budgetedAmount) * 100 : 0

      // Get previous month data for trend analysis
      const prevMonthTransactions = transactions.filter(
        (t) => t.type === "expense" && t.date.startsWith(prevMonth) && t.category === category,
      )
      const previousMonth = prevMonthTransactions.reduce((sum, t) => sum + t.amount, 0)

      const variance = spent - previousMonth
      let trend: "up" | "down" | "stable" = "stable"
      if (Math.abs(variance) > budgetedAmount * 0.1) {
        // 10% threshold
        trend = variance > 0 ? "up" : "down"
      }

      return {
        category,
        budgeted: budgetedAmount,
        spent,
        remaining,
        percentage,
        trend,
        previousMonth,
        variance,
      }
    })
  }

  const getSpendingTrends = (category: string, months: number) => {
    const trends = []
    const currentDate = new Date()

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      const monthStr = date.toISOString().slice(0, 7)

      const budget = getBudgetForCategory(category, monthStr)
      // Calculate actual spending for this month
      const monthTransactions = transactions.filter(
        (t) => t.type === "expense" && t.date.startsWith(monthStr) && t.category === category
      )
      const spent = monthTransactions.reduce((sum, t) => sum + t.amount, 0)
      
      trends.push({
        month: monthStr,
        spent,
        budgeted: budget?.totalAmount || 0,
      })
    }

    return trends
  }

  const predictNextMonthBudget = (category: string): number => {
    // Simple prediction based on last 3 months average
    const currentDate = new Date()
    const last3Months = []

    for (let i = 1; i <= 3; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      const monthStr = date.toISOString().slice(0, 7)
      const budget = getBudgetForCategory(category, monthStr)
      if (budget) last3Months.push(budget.totalAmount || 0)
    }

    if (last3Months.length === 0) return 0

    const average = last3Months.reduce((sum, amount) => sum + amount, 0) / last3Months.length
    return Math.round(average * 1.05) // 5% increase for inflation
  }

  return (
    <BudgetContext.Provider
      value={{
        budgets,
        loading,
        error,
        setBudget,
        getBudgetForCategory,
        getBudgetsForMonth,
        deleteBudget,
        getBudgetAnalysis,
        getSpendingTrends,
        predictNextMonthBudget,
        refreshBudgets,
        forceRefresh,
      }}
    >
      {children}
    </BudgetContext.Provider>
  )
}

function getPreviousMonth(month: string): string {
  const date = new Date(month + "-01")
  date.setMonth(date.getMonth() - 1)
  return date.toISOString().slice(0, 7)
}

export function useBudget() {
  const context = useContext(BudgetContext)
  if (context === undefined) {
    throw new Error("useBudget must be used within a BudgetProvider")
  }
  return context
}