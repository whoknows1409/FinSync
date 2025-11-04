"use client"

import { useState, useEffect, useRef } from "react"
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
import { Line } from 'react-chartjs-2'
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

interface HistoricalData {
  date: string
  close: number
}

interface ComparisonChartProps {
  stock1Symbol: string
  stock1Name: string
  stock2Symbol: string
  stock2Name: string
  timeRange: '7d' | '1mo' | '6mo'
}

export default function ComparisonChart({ 
  stock1Symbol, 
  stock1Name,
  stock2Symbol,
  stock2Name,
  timeRange
}: ComparisonChartProps) {
  const [historicalData1, setHistoricalData1] = useState<HistoricalData[]>([])
  const [historicalData2, setHistoricalData2] = useState<HistoricalData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [yMin, setYMin] = useState(0)
  const [yMax, setYMax] = useState(0)
  const chartRef1 = useRef<any>(null)
  const chartRef2 = useRef<any>(null)

  // Calculate price changes for both stocks
  const stock1Change = historicalData1.length > 1 
    ? historicalData1[historicalData1.length - 1].close - historicalData1[0].close 
    : 0
  const stock1ChangePercent = historicalData1.length > 1 && historicalData1[0].close > 0
    ? (stock1Change / historicalData1[0].close) * 100
    : 0
  const isStock1Up = stock1Change >= 0

  const stock2Change = historicalData2.length > 1 
    ? historicalData2[historicalData2.length - 1].close - historicalData2[0].close 
    : 0
  const stock2ChangePercent = historicalData2.length > 1 && historicalData2[0].close > 0
    ? (stock2Change / historicalData2[0].close) * 100
    : 0
  const isStock2Up = stock2Change >= 0

  const fetchHistoricalData = async () => {
    setLoading(true)
    setError('')
    
    try {
      const [response1, response2] = await Promise.all([
        fetch(`/api/stocks-analysis/historical-data?symbol=${stock1Symbol}&period=${timeRange}`),
        fetch(`/api/stocks-analysis/historical-data?symbol=${stock2Symbol}&period=${timeRange}`)
      ])
      
      if (!response1.ok || !response2.ok) {
        throw new Error('Failed to fetch historical data')
      }
      
      const [data1, data2] = await Promise.all([
        response1.json(),
        response2.json()
      ])
      
      setHistoricalData1(data1)
      setHistoricalData2(data2)
      
      // Calculate min and max for both datasets to synchronize scales
      const allPrices = [
        ...data1.map((item: any) => item.close),
        ...data2.map((item: any) => item.close)
      ]
      
      const minPrice = Math.min(...allPrices)
      const maxPrice = Math.max(...allPrices)
      
      // Add padding
      const padding = (maxPrice - minPrice) * 0.1
      setYMin(minPrice - padding)
      setYMax(maxPrice + padding)
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error fetching historical data'
      setError(message)
      setHistoricalData1([])
      setHistoricalData2([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHistoricalData()
  }, [stock1Symbol, stock2Symbol, timeRange])

  const chartData1 = {
    labels: historicalData1.map(item => item.date),
    datasets: [
      {
        label: stock1Name,
        data: historicalData1.map(item => item.close),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 0,
        pointHoverRadius: 8,
        pointHoverBorderWidth: 3,
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#3b82f6',
        fill: true,
      },
    ],
  }

  const chartData2 = {
    labels: historicalData2.map(item => item.date),
    datasets: [
      {
        label: stock2Name,
        data: historicalData2.map(item => item.close),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 0,
        pointHoverRadius: 8,
        pointHoverBorderWidth: 3,
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#10b981',
        fill: true,
      },
    ],
  }

  const chartOptions = (min: number, max: number, stockName: string, data: HistoricalData[], color: string): ChartOptions<'line'> => ({
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
        borderColor: color,
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
            if (data.length > 0) {
              const currentPrice = context.parsed.y
              const firstPrice = data[0].close
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
        min: min,
        max: max,
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
  })

  return (
    <Card className="shadow-lg border transition-all duration-300">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-xl">
          <Calendar className="h-5 w-5 text-primary" />
          Price Comparison
        </CardTitle>
        <CardDescription>
          Side-by-side price trend comparison for the selected period
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="flex items-center justify-center h-80">
            <div className="text-center space-y-3">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">Loading comparison charts...</p>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Stock 1 Chart */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg text-blue-600 dark:text-blue-400">
                  {stock1Name}
                </h3>
                {historicalData1.length > 0 && (
                  <Badge 
                    variant={isStock1Up ? "default" : "destructive"}
                    className="flex items-center gap-1"
                  >
                    {isStock1Up ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {isStock1Up ? '+' : ''}{stock1Change.toFixed(2)} ({isStock1Up ? '+' : ''}{stock1ChangePercent.toFixed(2)}%)
                  </Badge>
                )}
              </div>
              <div className="relative h-80">
                <Line 
                  ref={chartRef1} 
                  data={chartData1} 
                  options={chartOptions(yMin, yMax, stock1Name, historicalData1, '#3b82f6')} 
                />
              </div>
            </div>

            {/* Stock 2 Chart */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg text-green-600 dark:text-green-400">
                  {stock2Name}
                </h3>
                {historicalData2.length > 0 && (
                  <Badge 
                    variant={isStock2Up ? "default" : "destructive"}
                    className="flex items-center gap-1"
                  >
                    {isStock2Up ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {isStock2Up ? '+' : ''}{stock2Change.toFixed(2)} ({isStock2Up ? '+' : ''}{stock2ChangePercent.toFixed(2)}%)
                  </Badge>
                )}
              </div>
              <div className="relative h-80">
                <Line 
                  ref={chartRef2} 
                  data={chartData2} 
                  options={chartOptions(yMin, yMax, stock2Name, historicalData2, '#10b981')} 
                />
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}