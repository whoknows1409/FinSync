// frontend/components/analysis/recurring-expenses-card.tsx
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useTransactions } from "@/lib/transactions-context"
import type { RecurringTransaction } from "@/lib/transactions-context"

export function RecurringExpensesCard() {
  const { recurringTransactions } = useTransactions()

  // Format date function
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(date)
  }

  // Format currency function
  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString()}`
  }

  // Calculate next expected date based on start date and frequency
  const getNextExpectedDate = (startDate: string, frequency: string) => {
    const date = new Date(startDate)
    const today = new Date()
    
    // Simple logic to calculate next occurrence
    switch(frequency) {
      case 'daily':
        date.setDate(today.getDate() + 1)
        break
      case 'weekly':
        date.setDate(today.getDate() + (7 - today.getDay()))
        break
      case 'monthly':
        date.setMonth(today.getMonth() + 1)
        break
      case 'yearly':
        date.setFullYear(today.getFullYear() + 1)
        break
      default:
        break
    }
    
    return date.toISOString().split('T')[0]
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recurring Expenses</CardTitle>
        <CardDescription>Manage and track your regular expenses</CardDescription>
      </CardHeader>
      <CardContent>
        {recurringTransactions.length === 0 ? (
          <div className="flex items-center justify-center h-[100px]">
            <p className="text-muted-foreground">No recurring expenses defined yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recurringTransactions.map((transaction) => (
              <div key={transaction._id} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-1">
                  <div className="font-medium">{transaction.description}</div>
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <span>{transaction.category}</span>
                    <span>•</span>
                    <span>{transaction.frequency}</span>
                  </div>
                </div>
                <div className="text-right space-y-1">
                  <div className="font-semibold">{formatCurrency(transaction.amount)}</div>
                  <div className="text-sm text-muted-foreground">
                    Next: {formatDate(getNextExpectedDate(transaction.startDate, transaction.frequency))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}