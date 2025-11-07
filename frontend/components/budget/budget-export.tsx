// components/budget/budget-export.tsx
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
import { useBudget } from "@/lib/budget-context"
import { useTransactions } from "@/lib/transactions-context"
import type jsPDF from 'jspdf'

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

interface BudgetExportProps {
  open: boolean
  onClose: () => void
}

export function BudgetExport({ open, onClose }: BudgetExportProps) {
  const { getBudgetsForMonth } = useBudget()
  const { transactions } = useTransactions()
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv')
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7)) // YYYY-MM format
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleExport = async () => {
    setLoading(true)
    setError("")
    
    try {
      // Get budgets for the selected month
      const budgets = getBudgetsForMonth(selectedMonth)
      
      if (!budgets || budgets.length === 0) {
        setError("No budgets found for the selected month.")
        setLoading(false)
        return
      }
      
      // Calculate spending for each budget category
      const budgetData = budgets.map(budget => {
        // Calculate total spent for this category in the selected month
        const spent = transactions
          .filter(
            (transaction) =>
              transaction.type === "expense" &&
              transaction.category === budget.category &&
              transaction.date.startsWith(selectedMonth),
          )
          .reduce((total, transaction) => total + transaction.amount, 0)
        
        const budgeted = (budget as any).amount ?? budget.totalAmount
        const remaining = Math.max(budgeted - spent, 0)
        const overSpent = Math.max(spent - budgeted, 0)
        
        return {
          category: budget.category,
          totalBudget: budgeted,
          totalSpent: spent,
          remaining: remaining,
          overSpent: overSpent
        }
      })
      
      // Format month name for display
      const monthName = formatDate(new Date(selectedMonth + '-01'), 'MMMM yyyy')
      
      if (exportFormat === 'csv') {
        let csvContent = "Category,Total Budget,Total Spent,Remaining,Over Spent\n"
        budgetData.forEach(item => {
          csvContent += `${item.category},${item.totalBudget},${item.totalSpent},${item.remaining},${item.overSpent}\n`
        })
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `budget-report-${selectedMonth}.csv`
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
        doc.text('Budget Report', 105, 15, { align: 'center' })
        
        // Add month
        doc.setFontSize(11)
        doc.setFont('helvetica', 'normal')
        doc.text(monthName, 105, 23, { align: 'center' })
        
        // Add summary
        const totalBudget = budgetData.reduce((sum, item) => sum + item.totalBudget, 0)
        const totalSpent = budgetData.reduce((sum, item) => sum + item.totalSpent, 0)
        const totalRemaining = budgetData.reduce((sum, item) => sum + item.remaining, 0)
        const totalOverSpent = budgetData.reduce((sum, item) => sum + item.overSpent, 0)
        
        doc.setFontSize(9)
        doc.text(`Total Budget: Rs.${totalBudget.toLocaleString()} | Spent: Rs.${totalSpent.toLocaleString()} | Remaining: Rs.${totalRemaining.toLocaleString()}`, 105, 30, { align: 'center' })
        
        // Prepare table data
        const tableData = budgetData.map(item => [
          item.category,
          `Rs.${item.totalBudget.toLocaleString()}`,
          `Rs.${item.totalSpent.toLocaleString()}`,
          `Rs.${item.remaining.toLocaleString()}`,
          `Rs.${item.overSpent.toLocaleString()}`
        ])
        
        // Add table using autoTable function
        autoTable(doc, {
          startY: 35,
          head: [['Category', 'Budget', 'Spent', 'Remaining', 'Over Spent']],
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
            0: { cellWidth: 45, halign: 'left' },   // Category - wider
            1: { cellWidth: 30, halign: 'right' },  // Budget
            2: { cellWidth: 30, halign: 'right' },  // Spent
            3: { cellWidth: 30, halign: 'right' },  // Remaining
            4: { cellWidth: 35, halign: 'right' }   // Over Spent
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
        doc.save(`budget-report-${selectedMonth}.pdf`)
        console.log("PDF export completed")
      }
      
      onClose()
    } catch (error) {
      console.error('Error exporting budgets:', error)
      setError(`Failed to export budgets: ${error instanceof Error ? error.message : 'Unknown error'}`)
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
            <span>Export Budget Report</span>
          </CardTitle>
          <CardDescription>
            Export your budget data with spending analysis
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
            <Select value={exportFormat} onValueChange={(value: any) => setExportFormat(value)}>
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
            <Label htmlFor="month">Month</Label>
            <input
              id="month"
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
            />
          </div>

          <div className="bg-muted p-4 rounded-lg">
            <h4 className="font-medium mb-2">Export will include:</h4>
            <ul className="text-sm space-y-1">
              <li>• Categories with set budgets</li>
              <li>• Total budget amount</li>
              <li>• Total spent amount</li>
              <li>• Remaining budget</li>
              <li>• Amount over budget (if any)</li>
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