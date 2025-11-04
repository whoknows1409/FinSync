"use client"

import { useState, useEffect, useRef } from "react"
import { Line } from 'react-chartjs-2'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
  ChartOptions,
} from 'chart.js'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Calendar, TrendingUp, TrendingDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
)

interface StockChartProps {
  symbol: string
  name?: string
  timeRange?: '7d' | '1mo' | '6mo'
  onTimeRangeChange?: (range: '7d' | '1mo' | '6mo') => void
  externalTimeRange?: '7d' | '1mo' | '6mo'
}

interface HistoricalData {
  date: string
  close: number
}

export default function StockChart({ 
  symbol, 
  name, 
  timeRange: timeRangeProp = '1mo',
  onTimeRangeChange,
  externalTimeRange
}: StockChartProps) {
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const chartRef = useRef<any>(null)
  
  // Use external time range if provided, otherwise use internal state
  const [internalTimeRange, setInternalTimeRange] = useState<'7d' | '1mo' | '6mo'>(timeRangeProp)
  
  const currentTimeRange = externalTimeRange || internalTimeRange

  // Calculate price change
  const priceChange = historicalData.length > 1 
    ? historicalData[historicalData.length - 1].close - historicalData[0].close 
    : 0
  const priceChangePercent = historicalData.length > 1 && historicalData[0].close > 0
    ? (priceChange / historicalData[0].close) * 100
    : 0
  const isPriceUp = priceChange >= 0

  const fetchHistoricalData = async () => {
    setLoading(true)
    setError('')
    
    try {
      const response = await fetch(
        `/api/stocks-analysis/historical-data?symbol=${symbol}&period=${currentTimeRange}`
      )
      
      if (!response.ok) {
        throw new Error('Failed to fetch historical data')
      }
      
      const data = await response.json()
      setHistoricalData(data)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error fetching historical data'
      setError(message)
      setHistoricalData([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (symbol) {
      fetchHistoricalData()
    }
  }, [symbol, currentTimeRange])

  const handleTimeRangeChange = (range: '7d' | '1mo' | '6mo') => {
    if (onTimeRangeChange) {
      onTimeRangeChange(range)
    } else {
      setInternalTimeRange(range)
    }
  }

  const chartData = {
    labels: historicalData.map(item => item.date),
    datasets: [
      {
        label: name ? `${name} Price` : 'Price (₹)',
        data: historicalData.map(item => item.close),
        borderColor: isPriceUp ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
        backgroundColor: isPriceUp 
          ? 'rgba(34, 197, 94, 0.1)' 
          : 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 0,
        pointHoverRadius: 8,
        pointHoverBorderWidth: 3,
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: isPriceUp ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
        fill: true,
      },
    ],
  }

  const chartOptions: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index' as const,
      intersect: false,
    },
    plugins: {
      legend: {
        display: false,
      },
      title: {
        display: false,
      },
      tooltip: {
        enabled: true,
        position: 'nearest' as const,
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: isPriceUp ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
        borderWidth: 2,
        padding: 16,
        cornerRadius: 12,
        displayColors: false,
        titleFont: {
          size: 13,
          weight: 600,
        },
        bodyFont: {
          size: 16,
          weight: 'bold' as const,
        },
        callbacks: {
          title: function(context: any) {
            return context[0]?.label || ''
          },
          label: function(context: any) {
            const y = context?.parsed?.y
            const value = typeof y === 'number' ? y : 0
            return `₹${value.toFixed(2)}`
          },
          afterLabel: function(context: any) {
            if (historicalData.length > 0) {
              const currentPrice = context.parsed.y
              const firstPrice = historicalData[0].close
              const change = currentPrice - firstPrice
              const changePercent = firstPrice > 0 ? (change / firstPrice) * 100 : 0
              const isUp = change >= 0
              return `${isUp ? '+' : ''}${change.toFixed(2)} (${isUp ? '+' : ''}${changePercent.toFixed(2)}%)`
            }
            return ''
          }
        }
      }
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          maxRotation: 0,
          autoSkip: true,
          maxTicksLimit: 8,
          color: 'rgb(156, 163, 175)',
          font: {
            size: 11,
          }
        },
        border: {
          display: false,
        }
      },
      y: {
        position: 'right' as const,
        beginAtZero: false,
        grid: {
          color: 'rgba(156, 163, 175, 0.1)',
        },
        ticks: {
          callback: function(value: any) {
            const num = typeof value === 'number' ? value : Number(value)
            return '₹' + (isNaN(num) ? 0 : num).toFixed(2)
          },
          color: 'rgb(156, 163, 175)',
          font: {
            size: 11,
          },
          padding: 8,
        },
        border: {
          display: false,
        }
      }
    },
    onHover: (event, activeElements) => {
      const canvas = event.native?.target as HTMLElement
      if (canvas) {
        canvas.style.cursor = activeElements.length > 0 ? 'pointer' : 'default'
      }
    }
  }

  const resetView = () => {
    if (chartRef.current) {
      chartRef.current.resetZoom()
    }
  }

  return (
    <Card className="shadow-lg border transition-all duration-300">
      <CardHeader className="pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Calendar className="h-5 w-5 text-primary" />
              Price Chart
            </CardTitle>
            <CardDescription className="flex items-center gap-2">
              {historicalData.length > 0 && (
                <Badge 
                  variant={isPriceUp ? "default" : "destructive"}
                  className="flex items-center gap-1"
                >
                  {isPriceUp ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  {isPriceUp ? '+' : ''}{priceChange.toFixed(2)} ({isPriceUp ? '+' : ''}{priceChangePercent.toFixed(2)}%)
                </Badge>
              )}
              <span className="text-muted-foreground text-sm">
                {currentTimeRange === '7d' ? 'Last 7 Days' : currentTimeRange === '1mo' ? 'Last Month' : 'Last 6 Months'}
              </span>
            </CardDescription>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <div className="flex gap-2">
            {(['7d', '1mo', '6mo'] as const).map((range) => (
              <Button
                key={range}
                variant={currentTimeRange === range ? "default" : "outline"}
                size="sm"
                onClick={() => handleTimeRangeChange(range)}
                className="h-8 text-xs px-3 transition-all"
              >
                {range === '7d' ? '7 Days' : range === '1mo' ? '1 Month' : '6 Months'}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center justify-center h-80">
            <div className="text-center space-y-3">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">Loading chart data...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center text-center h-80">
            <div className="space-y-2">
              <p className="text-muted-foreground">Chart data not available.</p>
              <p className="text-sm text-muted-foreground">{error}</p>
            </div>
          </div>
        ) : (
          <div className="relative h-80 md:h-96">
            <Line ref={chartRef} data={chartData} options={chartOptions} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}