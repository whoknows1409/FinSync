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
    <div className="space-y-4 sm:space-y-6 p-4 md:p-0">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Budget</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Set and track your spending limits</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Button onClick={handleRefresh} variant="outline" disabled={loading} className="flex-1 sm:flex-initial">
            {loading ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            <span className="hidden xs:inline">Refresh</span>
          </Button>
          <Button onClick={handleExport} variant="outline" className="flex-1 sm:flex-initial">
            <Download className="mr-2 h-4 w-4" />
            <span className="hidden xs:inline">Export</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-3 sm:p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-xs sm:text-sm text-red-700">
                {error}
              </p>
              <div className="mt-2">
                <button
                  onClick={handleRefresh}
                  className="text-xs sm:text-sm bg-red-100 hover:bg-red-200 text-red-800 px-2 py-1 rounded"
                >
                  Retry
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full grid grid-cols-2 h-auto sm:h-10">
          <TabsTrigger value="overview" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
            <PiggyBank className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Budget </span>Overview
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
            <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Budget </span>Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 sm:space-y-6">
          {loading && !budgets.length ? (
            <div className="flex justify-center items-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
              <BudgetForm />
              <div className="lg:col-span-2">
                <BudgetOverview />
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="analysis" className="space-y-4 sm:space-y-6">
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