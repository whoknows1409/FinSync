"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Legend } from "recharts"
import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"

interface TrendData {
  month: string
  income: number
  expense: number
  net: number
}

export function IncomeExpenseTrend() {
  const [trendData, setTrendData] = useState<TrendData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const fetchIncomeExpenseTrends = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/analysis/income-expense-trends', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch income expense trends')
        }

        const data = await response.json()
        setTrendData(data.data.trends)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        toast({
          title: "Error",
          description: "Failed to fetch income expense trends.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchIncomeExpenseTrends()
  }, [toast])

  // Chart config for ChartContainer with visible colors
  const chartConfig = {
    income: {
      label: "Income",
      color: "#10b981", // Green - clearly visible
    },
    expense: {
      label: "Expense",
      color: "#ef4444", // Red - clearly visible
    },
    net: {
      label: "Net Savings",
      color: "#3b82f6", // Blue - clearly visible
    },
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Income vs Expenses Trend</CardTitle>
          <CardDescription>Monthly comparison of income and expenses</CardDescription>
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
          <CardTitle>Income vs Expenses Trend</CardTitle>
          <CardDescription>Monthly comparison of income and expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-red-500">Error: {error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (trendData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Income vs Expenses Trend</CardTitle>
          <CardDescription>Monthly comparison of income and expenses</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-muted-foreground">No transaction data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Income vs Expenses Trend</CardTitle>
        <CardDescription>Monthly comparison of income and expenses</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" className="opacity-50" />
              <XAxis 
                dataKey="month" 
                tick={{ fill: 'currentColor' }}
                tickLine={{ stroke: 'currentColor' }}
              />
              <YAxis 
                tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}k`}
                tick={{ fill: 'currentColor' }}
                tickLine={{ stroke: 'currentColor' }}
              />
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
              <Legend 
                wrapperStyle={{ paddingTop: '10px' }}
                formatter={(value) => chartConfig[value as keyof typeof chartConfig]?.label || value}
              />
              <Line
                type="monotone"
                dataKey="income"
                stroke={chartConfig.income.color}
                strokeWidth={3}
                dot={{ fill: chartConfig.income.color, r: 4 }}
                activeDot={{ r: 6 }}
                name="income"
              />
              <Line
                type="monotone"
                dataKey="expense"
                stroke={chartConfig.expense.color}
                strokeWidth={3}
                dot={{ fill: chartConfig.expense.color, r: 4 }}
                activeDot={{ r: 6 }}
                name="expense"
              />
              <Line
                type="monotone"
                dataKey="net"
                stroke={chartConfig.net.color}
                strokeWidth={3}
                dot={{ fill: chartConfig.net.color, r: 4 }}
                activeDot={{ r: 6 }}
                name="net"
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}