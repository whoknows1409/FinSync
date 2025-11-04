// frontend/components/debug/api-status.tsx
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"

export function ApiStatus() {
  const [status, setStatus] = useState<{ [key: string]: string }>({})
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const checkApiEndpoints = async () => {
    setLoading(true)
    const newStatus: { [key: string]: string } = {}
    
    const endpoints = [
      { name: 'Expense Breakdown', url: '/api/analysis/expense-breakdown' },
      { name: 'Income vs Expense', url: '/api/analysis/income-expense-trends' },
      { name: 'Savings Growth', url: '/api/analysis/savings-growth' },
      { name: 'Financial Summary', url: '/api/analysis/summary' },
      { name: 'Budget Performance', url: '/api/budgets/category-performance' },
    ]

    const token = localStorage.getItem('token')
    
    for (const endpoint of endpoints) {
      try {
        const response = await fetch(endpoint.url, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (response.ok) {
          newStatus[endpoint.name] = '✅ OK'
        } else {
          const errorData = await response.json()
          newStatus[endpoint.name] = `❌ Error: ${errorData.message || response.statusText}`
        }
      } catch (error) {
        newStatus[endpoint.name] = `❌ Failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      }
    }
    
    setStatus(newStatus)
    setLoading(false)
    
    // Check if any endpoint failed
    const hasFailures = Object.values(newStatus).some(status => status.includes('❌'))
    if (hasFailures) {
      toast({
        title: "API Issues Detected",
        description: "Some API endpoints are not responding correctly.",
        variant: "destructive",
      })
    } else {
      toast({
        title: "API Status",
        description: "All API endpoints are working correctly.",
      })
    }
  }

  useEffect(() => {
    checkApiEndpoints()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle>API Status</CardTitle>
        <CardDescription>Check the status of API endpoints</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-4">
          {Object.entries(status).map(([name, status]) => (
            <div key={name} className="flex justify-between items-center">
              <span className="text-sm font-medium">{name}:</span>
              <span className="text-sm">{status}</span>
            </div>
          ))}
        </div>
        <Button onClick={checkApiEndpoints} disabled={loading}>
          {loading ? 'Checking...' : 'Check Again'}
        </Button>
      </CardContent>
    </Card>
  )
}