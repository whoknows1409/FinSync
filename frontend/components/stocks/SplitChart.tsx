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
} from 'chart.js'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
)

interface StockData {
  symbol: string
  name: string
  currentPrice: number
}

interface HistoricalData {
  date: string
  close: number
}

interface SplitChartProps {
  stock1: StockData
  stock2: StockData
  timeRange: '7d' | '1mo' | '6mo'
}

export default function SplitChart({ stock1, stock2, timeRange }: SplitChartProps) {
  const [historicalData1, setHistoricalData1] = useState<HistoricalData[]>([])
  const [historicalData2, setHistoricalData2] = useState<HistoricalData[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const chartRef = useRef<HTMLCanvasElement>(null)
  const chartInstance = useRef<ChartJS | null>(null)

  const fetchHistoricalData = async () => {
    setLoading(true)
    setError('')
    
    try {
      const [response1, response2] = await Promise.all([
        fetch(`/api/stocks-analysis/historical-data?symbol=${stock1.symbol}&period=${timeRange}`),
        fetch(`/api/stocks-analysis/historical-data?symbol=${stock2.symbol}&period=${timeRange}`)
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
    if (stock1 && stock2) {
      fetchHistoricalData()
    }
  }, [stock1, stock2, timeRange])

  useEffect(() => {
    if (!loading && !error && historicalData1.length > 0 && historicalData2.length > 0 && chartRef.current) {
      // Destroy previous chart instance if it exists
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }

      // Find the min and max values across both datasets to set a common Y-axis
      const allPrices = [
        ...historicalData1.map(item => item.close),
        ...historicalData2.map(item => item.close)
      ]
      
      const minPrice = Math.min(...allPrices)
      const maxPrice = Math.max(...allPrices)
      
      // Add some padding to the Y-axis
      const padding = (maxPrice - minPrice) * 0.1
      const yMin = minPrice - padding
      const yMax = maxPrice + padding

      // Create custom plugin for drawing the middle Y-axis and splitting the chart
      const splitChartPlugin = {
        id: 'splitChart',
        beforeDraw: (chart: any) => {
          const {ctx, chartArea: {top, right, bottom, left, width, height}, scales: {x, y}} = chart;
          
          // Draw vertical line in the middle (Y-axis)
          ctx.save();
          ctx.strokeStyle = '#d1d5db'; // Lighter gray for the middle axis
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(left + width / 2, top);
          ctx.lineTo(left + width / 2, bottom);
          ctx.stroke();
          ctx.restore();
          
          // Draw Y-axis labels in the middle
          ctx.save();
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#6b7280'; // Medium gray text
          ctx.font = '11px sans-serif';
          
          // Draw Y-axis labels
          const yTicks = 5;
          for (let i = 0; i <= yTicks; i++) {
            const yValue = yMin + (yMax - yMin) * (i / yTicks);
            const yPos = bottom - (height * (i / yTicks));
            
            // Format the Y value
            const formattedValue = '₹' + yValue.toFixed(2);
            
            // Draw the label
            ctx.fillText(formattedValue, left + width / 2, yPos);
            
            // Draw grid line
            ctx.save();
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.05)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(left, yPos);
            ctx.lineTo(left + width, yPos);
            ctx.stroke();
            ctx.restore();
          }
          
          ctx.restore();
        },
        beforeDatasetDraw: (chart: any, args: any) => {
          const {ctx, chartArea: {left, top, width, height}} = chart;
          const halfWidth = width / 2;
          
          ctx.save();
          
          // Clip the dataset to its respective half
          if (args.index === 0) {
            // Left half for stock 1
            ctx.beginPath();
            ctx.rect(left, top, halfWidth, height);
            ctx.clip();
          } else {
            // Right half for stock 2
            ctx.beginPath();
            ctx.rect(left + halfWidth, top, halfWidth, height);
            ctx.clip();
          }
        },
        afterDatasetDraw: (chart: any) => {
          chart.ctx.restore();
        }
      }

      // Create the chart
      const ctx = chartRef.current.getContext('2d') as any
      chartInstance.current = new ChartJS(ctx, {
        type: 'line',
        data: {
          labels: historicalData1.map(item => item.date),
          datasets: [
            {
              label: stock1.name,
              data: historicalData1.map(item => item.close),
              borderColor: '#3b82f6', // Bright blue
              backgroundColor: 'transparent', // No background
              borderWidth: 3,
              pointRadius: 2, // Small dots
              pointHoverRadius: 4,
              tension: 0.3,
              yAxisID: 'y',
            },
            {
              label: stock2.name,
              data: historicalData2.map(item => item.close),
              borderColor: '#10b981', // Bright green
              backgroundColor: 'transparent', // No background
              borderWidth: 3,
              pointRadius: 2, // Small dots
              pointHoverRadius: 4,
              tension: 0.3,
              yAxisID: 'y',
            }
          ]
        },
        options: {
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
              display: true,
              text: `Price Comparison - ${timeRange.toUpperCase()}`,
              font: {
                size: 14,
                weight: 'bold' as const,
              }
            },
            tooltip: {
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              titleColor: '#1f2937',
              bodyColor: '#1f2937',
              borderColor: '#e5e7eb',
              borderWidth: 1,
              padding: 12,
              cornerRadius: 8,
              displayColors: true,
              callbacks: {
                label: function(context) {
                  const y = (context as any)?.parsed?.y
                  const value = typeof y === 'number' ? y : 0
                  return `${context.dataset.label}: ₹${value.toFixed(2)}`
                }
              }
            }
          },
          scales: {
            x: {
              display: false,
              grid: {
                display: false,
              }
            },
            y: {
              display: false,
              min: yMin,
              max: yMax,
            }
          }
        },
        plugins: [splitChartPlugin]
      })

      // Create custom X-axis for Stock 1 (bottom left)
      const createCustomXAxis = (position: 'top' | 'bottom', data: HistoricalData[], stockName: string, isLeft: boolean) => {
        const xAxisCanvas = document.createElement('canvas')
        xAxisCanvas.width = chartRef.current!.width / 2
        xAxisCanvas.height = 30
        xAxisCanvas.style.position = 'absolute'
        xAxisCanvas.style.left = isLeft ? '0' : '50%'
        xAxisCanvas.style.top = position === 'top' ? '0' : 'auto'
        xAxisCanvas.style.bottom = position === 'top' ? 'auto' : '0'
        
        const xAxisCtx = xAxisCanvas.getContext('2d') as any
        
        // Draw X-axis labels
        xAxisCtx.textAlign = 'center'
        xAxisCtx.textBaseline = position === 'top' ? 'bottom' : 'top'
        xAxisCtx.fillStyle = '#6b7280'
        xAxisCtx.font = '10px sans-serif'
        
        const xTicks = Math.min(6, data.length)
        const step = Math.floor(data.length / xTicks)
        
        for (let i = 0; i < xTicks; i++) {
          const index = i * step
          if (index < data.length) {
            const xPos = (index / (data.length - 1)) * (xAxisCanvas.width - 20) + 10
            const label = data[index].date
            const shortLabel = label.split('-').slice(1).join('/') // Remove year for brevity
            
            xAxisCtx.fillText(shortLabel, xPos, position === 'top' ? 20 : 10)
          }
        }
        
        // Draw stock name
        xAxisCtx.font = '12px sans-serif'
        xAxisCtx.fontWeight = 'bold'
        xAxisCtx.fillStyle = isLeft ? '#3b82f6' : '#10b981' // Bright colors
        xAxisCtx.fillText(stockName, xAxisCanvas.width / 2, position === 'top' ? 5 : 25)
        
        return xAxisCanvas
      }

      // Add custom X-axes after the chart is created
      setTimeout(() => {
        if (chartRef.current && chartRef.current.parentElement) {
          const xAxis1 = createCustomXAxis('bottom', historicalData1, stock1.name, true)
          const xAxis2 = createCustomXAxis('top', historicalData2, stock2.name, false)
          
          chartRef.current.parentElement!.style.position = 'relative'
          chartRef.current.parentElement!.appendChild(xAxis1)
          chartRef.current.parentElement!.appendChild(xAxis2)
        }
      }, 100)
    }

    // Cleanup function
    return () => {
      if (chartInstance.current) {
        chartInstance.current.destroy()
      }
      
      // Remove custom X-axes
      if (chartRef.current && chartRef.current.parentElement) {
        const customAxes = chartRef.current.parentElement.querySelectorAll('canvas:not(:first-child)')
        customAxes.forEach(axis => axis.remove())
      }
    }
  }, [loading, error, historicalData1, historicalData2, stock1, stock2, timeRange])

  return (
    <Card className="shadow-sm border-0">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="h-5 w-5" />
          Price Comparison Chart
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : error ? (
          <div className="h-64 flex items-center justify-center text-center">
            <p className="text-muted-foreground">Chart data not available.</p>
          </div>
        ) : (
          <div className="h-64 relative">
            <canvas ref={chartRef} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}