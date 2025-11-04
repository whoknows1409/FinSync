"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Brain, Sparkles } from "lucide-react"
import { useTransactions } from "@/lib/transactions-context"

export function AICategorization() {
  const { transactions } = useTransactions()

  const aiCategorizedCount = transactions.filter((t) => t.aiCategorized).length
  const totalTransactions = transactions.length
  const percentage = totalTransactions > 0 ? Math.round((aiCategorizedCount / totalTransactions) * 100) : 0

  const recentAICategories = transactions
    .filter((t) => t.aiCategorized)
    .slice(0, 5)
    .map((t) => ({ description: t.description, category: t.category }))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Brain className="h-5 w-5 text-blue-500" />
          <span>AI Categorization</span>
          <Badge variant="secondary" className="ml-auto">
            {percentage}% Auto-categorized
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-muted-foreground">
          <p>
            AI has automatically categorized {aiCategorizedCount} out of {totalTransactions} transactions.
          </p>
        </div>

        {recentAICategories.length > 0 && (
          <div>
            <h4 className="font-medium mb-2 flex items-center">
              <Sparkles className="h-4 w-4 mr-1 text-yellow-500" />
              Recent AI Categorizations
            </h4>
            <div className="space-y-2">
              {recentAICategories.map((item, index) => (
                <div key={index} className="flex justify-between items-center text-sm">
                  <span className="truncate flex-1 mr-2">{item.description}</span>
                  <Badge variant="outline">{item.category}</Badge>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
