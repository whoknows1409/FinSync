// TradingOrderHistory.tsx
"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { X } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Order {
  id: string
  symbol: string
  name: string
  type: 'BUY' | 'SELL'
  quantity: number
  price: number
  status: 'PENDING' | 'EXECUTED' | 'CANCELLED'
  timestamp: string
  orderType: 'MARKET' | 'LIMIT'
  executedAt?: string
  executedPrice?: number
}

interface TradingOrderHistoryProps {
  orders: Order[]
  onOrderCancelled: () => void
  isLoading: boolean
}

export default function TradingOrderHistory({ orders, onOrderCancelled, isLoading }: TradingOrderHistoryProps) {
  // Format currency to 2 decimal places
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusBadge = (status: Order['status']) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="secondary">Pending</Badge>
      case 'EXECUTED':
        return <Badge variant="default">Executed</Badge>
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleCancelOrder = async (orderId: string) => {
    try {
      const response = await fetch(`/api/v1/trading/orders/${orderId}/cancel`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        onOrderCancelled()
      } else {
        console.error('Failed to cancel order')
      }
    } catch (error) {
      console.error('Error cancelling order:', error)
    }
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order History</CardTitle>
          <CardDescription>Your recent trading orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (orders.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Order History</CardTitle>
          <CardDescription>Your recent trading orders</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">You don't have any orders yet.</p>
            <p className="text-sm text-muted-foreground mt-1">
              Place your first order to get started.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order History</CardTitle>
        <CardDescription>Your recent trading orders</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Symbol</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Quantity</TableHead>
              <TableHead className="text-right">Order Price</TableHead>
              <TableHead className="text-right">Executed Price</TableHead>
              <TableHead>Order Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order) => (
              <TableRow key={order.id}>
                <TableCell className="font-medium">{order.symbol}</TableCell>
                <TableCell>
                  <Badge variant={order.type === 'BUY' ? 'default' : 'secondary'}>
                    {order.type}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">{order.quantity}</TableCell>
                <TableCell className="text-right">{formatCurrency(order.price)}</TableCell>
                <TableCell className="text-right">
                  {order.executedPrice ? formatCurrency(order.executedPrice) : '-'}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{order.orderType}</Badge>
                </TableCell>
                <TableCell>{getStatusBadge(order.status)}</TableCell>
                <TableCell>{formatDate(order.timestamp)}</TableCell>
                <TableCell>
                  {order.status === 'PENDING' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleCancelOrder(order.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}