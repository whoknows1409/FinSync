// frontend/components/trading/Holdings.tsx
"use client"

import type { Holding as HoldingType } from "@/lib/stock-api"

interface HoldingsProps {
  holdings: HoldingType[]
}

export default function HoldingsComponent({ holdings }: HoldingsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-IN').format(value)
  }

  if (holdings.length === 0) {
    return (
      <div className="bg-card rounded-lg border p-4 shadow-sm">
        <h2 className="text-xl font-semibold mb-4">Your Holdings</h2>
        <p className="text-muted-foreground text-center py-4">You don't have any holdings yet.</p>
      </div>
    )
  }

  return (
    <div className="bg-card rounded-lg border p-4 shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Your Holdings</h2>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 text-sm font-medium">Symbol</th>
              <th className="text-left py-2 text-sm font-medium">Quantity</th>
              <th className="text-left py-2 text-sm font-medium">Avg. Price</th>
              <th className="text-left py-2 text-sm font-medium">Current Price</th>
              <th className="text-right py-2 text-sm font-medium">P/L</th>
            </tr>
          </thead>
          <tbody>
            {holdings.map((holding) => (
              <tr key={holding.symbol} className="border-b">
                <td className="py-3">
                  <div className="font-medium">{holding.symbol}</div>
                  <div className="text-sm text-muted-foreground">{holding.name}</div>
                </td>
                <td className="py-3">{formatNumber(holding.quantity)}</td>
                <td className="py-3">{formatCurrency(holding.averagePrice)}</td>
                <td className="py-3">{formatCurrency(holding.currentPrice)}</td>
                <td className={`py-3 text-right font-medium ${holding.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(holding.unrealizedPnL)} ({holding.pnlPercentage.toFixed(2)}%)
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}