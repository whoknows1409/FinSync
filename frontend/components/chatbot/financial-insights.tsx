"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useTransactions } from "@/lib/transactions-context"
import { useBudget } from "@/lib/budget-context"
import { Lightbulb, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react"

export function FinancialInsights() {
  const { transactions, getTotalByType } = useTransactions()
  const { budgets } = useBudget()

  const totalIncome = getTotalByType("income")
  const totalExpenses = getTotalByType("expense")
  const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome) * 100 : 0

  // Generate insights based on user data
  const insights = []

  // Savings rate insight
  if (savingsRate >= 20) {
    insights.push({
      type: "positive",
      title: "Excellent Savings Rate",
      description: `Your savings rate of ${savingsRate.toFixed(1)}% is above the recommended 20%. Great job!`,
      icon: CheckCircle,
    })
  } else if (savingsRate >= 10) {
    insights.push({
      type: "warning",
      title: "Good Savings Rate",
      description: `Your savings rate of ${savingsRate.toFixed(1)}% is decent. Try to reach 20% for optimal financial health.`,
      icon: TrendingUp,
    })
  } else {
    insights.push({
      type: "alert",
      title: "Low Savings Rate",
      description: `Your savings rate of ${savingsRate.toFixed(1)}% is below recommended levels. Consider reducing expenses or increasing income.`,
      icon: AlertTriangle,
    })
  }

  // Budget insights
  if (budgets.length === 0) {
    insights.push({
      type: "alert",
      title: "No Budgets Set",
      description: "Setting budgets can help you control spending and reach your financial goals faster.",
      icon: AlertTriangle,
    })
  } else {
    insights.push({
      type: "positive",
      title: "Budget Planning Active",
      description: `You have ${budgets.length} budget categories set up. This shows good financial discipline!`,
      icon: CheckCircle,
    })
  }

  // Transaction insights
  if (transactions.length < 10) {
    insights.push({
      type: "warning",
      title: "Limited Transaction Data",
      description: "Add more transactions to get better insights and personalized advice from the AI.",
      icon: TrendingUp,
    })
  }

  const getInsightColor = (type: string) => {
    switch (type) {
      case "positive":
        return "text-green-600"
      case "warning":
        return "text-yellow-600"
      case "alert":
        return "text-red-600"
      default:
        return "text-muted-foreground"
    }
  }

  const getInsightBadge = (type: string) => {
    switch (type) {
      case "positive":
        return "default" as const
      case "warning":
        return "secondary" as const
      case "alert":
        return "destructive" as const
      default:
        return "outline" as const
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5" />
          Financial Insights
        </CardTitle>
        <CardDescription>AI-powered insights based on your financial data</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {insights.map((insight, index) => (
            <div key={index} className="flex gap-3 p-3 border rounded-lg">
              <insight.icon className={`h-5 w-5 mt-0.5 ${getInsightColor(insight.type)}`} />
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{insight.title}</h4>
                  <Badge variant={getInsightBadge(insight.type)} className="text-xs">
                    {insight.type.toUpperCase()}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">{insight.description}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
