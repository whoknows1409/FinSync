"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, FileText, Table } from "lucide-react"
import { useTransactions } from "@/lib/transactions-context"
import { useBudget } from "@/lib/budget-context"

export function ExportReports() {
  const { transactions } = useTransactions()
  const { budgets } = useBudget()

  const exportToPDF = () => {
    // Mock PDF export functionality
    const reportData = {
      transactions: transactions.slice(0, 10),
      budgets,
      totalIncome: transactions.filter((t) => t.type === "income").reduce((sum, t) => sum + t.amount, 0),
      totalExpenses: transactions.filter((t) => t.type === "expense").reduce((sum, t) => sum + t.amount, 0),
    }

    alert("PDF report would be generated here. Integration with jsPDF or similar library needed.")
  }

  const exportToExcel = () => {
    // Mock Excel export functionality
    const csvContent = [
      ["Date", "Type", "Category", "Amount", "Description"],
      ...transactions.map((t) => [t.date, t.type, t.category, t.amount.toString(), t.description]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "financial-report.csv"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Download className="h-5 w-5" />
          <span>Export Reports</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={exportToPDF} className="w-full justify-start bg-transparent" variant="outline">
          <FileText className="h-4 w-4 mr-2" />
          Export as PDF
        </Button>
        <Button onClick={exportToExcel} className="w-full justify-start bg-transparent" variant="outline">
          <Table className="h-4 w-4 mr-2" />
          Export as Excel
        </Button>
      </CardContent>
    </Card>
  )
}
