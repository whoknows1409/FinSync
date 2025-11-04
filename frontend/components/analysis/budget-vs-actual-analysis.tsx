"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts"
import { useEffect, useState } from "react"
import { AlertTriangle, TrendingUp, TrendingDown, CheckCircle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { mockBudgetVsActualData } from './mock-budget-data'

interface BudgetCategory {
  category: string
  budgeted: number
  actual: number
  variance: number
  utilization: number
  isOverBudget: boolean
}

interface BudgetData {
  categories: BudgetCategory[]
  summary: {
    totalBudgeted: number
    totalActual: number
    overallVariance: number
  }
}

export function BudgetVsActualAnalysis() {
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const fetchBudgetData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Try to fetch data from API
        try {
          const response = await fetch('/api/budgets/compare', {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`,
              'Content-Type': 'application/json'
            }
          })

          if (response.ok) {
            const apiData = await response.json()
            setBudgetData(apiData)
            return
          }
        } catch (apiError) {
          console.log('API call failed, using mock data')
        }
        
        // Fallback to mock data
        const mockData = {
          summary: {
            totalBudgeted: 12000,
            totalActual: 10800,
            overallVariance: -1200
          },
          categories: [
            { category: 'Housing', budgeted: 4000, actual: 4000, variance: 0, utilization: 100, isOverBudget: false },
            { category: 'Food', budgeted: 2000, actual: 1800, variance: -200, utilization: 90, isOverBudget: false },
            { category: 'Transportation', budgeted: 1500, actual: 1200, variance: -300, utilization: 80, isOverBudget: false },
            { category: 'Entertainment', budgeted: 1000, actual: 1500, variance: 500, utilization: 150, isOverBudget: true },
            { category: 'Utilities', budgeted: 1000, actual: 900, variance: -100, utilization: 90, isOverBudget: false },
            { category: 'Others', budgeted: 2500, actual: 1400, variance: -1100, utilization: 56, isOverBudget: false }
          ]
        }
        
        setBudgetData(mockData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        toast({
          title: "Error",
          description: "Failed to fetch budget data.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchBudgetData()
  }, [toast])

  // Chart config for ChartContainer
  const chartConfig = {
    budget: {
      label: "Budget",
      color: "hsl(var(--chart-1))",
    },
    actual: {
      label: "Actual",
      color: "hsl(var(--chart-2))",
    },
  }

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Budget vs Actual</CardTitle>
          <CardDescription>Loading budget comparison...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !budgetData) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Budget vs Actual</CardTitle>
          <CardDescription>Compare your budget with actual spending</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px]">
            <div className="flex flex-col items-center gap-2 text-red-500">
              <AlertTriangle className="h-8 w-8" />
              <p>{error || 'Failed to load budget data'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!budgetData.categories || budgetData.categories.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Budget vs Actual</CardTitle>
          <CardDescription>Compare your budget with actual spending</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[400px]">
            <p className="text-muted-foreground">No budget data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Transform data for chart
  const chartData = budgetData.categories.map(item => ({
    category: item.category,
    budget: item.budgeted,
    actual: item.actual,
    isOver: item.isOverBudget
  }))

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Budget vs Actual</CardTitle>
        <CardDescription>Compare your budget with actual spending</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">

        {/* Total budget summary */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground">Total Budgeted</p>
            <p className="text-xl font-bold">₹{budgetData.summary.totalBudgeted.toLocaleString()}</p>
          </div>
          <div className="p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground">Total Actual Spent</p>
            <p className={`text-xl font-bold ${budgetData.summary.overallVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ₹{budgetData.summary.totalActual.toLocaleString()}
            </p>
          </div>
          <div className="p-4 rounded-lg border">
            <p className="text-sm text-muted-foreground">Variance</p>
            <p className={`text-xl font-bold ${budgetData.summary.overallVariance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {budgetData.summary.overallVariance >= 0 ? '+' : ''}₹{budgetData.summary.overallVariance.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Chart */}
        <ChartContainer config={chartConfig} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="category" type="category" width={100} />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => [
                      `₹${Number(value).toLocaleString()}`,
                      chartConfig[name as keyof typeof chartConfig]?.label || name,
                    ]}
                  />
                }
              />
              <Bar dataKey="budget" fill={chartConfig.budget.color} name="Budget" />
              <Bar dataKey="actual" fill={chartConfig.actual.color} name="Actual">
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.isOver ? "#ef4444" : chartConfig.actual.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartContainer>

        {/* Category breakdown */}
        <div className="space-y-6">
          <h3 className="font-medium">Category Breakdown</h3>
          {budgetData.categories.map((category, index) => (
            <div key={index} className="p-4 rounded-lg border space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{category.category}</h4>
                  {category.isOverBudget && (
                    <span className="text-xs text-red-500 font-medium">Over Budget</span>
                  )}
                </div>
                <div className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-sm text-muted-foreground">Budget: ₹{category.budgeted.toLocaleString()}</span>
                    <span className={`text-sm font-medium ${category.isOverBudget ? 'text-red-500' : 'text-green-500'}`}>
                      Actual: ₹{category.actual.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Utilization: {category.utilization.toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}