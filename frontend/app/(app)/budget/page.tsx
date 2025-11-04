"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, PiggyBank, BarChart3, RefreshCw, AlertCircle } from "lucide-react"
import { BudgetForm } from "@/components/budget/budget-form"
import { BudgetOverview } from "@/components/budget/budget-overview"
import { BudgetAnalysisDashboard } from "@/components/budget/budget-analysis-dashboard"
import { BudgetExport } from "@/components/budget/budget-export"
import { useBudget } from "@/lib/budget-context"
import { checkApiHealth } from "@/lib/api-service"
import { toast } from "sonner"

export default function BudgetPage() {
  const [showExport, setShowExport] = useState(false)
  const { refreshBudgets, forceRefresh, loading, error, budgets } = useBudget()

  const handleExport = () => {
    setShowExport(true)
  }

  const handleRefresh = async () => {
    try {
      await forceRefresh()
      toast.success('Budget data refreshed successfully')
    } catch (error) {
      toast.error('Failed to refresh budget data')
    }
  }

  // Initialize page data only once when component mounts
  useEffect(() => {
    const initializePage = async () => {
      try {
        await forceRefresh()
      } catch (error) {
        console.error('Failed to initialize budget page:', error)
        toast.error('Failed to load budget data')
      }
    }

    initializePage()
  }, [])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Budget</h1>
          <p className="text-muted-foreground">Set and track your spending limits</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" disabled={loading}>
            {loading ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Refresh
          </Button>
          <Button onClick={handleExport} variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">
                {error}
              </p>
              <div className="mt-2">
                <button
                  onClick={handleRefresh}
                  className="text-sm bg-red-100 hover:bg-red-200 text-red-800 px-2 py-1 rounded"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <PiggyBank className="h-4 w-4" />
            Budget Overview
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Budget Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {loading && !budgets.length ? (
            <div className="flex justify-center items-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              <BudgetForm />
              <div className="lg:col-span-2">
                <BudgetOverview />
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          {loading && !budgets.length ? (
            <div className="flex justify-center items-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <BudgetAnalysisDashboard />
          )}
        </TabsContent>
      </Tabs>

      <BudgetExport
        open={showExport}
        onClose={() => setShowExport(false)}
      />
    </div>
  )
}