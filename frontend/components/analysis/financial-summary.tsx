// components/analysis/financial-summary.tsx
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, DollarSign, Target } from "lucide-react"
import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { transactionAPI } from "@/lib/api-service" // Import the API service

interface FinancialData {
  totalIncome: number
  totalExpenses: number
  netSavings: number
  savingsRate: number
}

export function FinancialSummary() {
  const [financialData, setFinancialData] = useState<FinancialData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const fetchFinancialSummary = async () => {
      try {
        setLoading(true)
        
        // Use the existing API service function instead of direct fetch
        const response = await transactionAPI.getAnalysis()
        
        // Transform the data to match the expected FinancialData interface
        const totals = response.data.totals;
        setFinancialData({
          totalIncome: totals.totalIncome,
          totalExpenses: totals.totalExpenses,
          netSavings: totals.netAmount,
          savingsRate: totals.totalIncome > 0 ? (totals.netAmount / totals.totalIncome) * 100 : 0
        })
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        toast({
          title: "Error",
          description: "Failed to fetch financial summary.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchFinancialSummary()
  }, [toast])

  // The rest of the component remains unchanged
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Loading...</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <p className="text-red-500">Error loading financial data: {error}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  if (!financialData || (!financialData.totalIncome && !financialData.totalExpenses)) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
            <CardDescription>Your financial overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center h-[300px] text-center">
              <p className="text-muted-foreground mb-2">No financial data available</p>
              <p className="text-sm">Start by adding your income and expense transactions</p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const { totalIncome, totalExpenses, netSavings, savingsRate } = financialData

  const summaryCards = [
    {
      title: "Total Income",
      value: totalIncome,
      icon: DollarSign,
      color: "text-green-600",
      bgColor: "bg-green-50 dark:bg-green-950",
    },
    {
      title: "Total Expenses",
      value: totalExpenses,
      icon: TrendingDown,
      color: "text-red-600",
      bgColor: "bg-red-50 dark:bg-red-950",
    },
    {
      title: "Net Savings",
      value: netSavings,
      icon: TrendingUp,
      color: netSavings >= 0 ? "text-green-600" : "text-red-600",
      bgColor: netSavings >= 0 ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950",
    },
    {
      title: "Savings Rate",
      value: savingsRate,
      icon: Target,
      color: savingsRate >= 20 ? "text-green-600" : savingsRate >= 10 ? "text-yellow-600" : "text-red-600",
      bgColor:
        savingsRate >= 20
          ? "bg-green-50 dark:bg-green-950"
          : savingsRate >= 10
            ? "bg-yellow-50 dark:bg-yellow-950"
            : "bg-red-50 dark:bg-red-950",
      isPercentage: true,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
              <div className={`p-2 rounded-full ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${card.color}`}>
                {card.isPercentage ? `${card.value.toFixed(1)}%` : `₹${card.value.toLocaleString('en-IN')}`}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Financial Health</CardTitle>
            <CardDescription>Key financial indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Savings Rate:</span>
                <span className={`font-medium ${savingsRate >= 20 ? "text-green-600" : "text-yellow-600"}`}>
                  {savingsRate.toFixed(1)}%
                </span>
              </div>
              <div className="text-xs text-muted-foreground">
                {savingsRate >= 20
                  ? "Excellent! You're saving more than 20%"
                  : savingsRate >= 10
                    ? "Good! Aim for 20% savings rate"
                    : "Consider increasing your savings rate"}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Monthly Averages</CardTitle>
            <CardDescription>Average income and expenses per month</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Average Monthly Income:</span>
              <span className="text-lg font-bold text-green-600">₹{(totalIncome / 12).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Average Monthly Expenses:</span>
              <span className="text-lg font-bold text-red-600">₹{(totalExpenses / 12).toLocaleString('en-IN')}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t">
              <span className="text-sm font-medium">Average Monthly Savings:</span>
              <span
                className={`text-lg font-bold ${
                  netSavings >= 0 ? "text-green-600" : "text-red-600"
                }`}
              >
                ₹{(netSavings / 12).toLocaleString('en-IN')}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}