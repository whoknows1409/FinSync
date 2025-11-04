// components/dashboard/draggable-dashboard.tsx
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Settings, Plus, Grid3X3, LayoutGrid, ArrowUp, ArrowDown, X } from "lucide-react"
import { 
  WIDGET_TYPES, 
  type WidgetType,
  SummaryCardsWidget,
  RecentTransactionsWidget,
  BudgetOverviewWidget,
  NotificationsWidget,
  QuickActionsWidget,
  PortfolioWidget
} from "./dashboard-widgets"

interface DashboardLayout {
  id: string
  type: WidgetType
  position: { x: number; y: number; w: number; h: number }
}

// Updated default layout with new order and without Financial Goals
const DEFAULT_LAYOUT: DashboardLayout[] = [
  { id: "summary-cards", type: "summary-cards", position: { x: 0, y: 0, w: 12, h: 4 } },
  { id: "quick-actions", type: "quick-actions", position: { x: 0, y: 4, w: 12, h: 4 } },
  { id: "recent-transactions", type: "recent-transactions", position: { x: 0, y: 8, w: 12, h: 6 } },
  { id: "budget-overview", type: "budget-overview", position: { x: 0, y: 14, w: 12, h: 6 } },
  { id: "notifications", type: "notifications", position: { x: 0, y: 20, w: 12, h: 6 } },
  { id: "portfolio", type: "portfolio", position: { x: 0, y: 26, w: 12, h: 4 } },
]

// Updated widget info without Financial Goals
const WIDGET_INFO = {
  'summary-cards': { name: 'Financial Summary', description: 'Key financial metrics' },
  'recent-transactions': { name: 'Recent Transactions', description: 'Latest financial activities' },
  'budget-overview': { name: 'Budget Overview', description: 'Spending vs budget' },
  'notifications': { name: 'Smart Notifications', description: 'Important alerts' },
  'quick-actions': { name: 'Quick Actions', description: 'Common tasks' },
  'portfolio': { name: 'Portfolio Overview', description: 'Stock holdings' },
}

export function DraggableDashboard() {
  const [layout, setLayout] = useState<DashboardLayout[]>(DEFAULT_LAYOUT)
  const [isEditMode, setIsEditMode] = useState(false)
  const [showWidgetPicker, setShowWidgetPicker] = useState(false)

  // Load layout from localStorage on mount
  useEffect(() => {
    const savedLayout = localStorage.getItem('dashboard-layout')
    if (savedLayout) {
      try {
        setLayout(JSON.parse(savedLayout))
      } catch (error) {
        console.error('Failed to load dashboard layout:', error)
      }
    }
  }, [])

  // Save layout to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('dashboard-layout', JSON.stringify(layout))
  }, [layout])

  const addWidget = (widgetType: WidgetType) => {
    const newWidget: DashboardLayout = {
      id: `${widgetType}-${Date.now()}`,
      type: widgetType,
      position: { x: 0, y: 0, w: 12, h: 4 } // Full width on mobile
    }
    setLayout([...layout, newWidget])
    setShowWidgetPicker(false)
  }

  const removeWidget = (widgetId: string) => {
    setLayout(layout.filter(widget => widget.id !== widgetId))
  }

  const moveWidget = (widgetId: string, direction: 'up' | 'down') => {
    const index = layout.findIndex(widget => widget.id === widgetId)
    if (index === -1) return

    const newLayout = [...layout]
    if (direction === 'up' && index > 0) {
      // Swap with the widget above
      [newLayout[index - 1], newLayout[index]] = [newLayout[index], newLayout[index - 1]]
    } else if (direction === 'down' && index < layout.length - 1) {
      // Swap with the widget below
      [newLayout[index], newLayout[index + 1]] = [newLayout[index + 1], newLayout[index]]
    }

    setLayout(newLayout)
  }

  const resetLayout = () => {
    setLayout(DEFAULT_LAYOUT)
  }

  const renderWidget = (widget: DashboardLayout, index: number) => {
    const WidgetComponent = WIDGET_TYPES[widget.type]
    if (!WidgetComponent) return null

    return (
      <div className="relative group">
        <WidgetComponent />
        {isEditMode && (
          <div className="absolute top-2 right-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="outline"
              onClick={() => moveWidget(widget.id, 'up')}
              disabled={index === 0}
              className="h-6 w-6 p-0"
            >
              <ArrowUp className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => moveWidget(widget.id, 'down')}
              disabled={index === layout.length - 1}
              className="h-6 w-6 p-0"
            >
              <ArrowDown className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => removeWidget(widget.id)}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Dashboard Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Dashboard</h2>
          <p className="text-muted-foreground">Your personalized financial overview</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowWidgetPicker(!showWidgetPicker)}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Widget
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetLayout}
          >
            Reset Layout
          </Button>
          <Button
            variant={isEditMode ? "default" : "outline"}
            size="sm"
            onClick={() => setIsEditMode(!isEditMode)}
          >
            <Settings className="h-4 w-4 mr-2" />
            {isEditMode ? "Done" : "Customize"}
          </Button>
        </div>
      </div>

      {/* Widget Picker */}
      {showWidgetPicker && (
        <Card>
          <CardHeader>
            <CardTitle>Add Widget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(WIDGET_INFO).map(([type, info]) => {
                const isAlreadyAdded = layout.some(widget => widget.type === type)
                return (
                  <Button
                    key={type}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start space-y-2"
                    onClick={() => addWidget(type as WidgetType)}
                    disabled={isAlreadyAdded}
                  >
                    <div className="flex items-center space-x-2 w-full">
                      <LayoutGrid className="h-4 w-4" />
                      <span className="text-sm font-medium">{info.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground text-left">{info.description}</p>
                    {isAlreadyAdded && (
                      <Badge variant="secondary" className="text-xs">Added</Badge>
                    )}
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dashboard Grid - Responsive */}
      <div className="grid grid-cols-1 gap-4 auto-rows-min">
        {layout.map((widget, index) => (
          <div key={widget.id} className={`${isEditMode ? 'cursor-pointer' : ''}`}>
            {renderWidget(widget, index)}
          </div>
        ))}
      </div>

      {/* Edit Mode Instructions */}
      {isEditMode && (
        <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Grid3X3 className="h-5 w-5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                  Edit Mode Active
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Use the arrow buttons to reorder widgets, click the × to remove, or add new widgets
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}