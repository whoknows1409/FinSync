// components/budget/recurring-budgets.tsx
"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format, addMonths, isAfter } from "date-fns"
import { CalendarIcon, RefreshCw, Plus, Edit, Trash2, AlertCircle } from "lucide-react"
import { useBudget } from "@/lib/budget-context"
import { budgetAPI } from "@/lib/api-service"

const categories = [
  "Food",
  "Transportation",
  "Utilities",
  "Entertainment",
  "Healthcare",
  "Shopping",
  "Education",
  "Travel",
  "Other",
]

interface RecurringBudget {
  id: string
  category: string
  amount: number
  period: 'daily' | 'weekly' | 'monthly' | 'yearly'
  startDate: string
  endDate?: string
  carryForward: boolean
  isActive: boolean
  lastReset?: string
  nextReset?: string
}

export function RecurringBudgets() {
  const { budgets, setBudget } = useBudget()
  const [recurringBudgets, setRecurringBudgets] = useState<RecurringBudget[]>([])
  const [showForm, setShowForm] = useState(false)
  const [editingBudget, setEditingBudget] = useState<RecurringBudget | null>(null)
  const [showCalendar, setShowCalendar] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    amount: 0,
    period: 'monthly' as 'daily' | 'weekly' | 'monthly' | 'yearly',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    carryForward: false,
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch recurring budgets from backend on component mount
  useEffect(() => {
    fetchRecurringBudgets()
  }, [])

  const fetchRecurringBudgets = async () => {
    try {
      setLoading(true)
      setError(null)
      const response = await budgetAPI.getBudgets()
      // Format response data to match our RecurringBudget interface
      const formattedBudgets: RecurringBudget[] = response.data
        .filter((budget: any) => ['daily', 'weekly', 'monthly', 'yearly'].includes(budget.period))
        .map((budget: any) => {
          // Calculate next reset date based on start date and period
          const startDate = new Date(budget.startDate);
          let nextReset = new Date(startDate);
          
          switch (budget.period) {
            case 'daily':
              nextReset.setDate(startDate.getDate() + 1);
              break;
            case 'weekly':
              nextReset.setDate(startDate.getDate() + 7);
              break;
            case 'monthly':
              nextReset.setMonth(startDate.getMonth() + 1);
              break;
            case 'yearly':
              nextReset.setFullYear(startDate.getFullYear() + 1);
              break;
          }

          return {
            id: budget._id,
            category: budget.category,
            amount: budget.totalAmount || 0,
            period: budget.period as 'daily' | 'weekly' | 'monthly' | 'yearly',
            startDate: new Date(budget.startDate).toISOString().split('T')[0],
            endDate: budget.endDate ? new Date(budget.endDate).toISOString().split('T')[0] : undefined,
            carryForward: budget.carryForward || false,
            isActive: budget.isActive,
            lastReset: budget.lastReset ? new Date(budget.lastReset).toISOString().split('T')[0] : undefined,
            nextReset: nextReset.toISOString().split('T')[0]
          };
        })
      setRecurringBudgets(formattedBudgets)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch recurring budgets")
    } finally {
      setLoading(false)
    }
  }

  const handleAddBudget = () => {
    setFormData({
      name: '',
      category: '',
      amount: 0,
      period: 'monthly',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      carryForward: false,
    })
    setEditingBudget(null)
    setShowForm(true)
  }

  const handleEditBudget = (budget: RecurringBudget) => {
    setFormData({
      name: budget.category,
      category: budget.category,
      amount: budget.amount,
      period: budget.period,
      startDate: budget.startDate,
      endDate: budget.endDate || '',
      carryForward: budget.carryForward,
    })
    setEditingBudget(budget)
    setShowForm(true)
  }

  const handleDeleteBudget = async (id: string) => {
    if (confirm('Are you sure you want to delete this recurring budget?')) {
      try {
        setLoading(true)
        setError(null)
        await budgetAPI.deleteBudget(id)
        setRecurringBudgets(prev => prev.filter(b => b.id !== id))
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to delete recurring budget")
      } finally {
        setLoading(false)
      }
    }
  }

  const handleToggleActive = async (id: string, isActive: boolean) => {
    try {
      setLoading(true)
      setError(null)
      const budget = recurringBudgets.find(b => b.id === id)
      if (budget) {
        // Update in local state immediately for responsive UI
        setRecurringBudgets(prev => 
          prev.map(b => b.id === id ? { ...b, isActive } : b)
        )
        // Then update on the backend
        await budgetAPI.updateBudget(id, { status: isActive ? 'active' : 'inactive' })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update budget status")
      // Revert local state if API call fails
      setRecurringBudgets(prev => 
        prev.map(b => b.id === id ? { ...b, isActive: !isActive } : b)
      )
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.category || !formData.amount || !formData.startDate) {
      setError('Please fill in all required fields')
      return
    }

    try {
      setLoading(true)
      setError(null)
      
      const budgetData = {
        name: formData.name,
        category: formData.category,
        totalAmount: formData.amount,
        period: formData.period,
        startDate: formData.startDate,
        endDate: formData.endDate || undefined,
        isRollover: formData.carryForward,
        status: 'active'
      }

      if (editingBudget) {
        // Update existing budget
        await budgetAPI.updateBudget(editingBudget.id, budgetData)
        // Refetch to ensure we have the latest data
        await fetchRecurringBudgets()
      } else {
        // Create new budget
        await budgetAPI.addBudget(budgetData)
        // Refetch to ensure we have the latest data
        await fetchRecurringBudgets()
      }

      setShowForm(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save recurring budget")
    } finally {
      setLoading(false)
    }
  }

  const handleResetBudget = async (id: string) => {
    const budget = recurringBudgets.find(b => b.id === id)
    if (!budget) return

    try {
      setLoading(true)
      setError(null)
      
      // Create a new budget for the current period using the updated setBudget function
      await setBudget('Auto Reset Budget', budget.category, budget.amount || 0, budget.period)

      // Update the recurring budget's next reset date on the backend
      const nextReset = new Date(budget.nextReset || new Date())
      let newNextReset = new Date(nextReset)
      
      switch (budget.period) {
        case 'daily':
          newNextReset.setDate(nextReset.getDate() + 1)
          break
        case 'weekly':
          newNextReset.setDate(nextReset.getDate() + 7)
          break
        case 'monthly':
          newNextReset.setMonth(nextReset.getMonth() + 1)
          break
        case 'yearly':
          newNextReset.setFullYear(nextReset.getFullYear() + 1)
          break
      }

      await budgetAPI.updateBudget(id, {
        lastReset: new Date().toISOString().split('T')[0],
        nextReset: newNextReset.toISOString().split('T')[0]
      })

      // Refresh the list to show updated data
      await fetchRecurringBudgets()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reset budget")
    } finally {
      setLoading(false)
    }
  }

  const getPeriodText = (period: string) => {
    switch (period) {
      case 'weekly': return 'Weekly'
      case 'monthly': return 'Monthly'
      case 'yearly': return 'Yearly'
      default: return period
    }
  }

  const isResetDue = (nextReset?: string) => {
    if (!nextReset) return false
    return isAfter(new Date(), new Date(nextReset))
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Recurring Budgets
            </CardTitle>
            <CardDescription>
              Auto-reset budgets every month (or week). Option to carry forward unused budget to the next cycle.
            </CardDescription>
          </div>
          <Button onClick={handleAddBudget}>
            <Plus className="mr-2 h-4 w-4" />
            Add Recurring
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {recurringBudgets.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No recurring budgets set up yet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recurringBudgets.map((budget) => (
              <div key={budget.id} className="border rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{budget.category}</h3>
                      <Badge variant={budget.isActive ? "default" : "secondary"}>
                        {budget.isActive ? "Active" : "Inactive"}
                      </Badge>
                      {isResetDue(budget.nextReset) && (
                        <Badge variant="destructive">Reset Due</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>₹{budget.amount.toLocaleString()}</span>
                      <span>•</span>
                      <span>{getPeriodText(budget.period)}</span>
                      <span>•</span>
                      <span>Start: {budget.startDate}</span>
                    </div>
                    {budget.carryForward && (
                      <div className="text-xs bg-green-50 text-green-800 px-2 py-1 rounded mt-2 inline-block">
                        Unused budget carries forward
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={budget.isActive}
                      onCheckedChange={(checked) => handleToggleActive(budget.id, checked)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditBudget(budget)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteBudget(budget.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    {budget.isActive && isResetDue(budget.nextReset) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResetBudget(budget.id)}
                      >
                        Reset Now
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add/Edit Form */}
        {showForm && (
          <div className="border rounded-lg p-4 mt-4">
            <h3 className="font-medium mb-4">
              {editingBudget ? 'Edit Recurring Budget' : 'Add Recurring Budget'}
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Budget Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Enter budget name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select 
                  value={formData.category}
                  onValueChange={(value) => setFormData({...formData, category: value})}
                >
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
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  value={formData.amount || ''}
                  onChange={(e) => setFormData({...formData, amount: Number(e.target.value)})}
                  min="0"
                  step="0.01"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="period">Period</Label>
                <Select 
                  value={formData.period} 
                  onValueChange={(value: any) => setFormData({...formData, period: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                />
              </div>
              <div className="space-y-2 col-span-2">
                <Label htmlFor="endDate">End Date (Optional)</Label>
                <Input
                  id="endDate"
                  type="date"
                  value={formData.endDate}
                  onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                />
              </div>
              <div className="flex items-center justify-between col-span-2">
                <div className="space-y-0.5">
                  <Label htmlFor="carryForward">Carry Forward</Label>
                  <p className="text-sm text-muted-foreground">
                    Carry unused amount to next period
                  </p>
                </div>
                <Switch
                  id="carryForward"
                  checked={formData.carryForward}
                  onCheckedChange={(checked) => setFormData({...formData, carryForward: checked})}
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                {editingBudget ? 'Update' : 'Add'} Budget
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}