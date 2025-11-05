// app/(app)/transactions/page.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Download, History, Repeat, BarChart3, Plus } from "lucide-react"
import { TransactionOverview } from "@/components/transactions/transaction-overview"
import { TransactionsTable } from "@/components/transactions/transactions-table"
import { RecurringTransactions } from "@/components/transactions/recurring-transactions"
import { TransactionAnalysis } from "@/components/transactions/transaction-analysis"
import { TransactionExport } from "@/components/transactions/transaction-export"

export default function TransactionsPage() {
  const [showExport, setShowExport] = useState(false)

  const handleExport = () => {
    setShowExport(true)
  }

  return (
    <div className="space-y-6 p-4 md:p-0">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Transactions</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Manage your income and expenses</p>
        </div>
        <Button onClick={handleExport} variant="outline" className="w-full sm:w-auto">
          <Download className="mr-2 h-4 w-4" />
          Export
        </Button>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="w-full grid grid-cols-2 sm:grid-cols-4 h-auto sm:h-10">
          <TabsTrigger value="overview" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
            <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Overview</span>
            <span className="xs:hidden">Add</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
            <History className="h-3 w-3 sm:h-4 sm:w-4" />
            History
          </TabsTrigger>
          <TabsTrigger value="recurring" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
            <Repeat className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Recurring</span>
            <span className="xs:hidden">Repeat</span>
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
            <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden xs:inline">Analysis</span>
            <span className="xs:hidden">Stats</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <TransactionOverview />
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <TransactionsTable />
        </TabsContent>

        <TabsContent value="recurring" className="space-y-6">
          <RecurringTransactions />
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <TransactionAnalysis />
        </TabsContent>
      </Tabs>

      <TransactionExport
        open={showExport}
        onClose={() => setShowExport(false)}
      />
    </div>
  )
}