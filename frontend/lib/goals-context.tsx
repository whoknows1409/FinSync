"use client"

import type React from "react"
import { createContext, useContext, useState } from "react"

interface FinancialGoal {
  id: string
  title: string
  targetAmount: number
  currentAmount: number
  deadline: string
  category: "savings" | "investment" | "debt" | "emergency"
}

interface GoalsContextType {
  goals: FinancialGoal[]
  addGoal: (goal: Omit<FinancialGoal, "id">) => void
  updateGoal: (id: string, updates: Partial<FinancialGoal>) => void
  deleteGoal: (id: string) => void
}

const GoalsContext = createContext<GoalsContextType | undefined>(undefined)

export function GoalsProvider({ children }: { children: React.ReactNode }) {
  const [goals, setGoals] = useState<FinancialGoal[]>([
    {
      id: "1",
      title: "Emergency Fund",
      targetAmount: 100000,
      currentAmount: 45000,
      deadline: "2024-12-31",
      category: "emergency",
    },
    {
      id: "2",
      title: "Vacation Fund",
      targetAmount: 50000,
      currentAmount: 12000,
      deadline: "2024-06-30",
      category: "savings",
    },
  ])

  const addGoal = (goal: Omit<FinancialGoal, "id">) => {
    const newGoal: FinancialGoal = {
      ...goal,
      id: Math.random().toString(36).substr(2, 9),
    }
    setGoals((prev) => [...prev, newGoal])
  }

  const updateGoal = (id: string, updates: Partial<FinancialGoal>) => {
    setGoals((prev) => prev.map((goal) => (goal.id === id ? { ...goal, ...updates } : goal)))
  }

  const deleteGoal = (id: string) => {
    setGoals((prev) => prev.filter((goal) => goal.id !== id))
  }

  return <GoalsContext.Provider value={{ goals, addGoal, updateGoal, deleteGoal }}>{children}</GoalsContext.Provider>
}

export function useGoals() {
  const context = useContext(GoalsContext)
  if (context === undefined) {
    throw new Error("useGoals must be used within a GoalsProvider")
  }
  return context
}
