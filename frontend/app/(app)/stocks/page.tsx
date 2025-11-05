"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, TrendingUp } from "lucide-react"
import StockAnalysis from "@/components/stocks/StockAnalysis"
import StockComparison from "@/components/stocks/StockComparison"

export default function StocksPage() {
  return (
    <div className="container mx-auto py-4 sm:py-6 space-y-4 sm:space-y-6 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Stocks</h1>
          <p className="text-muted-foreground text-sm sm:text-base">Analyze and compare stocks</p>
        </div>
      </div>

      <Tabs defaultValue="analysis" className="w-full">
        <TabsList className="w-full grid grid-cols-2 h-auto sm:h-10">
          <TabsTrigger value="analysis" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
            <BarChart3 className="h-3 w-3 sm:h-4 sm:w-4" />
            Analysis
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2">
            <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4" />
            Comparison
          </TabsTrigger>
        </TabsList>

        <TabsContent value="analysis" className="space-y-6">
          <StockAnalysis />
        </TabsContent>

        <TabsContent value="comparison" className="space-y-6">
          <StockComparison />
        </TabsContent>
      </Tabs>
    </div>
  )
}