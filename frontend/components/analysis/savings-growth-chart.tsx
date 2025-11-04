"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"

interface SavingsData {
  month: string
  income: number
  expense: number
  savings: number
  cumulativeSavings: number
}

export function SavingsGrowthChart() {
  const [savingsData, setSavingsData] = useState<SavingsData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const fetchSavingsGrowth = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/analysis/savings-growth', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch savings growth')
        }

        const data = await response.json()
        setSavingsData(data.data.savingsGrowth)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        toast({
          title: "Error",
          description: "Failed to fetch savings growth.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchSavingsGrowth()
  }, [toast])

  // Chart config for ChartContainer with visible color
  const chartConfig = {
    cumulativeSavings: {
      label: "Cumulative Savings",
      color: "#8b5cf6", // Purple - clearly visible
    },
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Savings Growth</CardTitle>
          <CardDescription>Cumulative savings over time</CardDescription>
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
          <CardTitle>Savings Growth</CardTitle>
          <CardDescription>Cumulative savings over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-red-500">Error: {error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (savingsData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Savings Growth</CardTitle>
          <CardDescription>Cumulative savings over time</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-muted-foreground">No savings data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Savings Growth</CardTitle>
        <CardDescription>Cumulative savings over time</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={savingsData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
              <defs>
                <linearGradient id="colorSavings" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartConfig.cumulativeSavings.color} stopOpacity={0.8}/>
                  <stop offset="95%" stopColor={chartConfig.cumulativeSavings.color} stopOpacity={0.1}/>
                </linearGradient>
              </defs>
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
                    formatter={(value) => [`₹${Number(value).toLocaleString()}`, "Cumulative Savings"]}
                  />
                }
              />
              <Area
                type="monotone"
                dataKey="cumulativeSavings"
                stroke={chartConfig.cumulativeSavings.color}
                strokeWidth={3}
                fill="url(#colorSavings)"
                dot={{ fill: chartConfig.cumulativeSavings.color, r: 4 }}
                activeDot={{ r: 6 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}