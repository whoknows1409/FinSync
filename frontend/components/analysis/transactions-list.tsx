"use client"

import { useState, useEffect, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Calendar as CalendarIcon, TrendingUp, TrendingDown, ArrowUpDown } from "lucide-react"
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, startOfYear, endOfYear, subDays, subWeeks, subMonths, subYears, isWithinInterval } from "date-fns"
import { useTransactions } from "@/lib/transactions-context"
import { cn } from "@/lib/utils"

type PeriodType = "daily" | "weekly" | "monthly" | "yearly" | "custom"

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount)
}

const formatDate = (dateString: string | Date) => {
  const date = typeof dateString === 'string' ? new Date(dateString) : dateString
  return format(date, 'MMM dd, yyyy')
}

export function TransactionsList() {
  const { transactions, loading } = useTransactions()
  const [period, setPeriod] = useState<PeriodType>("monthly")
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>()
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>()
  const [sortBy, setSortBy] = useState<"date" | "amount">("date")
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc")

  // Calculate date range based on selected period
  const dateRange = useMemo(() => {
    const now = new Date()
    
    switch (period) {
      case "daily":
        return {
          start: startOfDay(now),
          end: endOfDay(now)
        }
      case "weekly":
        return {
          start: startOfWeek(now, { weekStartsOn: 1 }),
          end: endOfWeek(now, { weekStartsOn: 1 })
        }
      case "monthly":
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        }
      case "yearly":
        return {
          start: startOfYear(now),
          end: endOfYear(now)
        }
      case "custom":
        return {
          start: customStartDate ? startOfDay(customStartDate) : startOfMonth(now),
          end: customEndDate ? endOfDay(customEndDate) : endOfDay(now)
        }
      default:
        return {
          start: startOfMonth(now),
          end: endOfMonth(now)
        }
    }
  }, [period, customStartDate, customEndDate])

  // Filter and sort transactions based on selected period and sort options
  const filteredTransactions = useMemo(() => {
    if (!transactions || transactions.length === 0) return []

    // Filter by date range
    const filtered = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date)
      return isWithinInterval(transactionDate, {
        start: dateRange.start,
        end: dateRange.end
      })
    })

    // Sort transactions
    const sorted = [...filtered].sort((a, b) => {
      if (sortBy === "date") {
        const dateA = new Date(a.date).getTime()
        const dateB = new Date(b.date).getTime()
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA
      } else {
        return sortOrder === "asc" ? a.amount - b.amount : b.amount - a.amount
      }
    })

    return sorted
  }, [transactions, dateRange, sortBy, sortOrder])

  // Calculate summary statistics
  const summary = useMemo(() => {
    const totalIncome = filteredTransactions
      .filter(t => t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0)

    const totalExpenses = filteredTransactions
      .filter(t => t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0)

    return {
      totalIncome,
      totalExpenses,
      netCashFlow: totalIncome - totalExpenses,
      transactionCount: filteredTransactions.length
    }
  }, [filteredTransactions])

  const toggleSort = (newSortBy: "date" | "amount") => {
    if (sortBy === newSortBy) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc")
    } else {
      setSortBy(newSortBy)
      setSortOrder("desc")
    }
  }

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <CardTitle>Transaction History</CardTitle>
            <CardDescription>
              {period === "custom" && customStartDate && customEndDate
                ? `${formatDate(customStartDate)} - ${formatDate(customEndDate)}`
                : `Showing transactions for the selected period`}
            </CardDescription>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <Select value={period} onValueChange={(value: PeriodType) => setPeriod(value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="daily">Daily</SelectItem>
                <SelectItem value="weekly">Weekly</SelectItem>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {period === "custom" && (
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[140px] justify-start text-left font-normal",
                        !customStartDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customStartDate ? format(customStartDate, "MMM dd") : "Start date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customStartDate}
                      onSelect={setCustomStartDate}
                      initialFocus
                      disabled={(date) => date > new Date()}
                    />
                  </PopoverContent>
                </Popover>

                <span className="text-muted-foreground">to</span>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[140px] justify-start text-left font-normal",
                        !customEndDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customEndDate ? format(customEndDate, "MMM dd") : "End date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={customEndDate}
                      onSelect={setCustomEndDate}
                      initialFocus
                      disabled={(date) => 
                        date > new Date() || (customStartDate ? date < customStartDate : false)
                      }
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-4">
          <div className="bg-green-50 dark:bg-green-950 p-3 rounded-lg">
            <div className="text-sm text-muted-foreground">Total Income</div>
            <div className="text-xl font-bold text-green-600 dark:text-green-400">
              {formatCurrency(summary.totalIncome)}
            </div>
          </div>
          <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg">
            <div className="text-sm text-muted-foreground">Total Expenses</div>
            <div className="text-xl font-bold text-red-600 dark:text-red-400">
              {formatCurrency(summary.totalExpenses)}
            </div>
          </div>
          <div className={cn(
            "p-3 rounded-lg",
            summary.netCashFlow >= 0 
              ? "bg-blue-50 dark:bg-blue-950" 
              : "bg-orange-50 dark:bg-orange-950"
          )}>
            <div className="text-sm text-muted-foreground">Net Cash Flow</div>
            <div className={cn(
              "text-xl font-bold",
              summary.netCashFlow >= 0 
                ? "text-blue-600 dark:text-blue-400" 
                : "text-orange-600 dark:text-orange-400"
            )}>
              {formatCurrency(summary.netCashFlow)}
            </div>
          </div>
          <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
            <div className="text-sm text-muted-foreground">Transactions</div>
            <div className="text-xl font-bold">
              {summary.transactionCount}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-muted-foreground">Loading transactions...</p>
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              No transactions found for the selected period
            </p>
          </div>
        ) : (
          <>
            {/* Sort Controls */}
            <div className="flex items-center gap-2 mb-4">
              <span className="text-sm text-muted-foreground">Sort by:</span>
              <Button
                variant={sortBy === "date" ? "default" : "outline"}
                size="sm"
                onClick={() => toggleSort("date")}
                className="gap-1"
              >
                Date
                {sortBy === "date" && (
                  <ArrowUpDown className="h-3 w-3" />
                )}
              </Button>
              <Button
                variant={sortBy === "amount" ? "default" : "outline"}
                size="sm"
                onClick={() => toggleSort("amount")}
                className="gap-1"
              >
                Amount
                {sortBy === "amount" && (
                  <ArrowUpDown className="h-3 w-3" />
                )}
              </Button>
            </div>

            {/* Transactions List */}
            <div className="space-y-2">
              {filteredTransactions.map((transaction) => (
                <div
                  key={transaction._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start gap-3 mb-2 sm:mb-0">
                    <div className={cn(
                      "mt-1 p-2 rounded-full",
                      transaction.type === "income" 
                        ? "bg-green-100 dark:bg-green-950" 
                        : "bg-red-100 dark:bg-red-950"
                    )}>
                      {transaction.type === "income" ? (
                        <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{transaction.description}</div>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {transaction.category}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(transaction.date)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className={cn(
                    "text-right sm:text-left",
                    "text-lg font-bold",
                    transaction.type === "income" 
                      ? "text-green-600 dark:text-green-400" 
                      : "text-red-600 dark:text-red-400"
                  )}>
                    {transaction.type === "income" ? "+" : "-"}
                    {formatCurrency(transaction.amount)}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}
