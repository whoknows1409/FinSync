"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, DollarSign, PiggyBank } from "lucide-react"
import { useTransactions } from "@/lib/transactions-context"
import { useEffect, useState } from "react"

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

export function SummaryCards() {
  const { getTotalByType } = useTransactions()
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true)
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
        console.error('Failed to fetch dashboard data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchDashboardData()
  }, [])

  // Fallback to context if API fails
  const totalIncome = dashboardData?.summary.totalIncome ?? getTotalByType("income")
  const totalExpenses = dashboardData?.summary.totalExpenses ?? getTotalByType("expense")
  const savings = dashboardData?.summary.netSavings ?? (totalIncome - totalExpenses)
  const portfolioValue = dashboardData?.summary.portfolioValue ?? 0

  const formatChange = (change: number) => {
    const sign = change >= 0 ? '+' : ''
    return `${sign}${change.toFixed(1)}% from last month`
  }

  const incomeChange = dashboardData?.summary.changes.income ?? 0
  const expensesChange = dashboardData?.summary.changes.expenses ?? 0
  const portfolioChange = dashboardData?.summary.changes.portfolio ?? 0
  const savingsChange = savings > 0 ? incomeChange - expensesChange : 0 // Approximate savings change

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Income</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₹{totalIncome.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground flex items-center">
            <TrendingUp className={`h-3 w-3 mr-1 ${incomeChange >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            {loading ? "Loading..." : formatChange(incomeChange)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          <TrendingDown className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₹{totalExpenses.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground flex items-center">
            <TrendingDown className={`h-3 w-3 mr-1 ${expensesChange <= 0 ? 'text-green-500' : 'text-red-500'}`} />
            {loading ? "Loading..." : formatChange(expensesChange)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Portfolio Value</CardTitle>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">
            {portfolioValue >= 100000 
              ? `₹${(portfolioValue / 100000).toFixed(1)}L`
              : `₹${portfolioValue.toLocaleString()}`}
          </div>
          <p className="text-xs text-muted-foreground flex items-center">
            <TrendingUp className={`h-3 w-3 mr-1 ${portfolioChange >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            {loading ? "Loading..." : formatChange(portfolioChange)}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Savings</CardTitle>
          <PiggyBank className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">₹{savings.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground flex items-center">
            <TrendingUp className={`h-3 w-3 mr-1 ${savingsChange >= 0 ? 'text-green-500' : 'text-red-500'}`} />
            {loading ? "Loading..." : formatChange(savingsChange)}
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
