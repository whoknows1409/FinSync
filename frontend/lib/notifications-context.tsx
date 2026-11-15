"use client"

import type React from "react"
import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react"
import { notificationAPI } from "./api-service"
import { useAuth } from "./auth-context"
import { useTransactions } from "./transactions-context"

export interface Notification {
  id: string
  type: "warning" | "error" | "info" | "success"
  category: string
  title: string
  message: string
  link?: string
  timestamp: Date
  read: boolean
}

interface NotificationsContextType {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  refresh: () => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  removeNotification: (id: string) => Promise<void>
  clearAll: () => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined)

// How often to check the server for new notifications while the app is open
const REFRESH_INTERVAL_MS = 60 * 1000

const toNotification = (item: any): Notification => ({
  id: item.id || item._id,
  type: item.severity || "info",
  category: item.category,
  title: item.title,
  message: item.message,
  link: item.link,
  timestamp: new Date(item.createdAt),
  read: !!item.read,
})

// Notifications are created and stored by the server (budget alerts, filled
// orders, recurring transactions and so on). This provider only fetches them
// and records what the user has read or dismissed.
export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  const { transactions } = useTransactions()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const userId = user?.id
  const activeUser = useRef<string | undefined>(userId)
  activeUser.current = userId

  const refresh = useCallback(async () => {
    if (!userId) return
    try {
      const response = await notificationAPI.getNotifications()
      // Ignore a response that arrives after the user has signed out or changed
      if (activeUser.current !== userId) return
      setNotifications((response.data?.notifications || []).map(toNotification))
      setUnreadCount(response.data?.unreadCount || 0)
    } catch {
      // Notifications are not critical: keep what is shown and try again later
    }
  }, [userId])

  // Load on sign-in, clear on sign-out, then keep checking in the background
  useEffect(() => {
    if (!userId) {
      setNotifications([])
      setUnreadCount(0)
      return
    }

    setLoading(true)
    refresh().finally(() => setLoading(false))

    const interval = setInterval(refresh, REFRESH_INTERVAL_MS)
    const onFocus = () => refresh()
    window.addEventListener("focus", onFocus)
    return () => {
      clearInterval(interval)
      window.removeEventListener("focus", onFocus)
    }
  }, [userId, refresh])

  // A new or changed transaction can trigger a budget alert, so check right away
  const transactionCount = transactions.length
  useEffect(() => {
    if (!userId) return
    const timeout = setTimeout(refresh, 1500)
    return () => clearTimeout(timeout)
  }, [transactionCount, userId, refresh])

  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)))
    setUnreadCount((count) => Math.max(0, count - 1))
    try {
      await notificationAPI.markAsRead(id)
    } catch {
      refresh()
    }
  }, [refresh])

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    setUnreadCount(0)
    try {
      await notificationAPI.markAllAsRead()
    } catch {
      refresh()
    }
  }, [refresh])

  const removeNotification = useCallback(async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
    try {
      await notificationAPI.deleteNotification(id)
    } finally {
      refresh()
    }
  }, [refresh])

  const clearAll = useCallback(async () => {
    setNotifications([])
    setUnreadCount(0)
    try {
      await notificationAPI.clearNotifications()
    } catch {
      refresh()
    }
  }, [refresh])

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        refresh,
        markAsRead,
        markAllAsRead,
        removeNotification,
        clearAll,
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
