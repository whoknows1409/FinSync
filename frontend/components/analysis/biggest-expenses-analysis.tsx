"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useState } from "react"
import { AlertCircle, BarChart3 } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

interface ExpenseItem {
  category: string;
  amount: number;
  percentage: number;
}

interface ExpensesData {
  totalMonthlyExpenses: number;
  topExpenses: ExpenseItem[];
}

export function BiggestExpensesAnalysis() {
  const [expensesData, setExpensesData] = useState<ExpensesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchExpenses = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const response = await fetch('/api/transactions/expenses-summary', {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch expenses data');
        }

        const data = await response.json();
        setExpensesData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        toast({
          title: "Error",
          description: "Failed to fetch expenses data.",
          variant: "destructive",
        });
        
        // Fallback to mock data if API fails
        setExpensesData({
          totalMonthlyExpenses: 8500,
          topExpenses: [
            { category: 'Housing', amount: 3500, percentage: 41 },
            { category: 'Food', amount: 1500, percentage: 18 },
            { category: 'Transportation', amount: 1000, percentage: 12 },
            { category: 'Entertainment', amount: 800, percentage: 9 },
            { category: 'Utilities', amount: 700, percentage: 8 },
            { category: 'Others', amount: 1000, percentage: 12 }
          ]
        });
      } finally {
        setLoading(false);
      }
    };

    fetchExpenses();
  }, [toast]);

  if (loading) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Biggest Expenses</CardTitle>
          <CardDescription>Loading your spending data...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !expensesData) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Biggest Expenses</CardTitle>
          <CardDescription>View your top spending categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <div className="flex flex-col items-center gap-2 text-red-500">
              <AlertCircle className="h-8 w-8" />
              <p>{error || 'Failed to load expense data'}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!expensesData.topExpenses || expensesData.topExpenses.length === 0) {
    return (
      <Card className="h-full">
        <CardHeader>
          <CardTitle>Biggest Expenses</CardTitle>
          <CardDescription>View your top spending categories</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[300px]">
            <p className="text-muted-foreground">No expense data available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Biggest Expenses</CardTitle>
        <CardDescription>Your top spending categories</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Total expenses summary */}
        <div className="flex justify-between items-center p-4 rounded-lg border">
          <div>
            <h3 className="text-sm text-muted-foreground">Total Monthly Expenses</h3>
            <p className="text-xl font-bold">₹{expensesData.totalMonthlyExpenses.toLocaleString()}</p>
          </div>
          <div className="flex items-center gap-1 text-sm text-muted-foreground">
            <BarChart3 className="h-4 w-4" />
            <span>Based on 30-day data</span>
          </div>
        </div>

        {/* Top expenses list */}
        <div className="space-y-4">
          {expensesData.topExpenses.map((expense, index) => (
            <div key={index} className="p-3 border rounded-lg">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">{expense.category}</h3>
                <div className="flex items-center gap-2">
                  <span className="font-medium">₹{expense.amount.toLocaleString()}</span>
                  <span className="text-sm text-muted-foreground">{expense.percentage}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}