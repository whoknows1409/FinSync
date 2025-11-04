// components/budget-analysis-dashboard.tsx
"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus, AlertTriangle, Target, BarChart3 } from "lucide-react"
import { useBudget } from "@/lib/budget-context"
import { useTransactions } from "@/lib/transactions-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  Cell
} from "recharts"

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"]

// Custom Tooltip Component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-200 rounded-lg shadow-lg">
        <p className="font-semibold text-gray-900">{`Category: ${label}`}</p>
        <div className="mt-2 space-y-1">
          <p className="text-sm" style={{ color: "#8884d8" }}>
            {`Budget: ₹${payload[0].value.toLocaleString()}`}
          </p>
          <p className="text-sm" style={{ color: "#82ca9d" }}>
            {`Actual: ₹${payload[1].value.toLocaleString()}`}
          </p>
          <div className="mt-2 pt-2 border-t border-gray-200">
            <p className="text-xs text-gray-600">
              {payload[1].value > payload[0].value 
                ? `Over budget by ₹${(payload[1].value - payload[0].value).toLocaleString()}` 
                : payload[1].value < payload[0].value 
                  ? `Under budget by ₹${(payload[0].value - payload[1].value).toLocaleString()}` 
                  : "On budget"
              }
            </p>
          </div>
        </div>
      </div>
    )
  }
  return null
}

export function BudgetAnalysisDashboard() {
  const { getBudgetAnalysis, getSpendingTrends } = useBudget()
  const { transactions } = useTransactions()
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  
  const currentMonth = new Date().toISOString().slice(0, 7)
  const analysis = getBudgetAnalysis(currentMonth)
  
  // Get unique categories from analysis
  const categories = ["all", ...analysis.map(item => item.category)]
  
  // Filter data for the chart based on selected category
  const filteredChartData = selectedCategory === "all" 
    ? analysis 
    : analysis.filter(item => item.category === selectedCategory)
  
  // Calculate totals for overview cards based on selected category
  const totalBudgeted = selectedCategory === "all" 
    ? analysis.reduce((sum, item) => sum + item.budgeted, 0)
    : analysis
        .filter(item => item.category === selectedCategory)
        .reduce((sum, item) => sum + item.budgeted, 0)
  
  const totalSpent = selectedCategory === "all" 
    ? analysis.reduce((sum, item) => sum + item.spent, 0)
    : analysis
        .filter(item => item.category === selectedCategory)
        .reduce((sum, item) => sum + item.spent, 0)
  
  const totalRemaining = totalBudgeted - totalSpent

  // Prepare data for bar chart
  const barChartData = filteredChartData.map(item => ({
    name: item.category,
    budgeted: item.budgeted,
    spent: item.spent,
    remaining: item.budgeted - item.spent
  }))

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-red-500" />
      case "down":
        return <TrendingDown className="h-4 w-4 text-green-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  const getStatusColor = (percentage: number) => {
    if (percentage >= 100) return "text-red-600"
    if (percentage >= 80) return "text-yellow-600"
    return "text-green-600"
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Budgeted</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalBudgeted.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {selectedCategory === "all" ? "This month's budget" : `Budget for ${selectedCategory}`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalSpent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">
              {totalBudgeted > 0 ? ((totalSpent / totalBudgeted) * 100).toFixed(1) : 0}% of budget used
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
            <AlertTriangle className={`h-4 w-4 ${totalRemaining < 0 ? "text-red-500" : "text-green-500"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalRemaining < 0 ? "text-red-600" : "text-green-600"}`}>
              ₹{Math.abs(totalRemaining).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">{totalRemaining < 0 ? "Over budget" : "Under budget"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Category Analysis - Always shows all categories */}
        <Card>
          <CardHeader>
            <CardTitle>Budget Analysis by Category</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {analysis.map((item) => (
              <div key={item.category} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="font-medium">{item.category}</span>
                    {getTrendIcon(item.trend)}
                    {item.percentage >= 100 && (
                      <Badge variant="destructive" className="text-xs">
                        Over Budget
                      </Badge>
                    )}
                    {item.percentage >= 80 && item.percentage < 100 && (
                      <Badge variant="secondary" className="text-xs">
                        Warning
                      </Badge>
                    )}
                  </div>
                  <span className={`text-sm font-medium ${getStatusColor(item.percentage)}`}>
                    {item.percentage.toFixed(1)}%
                  </span>
                </div>

                <Progress value={Math.min(item.percentage, 100)} className="h-2" />

                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>₹{item.spent.toLocaleString()} spent</span>
                  <span>₹{item.budgeted.toLocaleString()} budgeted</span>
                </div>

                {item.variance !== 0 && (
                  <div className="text-xs text-muted-foreground">
                    {item.variance > 0 ? "+" : ""}₹{item.variance.toLocaleString()} vs last month
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Budget vs Actual Expense - Filtered by selected category */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Budget vs Actual Expense</CardTitle>
              <div className="w-48">
                <Label htmlFor="category-select" className="text-sm">Category:</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger id="category-select">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat === "all" ? "All Categories" : cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={barChartData}
                  margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="budgeted" name="Budgeted" fill="#8884d8" />
                  <Bar dataKey="spent" name="Spent" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Category Legend */}
            <div className="grid grid-cols-2 gap-2 mt-4">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-[#8884d8]" />
                <span className="text-xs">Budgeted Amount</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 rounded-full bg-[#82ca9d]" />
                <span className="text-xs">Actual Spent</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}