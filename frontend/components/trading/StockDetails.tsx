// frontend/components/trading/StockDetails.tsx
"use client"

import type { Stock as StockData } from "@/lib/stock-api"

interface StockDetailsProps {
  stockData: StockData
}

export default function StockDetails({ stockData }: StockDetailsProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(value)
  }

  const formatMarketCap = (value: number) => {
    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(2)} Cr`
    } else if (value >= 100000) {
      return `₹${(value / 100000).toFixed(2)} L`
    }
    return formatCurrency(value)
  }

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-IN').format(value)
  }

  const changeColor = (stockData.change ?? 0) >= 0 ? 'text-green-600' : 'text-red-600'

  return (
    <div className="bg-card rounded-lg border p-4 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold">{stockData.symbol}</h2>
          <p className="text-muted-foreground">{stockData.name}</p>
        </div>
        <div className="mt-2 md:mt-0">
          <div className="text-3xl font-bold">{formatCurrency(stockData.currentPrice ?? 0)}</div>
          <div className={`flex items-center ${changeColor}`}>
            <span>{(stockData.change ?? 0) >= 0 ? '↑' : '↓'}</span>
            <span>{formatCurrency(Math.abs(stockData.change ?? 0))} ({(stockData.changePercent ?? 0).toFixed(2)}%)</span>
          </div>
        </div>
      </div>
      
      <div className="text-sm text-muted-foreground mb-4">
        Last Updated: {new Date((stockData.lastUpdated as any) || Date.now()).toLocaleTimeString()}
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Day's Range</p>
          <p className="font-medium">{formatCurrency(((stockData as any).dayLow ?? 0))} - {formatCurrency(((stockData as any).dayHigh ?? 0))}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">52W Range</p>
          <p className="font-medium">{formatCurrency(((stockData as any).week52Low ?? (stockData as any).fiftyTwoWeekLow ?? 0))} - {formatCurrency(((stockData as any).week52High ?? (stockData as any).fiftyTwoWeekHigh ?? 0))}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Market Cap</p>
          <p className="font-medium">{formatMarketCap(stockData.marketCap ?? 0)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">P/E Ratio</p>
          <p className="font-medium">{( ((stockData as any).pe ?? (stockData as any).peRatio) ? Number(((stockData as any).pe ?? (stockData as any).peRatio)).toFixed(2) : 'N/A')}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Volume</p>
          <p className="font-medium">{formatNumber(stockData.volume ?? 0)}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground">Previous Close</p>
          <p className="font-medium">{formatCurrency(stockData.previousClose ?? 0)}</p>
        </div>
      </div>
    </div>
  )
}