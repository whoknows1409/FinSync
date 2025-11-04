// frontend/components/analysis/biggest-expense-card.tsx
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { TrendingUp, IndianRupee } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ExpenseData {
  category: string
  amount: number
  count: number
  avgAmount: number
  percentage: number
}

export function BiggestExpenseCard() {
  const [biggestExpense, setBiggestExpense] = useState<ExpenseData | null>(null)
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
          throw new Error('Failed to fetch expense breakdown')
        }

        const data = await response.json()
        // Get the first item (biggest expense category)
        if (data.data.breakdown && data.data.breakdown.length > 0) {
          setBiggestExpense(data.data.breakdown[0])
        } else {
          setBiggestExpense(null)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error')
        toast({
          title: "Error",
          description: "Failed to fetch biggest expense.",
          variant: "destructive",
        })
      } finally {
        setLoading(false)
      }
    }

    fetchExpenseBreakdown()
  }, [toast])

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Biggest Expense</CardTitle>
          <CardDescription>Your largest expense this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[100px]">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Biggest Expense</CardTitle>
          <CardDescription>Your largest expense this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[100px]">
            <p className="text-red-500">Error: {error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!biggestExpense) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Biggest Expense</CardTitle>
          <CardDescription>Your largest expense this month</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[100px]">
            <p className="text-muted-foreground">No expense data available for this month</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Biggest Expense</CardTitle>
        <CardDescription>Your largest expense this month</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center space-x-4">
          <div className="p-3 rounded-full bg-red-100 dark:bg-red-900">
            <IndianRupee className="h-6 w-6 text-red-600" />
          </div>
          <div>
            <p className="text-2xl font-bold">₹{biggestExpense.amount.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">{biggestExpense.category}</p>
          </div>
        </div>
        <div className="mt-4 text-sm text-muted-foreground">
          This month your biggest expense was {biggestExpense.category} – ₹{biggestExpense.amount.toLocaleString()} ({biggestExpense.percentage}% of total expenses)
        </div>
      </CardContent>
    </Card>
  )
}