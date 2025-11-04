// frontend/components/trading/BuyStock.tsx
"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Stock as StockData } from "@/lib/stock-api"

interface BuyStockProps {
  stockData: StockData
  quantity: number
  onQuantityChange: (quantity: number) => void
  onBuy: () => void
}

export default function BuyStock({ stockData, quantity, onQuantityChange, onBuy }: BuyStockProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(value)
  }

  const totalCost = quantity * stockData.currentPrice

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value)
    if (!isNaN(value) && value > 0) {
      onQuantityChange(value)
    }
  }

  return (
    <div className="bg-card rounded-lg border p-4 shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Buy Stock</h2>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Current Price</p>
          <p className="text-lg font-semibold">{formatCurrency(stockData.currentPrice)}</p>
        </div>
        
        <div>
          <label htmlFor="quantity" className="text-sm font-medium">
            Quantity
          </label>
          <Input
            id="quantity"
            type="number"
            min="1"
            value={quantity}
            onChange={handleQuantityChange}
            className="mt-1"
          />
        </div>
        
        <div className="pt-2 border-t">
          <div className="flex justify-between items-center">
            <span className="font-medium">Total Cost</span>
            <span className="text-lg font-bold">{formatCurrency(totalCost)}</span>
          </div>
        </div>
        
        <Button 
          onClick={onBuy} 
          className="w-full mt-2"
          disabled={totalCost <= 0}
        >
          Buy {stockData.symbol}
        </Button>
      </div>
    </div>
  )
}