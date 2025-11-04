// Export Utility for Finsync (CSV-based)
// Replaced XLSX dependency with CSV generation to avoid vulnerable xlsx package

import { saveAs } from 'file-saver'

export interface ExportData {
  [key: string]: any
}

export interface ExportOptions {
  filename: string
  sheetName?: string
  headers?: string[]
}

export class ExcelExporter {
  /**
   * Export array of objects to Excel file
   */
  static exportToExcel(data: ExportData[], options: ExportOptions): void {
    try {
      const csv = this.toCSV(data, options.headers)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
      saveAs(blob, `${options.filename}.csv`)
      
    } catch (error) {
      console.error('CSV export error:', error)
      throw new Error('Failed to export data to CSV')
    }
  }

  /**
   * Export multiple sheets to Excel file
   */
  static exportMultipleSheets(sheets: { name: string; data: ExportData[] }[], filename: string): void {
    try {
      // Concatenate sheets into a single CSV with section headers
      const sections = sheets.map(sheet => {
        const header = `# ${sheet.name}`
        const csv = this.toCSV(sheet.data)
        return `${header}\n${csv}`
      })
      const combined = sections.join('\n\n')
      const blob = new Blob([combined], { type: 'text/csv;charset=utf-8' })
      saveAs(blob, `${filename}.csv`)
      
    } catch (error) {
      console.error('CSV export error:', error)
      throw new Error('Failed to export data to CSV')
    }
  }

  /**
   * Calculate optimal column widths based on content
   */
  private static toCSV(data: ExportData[], headers?: string[]): string {
    if (!data || data.length === 0) return ''
    const keys = headers && headers.length ? headers : Object.keys(data[0])
    const escape = (val: any) => {
      const s = val === null || val === undefined ? '' : String(val)
      if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
      return s
    }
    const lines: string[] = []
    lines.push(keys.join(','))
    for (const row of data) {
      lines.push(keys.map(k => escape(row[k])).join(','))
    }
    return lines.join('\n')
  }

  /**
   * Format date for Excel
   */
  static formatDateForExcel(date: Date): string {
    return date.toLocaleDateString('en-US')
  }

  /**
   * Format currency for Excel
   */
  static formatCurrencyForExcel(amount: number): string {
    return `₹${amount.toLocaleString('en-IN')}`
  }
}

// Specific export functions for different data types

export const exportTransactions = (transactions: any[]) => {
  const formattedData = transactions.map(transaction => ({
    'Date': ExcelExporter.formatDateForExcel(new Date(transaction.date)),
    'Description': transaction.description,
    'Category': transaction.category,
    'Amount': ExcelExporter.formatCurrencyForExcel(transaction.amount),
    'Type': transaction.type,
    'Account': transaction.account,
    'Tags': transaction.tags?.join(', ') || '',
    'Notes': transaction.notes || '',
  }))

  ExcelExporter.exportToExcel(formattedData, {
    filename: `transactions_${new Date().toISOString().split('T')[0]}`,
    sheetName: 'Transactions'
  })
}

export const exportBudget = (budgets: any[]) => {
  const formattedData = budgets.map(budget => ({
    'Category': budget.category,
    'Budgeted Amount': ExcelExporter.formatCurrencyForExcel(budget.budgetedAmount),
    'Actual Amount': ExcelExporter.formatCurrencyForExcel(budget.actualAmount),
    'Remaining': ExcelExporter.formatCurrencyForExcel(budget.budgetedAmount - budget.actualAmount),
    'Percentage Used': `${((budget.actualAmount / budget.budgetedAmount) * 100).toFixed(1)}%`,
    'Status': budget.actualAmount > budget.budgetedAmount ? 'Over Budget' : 'Within Budget',
    'Month': budget.month,
  }))

  ExcelExporter.exportToExcel(formattedData, {
    filename: `budget_${new Date().toISOString().split('T')[0]}`,
    sheetName: 'Budget'
  })
}

export const exportPortfolio = (holdings: any[], transactions: any[]) => {
  const sheets = [
    {
      name: 'Holdings',
      data: holdings.map(holding => ({
        'Symbol': holding.symbol,
        'Company': holding.company,
        'Quantity': holding.quantity,
        'Average Price': ExcelExporter.formatCurrencyForExcel(holding.averagePrice),
        'Current Price': ExcelExporter.formatCurrencyForExcel(holding.currentPrice),
        'Market Value': ExcelExporter.formatCurrencyForExcel(holding.marketValue),
        'Unrealized P&L': ExcelExporter.formatCurrencyForExcel(holding.unrealizedPnL),
        'P&L Percentage': `${holding.pnlPercentage.toFixed(2)}%`,
        'Sector': holding.sector,
      }))
    },
    {
      name: 'Transactions',
      data: transactions.map(transaction => ({
        'Date': ExcelExporter.formatDateForExcel(new Date(transaction.date)),
        'Symbol': transaction.symbol,
        'Type': transaction.type,
        'Quantity': transaction.quantity,
        'Price': ExcelExporter.formatCurrencyForExcel(transaction.price),
        'Total Amount': ExcelExporter.formatCurrencyForExcel(transaction.totalAmount),
        'Status': transaction.status,
      }))
    }
  ]

  ExcelExporter.exportMultipleSheets(sheets, `portfolio_${new Date().toISOString().split('T')[0]}`)
}

export const exportFinancialReport = (data: {
  summary: any
  transactions: any[]
  budgets: any[]
  goals: any[]
}) => {
  const sheets = [
    {
      name: 'Summary',
      data: [
        { 'Metric': 'Total Income', 'Value': ExcelExporter.formatCurrencyForExcel(data.summary.totalIncome) },
        { 'Metric': 'Total Expenses', 'Value': ExcelExporter.formatCurrencyForExcel(data.summary.totalExpenses) },
        { 'Metric': 'Net Savings', 'Value': ExcelExporter.formatCurrencyForExcel(data.summary.netSavings) },
        { 'Metric': 'Savings Rate', 'Value': `${data.summary.savingsRate.toFixed(1)}%` },
        { 'Metric': 'Portfolio Value', 'Value': ExcelExporter.formatCurrencyForExcel(data.summary.portfolioValue) },
        { 'Metric': 'Report Date', 'Value': ExcelExporter.formatDateForExcel(new Date()) },
      ]
    },
    {
      name: 'Transactions',
      data: data.transactions.map(transaction => ({
        'Date': ExcelExporter.formatDateForExcel(new Date(transaction.date)),
        'Description': transaction.description,
        'Category': transaction.category,
        'Amount': ExcelExporter.formatCurrencyForExcel(transaction.amount),
        'Type': transaction.type,
      }))
    },
    {
      name: 'Budgets',
      data: data.budgets.map(budget => ({
        'Category': budget.category,
        'Budgeted': ExcelExporter.formatCurrencyForExcel(budget.budgetedAmount),
        'Actual': ExcelExporter.formatCurrencyForExcel(budget.actualAmount),
        'Variance': ExcelExporter.formatCurrencyForExcel(budget.budgetedAmount - budget.actualAmount),
      }))
    },
    {
      name: 'Goals',
      data: data.goals.map(goal => ({
        'Goal': goal.name,
        'Target Amount': ExcelExporter.formatCurrencyForExcel(goal.targetAmount),
        'Current Amount': ExcelExporter.formatCurrencyForExcel(goal.currentAmount),
        'Progress': `${goal.progress.toFixed(1)}%`,
        'Target Date': ExcelExporter.formatDateForExcel(new Date(goal.targetDate)),
      }))
    }
  ]

  ExcelExporter.exportMultipleSheets(sheets, `financial_report_${new Date().toISOString().split('T')[0]}`)
}
