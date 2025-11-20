"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D", "#FFC658"]

interface ExpenseData {
  category: string
  amount: number
  count: number
  avgAmount: number
  percentage: number
}

interface ChartDataInput {
  category: string
  amount: number
  count: number
  avgAmount: number
  percentage: number
  [key: string]: any
}

export function ExpenseBreakdownChart() {
  const [expenseData, setExpenseData] = useState<ExpenseData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    const fetchExpenseBreakdown = async () => {
      try {
        setLoading(true)
        const response = await fetch('/api/analysis/expense-breakdown', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch expense breakdown')
        }

        const data = await response.json()
        setExpenseData(data.data.breakdown)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        toast({
          title: "Error",
          description: "Failed to fetch expense breakdown.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchExpenseBreakdown()
  }, [toast])

  // Chart config for ChartContainer
  const chartConfig = {
    amount: {
      label: "Amount",
      color: "hsl(var(--chart-1))",
    },
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Expense Breakdown</CardTitle>
          <CardDescription>Distribution of expenses by category</CardDescription>
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
          <CardTitle>Expense Breakdown</CardTitle>
          <CardDescription>Distribution of expenses by category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-red-500">Error: {error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (expenseData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Expense Breakdown</CardTitle>
          <CardDescription>Distribution of expenses by category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-muted-foreground">No expense data available</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Custom label renderer that prevents overlap by only showing labels for larger segments
  const renderCustomLabel = ({
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    percentage,
    category,
  }: any) => {
    // Only show label if segment is larger than 5%
    if (percentage < 5) return null;

    const RADIAN = Math.PI / 180;
    const radius = outerRadius + 25;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text
        x={x}
        y={y}
        fill="currentColor"
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        className="text-xs font-medium text-foreground"
      >
        {`${category} (${percentage}%)`}
      </text>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Expense Breakdown</CardTitle>
        <CardDescription>Distribution of expenses by category</CardDescription>
      </CardHeader>
      <CardContent>
        {/* Convert expenseData to ChartDataInput format */}
        {expenseData.length > 0 && (
          <ChartContainer config={chartConfig} className="h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseData as ChartDataInput[]}
                  cx="50%"
                  cy="50%"
                  labelLine={{
                    stroke: 'hsl(var(--muted-foreground))',
                    strokeWidth: 1,
                  }}
                  label={renderCustomLabel}
                  outerRadius={90}
                  fill="#8884d8"
                  dataKey="amount"
                >
                {expenseData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      formatter={(value, name) => [
                        `₹${Number(value).toLocaleString()}`,
                        name === "amount" ? "Amount" : name,
                      ]}
                    />
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        )}
        <div className="mt-4 space-y-2">
          {expenseData.map((item, index) => (
            <div key={`expense-${item.category}-${index}`} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span>{item.category}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>₹{Number(item.amount).toLocaleString()}</span>
                <span className="text-muted-foreground">({item.percentage}%)</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}