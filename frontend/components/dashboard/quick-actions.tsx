// components/quick-actions.tsx
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, TrendingUp, MessageSquare, BarChart3 } from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

export function QuickActions() {
  const pathname = usePathname()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common tasks and shortcuts</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <Button 
            asChild 
            variant="outline" 
            className="h-20 flex-col bg-transparent hover:bg-accent"
            aria-label="Add Transaction"
          >
            <Link href="/transactions" className="flex flex-col items-center justify-center">
              <Plus className="h-6 w-6 mb-2" />
              <span>Add Transaction</span>
            </Link>
          </Button>
          
          <Button 
            asChild 
            variant="outline" 
            className="h-20 flex-col bg-transparent hover:bg-accent"
            aria-label="Analyze Stocks"
          >
            <Link href="/stocks" className="flex flex-col items-center justify-center">
              <TrendingUp className="h-6 w-6 mb-2" />
              <span>Analyze Stocks</span>
            </Link>
          </Button>
          
          <Button 
            asChild 
            variant="outline" 
            className="h-20 flex-col bg-transparent hover:bg-accent"
            aria-label="Ask AI"
          >
            <Link href="/chatbot" className="flex flex-col items-center justify-center">
              <MessageSquare className="h-6 w-6 mb-2" />
              <span>Ask AI</span>
            </Link>
          </Button>
          
          <Button 
            asChild 
            variant="outline" 
            className="h-20 flex-col bg-transparent hover:bg-accent"
            aria-label="View Reports"
          >
            <Link href="/analysis" className="flex flex-col items-center justify-center">
              <BarChart3 className="h-6 w-6 mb-2" />
              <span>View Reports</span>
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}