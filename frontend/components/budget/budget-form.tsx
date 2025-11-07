"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useBudget } from "@/lib/budget-context"
import { useTransactions } from "@/lib/transactions-context"
import { PiggyBank } from "lucide-react"
import { toast } from "sonner"

export function BudgetForm() {
  const { setBudget } = useBudget()
  const { transactions } = useTransactions()
  const [amount, setAmount] = useState<string>('')
  const [category, setCategory] = useState<string>('')
  const [period, setPeriod] = useState<string>('monthly')
  const [carryForward, setCarryForward] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  // Use the same expense categories as transaction form
  const [categories, setCategories] = useState<string[]>([
    "Food & Dining",
    "Transportation",
    "Utilities",
    "Entertainment",
    "Healthcare",
    "Shopping",
    "Housing",
    "Other Expense"
  ])
  
  // Dynamically get unique categories from transactions
  useEffect(() => {
    if (transactions && transactions.length > 0) {
      // Get all unique expense categories from transactions
      const uniqueCategories = [...new Set(
        transactions
          .filter(t => t.type === 'expense' && t.category)
          .map(t => t.category)
      )]
      
      // Predefined expense categories matching transaction form
      const predefinedCategories = [
        "Food & Dining",
        "Transportation",
        "Utilities",
        "Entertainment",
        "Healthcare",
        "Shopping",
        "Housing",
        "Other Expense"
      ];
      
      // Combine with transaction categories and remove duplicates
      const combinedCategories = [...new Set([...uniqueCategories, ...predefinedCategories])]
        .filter(cat => cat !== "Food") // Remove "Food" if it exists
        .sort(); // Sort alphabetically
      
      setCategories(combinedCategories)
    }
  }, [transactions])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!category || !amount) {
      setError('Please select a category and enter an amount')
      return
    }

    const amountNumber = parseFloat(amount)
    if (isNaN(amountNumber) || amountNumber <= 0) {
      setError('Please enter a valid amount')
      return
    }

    try {
      // Use category as the name since we're removing the name field
      await setBudget(category, category, amountNumber, period, { rollover: carryForward })
      setCategory('')
      setAmount('')
      setPeriod('monthly') // Reset to default
      setCarryForward(false) // Reset carry forward
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to set budget. Please try again.')
      console.error(err)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PiggyBank className="h-5 w-5" />
          Set Budget
        </CardTitle>
        <CardDescription>Set spending limits for different categories</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Budget Amount (₹)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              min="0"
              step="0.01"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="period">Period</Label>
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger>
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between space-x-2">
            <Label htmlFor="carryForward">Carry Forward</Label>
            <Switch
              id="carryForward"
              checked={carryForward}
              onCheckedChange={setCarryForward}
            />
          </div>

          {error && (
            <div className="mt-2 p-3 bg-red-50 text-red-700 rounded-md">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full">
            Set Budget
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}