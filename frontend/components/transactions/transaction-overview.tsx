// components/transactions/transaction-overview.tsx
"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useTransactions } from "@/lib/transactions-context"
import { Edit, Trash2, TrendingUp, TrendingDown, DollarSign } from "lucide-react"
import { TransactionForm } from "./transaction-form"

export function TransactionOverview() {
  const { transactions, deleteTransaction, loading } = useTransactions()
  const [editingTransaction, setEditingTransaction] = useState<any>(null)

  // Sort transactions by date (newest first) - backend already sorts, but we can sort again if needed
  const sortedTransactions = [...transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10) // Get only the 10 most recent transactions

  const handleEdit = (transaction: any) => {
    setEditingTransaction(transaction)
  }

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this transaction?")) {
      deleteTransaction(id)
    }
  }

  const handleCancelEdit = () => {
    setEditingTransaction(null)
  }

  // Calculate totals
  const totalIncome = transactions
    .filter(t => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0)
    
  const totalExpenses = transactions
    .filter(t => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0)
    
  const netAmount = totalIncome - totalExpenses

  if (editingTransaction) {
    return <TransactionForm editingTransaction={editingTransaction} onCancel={handleCancelEdit} />
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading transactions...</div>
  }

  return (
    <div className="space-y-6">
      <TransactionForm />
      
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+₹{totalIncome.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">-₹{totalExpenses.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${netAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {netAmount >= 0 ? '+' : ''}₹{Math.abs(netAmount).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>Your 10 most recent transactions</CardDescription>
        </CardHeader>
        <CardContent>
          {sortedTransactions.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-muted-foreground">No transactions found.</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                   {sortedTransactions.map((transaction) => {
                    // Format date and time from the transaction date
                    const transactionDate = new Date(transaction.date);
                    const formattedDate = transactionDate.toLocaleDateString();
                    const formattedTime = transactionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    
                    return (
                      <TableRow key={transaction._id}>
                        <TableCell className="font-medium">{formattedDate}</TableCell>
                        <TableCell>{formattedTime}</TableCell>
                        <TableCell>{transaction.description}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{transaction.category}</Badge>
                        </TableCell>
                        <TableCell>
          <Badge variant={transaction.type === "income" ? "default" : "secondary"}>
            {transaction.type}
          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
          <span
            className={`font-medium ${transaction.type === "income" ? "text-green-600" : "text-red-600"}`}
          >
            {transaction.type === "income" ? "+" : "-"}₹{transaction.amount.toLocaleString()}
          </span>
                        </TableCell>
                        <TableCell className="text-right">
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEdit(transaction)}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDelete(transaction._id)}
              className="h-8 w-8 p-0 text-destructive hover:text-destructive"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}