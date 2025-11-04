"use client"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, TrendingUp } from "lucide-react"
import StockAnalysis from "@/components/stocks/StockAnalysis"
import StockComparison from "@/components/stocks/StockComparison"

export default function StocksPage() {
  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Stocks</h1>
          <p className="text-muted-foreground">Analyze and compare stocks</p>
        </div>
      </div>

      <Tabs defaultValue="analysis" className="w-full">
        <TabsList>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analysis
          </TabsTrigger>
          <TabsTrigger value="comparison" className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
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