// app/(app)/notifications/page.tsx
"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CheckCircle2,
  History,
  Info,
  Loader2,
  RefreshCw,
  Trash2,
  X,
  XCircle,
} from "lucide-react"
import { profileAPI } from "@/lib/api-service"
import { useNotifications, type Notification } from "@/lib/notifications-context"
import { formatDateInIST, formatTimeInIST } from "@/lib/date-utils"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Activity {
  action: string
  time: string
}

const severityIcon = (type: Notification["type"]) => {
  switch (type) {
    case "error":
      return <XCircle className="h-5 w-5 text-red-500" />
    case "warning":
      return <AlertTriangle className="h-5 w-5 text-amber-500" />
    case "success":
      return <CheckCircle2 className="h-5 w-5 text-green-500" />
    default:
      return <Info className="h-5 w-5 text-blue-500" />
  }
}

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    loading,
    refresh,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
  } = useNotifications()
  const [activities, setActivities] = useState<Activity[]>([])
  const [activitiesLoading, setActivitiesLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchActivities = async () => {
    try {
      const response = await profileAPI.getActivities()
      setActivities(response.data)
    } catch (error) {
      console.error('Failed to fetch activities:', error)
    } finally {
      setActivitiesLoading(false)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    try {
      await Promise.all([refresh(), fetchActivities()])
      toast.success('Notifications refreshed')
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleClearAll = async () => {
    if (!confirm('Delete all notifications? This cannot be undone.')) return
    await clearAll()
  }

  useEffect(() => {
    fetchActivities()
  }, [])

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">Alerts about your budgets, orders and recurring transactions</p>
        </div>
        <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
          <div className="space-y-1.5">
            <CardTitle className="flex items-center space-x-2">
              <Bell className="h-5 w-5" />
              <span>Alerts</span>
              {unreadCount > 0 && <Badge>{unreadCount} unread</Badge>}
            </CardTitle>
            <CardDescription>Kept for 90 days</CardDescription>
          </div>
          {notifications.length > 0 && (
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={markAllAsRead} disabled={unreadCount === 0}>
                <CheckCheck className="h-4 w-4 mr-2" />
                Mark all read
              </Button>
              <Button variant="ghost" size="sm" onClick={handleClearAll}>
                <Trash2 className="h-4 w-4 mr-2" />
                Clear all
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {loading && notifications.length === 0 ? (
              Array(4).fill(0).map((_, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/30 animate-pulse">
                  <div className="min-w-0 flex-1">
                    <div className="h-4 w-48 bg-gray-300 rounded mb-1"></div>
                    <div className="h-3 w-72 max-w-full bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))
            ) : notifications.length > 0 ? (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border p-3",
                    notification.read ? "bg-background" : "border-primary/30 bg-muted/50"
                  )}
                >
                  <div className="mt-0.5 shrink-0">{severityIcon(notification.type)}</div>
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm", !notification.read && "font-semibold")}>{notification.title}</p>
                    <p className="text-sm text-muted-foreground break-words">{notification.message}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span>
                        {formatDateInIST(notification.timestamp)}, {formatTimeInIST(notification.timestamp)}
                      </span>
                      {notification.link && (
                        <Link
                          href={notification.link}
                          className="text-primary hover:underline"
                          onClick={() => !notification.read && markAsRead(notification.id)}
                        >
                          View
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    {!notification.read && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => markAsRead(notification.id)}
                        aria-label="Mark as read"
                        title="Mark as read"
                      >
                        <CheckCheck className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeNotification(notification.id)}
                      aria-label="Delete notification"
                      title="Delete"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                You're all caught up. Budget alerts, filled orders and recurring transactions will show up here.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <History className="h-5 w-5" />
            <span>Recent Activities</span>
          </CardTitle>
          <CardDescription>Your latest financial activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {activitiesLoading ? (
              Array(5).fill(0).map((_, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/30 animate-pulse">
                  <div className="min-w-0 flex-1">
                    <div className="h-4 w-48 bg-gray-300 rounded mb-1"></div>
                    <div className="h-3 w-24 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))
            ) : activities.length > 0 ? (
              activities.slice(0, 25).map((activity, index) => (
                <div key={index} className="flex items-start p-3 rounded-lg bg-muted/30">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No recent activity
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
