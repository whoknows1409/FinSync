"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react"
import { useTransactions } from "@/lib/transactions-context"

interface ImportResult {
  success: number
  failed: number
  errors: string[]
}

export function BulkImport() {
  const { addTransaction, categorizeWithAI } = useTransactions()
  const [file, setFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile && selectedFile.type === "text/csv") {
      setFile(selectedFile)
      setResult(null)
    }
  }

  const parseCSV = (text: string): any[] => {
    const lines = text.split("\n")
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase())

    return lines
      .slice(1)
      .map((line) => {
        if (!line.trim()) return null
        const values = line.split(",")
        const row: any = {}
        headers.forEach((header, index) => {
          row[header] = values[index]?.trim()
        })
        return row
      })
      .filter(Boolean)
  }

  const handleImport = async () => {
    if (!file) return

    setImporting(true)
    const text = await file.text()
    const rows = parseCSV(text)

    let success = 0
    let failed = 0
    const errors: string[] = []

    for (const row of rows) {
      try {
        // Expected CSV format: date,type,amount,description,category
        const amount = Number.parseFloat(row.amount)
        const type = row.type?.toLowerCase()

        if (!amount || isNaN(amount)) {
          throw new Error("Invalid amount")
        }

        if (type !== "income" && type !== "expense") {
          throw new Error("Type must be 'income' or 'expense'")
        }

        const category = row.category || categorizeWithAI(row.description || "")

        addTransaction({
          type: type as "income" | "expense",
          amount,
          description: row.description || "Imported transaction",
          category,
          date: row.date || new Date().toISOString().split("T")[0],
          aiCategorized: !row.category,
        })

        success++
      } catch (error) {
        failed++
        errors.push(`Row ${success + failed}: ${error instanceof Error ? error.message : "Unknown error"}`)
      }
    }

    setResult({ success, failed, errors })
    setImporting(false)
    setFile(null)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Upload className="h-5 w-5" />
          <span>Bulk Import</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="csv-file">Upload CSV File</Label>
          <Input id="csv-file" type="file" accept=".csv" onChange={handleFileChange} />
          <p className="text-xs text-muted-foreground">Expected format: date,type,amount,description,category</p>
        </div>

        {file && (
          <div className="flex items-center space-x-2 p-2 bg-muted rounded">
            <FileText className="h-4 w-4" />
            <span className="text-sm">{file.name}</span>
          </div>
        )}

        <Button onClick={handleImport} disabled={!file || importing} className="w-full">
          {importing ? "Importing..." : "Import Transactions"}
        </Button>

        {result && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="text-sm">Successfully imported: {result.success}</span>
            </div>
            {result.failed > 0 && (
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="text-sm">Failed: {result.failed}</span>
              </div>
            )}
            {result.errors.length > 0 && (
              <div className="text-xs text-muted-foreground space-y-1">
                {result.errors.slice(0, 3).map((error, index) => (
                  <div key={index}>{error}</div>
                ))}
                {result.errors.length > 3 && <div>... and {result.errors.length - 3} more errors</div>}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
