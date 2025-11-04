// components/budget/budget-debug.tsx
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useBudget } from "@/lib/budget-context"
import { Bug, RefreshCw, Copy } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"

export function BudgetDebug() {
  const { budgets, loading, error, forceRefresh } = useBudget()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showRawData, setShowRawData] = useState(false)

  const handleForceRefresh = async () => {
    setIsRefreshing(true)
    try {
      await forceRefresh()
      toast.success('Budget data force refreshed')
    } catch (error) {
      toast.error('Force refresh failed')
    } finally {
      setIsRefreshing(false)
    }
  }

  const handleCopyData = () => {
    navigator.clipboard.writeText(JSON.stringify(budgets, null, 2))
    toast.success('Budget data copied to clipboard')
  }

  return (
    <Card className="mb-6 border-yellow-200 bg-yellow-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-yellow-800">
          <Bug className="h-5 w-5" />
          Budget Debug Information
        </CardTitle>
        <CardDescription className="text-yellow-700">
          This panel shows the current state of budget data for debugging purposes
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-sm font-medium text-yellow-800">
              Budgets Count: {budgets.length}
            </p>
            <p className="text-sm text-yellow-700">
              Loading: {loading ? 'Yes' : 'No'}
            </p>
            <p className="text-sm text-yellow-700">
              Error: {error || 'None'}
            </p>
            <p className="text-sm text-yellow-700">
              Last Updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={handleForceRefresh} 
              variant="outline" 
              size="sm"
              disabled={isRefreshing}
            >
              {isRefreshing ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              Force Refresh
            </Button>
            <Button 
              onClick={handleCopyData} 
              variant="outline" 
              size="sm"
            >
              <Copy className="h-4 w-4" />
              Copy Data
            </Button>
          </div>
        </div>
        
        <details className="text-sm">
          <summary 
            className="cursor-pointer font-medium text-yellow-800"
            onClick={() => setShowRawData(!showRawData)}
          >
            {showRawData ? 'Hide' : 'View'} Raw Budget Data
          </summary>
          {showRawData && (
            <pre className="mt-2 p-3 bg-yellow-100 rounded text-yellow-900 overflow-auto max-h-60 text-xs">
              {JSON.stringify(budgets, null, 2)}
            </pre>
          )}
        </details>
      </CardContent>
    </Card>
  )
}