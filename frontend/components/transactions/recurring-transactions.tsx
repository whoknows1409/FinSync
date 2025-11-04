"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Plus, Repeat, Edit, Trash2, Calendar, AlertCircle } from "lucide-react"
import { useTransactions, type RecurringTransaction } from "@/lib/transactions-context"
import { useState } from "react"
import { AddRecurringTransactionDialog } from "@/components/transactions/add-recurring-dialog"
import { EditRecurringTransactionDialog } from "@/components/transactions/edit-recurring-dialog"
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function RecurringTransactions() {
  const { 
    recurringTransactions, 
    updateRecurringTransaction, 
    deleteRecurringTransaction, 
    addRecurringTransaction,
    transactions,
    processRecurringTransactions,
    loading,
    fetchTransactions,
    fetchRecurringTransactions
  } = useTransactions()
  
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showInfoDialog, setShowInfoDialog] = useState(false)
  const [selectedRecurring, setSelectedRecurring] = useState<RecurringTransaction | undefined>(undefined)
  const [isProcessing, setIsProcessing] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const { toast } = useToast()

  // Define categories aligned with backend enum in RecurringTransaction model
  const incomeCategories = [
    "Salary",
    "Freelance",
    "Business",
    "Investments",
    "Savings",
    "Other Income",
  ]
  const expenseCategories = [
    "Food & Dining",
    "Transportation",
    "Shopping",
    "Entertainment",
    "Bills & Utilities",
    "Healthcare",
    "Education",
    "Travel",
    "Other Expense",
  ]

  // Function to generate transactions from recurring templates
  const generateTransactionsFromRecurring = async () => {
    setIsProcessing(true)
    try {
      const result = await processRecurringTransactions()
      toast({
        title: "Recurring Transactions Processed",
        description: `Successfully processed ${result.processedCount} transactions.`,
      })
      // Refresh transactions list
      await fetchTransactions()
      await fetchRecurringTransactions()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to process recurring transactions.",
        variant: "destructive",
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const toggleRecurring = async (id: string, isActive: boolean) => {
    try {
      await updateRecurringTransaction(id, { isActive })
      toast({
        title: "Recurring Transaction Updated",
        description: `Transaction ${isActive ? 'activated' : 'deactivated'}.`,
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update recurring transaction.",
        variant: "destructive",
      })
    }
  }

  const handleAddRecurringTransaction = async (transaction: Omit<RecurringTransaction, "_id">) => {
    try {
      await addRecurringTransaction(transaction)
      toast({
        title: "Success",
        description: "Recurring transaction created successfully",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add recurring transaction.",
        variant: "destructive",
      })
    }
  }

  const handleEditRecurringTransaction = async (id: string, transaction: Partial<RecurringTransaction>) => {
    try {
      await updateRecurringTransaction(id, transaction)
      toast({
        title: "Success",
        description: "Recurring transaction updated successfully",
      })
      // Refresh the data after successful edit
      await fetchRecurringTransactions()
      setShowEditDialog(false)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update recurring transaction.",
        variant: "destructive",
      })
    }
  }

  const confirmDelete = (id: string) => {
    setDeleteId(id)
    setShowDeleteDialog(true)
  }

  const handleDeleteConfirmed = async () => {
    if (deleteId) {
      setIsDeleting(deleteId)
      try {
        console.log('Confirming delete for recurring transaction:', deleteId);
        const result = await deleteRecurringTransaction(deleteId)
        console.log('Delete result:', result);
        toast({
          title: "Success",
          description: "Recurring transaction deleted successfully",
        })
        
        // Force a refresh of the data
        console.log('Refreshing data after deletion...');
        await fetchRecurringTransactions()
        console.log('Data refreshed');
        
      } catch (error) {
        console.error('Error deleting recurring transaction:', error);
        toast({
          title: "Error",
          description: "Failed to delete recurring transaction.",
          variant: "destructive",
        })
      } finally {
        setIsDeleting(null)
        setShowDeleteDialog(false)
        setDeleteId(null)
      }
    }
  }

  const getFrequencyColor = (frequency: string) => {
    switch (frequency) {
      case "daily":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
      case "weekly":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
      case "monthly":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
      case "yearly":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300"
    }
  }

  const showRecurringDetails = (recurring: RecurringTransaction) => {
    setSelectedRecurring(recurring)
    setShowInfoDialog(true)
  }

  const openEditDialog = (recurring: RecurringTransaction) => {
    setSelectedRecurring(recurring)
    setShowEditDialog(true)
  }

  // Count how many transactions were generated from each recurring template
  const getGeneratedTransactionCount = (recurringId: string) => {
    return transactions.filter((t: any) => t.recurringId === recurringId).length
  }

  if (loading) {
    return <div className="flex justify-center items-center h-64">Loading recurring transactions...</div>
  }

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center space-x-2">
            <Repeat className="h-5 w-5" />
            <span>Recurring Transactions</span>
          </CardTitle>
          <div className="flex items-center space-x-2">
            <Button 
              size="sm" 
              variant="outline" 
              onClick={generateTransactionsFromRecurring}
              title="Manually process recurring transactions"
              disabled={isProcessing}
            >
              <Calendar className="h-4 w-4 mr-1" />
              {isProcessing ? 'Processing...' : 'Process Now'}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setShowAddDialog(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Recurring
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recurringTransactions.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No recurring transactions set up</p>
          ) : (
            <div className="space-y-4">
              {recurringTransactions.map((recurring: RecurringTransaction) => {
                const generatedCount = getGeneratedTransactionCount(recurring._id)
                return (
                  <div key={recurring._id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-medium">{recurring.description}</h4>
                        <Badge className={getFrequencyColor(recurring.frequency)}>{recurring.frequency}</Badge>
                        <Badge variant={recurring.type === "income" ? "default" : "destructive"}>
                          {recurring.type}
                        </Badge>
                        {generatedCount > 0 && (
                          <Badge variant="outline" className="bg-blue-50">
                            {generatedCount} generated
                          </Badge>
                        )}
                        {!recurring.isActive && (
                          <Badge variant="outline" className="bg-gray-100 text-gray-800">
                            Inactive
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <span>₹{recurring.amount.toLocaleString()}</span>
                        <span>{recurring.category}</span>
                        <span>Start: {new Date(recurring.startDate).toLocaleDateString()}</span>
                        {recurring.endDate && (
                          <span>End: {new Date(recurring.endDate).toLocaleDateString()}</span>
                        )}
                        {recurring.lastProcessed && (
                          <span>Last: {new Date(recurring.lastProcessed).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={recurring.isActive}
                        onCheckedChange={(checked) => toggleRecurring(recurring._id, checked)}
                      />
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => openEditDialog(recurring)}
                        title="Edit transaction"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => confirmDelete(recurring._id)}
                        title="Delete transaction"
                        disabled={isDeleting === recurring._id}
                      >
                        {isDeleting === recurring._id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AddRecurringTransactionDialog 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog} 
        onSave={handleAddRecurringTransaction}
        incomeCategories={incomeCategories}
        expenseCategories={expenseCategories}
      />

      <EditRecurringTransactionDialog 
        open={showEditDialog} 
        onOpenChange={setShowEditDialog} 
        onSave={handleEditRecurringTransaction}
        recurringTransaction={selectedRecurring}
        incomeCategories={incomeCategories}
        expenseCategories={expenseCategories}
      />

      {/* Recurring Transaction Details Dialog */}
      <Dialog open={showInfoDialog} onOpenChange={setShowInfoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recurring Transaction Details</DialogTitle>
            <DialogDescription>
              Information about this recurring transaction and generated instances.
            </DialogDescription>
          </DialogHeader>
          {selectedRecurring && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-sm">Description</h4>
                  <p>{selectedRecurring.description}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Amount</h4>
                  <p>₹{selectedRecurring.amount.toLocaleString()}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Frequency</h4>
                  <p className="capitalize">{selectedRecurring.frequency}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Type</h4>
                  <p className="capitalize">{selectedRecurring.type}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Start Date</h4>
                  <p>{new Date(selectedRecurring.startDate).toLocaleDateString()}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Status</h4>
                  <p className={selectedRecurring.isActive ? "text-green-600" : "text-red-600"}>
                    {selectedRecurring.isActive ? "Active" : "Inactive"}
                  </p>
                </div>
                <div>
                  <h4 className="font-medium text-sm">Last Processed</h4>
                  <p>{selectedRecurring.lastProcessed ? new Date(selectedRecurring.lastProcessed).toLocaleDateString() : 'N/A'}</p>
                </div>
                {selectedRecurring.endDate && (
                  <div>
                    <h4 className="font-medium text-sm">End Date</h4>
                    <p>{new Date(selectedRecurring.endDate).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
              
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This recurring transaction has generated {getGeneratedTransactionCount(selectedRecurring._id)} transactions so far.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the recurring transaction.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDeleteDialog(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirmed}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}