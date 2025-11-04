// components/dashboard/financial-goals.tsx
"use client"

// This file is kept for reference but the Financial Goals widget has been removed from the dashboard.
// To use this widget again, you'll need to:
// 1. Import it in the draggable-dashboard.tsx file
// 2. Add it back to the WIDGET_TYPES object in dashboard-widgets.tsx
// 3. Add it back to the WIDGET_INFO object in draggable-dashboard.tsx
// 4. Add it back to the DEFAULT_LAYOUT in draggable-dashboard.tsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { Plus, Target } from "lucide-react"
import { useGoals } from "@/lib/goals-context"

export function FinancialGoals() {
  const { goals } = useGoals()

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center space-x-2">
          <Target className="h-5 w-5" />
          <span>Financial Goals</span>
        </CardTitle>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-1" />
          Add Goal
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {goals.map((goal) => {
          const progress = (goal.currentAmount / goal.targetAmount) * 100
          const daysLeft = Math.ceil((new Date(goal.deadline).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))

          return (
            <div key={goal.id} className="space-y-2">
              <div className="flex justify-between items-center">
                <h4 className="font-medium">{goal.title}</h4>
                <span className="text-sm text-muted-foreground">
                  {daysLeft > 0 ? `${daysLeft} days left` : "Overdue"}
                </span>
              </div>
              <Progress value={progress} className="h-2" />
              <div className="flex justify-between text-sm">
                <span>₹{goal.currentAmount.toLocaleString()}</span>
                <span className="text-muted-foreground">₹{goal.targetAmount.toLocaleString()}</span>
              </div>
              <div className="text-xs text-muted-foreground">{progress.toFixed(1)}% complete</div>
            </div>
          )
        })}
      </CardContent>
    </Card>
  )
}