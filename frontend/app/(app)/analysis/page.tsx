import { FinancialSummary } from "@/components/analysis/financial-summary"
import { ExpenseBreakdownChart } from "@/components/analysis/expense-breakdown-chart"
import { IncomeExpenseTrend } from "@/components/analysis/income-expense-trend"
import { SavingsGrowthChart } from "@/components/analysis/savings-growth-chart"
import { RecurringExpensesCard } from "@/components/analysis/recurring-expenses-card"
import { TransactionsList } from "@/components/analysis/transactions-list"

export default function AnalysisPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Financial Analysis</h1>
        <p className="text-muted-foreground">
          Comprehensive insights into your financial health
        </p>
      </div>

      <FinancialSummary />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ExpenseBreakdownChart />
        <RecurringExpensesCard />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <IncomeExpenseTrend />
        <SavingsGrowthChart />
      </div>

      {/* Transaction History with Period Filtering */}
      <TransactionsList />
    </div>
  )
}
