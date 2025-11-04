// frontend/components/trading/VirtualWallet.tsx
"use client"

import { Wallet, TrendingUp } from "lucide-react"

interface VirtualWalletProps {
  walletBalance: number
  amountInvested: number
}

export default function VirtualWallet({ walletBalance, amountInvested }: VirtualWalletProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2
    }).format(value)
  }

  return (
    <div className="bg-card rounded-lg border p-4 shadow-sm">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        <Wallet className="h-5 w-5" />
        Virtual Wallet
      </h2>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">Current Balance</p>
          <p className="text-2xl font-bold">{formatCurrency(walletBalance)}</p>
        </div>
        
        <div>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-4 w-4" />
            Amount Invested
          </p>
          <p className="text-xl font-semibold">{formatCurrency(amountInvested)}</p>
        </div>
        
        <div className="pt-2 border-t">
          <p className="text-sm text-muted-foreground">Total Portfolio Value</p>
          <p className="text-xl font-bold">{formatCurrency(walletBalance + amountInvested)}</p>
        </div>
      </div>
    </div>
  )
}