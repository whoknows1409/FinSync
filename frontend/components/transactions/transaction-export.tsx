// components/transactions/transaction-export.tsx
"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format as formatDate } from "date-fns"
import { CalendarIcon, Download, FileText } from "lucide-react"
import { useTransactions } from "@/lib/transactions-context"
import type jsPDF from 'jspdf'

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

interface TransactionExportProps {
  open: boolean
  onClose: () => void
}

export function TransactionExport({ open, onClose }: TransactionExportProps) {
  const { transactions } = useTransactions()
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv')
  const [dateRange, setDateRange] = useState<'all' | 'custom'>('all')
  const [startDate, setStartDate] = useState<Date | undefined>()
  const [endDate, setEndDate] = useState<Date | undefined>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [showStartCalendar, setShowStartCalendar] = useState(false)
  const [showEndCalendar, setShowEndCalendar] = useState(false)

  const handleExport = async () => {
    setLoading(true)
    setError("")
    
    try {
      console.log("Starting export process...")
      
      // Filter transactions based on date range
      let filteredTransactions = transactions
      
      if (dateRange === 'custom' && startDate && endDate) {
        filteredTransactions = transactions.filter(transaction => {
          const transactionDate = new Date(transaction.date)
          return transactionDate >= startDate && transactionDate <= endDate
        })
      }
      
      console.log("Transactions retrieved:", filteredTransactions.length)
      
      if (filteredTransactions.length === 0) {
        setError("No transactions found for the selected date range.")
        setLoading(false)
        return
      }
      
      // Sort transactions by date (newest first)
      filteredTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      
      console.log("Transaction data calculated")
      
      if (exportFormat === 'csv') {
        console.log("Exporting as CSV...")
        let csvContent = "Date,Description,Category,Type,Amount\n"
        filteredTransactions.forEach(transaction => {
          csvContent += `${transaction.date},${transaction.description},${transaction.category},${transaction.type},${transaction.amount}\n`
        })
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `transactions-${dateRange === 'all' ? 'all' : formatDate(startDate || new Date(), 'yyyy-MM-dd') + '-to-' + formatDate(endDate || new Date(), 'yyyy-MM-dd')}.csv`
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)
        console.log("CSV export completed")
      } else if (exportFormat === 'pdf') {
        console.log("Exporting as PDF...")
        
        // Dynamically import jsPDF and autoTable
        const jsPDFModule = await import('jspdf')
        const jsPDF = jsPDFModule.default
        const autoTableModule = await import('jspdf-autotable')
        const autoTable = autoTableModule.default
        
        // Create PDF with jsPDF
        const doc = new jsPDF()
        
        // Add title
        doc.setFontSize(20)
        doc.setFont('helvetica', 'bold')
        doc.text('Transaction Report', 105, 15, { align: 'center' })
        
        // Add date range
        doc.setFontSize(11)
        doc.setFont('helvetica', 'normal')
        const dateRangeText = dateRange === 'all' 
          ? 'All Transactions' 
          : `${formatDate(startDate || new Date(), 'MMM dd, yyyy')} - ${formatDate(endDate || new Date(), 'MMM dd, yyyy')}`
        doc.text(dateRangeText, 105, 23, { align: 'center' })
        
        // Add summary
        const totalIncome = filteredTransactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0)
        const totalExpense = filteredTransactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0)
        
        doc.setFontSize(9)
        doc.text(`Total Transactions: ${filteredTransactions.length} | Income: Rs.${totalIncome.toLocaleString()} | Expense: Rs.${totalExpense.toLocaleString()}`, 105, 30, { align: 'center' })
        
        // Prepare table data
        const tableData = filteredTransactions.map(transaction => [
          formatDate(new Date(transaction.date), 'dd MMM yyyy'),
          transaction.description,
          transaction.category,
          transaction.type.charAt(0).toUpperCase() + transaction.type.slice(1),
          `Rs.${transaction.amount.toLocaleString()}`
        ])
        
        // Add table using autoTable function
        autoTable(doc, {
          startY: 35,
          head: [['Date', 'Description', 'Category', 'Type', 'Amount']],
          body: tableData,
          theme: 'striped',
          headStyles: {
            fillColor: [59, 130, 246], // Blue color
            textColor: 255,
            fontStyle: 'bold',
            fontSize: 10,
            halign: 'left'
          },
          bodyStyles: {
            fontSize: 9,
            cellPadding: 3
          },
          columnStyles: {
            0: { cellWidth: 28, halign: 'left' }, // Date
            1: { cellWidth: 60, halign: 'left' }, // Description - wider for text
            2: { cellWidth: 35, halign: 'left' }, // Category
            3: { cellWidth: 25, halign: 'center' }, // Type
            4: { cellWidth: 32, halign: 'right' }  // Amount - right aligned
          },
          alternateRowStyles: {
            fillColor: [245, 247, 250]
          },
          margin: { top: 35, left: 10, right: 10 },
          didDrawPage: function (data: any) {
            // Footer with page number
            doc.setFontSize(8)
            doc.setTextColor(128)
            doc.text(
              `Page ${data.pageNumber}`,
              doc.internal.pageSize.width / 2,
              doc.internal.pageSize.height - 10,
              { align: 'center' }
            )
          }
        })
        
        // Save the PDF
        doc.save(`transactions-${dateRange === 'all' ? 'all' : formatDate(startDate || new Date(), 'yyyy-MM-dd') + '-to-' + formatDate(endDate || new Date(), 'yyyy-MM-dd')}.pdf`)
        console.log("PDF export completed")
      }
      
      onClose()
    } catch (error) {
      console.error('Error exporting transactions:', error)
      const errorMessage = error instanceof Error ? error.message : String(error)
      setError(`Failed to export transactions: ${errorMessage || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Download className="h-5 w-5" />
            <span>Export Transactions</span>
          </CardTitle>
          <CardDescription>
            Export your transaction history
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-800 p-3 rounded-md text-sm">
              {error}
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="format">Export Format</Label>
            <Select value={exportFormat} onValueChange={(value: 'csv' | 'pdf') => setExportFormat(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="csv">CSV</SelectItem>
                <SelectItem value="pdf">PDF</SelectItem>
                
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Date Range</Label>
            <Select value={dateRange} onValueChange={(value: 'all' | 'custom') => setDateRange(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Transactions</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {dateRange === 'custom' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Start Date</Label>
                <Popover open={showStartCalendar} onOpenChange={setShowStartCalendar}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {startDate ? (
                        formatDate(startDate, 'PPP')
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>End Date</Label>
                <Popover open={showEndCalendar} onOpenChange={setShowEndCalendar}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-start text-left font-normal"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {endDate ? (
                        formatDate(endDate, 'PPP')
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          )}

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Export will include:</h4>
            <ul className="text-sm space-y-1">
              <li>• Transaction date</li>
              <li>• Description</li>
              <li>• Category</li>
              <li>• Type (income/expense)</li>
              <li>• Amount</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={loading}>
              {loading ? 'Exporting...' : (
                <>
                  <Download className="mr-2 h-4 w-4" />
                  Export
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

