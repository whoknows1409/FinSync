"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useTransactions } from "./transactions-context"
import { useBudget } from "./budget-context"

interface Notification {
  id: string
  type: "warning" | "error" | "info"
  title: string
  message: string
  timestamp: Date
  read: boolean
}

interface NotificationsContextType {
  notifications: Notification[]
  unreadCount: number
  markAsRead: (id: string) => void
  markAllAsRead: () => void
  addNotification: (notification: Omit<Notification, "id" | "timestamp" | "read">) => void
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined)

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const { transactions } = useTransactions()
  const { budgets } = useBudget()

  const addNotification = (notification: Omit<Notification, "id" | "timestamp" | "read">) => {
    const newNotification: Notification = {
      ...notification,
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      read: false,
    }
    setNotifications((prev) => [newNotification, ...prev])
  }

  const markAsRead = (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
  }

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }

  useEffect(() => {
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()

    // Check budget alerts
    Object.entries(budgets).forEach(([category, budget]) => {
      const monthlySpent = transactions
        .filter(
          (t) =>
            t.type === "expense" &&
            t.category === category &&
            new Date(t.date).getMonth() === currentMonth &&
            new Date(t.date).getFullYear() === currentYear,
        )
        .reduce((sum, t) => sum + t.amount, 0)

      // Ensure budget is treated as a number for arithmetic operations
      const percentage = (monthlySpent / Number(budget)) * 100

      if (percentage >= 100) {
        addNotification({
          type: "error",
          title: "Budget Exceeded",
          message: `You've exceeded your ${category} budget by ₹${(monthlySpent - Number(budget)).toFixed(2)}`,
        })
      } else if (percentage >= 80) {
        addNotification({
          type: "warning",
          title: "Budget Alert",
          message: `You've used ${percentage.toFixed(0)}% of your ${category} budget`,
        })
      }
    })

    // Check for unusual expenses (>₹5000)
    const recentLargeExpenses = transactions.filter(
      (t) =>
        t.type === "expense" && t.amount > 5000 && new Date(t.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
    )

    if (recentLargeExpenses.length > 0) {
      addNotification({
        type: "info",
        title: "Large Expense Detected",
        message: `You had ${recentLargeExpenses.length} large expense(s) this week`,
      })
    }
  }, [transactions, budgets])

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        addNotification,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationsContext)
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationsProvider")
  }
  return context
}
