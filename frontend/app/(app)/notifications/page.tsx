// app/(app)/notifications/page.tsx
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Bell, RefreshCw, Loader2 } from "lucide-react"
import { profileAPI } from "@/lib/api-service"
import { toast } from "sonner"

interface Activity {
  action: string
  time: string
}

export default function NotificationsPage() {
  const [activities, setActivities] = useState<Activity[]>([])
  const [loading, setLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchActivities = async () => {
    try {
      setLoading(true)
      const response = await profileAPI.getActivities()
      setActivities(response.data)
    } catch (error) {
      console.error('Failed to fetch notifications:', error)
      toast.error('Failed to load notifications')
    } finally {
      setLoading(false)
    }
  }

  const refreshActivities = async () => {
    try {
      setIsRefreshing(true)
      const response = await profileAPI.getActivities()
      setActivities(response.data)
      toast.success('Notifications refreshed')
    } catch (error) {
      console.error('Failed to refresh notifications:', error)
      toast.error('Failed to refresh notifications')
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchActivities()
  }, [])

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">Your latest financial activities and updates</p>
        </div>
        <Button 
          variant="outline" 
          onClick={refreshActivities} 
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="h-5 w-5" />
            <span>Recent Activities</span>
          </CardTitle>
          <CardDescription>Your latest financial activities</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {loading ? (
              // Show loading skeleton
              Array(25).fill(0).map((_, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 rounded-lg bg-muted/30 animate-pulse">
                  <div className="min-w-0 flex-1">
                    <div className="h-4 w-48 bg-gray-300 rounded mb-1"></div>
                    <div className="h-3 w-24 bg-gray-200 rounded"></div>
                  </div>
                </div>
              ))
            ) : activities.length > 0 ? (
              // Show up to 25 activities
              activities.slice(0, 25).map((activity, index) => (
                <div key={index} className="flex items-start p-3 rounded-lg bg-muted/30">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{activity.action}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))
            ) : (
              // Show empty state when no activities
              <div className="text-center py-8 text-muted-foreground">
                No notifications available
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}