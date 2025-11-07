// frontend/components/StockChart.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react'; // Added useState to the imports
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Activity, Play, Pause } from 'lucide-react';
import { createChart, IChartApi, ISeriesApi } from 'lightweight-charts';
import { getStockHistoricalData } from '@/lib/stock-api';

interface HistoricalData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface ChartIndicator {
  ma20?: number;
  ma50?: number;
  ma200?: number;
}

interface LivePriceData {
  time: number;
  price: number;
  volume: number;
}

interface StockChartProps {
  stockSymbol: string | null;
  stockDetails: any;
  isLiveMode: boolean;
  chartTimeframe: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '2Y' | '5Y' | 'Live';
  setChartTimeframe: (timeframe: '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '2Y' | '5Y' | 'Live') => void;
  setIsLiveMode: (isLive: boolean) => void;
  livePriceData: LivePriceData[];
  showMA: boolean;
  setShowMA: (show: boolean) => void;
  showVolume: boolean;
  setShowVolume: (show: boolean) => void;
  isDarkMode: boolean;
  marketStatus: 'open' | 'closed';
  liveDataInterval: number;
  handleIntervalChange: (interval: number) => void;
  apiHealth: boolean;
  forceChartUpdate: number;
  chartKey: number;
}

export default function StockChart({
  stockSymbol,
  stockDetails,
  isLiveMode,
  chartTimeframe,
  setChartTimeframe,
  setIsLiveMode,
  livePriceData,
  showMA,
  setShowMA,
  showVolume,
  setShowVolume,
  isDarkMode,
  marketStatus,
  liveDataInterval,
  handleIntervalChange,
  apiHealth,
  forceChartUpdate,
  chartKey,
}: StockChartProps) {
  const [historicalData, setHistoricalData] = useState<HistoricalData[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);
  const priceSeriesRef = useRef<ISeriesApi<'Line' | 'Candlestick'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);

  // Effect for fetching historical data
  useEffect(() => {
    if (!stockSymbol || isLiveMode) {
      setHistoricalData([]);
      return;
    }

    const fetchHistoricalData = async () => {
      setLoadingChart(true);
      try {
        setHistoricalData([]);
        
        let interval = '1d';
        switch (chartTimeframe) {
          case 'Live':
          case '1D':
            interval = '5m';
            break;
          case '1W':
            interval = '15m';
            break;
          case '1M':
            interval = '30m';
            break;
          case '3M':
          case '6M':
            interval = '1h';
            break;
          case '1Y':
          case '2Y':
          case '5Y':
            interval = '1d';
            break;
        }
        
        const tf = chartTimeframe === 'Live' ? '1D' : chartTimeframe;
        const data = await getStockHistoricalData(
          stockSymbol, 
          tf as '1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '2Y' | '5Y', 
          interval
        );
        setHistoricalData(data);
      } catch (error) {
        console.error('Error fetching historical data:', error);
      } finally {
        setLoadingChart(false);
      }
    };

    fetchHistoricalData();
  }, [stockSymbol, chartTimeframe, isLiveMode]);

  // Calculate moving averages
  const calculateMovingAverages = (data: HistoricalData[]): ChartIndicator[] => {
    const result: ChartIndicator[] = [];
    
    for (let i = 0; i < data.length; i++) {
      const indicator: ChartIndicator = {};
      
      if (i >= 19) {
        const sum20 = data.slice(i - 19, i + 1).reduce((acc, item) => acc + item.close, 0);
        indicator.ma20 = sum20 / 20;
      }
      
      if (i >= 49) {
        const sum50 = data.slice(i - 49, i + 1).reduce((acc, item) => acc + item.close, 0);
        indicator.ma50 = sum50 / 50;
      }
      
      if (i >= 199) {
        const sum200 = data.slice(i - 199, i + 1).reduce((acc, item) => acc + item.close, 0);
        indicator.ma200 = sum200 / 200;
      }
      
      result.push(indicator);
    }
    
    return result;
  };

  // Helper function to format time based on the interval
  const formatTime = (date: Date, format: string) => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear().toString().slice(-2);

    switch (format) {
      case '%HH:%MM:%SS':
        return `${hours}:${minutes}:${seconds}`;
      case '%HH:%MM':
        return `${hours}:${minutes}`;
      case '%dd/%mm':
        return `${day}/${month}`;
      case '%dd/%mm/%yy':
        return `${day}/${month}/${year}`;
      default:
        return `${day}/${month}/${year}`;
    }
  };

  // Effect for creating and updating chart
  useEffect(() => {
    if (!chartContainerRef.current) {
      return;
    }

    // Destroy existing chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
      chartInstanceRef.current = null;
      priceSeriesRef.current = null;
      volumeSeriesRef.current = null;
    }

    const chartData = isLiveMode ? livePriceData : historicalData;
    const indicators = isLiveMode ? [] : calculateMovingAverages(historicalData);

    if (chartData.length === 0) {
      return;
    }

    // Define colors based on theme
    const bgColor = isDarkMode ? '#121212' : '#ffffff';
    const textColor = isDarkMode ? '#e2e8f0' : '#0f172a';
    const gridColor = isDarkMode ? '#3d3d3d' : '#e2e8f0';
    const borderColor = isDarkMode ? '#3d3d3d' : '#d1d5db';
    const crosshairColor = isDarkMode ? '#64748b' : '#94a3b8';
    const volumeColor = isDarkMode ? '#64748b' : '#94a3b8';
    const lineColor = '#3b82f6';

    // Determine time format
    let timeFormat;
    if (isLiveMode) {
      timeFormat = '%HH:%MM:%SS';
    } else {
      switch (chartTimeframe) {
        case 'Live':
        case '1D':
          timeFormat = '%HH:%MM';
          break;
        case '1W':
          timeFormat = '%HH:%MM';
          break;
        case '1M':
          timeFormat = '%dd/%mm';
          break;
        case '3M':
        case '6M':
        case '1Y':
        case '2Y':
        case '5Y':
          timeFormat = '%dd/%mm/%yy';
          break;
        default:
          timeFormat = '%dd/%mm/%yy';
      }
    }

    // Create new chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      layout: {
        background: bgColor as any,
        textColor: textColor,
        fontSize: 12,
        fontFamily: 'Inter, sans-serif',
      },
      grid: {
        vertLines: { color: gridColor, style: 1 },
        horzLines: { color: gridColor, style: 1 },
      },
      crosshair: {
        mode: 0,
        vertLine: {
          width: 1,
          color: crosshairColor,
          style: 3,
        },
        horzLine: {
          width: 1,
          color: crosshairColor,
          style: 3,
        },
      },
      rightPriceScale: {
        borderColor: borderColor,
        textColor: textColor,
        entireTextOnly: true,
        scaleMargins: {
          top: 0.1,
          bottom: showVolume ? 0.3 : 0.1,
        },
      },
      timeScale: {
        borderColor: borderColor,
        timeVisible: true,
        secondsVisible: isLiveMode,
        tickMarkFormatter: (time: any) => {
          const date = new Date(time * 1000);
          return formatTime(date, timeFormat);
        },
        minBarSpacing: isLiveMode ? 0.00001 : undefined,
      },
      handleScroll: {
        vertTouchDrag: true,
        horzTouchDrag: true,
      },
      handleScale: {
        // remove unsupported axisPressedReset in current types
      } as any,
    });

    // Add price series (line chart for live mode)
    if (isLiveMode) {
      const priceSeries = chart.addLineSeries({
        color: lineColor,
        lineWidth: 2,
        crosshairMarkerVisible: false,
        priceScaleId: '',
      });
      
      priceSeriesRef.current = priceSeries;
      
      // Format data for line chart
      const lineData = chartData.map((item: any) => ({
        time: (item.time as number) / 1000,
        value: item.price as number
      }));
      
      (priceSeries as any).setData(lineData);
    } else {
      // For historical data, we still use candlestick
      const candlestickSeries = chart.addCandlestickSeries({
        upColor: '#10b981',
        downColor: '#ef4444',
        borderDownColor: '#ef4444',
        borderUpColor: '#10b981',
        wickDownColor: '#ef4444',
        wickUpColor: '#10b981',
        // margins unsupported in current types
      });
      
      priceSeriesRef.current = candlestickSeries as any;
      
      // Format data for candlestick
      const candlestickData = (chartData as any[]).map((item: any) => ({
        time: new Date(item.time).getTime() / 1000,
        open: item.open as number,
        high: item.high as number,
        low: item.low as number,
        close: item.close as number,
      }));
      
      (candlestickSeries as any).setData(candlestickData);
    }

    // Add moving averages if enabled and not in live mode
    if (showMA && !isLiveMode) {
      // 20-day MA
      if (indicators.some(ind => ind.ma20)) {
        const ma20Series = chart.addLineSeries({
          color: isDarkMode ? '#60a5fa' : '#3b82f6',
          lineWidth: 2,
          priceScaleId: '',
        });
        
        (ma20Series as any).setData(
          indicators
            .map((ind, index) => ind.ma20 ? { 
              time: new Date(historicalData[index].time).getTime() / 1000, 
              value: ind.ma20 as number
            } : null)
            .filter(item => item !== null) as any
        );
      }

      // 50-day MA
      if (indicators.some(ind => ind.ma50)) {
        const ma50Series = chart.addLineSeries({
          color: isDarkMode ? '#a78bfa' : '#8b5cf6',
          lineWidth: 2,
          priceScaleId: '',
        });
        
        (ma50Series as any).setData(
          indicators
            .map((ind, index) => ind.ma50 ? { 
              time: new Date(historicalData[index].time).getTime() / 1000, 
              value: ind.ma50 as number
            } : null)
            .filter(item => item !== null) as any
        );
      }

      // 200-day MA
      if (indicators.some(ind => ind.ma200)) {
        const ma200Series = chart.addLineSeries({
          color: isDarkMode ? '#c084fc' : '#a855f7',
          lineWidth: 2,
          priceScaleId: '',
        });
        
        (ma200Series as any).setData(
          indicators
            .map((ind, index) => ind.ma200 ? { 
              time: new Date(historicalData[index].time).getTime() / 1000, 
              value: ind.ma200 as number
            } : null)
            .filter(item => item !== null) as any
        );
      }
    }

    // Add volume series if enabled
    if (showVolume) {
      const volumeSeries = chart.addHistogramSeries({
        color: volumeColor,
        priceFormat: {
          type: 'volume',
        },
        priceScaleId: ''
      } as any);

      if (isLiveMode) {
        const arr = (chartData as any[]).map((item: any, idx: number) => ({
          time: (item.time as number) / 1000,
          value: item.volume as number,
          color: (item.price as number) >= (((chartData as any[])[Math.max(0, idx - 1)]?.price as number) || (item.price as number)) ? '#10b981' : '#ef4444',
        }));
        (volumeSeries as any).setData(arr as any);
      } else {
        const arr = (chartData as any[]).map((item: any, index: number) => ({
          time: new Date(item.time as any).getTime() / 1000,
          value: item.volume as number,
          color: (item.close as number) >= ((historicalData[Math.max(0, index - 1)]?.close as number) || (item.open as number)) ? '#10b981' : '#ef4444',
        }));
        (volumeSeries as any).setData(arr as any);
      }

      volumeSeriesRef.current = volumeSeries as any;
    }

    // Store chart instance
    chartInstanceRef.current = chart;

    // Handle resize
    const handleResize = () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.applyOptions({
          width: chartContainerRef.current?.clientWidth,
        });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
        priceSeriesRef.current = null;
        volumeSeriesRef.current = null;
      }
    };
  }, [historicalData, livePriceData, showMA, showVolume, isDarkMode, chartTimeframe, isLiveMode, forceChartUpdate, stockSymbol, chartKey]);

  // Effect to update chart when live data changes
  useEffect(() => {
    if (!isLiveMode || !priceSeriesRef.current || livePriceData.length === 0) {
      return;
    }

    try {
      // Format the live data for the line chart
      const lineData = livePriceData.map(item => ({
        time: item.time / 1000,
        value: item.price
      }));

      // Update the price series
      (priceSeriesRef.current as any).setData(lineData as any);

      // Update volume series if enabled
      if (showVolume && volumeSeriesRef.current) {
        const volumeData = livePriceData.map((item, index) => ({
          time: item.time / 1000,
          value: item.volume,
          color: item.price >= (livePriceData[Math.max(0, index - 1)]?.price || item.price) ? '#10b981' : '#ef4444'
        }));
        (volumeSeriesRef.current as any).setData(volumeData as any);
      }
    } catch (error) {
      console.error('Error updating chart with live data:', error);
    }
  }, [livePriceData, showVolume, isLiveMode]);

  // Format currency to 2 decimal places
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  };

  return (
    <Card className={isDarkMode ? "bg-[#121212] border-[#3d3d3d]" : "bg-white border-gray-200"}>
      <CardHeader className="pb-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className={`text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            Price Chart
            {isLiveMode && (
              <Badge variant="outline" className="ml-2 text-green-600 border-green-600">
                <Activity className="h-3 w-3 mr-1" />
                LIVE
              </Badge>
            )}
          </CardTitle>
          <div className="flex flex-col sm:flex-row gap-4">
            <Tabs value={chartTimeframe} onValueChange={(value) => {
              const newTimeframe = value as any;
              setChartTimeframe(newTimeframe);
              setIsLiveMode(newTimeframe === 'Live');
            }}>
              <TabsList className={isDarkMode ? "bg-[#3d3d3d]" : "bg-gray-100"}>
                <TabsTrigger value="Live" className={isDarkMode ? "data-[state=active]:bg-[#4d4d4d]" : "data-[state=active]:bg-gray-200"}>
                  {isLiveMode ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
                  Live
                </TabsTrigger>
                <TabsTrigger value="1D" className={isDarkMode ? "data-[state=active]:bg-[#4d4d4d]" : "data-[state=active]:bg-gray-200"}>1D</TabsTrigger>
                <TabsTrigger value="1W" className={isDarkMode ? "data-[state=active]:bg-[#4d4d4d]" : "data-[state=active]:bg-gray-200"}>1W</TabsTrigger>
                <TabsTrigger value="1M" className={isDarkMode ? "data-[state=active]:bg-[#4d4d4d]" : "data-[state=active]:bg-gray-200"}>1M</TabsTrigger>
                <TabsTrigger value="3M" className={isDarkMode ? "data-[state=active]:bg-[#4d4d4d]" : "data-[state=active]:bg-gray-200"}>3M</TabsTrigger>
                <TabsTrigger value="6M" className={isDarkMode ? "data-[state=active]:bg-[#4d4d4d]" : "data-[state=active]:bg-gray-200"}>6M</TabsTrigger>
                <TabsTrigger value="1Y" className={isDarkMode ? "data-[state=active]:bg-[#4d4d4d]" : "data-[state=active]:bg-gray-200"}>1Y</TabsTrigger>
                <TabsTrigger value="2Y" className={isDarkMode ? "data-[state=active]:bg-[#4d4d4d]" : "data-[state=active]:bg-gray-200"}>2Y</TabsTrigger>
                <TabsTrigger value="5Y" className={isDarkMode ? "data-[state=active]:bg-[#4d4d4d]" : "data-[state=active]:bg-gray-200"}>5Y</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <span className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>MA</span>
                <Switch
                  checked={showMA}
                  onCheckedChange={setShowMA}
                  disabled={isLiveMode}
                  className="data-[state=checked]:bg-blue-600"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>Volume</span>
                <Switch
                  checked={showVolume}
                  onCheckedChange={setShowVolume}
                  className="data-[state=checked]:bg-blue-600"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Live Mode Controls */}
        {isLiveMode && (
          <div className="flex items-center justify-between mt-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-center gap-4">
              <span className={`text-sm font-medium ${isDarkMode ? 'text-blue-300' : 'text-blue-800'}`}>
                Update Interval:
              </span>
              <div className="flex gap-2">
                {[3, 5, 10, 15, 30].map((interval) => (
                  <Button
                    key={interval}
                    variant={liveDataInterval === interval ? "default" : "outline"}
                    size="sm"
                    onClick={() => handleIntervalChange(interval)}
                    className="text-xs h-7"
                  >
                    {interval}s
                  </Button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${apiHealth ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span className={`text-xs ${apiHealth ? 'text-green-600' : 'text-red-600'}`}>
                {apiHealth ? 'Connected' : 'Disconnected'}
              </span>
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {loadingChart ? (
          <div className="flex justify-center items-center h-[400px]">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          </div>
        ) : (
          <>
            {/* Always show the chart for the selected timeframe */}
            <div key={`${stockSymbol}-${chartKey}`} ref={chartContainerRef} className="h-[400px] w-full min-w-0" />
            
            <div className="mt-2 text-xs text-gray-500">
              Data points: {isLiveMode ? livePriceData.length : historicalData.length} | 
              Mode: {isLiveMode ? 'Live Line Chart' : 'Historical Candlestick'}
            </div>
          </>
        )}
        
        {/* Live Data Info */}
        {isLiveMode && livePriceData.length > 0 && (
          <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className={`font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Current:</span>
                <span className={`ml-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {formatCurrency(livePriceData[livePriceData.length - 1].price)}
                </span>
              </div>
              <div>
                <span className={`font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>High:</span>
                <span className={`ml-2 text-green-500`}>
                  {formatCurrency(Math.max(...livePriceData.map(d => d.price)))}
                </span>
              </div>
              <div>
                <span className={`font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Low:</span>
                <span className={`ml-2 text-red-500`}>
                  {formatCurrency(Math.min(...livePriceData.map(d => d.price)))}
                </span>
              </div>
              <div>
                <span className={`font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>Volume:</span>
                <span className={`ml-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                  {livePriceData[livePriceData.length - 1].volume.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}
        
        {/* Moving Average Legend */}
        {showMA && !isLiveMode && (
          <div className="flex gap-4 mt-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-blue-400"></div>
              <span className={isDarkMode ? "text-slate-300" : "text-gray-600"}>MA20</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-violet-400"></div>
              <span className={isDarkMode ? "text-slate-300" : "text-gray-600"}>MA50</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-purple-400"></div>
              <span className={isDarkMode ? "text-slate-300" : "text-gray-600"}>MA200</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}