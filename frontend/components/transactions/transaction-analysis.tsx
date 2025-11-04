// components/transactions/transaction-analysis.tsx
"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useTransactions } from "@/lib/transactions-context"
import { BarChart3, TrendingUp, TrendingDown } from "lucide-react"

interface CategoryData {
  category: string
  income: number
  expense: number
  total: number
  net: number
}

interface AnalysisData {
  categoryData: CategoryData[]
  totals: {
    totalIncome: number
    totalExpenses: number
    netAmount: number
  }
}

export function TransactionAnalysis() {
  const { transactions } = useTransactions()
  const [analysisData, setAnalysisData] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAnalysisData = async () => {
      try {
        const response = await fetch('/api/v1/transactions/analysis', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        })

        if (!response.ok) {
          throw new Error('Failed to fetch analysis data')
        }

        const data = await response.json()
        setAnalysisData(data.data)
      } catch (error) {
        console.error('Error fetching analysis data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnalysisData()
  }, [transactions])

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading analysis...</div>
  }

  if (!analysisData) {
    return <div className="text-center py-8">Failed to load analysis data</div>
  }

  const { categoryData, totals } = analysisData

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Transaction Analysis
        </CardTitle>
        <CardDescription>Summary of your transactions by category</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">+₹{totals.totalIncome.toLocaleString('en-IN')}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">-₹{totals.totalExpenses.toLocaleString('en-IN')}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Savings</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${totals.netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totals.netAmount >= 0 ? '+' : ''}₹{Math.abs(totals.netAmount).toLocaleString('en-IN')}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Income</TableHead>
                <TableHead className="text-right">Expense</TableHead>
                <TableHead className="text-right">Net</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {categoryData.map((item) => (
                <TableRow key={item.category}>
                  <TableCell className="font-medium">{item.category}</TableCell>
                  <TableCell className="text-right text-green-600">
                    {item.income > 0 ? `+₹${item.income.toLocaleString('en-IN')}` : '-'}
                  </TableCell>
                  <TableCell className="text-right text-red-600">
                    {item.expense > 0 ? `-₹${item.expense.toLocaleString('en-IN')}` : '-'}
                  </TableCell>
                  <TableCell className={`text-right font-medium ${item.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {item.net >= 0 ? '+' : ''}₹{Math.abs(item.net).toLocaleString('en-IN')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}