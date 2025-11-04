"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Lightbulb, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react"
import { useBudget } from "@/lib/budget-context"
import { useTransactions } from "@/lib/transactions-context"

interface Recommendation {
  type: "increase" | "decrease" | "warning" | "optimize"
  category: string
  currentAmount: number
  suggestedAmount: number
  reason: string
  impact: "high" | "medium" | "low"
}

export function SmartBudgetRecommendations() {
  const { getBudgetAnalysis, predictNextMonthBudget, setBudget } = useBudget()
  const { transactions } = useTransactions()

  const currentMonth = new Date().toISOString().slice(0, 7)
  const analysis = getBudgetAnalysis(currentMonth)

  const generateRecommendations = (): Recommendation[] => {
    const recommendations: Recommendation[] = []

    analysis.forEach((item) => {
      // Over budget recommendations
      if (item.percentage > 100) {
        const suggested = Math.ceil(item.spent * 1.1) // 10% buffer
        recommendations.push({
          type: "increase",
          category: item.category,
          currentAmount: item.budgeted,
          suggestedAmount: suggested,
          reason: `You've exceeded your budget by ₹${(item.spent - item.budgeted).toLocaleString()}. Consider increasing your budget.`,
          impact: "high",
        })
      }

      // Consistently under budget
      if (item.percentage < 50 && item.trend === "stable") {
        const suggested = Math.ceil(item.spent * 1.2) // 20% buffer
        recommendations.push({
          type: "decrease",
          category: item.category,
          currentAmount: item.budgeted,
          suggestedAmount: suggested,
          reason: `You consistently spend less than 50% of your budget. Consider reallocating funds.`,
          impact: "medium",
        })
      }

      // Trending up warning
      if (item.trend === "up" && item.percentage > 80) {
        recommendations.push({
          type: "warning",
          category: item.category,
          currentAmount: item.budgeted,
          suggestedAmount: item.budgeted,
          reason: `Spending is trending upward and you're at ${item.percentage.toFixed(1)}% of budget.`,
          impact: "high",
        })
      }

      // Optimization opportunities
      if (item.percentage > 90 && item.percentage < 100) {
        recommendations.push({
          type: "optimize",
          category: item.category,
          currentAmount: item.budgeted,
          suggestedAmount: item.budgeted,
          reason: `You're using ${item.percentage.toFixed(1)}% of your budget efficiently.`,
          impact: "low",
        })
      }
    })

    return recommendations.sort((a, b) => {
      const impactOrder = { high: 3, medium: 2, low: 1 }
      return impactOrder[b.impact] - impactOrder[a.impact]
    })
  }

  const recommendations = generateRecommendations()

  const getRecommendationIcon = (type: string) => {
    switch (type) {
      case "increase":
        return <TrendingUp className="h-4 w-4 text-blue-500" />
      case "decrease":
        return <TrendingUp className="h-4 w-4 text-green-500 rotate-180" />
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case "optimize":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      default:
        return <Lightbulb className="h-4 w-4 text-gray-500" />
    }
  }

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300"
      case "medium":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "low":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  const applyRecommendation = (rec: Recommendation) => {
    const nextMonth = new Date()
    nextMonth.setMonth(nextMonth.getMonth() + 1)
    const nextMonthStr = nextMonth.toISOString().slice(0, 7)

    setBudget(`Recommended ${rec.category}`, rec.category, rec.suggestedAmount, 'monthly', {
      startDate: new Date(nextMonthStr + '-01')
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Lightbulb className="h-5 w-5 text-yellow-500" />
          <span>Smart Budget Recommendations</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recommendations.length === 0 ? (
          <div className="text-center py-6">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <p className="text-muted-foreground">Your budgets look great! No recommendations at this time.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recommendations.slice(0, 5).map((rec, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-2">
                    {getRecommendationIcon(rec.type)}
                    <span className="font-medium">{rec.category}</span>
                    <Badge className={getImpactColor(rec.impact)}>{rec.impact} impact</Badge>
                  </div>
                  {(rec.type === "increase" || rec.type === "decrease") && (
                    <Button size="sm" variant="outline" onClick={() => applyRecommendation(rec)}>
                      Apply
                    </Button>
                  )}
                </div>

                <p className="text-sm text-muted-foreground">{rec.reason}</p>

                {rec.suggestedAmount !== rec.currentAmount && (
                  <div className="flex items-center space-x-4 text-sm">
                    <span>Current: ₹{rec.currentAmount.toLocaleString()}</span>
                    <span>→</span>
                    <span className="font-medium">Suggested: ₹{rec.suggestedAmount.toLocaleString()}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
