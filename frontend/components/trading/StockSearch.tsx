// frontend/components/trading/StockSearch.tsx
"use client"

import { useState } from "react"
import { Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface StockSearchProps {
  onSearch: (symbol: string) => void
  initialSymbol: string
}

export default function StockSearch({ onSearch, initialSymbol }: StockSearchProps) {
  const [symbol, setSymbol] = useState<string>(initialSymbol)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (symbol.trim()) {
      onSearch(symbol.trim())
    }
  }

  return (
    <div className="bg-card rounded-lg border p-4 shadow-sm">
      <h2 className="text-xl font-semibold mb-4">Stock Search</h2>
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          type="text"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value.toUpperCase())}
          placeholder="Enter NSE stock symbol (e.g., RELIANCE)"
          className="flex-1"
        />
        <Button type="submit" size="icon">
          <Search className="h-4 w-4" />
        </Button>
      </form>
      <p className="text-sm text-muted-foreground mt-2">
        Enter NSE stock symbol to view details and trade
      </p>
    </div>
  )
}