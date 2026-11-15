// components/dashboard/financial-goals.tsx
"use client"

// Compact goals summary. It is not part of the dashboard at the moment; goals
// have their own page at /goals. To put it back on the dashboard:
// 1. Import it in the draggable-dashboard.tsx file
// 2. Add it back to the WIDGET_TYPES object in dashboard-widgets.tsx
// 3. Add it back to the WIDGET_INFO object in draggable-dashboard.tsx
// 4. Add it back to the DEFAULT_LAYOUT in draggable-dashboard.tsx

import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Plus, Target } from "lucide-react"
import { useGoals } from "@/lib/goals-context"
import { formatCurrency } from "@/lib/utils"

export function FinancialGoals() {
  const { goals } = useGoals()
  const activeGoals = goals.filter((goal) => goal.status === "active")

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center space-x-2">
          <Target className="h-5 w-5" />
          <span>Financial Goals</span>
        </CardTitle>
        <Button size="sm" variant="outline" asChild>
          <Link href="/goals">
            <Plus className="h-4 w-4 mr-1" />
            Add Goal
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {activeGoals.length === 0 && (
          <p className="text-sm text-muted-foreground">No active goals yet.</p>
        )}
        {activeGoals.map((goal) => {
          const progress = Math.min(100, goal.progressPercentage || 0)
          const overdue = new Date(goal.targetDate).getTime() < Date.now()

          return (
            <div key={goal._id} className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">{goal.name}</h4>
                <span className="text-sm text-muted-foreground">
                  {overdue ? "Overdue" : `${goal.daysRemaining} days left`}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-sm">
                <span>{formatCurrency(goal.currentAmount)}</span>
                <span className="text-muted-foreground">{formatCurrency(goal.targetAmount)}</span>
              </div>
              <div className="text-xs text-muted-foreground">{progress}% complete</div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}
