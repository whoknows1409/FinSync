"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Loader2,
  Minus,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Target,
  Trash2,
  Wallet,
} from "lucide-react"
import {
  useGoals,
  type FinancialGoal,
  type GoalInput,
  type GoalPriority,
  type GoalType,
} from "@/lib/goals-context"
import { cn, formatCurrency, formatDate } from "@/lib/utils"

const GOAL_TYPES: { value: GoalType; label: string }[] = [
  { value: "savings", label: "Savings" },
  { value: "emergency_fund", label: "Emergency fund" },
  { value: "purchase", label: "Purchase" },
  { value: "investment", label: "Investment" },
  { value: "debt_payment", label: "Debt repayment" },
  { value: "retirement", label: "Retirement" },
  { value: "other", label: "Other" },
]

const PRIORITIES: { value: GoalPriority; label: string }[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "critical", label: "Critical" },
]

const typeLabel = (type: GoalType) => GOAL_TYPES.find((t) => t.value === type)?.label || "Other"

const toDateInput = (value?: string) => (value ? new Date(value).toISOString().slice(0, 10) : "")

// Tomorrow, as the earliest date a new goal can target
const minTargetDate = () => {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  return tomorrow.toISOString().slice(0, 10)
}

interface GoalDialogProps {
  open: boolean
  goal: FinancialGoal | null
  onClose: () => void
}

function GoalDialog({ open, goal, onClose }: GoalDialogProps) {
  const { addGoal, updateGoal } = useGoals()
  const [name, setName] = useState("")
  const [type, setType] = useState<GoalType>("savings")
  const [targetAmount, setTargetAmount] = useState("")
  const [currentAmount, setCurrentAmount] = useState("")
  const [targetDate, setTargetDate] = useState("")
  const [priority, setPriority] = useState<GoalPriority>("medium")
  const [notes, setNotes] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Fill the form each time the dialog opens
  useEffect(() => {
    if (!open) return
    setName(goal?.name || "")
    setType(goal?.type || "savings")
    setTargetAmount(goal ? String(goal.targetAmount) : "")
    setCurrentAmount("")
    setTargetDate(toDateInput(goal?.targetDate))
    setPriority(goal?.priority || "medium")
    setNotes(goal?.notes || "")
    setFormError(null)
  }, [open, goal])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()

    const target = Number(targetAmount)
    const saved = Number(currentAmount) || 0
    if (!name.trim()) return setFormError("Give the goal a name")
    if (!(target > 0)) return setFormError("Enter a target amount greater than zero")
    if (saved < 0) return setFormError("The amount already saved cannot be negative")
    if (!targetDate) return setFormError("Choose a target date")

    setFormError(null)
    setSaving(true)

    const input: GoalInput = {
      name: name.trim(),
      type,
      targetAmount: target,
      targetDate,
      priority,
      notes: notes.trim(),
    }
    const ok = goal
      ? await updateGoal(goal._id, input)
      : await addGoal({ ...input, currentAmount: saved })

    setSaving(false)
    if (ok) onClose()
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen: boolean) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{goal ? "Edit goal" : "New goal"}</DialogTitle>
          <DialogDescription>
            {goal ? "Change the target, date or priority." : "Set what you are saving for, how much, and by when."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="goal-name">Name</Label>
            <Input
              id="goal-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Emergency fund, new laptop, Goa trip"
              maxLength={100}
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={(value) => setType(value as GoalType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GOAL_TYPES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(value) => setPriority(value as GoalPriority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((option) => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="goal-target">Target amount (₹)</Label>
              <Input
                id="goal-target"
                type="number"
                min="1"
                step="any"
                inputMode="decimal"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="100000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="goal-date">Target date</Label>
              <Input
                id="goal-date"
                type="date"
                min={goal ? undefined : minTargetDate()}
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
              />
            </div>
          </div>

          {!goal && (
            <div className="space-y-2">
              <Label htmlFor="goal-saved">Already saved (₹, optional)</Label>
              <Input
                id="goal-saved"
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={currentAmount}
                onChange={(e) => setCurrentAmount(e.target.value)}
                placeholder="0"
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="goal-notes">Notes (optional)</Label>
            <Textarea
              id="goal-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={1000}
              rows={2}
            />
          </div>

          {formError && <p className="text-sm text-red-600" role="alert">{formError}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {goal ? "Save changes" : "Create goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface MoneyDialogProps {
  goal: FinancialGoal | null
  mode: "add" | "withdraw"
  onClose: () => void
}

function MoneyDialog({ goal, mode, onClose }: MoneyDialogProps) {
  const { contribute } = useGoals()
  const [amount, setAmount] = useState("")
  const [notes, setNotes] = useState("")
  const [formError, setFormError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!goal) return
    setAmount("")
    setNotes("")
    setFormError(null)
  }, [goal, mode])

  if (!goal) return null

  const adding = mode === "add"

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    const value = Number(amount)
    if (!(value > 0)) return setFormError("Enter an amount greater than zero")
    if (!adding && value > goal.currentAmount) {
      return setFormError(`You can take out at most ${formatCurrency(goal.currentAmount)}`)
    }

    setFormError(null)
    setSaving(true)
    const ok = await contribute(goal._id, adding ? value : -value, notes.trim() || undefined)
    setSaving(false)
    if (ok) onClose()
  }

  return (
    <Dialog open onOpenChange={(isOpen: boolean) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[420px]">
        <DialogHeader>
          <DialogTitle>{adding ? "Add money" : "Take money out"}</DialogTitle>
          <DialogDescription>
            {goal.name}: {formatCurrency(goal.currentAmount)} saved of {formatCurrency(goal.targetAmount)}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="money-amount">Amount (₹)</Label>
            <Input
              id="money-amount"
              type="number"
              min="0"
              step="any"
              inputMode="decimal"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="money-notes">Note (optional)</Label>
            <Input
              id="money-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={200}
              placeholder={adding ? "Bonus, monthly transfer" : "Why you are taking it out"}
            />
          </div>

          {formError && <p className="text-sm text-red-600" role="alert">{formError}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {adding ? "Add money" : "Take out"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface GoalCardProps {
  goal: FinancialGoal
  onEdit: () => void
  onMoney: (mode: "add" | "withdraw") => void
}

function GoalCard({ goal, onEdit, onMoney }: GoalCardProps) {
  const { updateGoal, deleteGoal } = useGoals()
  const [showHistory, setShowHistory] = useState(false)
  const [busy, setBusy] = useState(false)

  const completed = goal.status === "completed"
  const paused = goal.status === "paused"
  const overdue = !completed && new Date(goal.targetDate).getTime() < Date.now()
  const progress = Math.min(100, Math.max(0, goal.progressPercentage || 0))

  // What it takes each month to arrive on time
  const monthsLeft = Math.max(1, Math.ceil((goal.daysRemaining || 0) / 30))
  const monthlyNeed = goal.amountRemaining > 0 && !overdue ? goal.amountRemaining / monthsLeft : 0

  const history = [...(goal.contributions || [])]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 8)

  const run = async (action: () => Promise<boolean>) => {
    setBusy(true)
    await action()
    setBusy(false)
  }

  const handleDelete = () => {
    if (confirm(`Delete the goal "${goal.name}"? Its history will be removed too.`)) {
      run(() => deleteGoal(goal._id))
    }
  }

  return (
    <Card className={cn(paused && "opacity-75")}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate text-lg">{goal.name}</CardTitle>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline">{typeLabel(goal.type)}</Badge>
              {completed && <Badge className="bg-green-600 hover:bg-green-600">Reached</Badge>}
              {paused && <Badge variant="secondary">Paused</Badge>}
              {overdue && <Badge variant="destructive">Past target date</Badge>}
              {goal.priority === "high" || goal.priority === "critical" ? (
                <Badge variant="secondary" className="capitalize">{goal.priority} priority</Badge>
              ) : null}
            </div>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit} aria-label="Edit goal" title="Edit">
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-600 hover:text-red-700"
              onClick={handleDelete}
              disabled={busy}
              aria-label="Delete goal"
              title="Delete"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-2xl font-bold">{formatCurrency(goal.currentAmount)}</span>
            <span className="text-sm text-muted-foreground">of {formatCurrency(goal.targetAmount)}</span>
          </div>
          <Progress value={progress} className="h-2" />
          <div className="flex flex-wrap justify-between gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span>{goal.progressPercentage || 0}% saved</span>
            <span>
              {completed
                ? "Target reached"
                : overdue
                  ? `Was due ${formatDate(goal.targetDate)}`
                  : `${goal.daysRemaining} day${goal.daysRemaining === 1 ? "" : "s"} left (${formatDate(goal.targetDate)})`}
            </span>
          </div>
        </div>

        {!completed && goal.amountRemaining > 0 && (
          <p className="text-sm">
            {formatCurrency(goal.amountRemaining)} to go
            {monthlyNeed > 0 && (
              <span className="text-muted-foreground"> · about {formatCurrency(monthlyNeed)} a month to arrive on time</span>
            )}
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => onMoney("add")} disabled={busy}>
            <Plus className="mr-1 h-4 w-4" />
            Add money
          </Button>
          <Button size="sm" variant="outline" onClick={() => onMoney("withdraw")} disabled={busy || goal.currentAmount <= 0}>
            <Minus className="mr-1 h-4 w-4" />
            Take out
          </Button>
          {!completed && (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => run(() => updateGoal(goal._id, { status: paused ? "active" : "paused" }))}
            >
              {paused ? <Play className="mr-1 h-4 w-4" /> : <Pause className="mr-1 h-4 w-4" />}
              {paused ? "Resume" : "Pause"}
            </Button>
          )}
        </div>

        {history.length > 0 && (
          <div>
            <button
              type="button"
              className="flex items-center text-sm text-muted-foreground hover:text-foreground"
              onClick={() => setShowHistory((shown) => !shown)}
              aria-expanded={showHistory}
            >
              {showHistory ? <ChevronUp className="mr-1 h-4 w-4" /> : <ChevronDown className="mr-1 h-4 w-4" />}
              History ({goal.contributions.length})
            </button>
            {showHistory && (
              <ul className="mt-2 space-y-1 text-sm">
                {history.map((entry, index) => (
                  <li key={entry._id || index} className="flex justify-between gap-3">
                    <span className="min-w-0 truncate text-muted-foreground">
                      {formatDate(entry.date)}
                      {entry.notes ? ` · ${entry.notes}` : entry.source ? ` · ${entry.source}` : ""}
                    </span>
                    <span className={cn("shrink-0 font-medium", entry.amount < 0 ? "text-red-600" : "text-green-600")}>
                      {entry.amount < 0 ? "−" : "+"}{formatCurrency(Math.abs(entry.amount))}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default function GoalsPage() {
  const { goals, summary, loading, error, refreshGoals } = useGoals()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingGoal, setEditingGoal] = useState<FinancialGoal | null>(null)
  const [moneyGoal, setMoneyGoal] = useState<{ goal: FinancialGoal; mode: "add" | "withdraw" } | null>(null)

  const openGoals = goals.filter((goal) => goal.status === "active" || goal.status === "paused")
  const finishedGoals = goals.filter((goal) => goal.status === "completed" || goal.status === "cancelled")
  const overallProgress = summary.totalTargetAmount > 0
    ? Math.min(100, Math.round((summary.totalSavedAmount / summary.totalTargetAmount) * 100))
    : 0

  const openCreate = () => {
    setEditingGoal(null)
    setDialogOpen(true)
  }

  const openEdit = (goal: FinancialGoal) => {
    setEditingGoal(goal)
    setDialogOpen(true)
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 md:p-0">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Goals</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Save towards the things that matter and track how close you are</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={refreshGoals} variant="outline" disabled={loading} className="flex-1 sm:flex-initial">
            <RefreshCw className={cn("mr-2 h-4 w-4", loading && "animate-spin")} />
            Refresh
          </Button>
          <Button onClick={openCreate} className="flex-1 sm:flex-initial">
            <Plus className="mr-2 h-4 w-4" />
            New goal
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-300">
          <CardContent className="py-4 text-sm text-red-600">{error}</CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active goals</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.activeGoals}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Saved so far</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(summary.totalSavedAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {summary.totalTargetAmount > 0
                ? `${overallProgress}% of ${formatCurrency(summary.totalTargetAmount)}`
                : "No targets set yet"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Goals reached</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.completedGoals}</div>
          </CardContent>
        </Card>
      </div>

      {loading && goals.length === 0 ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : goals.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Target className="h-10 w-10 text-muted-foreground" />
            <div>
              <p className="font-medium">No goals yet</p>
              <p className="text-sm text-muted-foreground">
                Create one for an emergency fund, a purchase or a trip, then add money as you save.
              </p>
            </div>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create your first goal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {openGoals.length > 0 && (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              {openGoals.map((goal) => (
                <GoalCard
                  key={goal._id}
                  goal={goal}
                  onEdit={() => openEdit(goal)}
                  onMoney={(mode) => setMoneyGoal({ goal, mode })}
                />
              ))}
            </div>
          )}

          {finishedGoals.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-lg font-semibold">Finished</h2>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {finishedGoals.map((goal) => (
                  <GoalCard
                    key={goal._id}
                    goal={goal}
                    onEdit={() => openEdit(goal)}
                    onMoney={(mode) => setMoneyGoal({ goal, mode })}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <GoalDialog open={dialogOpen} goal={editingGoal} onClose={() => setDialogOpen(false)} />
      <MoneyDialog goal={moneyGoal?.goal || null} mode={moneyGoal?.mode || "add"} onClose={() => setMoneyGoal(null)} />
    </div>
  )
}
