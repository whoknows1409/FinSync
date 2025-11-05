"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useTransactions, type Transaction } from "@/lib/transactions-context"
import { Edit, Trash2, History } from "lucide-react"
import { TransactionForm } from "./transaction-form"
import { useToast } from "@/hooks/use-toast"

export function TransactionsTable() {
  const { transactions, deleteTransaction, updateTransaction, fetchTransactions } = useTransactions()
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const { toast } = useToast()

  const handleEdit = (transaction: Transaction) => {
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

  if (editingTransaction) {
    return <TransactionForm editingTransaction={editingTransaction} onCancel={handleCancelEdit} />
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <History className="h-4 w-4 sm:h-5 sm:w-5" />
          Transaction History
        </CardTitle>
        <CardDescription className="text-sm">View and manage all your transactions</CardDescription>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground text-sm">No transactions found. Add your first transaction above.</p>
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-20">Date</TableHead>
                  <TableHead className="hidden sm:table-cell">Time</TableHead>
                  <TableHead className="min-w-[120px]">Description</TableHead>
                  <TableHead className="hidden md:table-cell">Category</TableHead>
                  <TableHead className="hidden lg:table-cell">Type</TableHead>
                  <TableHead className="text-right min-w-[100px]">Amount</TableHead>
                  <TableHead className="text-right min-w-20">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((transaction) => {
                  // Format date and time from the transaction date
                  const transactionDate = new Date(transaction.date);
                  const formattedDate = transactionDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                  const formattedTime = transactionDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                  
                  return (
                    <TableRow key={transaction._id}>
                      <TableCell className="font-medium text-sm">{formattedDate}</TableCell>
                      <TableCell className="hidden sm:table-cell text-sm">{formattedTime}</TableCell>
                      <TableCell className="text-sm">
                        <div className="max-w-[150px] truncate">{transaction.description}</div>
                        <div className="md:hidden mt-1">
                          <Badge variant="outline" className="text-xs">{transaction.category}</Badge>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className="text-xs">{transaction.category}</Badge>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <Badge variant={transaction.type === "income" ? "default" : "secondary"} className="text-xs">
                          {transaction.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <span
                          className={`font-medium text-sm ${transaction.type === "income" ? "text-green-600" : "text-red-600"}`}
                        >
                          {transaction.type === "income" ? "+" : "-"}₹{transaction.amount.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(transaction)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(transaction._id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3 sm:h-4 sm:w-4" />
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
  )
}