"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from "recharts"
import { useEffect, useState } from "react"
import { AlertTriangle } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface BudgetPerformance {
  _id: string
  totalBudgeted: number
  totalSpent: number
  count: number
  avgUtilization: number
  remaining: number
  utilization: number
}

export function BudgetVsActualChart() {
  const [budgetData, setBudgetData] = useState<BudgetPerformance[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const fetchBudgetData = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/budgets/category-performance', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch budget data')
        }

        const data = await response.json()
        setBudgetData(data.data.performance)
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
      <Card>
        <CardHeader>
          <CardTitle>Budget vs Actual</CardTitle>
          <CardDescription>Compare your budgeted amounts with actual spending</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget vs Actual</CardTitle>
          <CardDescription>Compare your budgeted amounts with actual spending</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-red-500">Error: {error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (budgetData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Budget vs Actual</CardTitle>
          <CardDescription>Compare your budgeted amounts with actual spending</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-muted-foreground">No budget data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Transform data for chart
  const chartData = budgetData.map(item => ({
    category: item._id,
    budget: item.totalBudgeted,
    actual: item.totalSpent,
    isOver: item.totalSpent > item.totalBudgeted
  }))

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget vs Actual</CardTitle>
        <CardDescription>Compare your budgeted amounts with actual spending</CardDescription>
      </CardHeader>
      <CardContent>
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
        <div className="mt-4 space-y-2">
          {budgetData.filter(item => item.totalSpent > item.totalBudgeted).map((item, index) => (
            <div key={index} className="flex items-center space-x-2 text-red-500">
              <AlertTriangle className="h-4 w-4" />
              <span className="text-sm">
                You've exceeded your budget for {item._id} by ₹{(item.totalSpent - item.totalBudgeted).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}