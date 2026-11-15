"use client"

import type React from "react"
import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { toast } from "sonner"
import { goalAPI } from "./api-service"
import { useAuth } from "./auth-context"

export type GoalType =
  | "savings"
  | "debt_payment"
  | "investment"
  | "purchase"
  | "emergency_fund"
  | "retirement"
  | "other"

export type GoalPriority = "low" | "medium" | "high" | "critical"
export type GoalStatus = "active" | "paused" | "completed" | "cancelled"

export interface GoalContribution {
  _id?: string
  amount: number
  date: string
  source?: string
  notes?: string
}

export interface FinancialGoal {
  _id: string
  name: string
  description?: string
  type: GoalType
  targetAmount: number
  currentAmount: number
  targetDate: string
  priority: GoalPriority
  status: GoalStatus
  notes?: string
  contributions: GoalContribution[]
  // Calculated by the server
  progressPercentage: number
  daysRemaining: number
  amountRemaining: number
  createdAt?: string
}

export interface GoalInput {
  name: string
  type: GoalType
  targetAmount: number
  targetDate: string
  priority?: GoalPriority
  notes?: string
  // Money already saved when the goal is created
  currentAmount?: number
}

export interface GoalsSummary {
  totalGoals: number
  activeGoals: number
  completedGoals: number
  totalTargetAmount: number
  totalSavedAmount: number
}

interface GoalsContextType {
  goals: FinancialGoal[]
  summary: GoalsSummary
  loading: boolean
  error: string | null
  refreshGoals: () => Promise<void>
  addGoal: (goal: GoalInput) => Promise<boolean>
  updateGoal: (id: string, updates: Partial<GoalInput> & { status?: GoalStatus }) => Promise<boolean>
  deleteGoal: (id: string) => Promise<boolean>
  // A negative amount takes money out of the goal
  contribute: (id: string, amount: number, notes?: string) => Promise<boolean>
}

const EMPTY_SUMMARY: GoalsSummary = {
  totalGoals: 0,
  activeGoals: 0,
  completedGoals: 0,
  totalTargetAmount: 0,
  totalSavedAmount: 0,
}

const GoalsContext = createContext<GoalsContextType | undefined>(undefined)

const messageFrom = (error: unknown, fallback: string) => {
  const info = (error as any)?.info
  if (Array.isArray(info?.errors) && info.errors.length > 0) {
    return info.errors.map((e: any) => e.message).join(". ")
  }
  return error instanceof Error && error.message ? error.message : fallback
}

// Goals are stored on the server. Nothing is loaded until a user is signed in.
export function GoalsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id
  const [goals, setGoals] = useState<FinancialGoal[]>([])
  const [summary, setSummary] = useState<GoalsSummary>(EMPTY_SUMMARY)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refreshGoals = useCallback(async () => {
    if (!userId) return
    setLoading(true)
    try {
      const response = await goalAPI.getGoals()
      setGoals(response.data || [])
      setSummary(response.summary || EMPTY_SUMMARY)
      setError(null)
    } catch (err) {
      setError(messageFrom(err, "Failed to load goals"))
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    if (!userId) {
      setGoals([])
      setSummary(EMPTY_SUMMARY)
      return
    }
    refreshGoals()
  }, [userId, refreshGoals])

  const addGoal = async (goal: GoalInput) => {
    try {
      await goalAPI.addGoal(goal)
      await refreshGoals()
      toast.success("Goal created")
      return true
    } catch (err) {
      toast.error(messageFrom(err, "Failed to create goal"))
      return false
    }
  }

  const updateGoal = async (id: string, updates: Partial<GoalInput> & { status?: GoalStatus }) => {
    try {
      await goalAPI.updateGoal(id, updates)
      await refreshGoals()
      toast.success("Goal updated")
      return true
    } catch (err) {
      toast.error(messageFrom(err, "Failed to update goal"))
      return false
    }
  }

  const deleteGoal = async (id: string) => {
    try {
      await goalAPI.deleteGoal(id)
      await refreshGoals()
      toast.success("Goal deleted")
      return true
    } catch (err) {
      toast.error(messageFrom(err, "Failed to delete goal"))
      return false
    }
  }

  const contribute = async (id: string, amount: number, notes?: string) => {
    try {
      const response = await goalAPI.addContribution(id, { amount, notes })
      await refreshGoals()
      if (amount > 0 && response.data?.status === "completed") {
        toast.success("Goal reached!")
      } else {
        toast.success(amount > 0 ? "Money added to goal" : "Money taken out of goal")
      }
      return true
    } catch (err) {
      toast.error(messageFrom(err, "Failed to update goal"))
      return false
    }
  }

  return (
    <GoalsContext.Provider
      value={{ goals, summary, loading, error, refreshGoals, addGoal, updateGoal, deleteGoal, contribute }}
    >
      {children}
    </GoalsContext.Provider>
  )
}

export function useGoals() {
  const context = useContext(GoalsContext)
  if (context === undefined) {
    throw new Error("useGoals must be used within a GoalsProvider")
  }
  return context
}
