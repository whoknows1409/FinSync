"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useAuth } from "./auth-context"
import { useToast } from "@/hooks/use-toast"
import { transactionAPI } from "@/lib/api-service" // Import the transactionAPI

export interface Transaction {
  _id: string
  type: "income" | "expense"
  amount: number
  category: string
  description: string
  date: string
  createdAt: string
  isRecurring?: boolean
  recurringId?: string
  aiCategorized?: boolean
}

export interface RecurringTransaction {
  _id: string
  type: "income" | "expense"
  amount: number
  category: string
  description: string
  frequency: "daily" | "weekly" | "monthly" | "yearly"
  startDate: string
  endDate?: string
  isActive: boolean
  lastProcessed?: string
}

interface TransactionsContextType {
  transactions: Transaction[]
  recurringTransactions: RecurringTransaction[]
  addTransaction: (transaction: Omit<Transaction, "_id" | "createdAt">) => Promise<void>
  updateTransaction: (id: string, transaction: Omit<Transaction, "_id" | "createdAt">) => Promise<void>
  deleteTransaction: (id: string) => Promise<void>
  addRecurringTransaction: (transaction: Omit<RecurringTransaction, "_id">) => Promise<void>
  updateRecurringTransaction: (id: string, transaction: Partial<RecurringTransaction>) => Promise<void>
  deleteRecurringTransaction: (id: string) => Promise<void>
  getTransactionsByType: (type: "income" | "expense") => Transaction[]
  getTotalByType: (type: "income" | "expense") => number
  categorizeWithAI: (description: string) => string
  processRecurringTransactions: () => Promise<{ processedCount: number }>
  loading: boolean
  error: string | null
  fetchTransactions: () => Promise<void>
  fetchRecurringTransactions: () => Promise<void>
}

const TransactionsContext = createContext<TransactionsContextType | undefined>(undefined)

// AI categorization rules (mock implementation)
const categorizationRules = [
  { keywords: ["zomato", "swiggy", "restaurant", "food", "grocery", "cafe"], category: "Food" },
  { keywords: ["uber", "ola", "metro", "bus", "taxi", "fuel", "petrol"], category: "Transportation" },
  { keywords: ["netflix", "spotify", "amazon prime", "movie", "entertainment"], category: "Entertainment" },
  { keywords: ["electricity", "water", "gas", "internet", "phone", "utility"], category: "Utilities" },
  { keywords: ["rent", "emi", "loan", "mortgage"], category: "Housing" },
  { keywords: ["salary", "bonus", "freelance", "income"], category: "Salary" },
  { keywords: ["medical", "doctor", "hospital", "pharmacy", "health"], category: "Healthcare" },
  { keywords: ["shopping", "clothes", "amazon", "flipkart"], category: "Shopping" },
]

export function TransactionsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth() // Get the user from AuthProvider
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [recurringTransactions, setRecurringTransactions] = useState<RecurringTransaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Fetch transactions from backend using transactionAPI
  const fetchTransactions = async () => {
    try {
      setLoading(true)
      const response = await transactionAPI.getTransactions()
      setTransactions(response.data || [])
    } catch (err) {
      console.error('Error fetching transactions:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      toast({
        title: "Error",
        description: "Failed to fetch transactions.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  // Fetch recurring transactions from backend using transactionAPI
  const fetchRecurringTransactions = async () => {
    try {
      console.log('Fetching recurring transactions...');
      const response = await transactionAPI.getRecurringTransactions()
      console.log('Fetched recurring transactions:', response.data);
      setRecurringTransactions(response.data || [])
    } catch (err) {
      console.error('Error fetching recurring transactions:', err);
      setError(err instanceof Error ? err.message : 'Unknown error')
      toast({
        title: "Error",
        description: "Failed to fetch recurring transactions.",
        variant: "destructive",
      })
    }
  }

  // Only fetch data when user is logged in
  useEffect(() => {
    if (user) {
      fetchTransactions()
      fetchRecurringTransactions()
    } else {
      setLoading(false)
    }
  }, [user])

  const categorizeWithAI = (description: string): string => {
    const lowerDesc = description.toLowerCase()

    for (const rule of categorizationRules) {
      if (rule.keywords.some((keyword) => lowerDesc.includes(keyword))) {
        return rule.category
      }
    }

    return "Other"
  }

  const addTransaction = async (transaction: Omit<Transaction, "_id" | "createdAt">) => {
    try {
      // Auto-categorize if no category provided or category is "Other"
      let finalTransaction = { ...transaction }
      if (!transaction.category || transaction.category === "Other") {
        const aiCategory = categorizeWithAI(transaction.description)
        finalTransaction = {
          ...transaction,
          category: aiCategory,
          aiCategorized: aiCategory !== "Other",
        }
      }

      const response = await transactionAPI.addTransaction(finalTransaction)
      setTransactions(prev => [response.data, ...prev])
      
      // Show success message
      toast({
        title: "Success",
        description: "Transaction created successfully",
      })
    } catch (err) {
      console.error('Error adding transaction:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      toast({
        title: "Error",
        description: "Failed to add transaction.",
        variant: "destructive",
      })
    }
  }

  const updateTransaction = async (id: string, updatedTransaction: Omit<Transaction, "_id" | "createdAt">) => {
    try {
      const response = await transactionAPI.updateTransaction(id, updatedTransaction)
      setTransactions(prev => 
        prev.map(t => t._id === id ? response.data : t)
      )
      
      // Show success message
      toast({
        title: "Success",
        description: "Transaction updated successfully",
      })
    } catch (err) {
      console.error('Error updating transaction:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      toast({
        title: "Error",
        description: "Failed to update transaction.",
        variant: "destructive",
      })
    }
  }

  const deleteTransaction = async (id: string) => {
    try {
      await transactionAPI.deleteTransaction(id)
      setTransactions(prev => prev.filter(t => t._id !== id))
      
      // Show success message
      toast({
        title: "Success",
        description: "Transaction deleted successfully",
      })
    } catch (err) {
      console.error('Error deleting transaction:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      toast({
        title: "Error",
        description: "Failed to delete transaction.",
        variant: "destructive",
      })
    }
  }

  const addRecurringTransaction = async (transaction: Omit<RecurringTransaction, "_id">) => {
    try {
      const response = await transactionAPI.addRecurringTransaction(transaction)
      setRecurringTransactions(prev => [...prev, response.data])
      
      // Refresh transactions list since a new transaction might have been created
      await fetchTransactions()
      
      // Show success message
      toast({
        title: "Success",
        description: "Recurring transaction created successfully",
      })
    } catch (err) {
      console.error('Error adding recurring transaction:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      toast({
        title: "Error",
        description: "Failed to add recurring transaction.",
        variant: "destructive",
      })
    }
  }

  const updateRecurringTransaction = async (id: string, updates: Partial<RecurringTransaction>) => {
    try {
      const response = await transactionAPI.updateRecurringTransaction(id, updates)
      setRecurringTransactions(prev => 
        prev.map(r => r._id === id ? response.data : r)
      )
      
      // Show success message
      toast({
        title: "Success",
        description: "Recurring transaction updated successfully",
      })
    } catch (err) {
      console.error('Error updating recurring transaction:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      toast({
        title: "Error",
        description: "Failed to update recurring transaction.",
        variant: "destructive",
      })
    }
  }

  const deleteRecurringTransaction = async (id: string) => {
    try {
      console.log(`Deleting recurring transaction with ID: ${id}`);
      await transactionAPI.deleteRecurringTransaction(id)
      
      // Update the state immediately
      console.log('Updating state after deletion...');
      setRecurringTransactions(prev => {
        const updatedList = prev.filter(r => r._id !== id);
        console.log('Updated list:', updatedList);
        return updatedList;
      })
      
      // Show success message
      toast({
        title: "Success",
        description: "Recurring transaction deleted successfully",
      })
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      console.error('Error deleting recurring transaction:', err);
      setError(errorMessage);
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const processRecurringTransactions = async () => {
    try {
      const response = await transactionAPI.processRecurringTransactions()
      
      // Refresh transactions and recurring transactions
      await fetchTransactions()
      await fetchRecurringTransactions()
      
      return response
    } catch (err) {
      console.error('Error processing recurring transactions:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      toast({
        title: "Error",
        description: "Failed to process recurring transactions.",
        variant: "destructive",
      })
      throw err
    }
  }

  const getTransactionsByType = (type: "income" | "expense") => {
    return transactions.filter((transaction) => transaction.type === type)
  }

  const getTotalByType = (type: "income" | "expense") => {
    return transactions
      .filter((transaction) => transaction.type === type)
      .reduce((total, transaction) => total + transaction.amount, 0)
  }

  return (
    <TransactionsContext.Provider
      value={{
        transactions,
        recurringTransactions,
        addTransaction,
        updateTransaction,
        deleteTransaction,
        addRecurringTransaction,
        updateRecurringTransaction,
        deleteRecurringTransaction,
        getTransactionsByType,
        getTotalByType,
        categorizeWithAI,
        processRecurringTransactions,
        loading,
        error,
        fetchTransactions,
        fetchRecurringTransactions
      }}
    >
      {children}
    </TransactionsContext.Provider>
  )
}

export function useTransactions() {
  const context = useContext(TransactionsContext)
  if (context === undefined) {
    throw new Error("useTransactions must be used within a TransactionsProvider")
  }
  return context
}