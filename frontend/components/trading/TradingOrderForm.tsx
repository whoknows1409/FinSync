// frontend/components/trading/TradingOrderForm.tsx
'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { Loader2, Search, AlertTriangle, TrendingUp, TrendingDown, Play, Pause, Circle, RefreshCw, Activity } from 'lucide-react';
import {
  getStockDetails,
  placeOrder,
  initializeTradingAccount,
  getHoldings,
  getTradingAccount,
  Stock,
  Holding,
  checkApiHealth,
  getStockHistoricalData,
} from '@/lib/stock-api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import StockChart from './StockChart';

interface TradingOrderFormProps {
  onOrderPlaced: () => void;
  walletBalance: number;
  holdings: Holding[];
}

interface LivePriceData {
  time: number;
  price: number;
  volume: number;
}

export default function TradingOrderForm({
  onOrderPlaced,
  walletBalance,
  holdings = [],
}: TradingOrderFormProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [stockSymbol, setStockSymbol] = useState<string | null>(null);
  const [stockDetails, setStockDetails] = useState<Stock | null>(null);
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT'>('MARKET');
  const [tradeType, setTradeType] = useState<'BUY' | 'SELL'>('BUY');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [chartTimeframe, setChartTimeframe] = useState<'1D' | '1W' | '1M' | '3M' | '6M' | '1Y' | '2Y' | '5Y' | 'Live'>('Live');
  const [showMA, setShowMA] = useState(false);
  const [showVolume, setShowVolume] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  
  // Live trading state
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [marketStatus, setMarketStatus] = useState<'open' | 'closed'>('closed');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [liveDataInterval, setLiveDataInterval] = useState<number>(5);
  const [apiHealth, setApiHealth] = useState<boolean>(true);
  const [livePriceData, setLivePriceData] = useState<LivePriceData[]>([]);
  const [forceChartUpdate, setForceChartUpdate] = useState(0);
  const [chartKey, setChartKey] = useState(0);
  const [showLiveTradingForm, setShowLiveTradingForm] = useState(false);
  
  // Real-time data state for info section
  const [realTimeData, setRealTimeData] = useState<Stock | null>(null);
  const [isRealTimeFetching, setIsRealTimeFetching] = useState(false);
  
  // Add state for trading account data
  const [tradingAccount, setTradingAccount] = useState<any>(null);
  const [accountLoading, setAccountLoading] = useState(true);
  
  // Add state for last market price (for when market is closed)
  const [lastMarketPrice, setLastMarketPrice] = useState<number | null>(null);
  
  // Add missing state variables
  const [historicalData, setHistoricalData] = useState<any[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);
  
  // Add missing refs
  const chartInstanceRef = useRef<any>(null);
  const priceSeriesRef = useRef<any>(null);
  const volumeSeriesRef = useRef<any>(null);
  
  const liveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const realTimeIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const isFetchingRef = useRef(false);

  // Top 10 popular Indian NSE stocks
  const popularStocks = [
    { symbol: 'RELIANCE.NS', name: 'Reliance Industries Ltd.' },
    { symbol: 'TCS.NS', name: 'Tata Consultancy Services' },
    { symbol: 'HDFCBANK.NS', name: 'HDFC Bank Ltd.' },
    { symbol: 'INFY.NS', name: 'Infosys Ltd.' },
    { symbol: 'HINDUNILVR.NS', name: 'Hindustan Unilever Ltd.' },
    { symbol: 'ICICIBANK.NS', name: 'ICICI Bank Ltd.' },
    { symbol: 'SBIN.NS', name: 'State Bank of India' },
    { symbol: 'BHARTIARTL.NS', name: 'Bharti Airtel Ltd.' },
    { symbol: 'WIPRO.NS', name: 'Wipro Ltd.' },
    { symbol: 'ITC.NS', name: 'ITC Ltd.' },
  ];

  // Effect for theme detection
  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };

    checkDarkMode();

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  // Effect for checking API health
  useEffect(() => {
    const checkHealth = async () => {
      const healthy = await checkApiHealth();
      setApiHealth(healthy);
      if (!healthy) {
        toast({
          title: 'API Connection Issue',
          description: 'Unable to connect to stock data service. Some features may be limited.',
          variant: 'destructive',
        });
      }
    };

    checkHealth();
    const healthInterval = setInterval(checkHealth, 30000);

    return () => clearInterval(healthInterval);
  }, []);

  // Add effect to fetch trading account data
  useEffect(() => {
    const fetchTradingAccount = async () => {
      try {
        setAccountLoading(true);
        const account = await getTradingAccount();
        setTradingAccount(account);
      } catch (error) {
        console.error('Error fetching trading account:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch trading account data',
          variant: 'destructive',
        });
      } finally {
        setAccountLoading(false);
      }
    };

    fetchTradingAccount();
  }, []);

  // Function to get current time in IST (Indian Standard Time)
  const getISTTime = () => {
    const now = new Date();
    // Get UTC time in milliseconds
    const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
    // IST is UTC+5:30
    const istTime = new Date(utcTime + (5.5 * 60 * 60 * 1000));
    return istTime;
  };

  // Function to check market status using IST
  const checkMarketStatus = () => {
    const now = getISTTime();
    const day = now.getDay();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    const isWeekday = day > 0 && day < 6; // Monday to Friday
    const isMarketHours = (hours > 9 || (hours === 9 && minutes >= 15)) && 
                         (hours < 15 || (hours === 15 && minutes <= 30));
    
    setMarketStatus(isWeekday && isMarketHours ? 'open' : 'closed');
  };

  // Effect for checking market status
  useEffect(() => {
    checkMarketStatus(); // Initial check
    const statusInterval = setInterval(() => {
      checkMarketStatus();
    }, 60000); // Check every minute

    return () => clearInterval(statusInterval);
  }, []);

  // Function to fetch real-time data for info section
  const fetchRealTimeData = async () => {
    if (!stockSymbol || !apiHealth) return;

    try {
      setIsRealTimeFetching(true);
      const updatedStock = await getStockDetails(stockSymbol, '1m');
      setRealTimeData(updatedStock);
      setLastUpdated(new Date());
      
      // Update last market price when market is closed
      if (marketStatus === 'closed') {
        setLastMarketPrice(updatedStock.currentPrice);
      }
    } catch (error) {
      console.error('Error fetching real-time data:', error);
    } finally {
      setIsRealTimeFetching(false);
    }
  };

  // Effect for real-time data fetching (always active when stock is selected)
  useEffect(() => {
    if (!stockSymbol || !apiHealth) {
      if (realTimeIntervalRef.current) {
        clearInterval(realTimeIntervalRef.current);
        realTimeIntervalRef.current = null;
      }
      return;
    }

    // Fetch immediately
    fetchRealTimeData();

    // Set up interval for real-time updates
    if (realTimeIntervalRef.current) {
      clearInterval(realTimeIntervalRef.current);
    }
    
    realTimeIntervalRef.current = setInterval(fetchRealTimeData, 5000); // Update every 5 seconds

    return () => {
      if (realTimeIntervalRef.current) {
        clearInterval(realTimeIntervalRef.current);
        realTimeIntervalRef.current = null;
      }
    };
  }, [stockSymbol, apiHealth]);

  // Function to fetch live price data for chart
  const fetchLivePriceData = async () => {
    if (!stockSymbol || !isLiveMode || !apiHealth) return;

    try {
      setIsFetching(true);
      const updatedStock = await getStockDetails(stockSymbol, '1m');
      
      const newPriceData: LivePriceData = {
        time: Date.now(),
        price: updatedStock.currentPrice,
        volume: Math.floor(Math.random() * 10000) + 1000
      };

      setStockDetails(updatedStock);
      setLivePriceData(prev => {
        const newData = [...prev, newPriceData];
        if (newData.length > 50) {
          return newData.slice(-50);
        }
        return newData;
      });

      // Update last market price when in live mode
      if (marketStatus === 'closed') {
        setLastMarketPrice(updatedStock.currentPrice);
      }

      setForceChartUpdate(prev => prev + 1);
    } catch (error) {
      console.error('Error fetching live price data:', error);
      toast({
        title: 'Live Data Error',
        description: 'Failed to fetch real-time data',
        variant: 'destructive',
      });
    } finally {
      setIsFetching(false);
    }
  };

  // Effect for live mode
  useEffect(() => {
    if (isLiveMode && stockSymbol && apiHealth) {
      checkMarketStatus();
      
      if (liveIntervalRef.current) {
        clearInterval(liveIntervalRef.current);
        liveIntervalRef.current = null;
      }

      setLivePriceData([]);
      fetchLivePriceData();

      // Show trading form in both live and closed market scenarios
      setShowLiveTradingForm(true);

      if (marketStatus === 'open') {
        liveIntervalRef.current = setInterval(() => {
          if (!isFetching) {
            fetchLivePriceData();
          }
        }, liveDataInterval * 1000);
      }
    } else {
      setShowLiveTradingForm(false);
    }

    return () => {
      if (liveIntervalRef.current) {
        clearInterval(liveIntervalRef.current);
        liveIntervalRef.current = null;
      }
    };
  }, [isLiveMode, stockSymbol, marketStatus, liveDataInterval, apiHealth]);

  // Effect for updating stock details periodically
  useEffect(() => {
    if (!stockSymbol || isLiveMode) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const updateStockPrice = async () => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;
      
      try {
        const updatedStock = await getStockDetails(stockSymbol, '1d');
        setStockDetails(updatedStock);
        if (orderType === 'MARKET') {
          setPrice(updatedStock.currentPrice.toFixed(2));
        }
        
        // Update last market price when not in live mode
        if (marketStatus === 'closed') {
          setLastMarketPrice(updatedStock.currentPrice);
        }
      } catch (error) {
        console.error('Error updating stock price:', error);
      } finally {
        isFetchingRef.current = false;
      }
    };

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    updateStockPrice();
    
    intervalRef.current = setInterval(updateStockPrice, 15000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [stockSymbol, orderType, isLiveMode]);

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
        toast({
          title: 'Error',
          description: 'Failed to fetch chart data',
          variant: 'destructive',
        });
      } finally {
        setLoadingChart(false);
      }
    };

    fetchHistoricalData();
  }, [stockSymbol, chartTimeframe, isLiveMode]);

  // Effect to handle market status changes and update live mode
  useEffect(() => {
    if (stockSymbol && marketStatus === 'open') {
      // If market opens and we have a stock selected, switch to live mode
      setIsLiveMode(true);
      setChartTimeframe('Live');
    } else if (stockSymbol && marketStatus === 'closed' && isLiveMode) {
      // If market closes and we were in live mode, switch to 1D
      setIsLiveMode(false);
      setChartTimeframe('1D');
    }
  }, [marketStatus, stockSymbol]);

  // Clear validation error when relevant fields change
  useEffect(() => {
    if (validationError) {
      setValidationError(null);
    }
  }, [stockSymbol, tradeType, quantity, price, orderType, validationError]);

  // Get holding for current stock if it exists
  const getCurrentHolding = () => {
    if (!stockDetails || !holdings.length) return null;
    return holdings.find(h => h.symbol === stockDetails.symbol);
  };

  const handleSearch = async () => {
    if (!searchQuery || searchQuery.length < 1) {
      setValidationError('Please enter a valid stock symbol');
      return;
    }

    // Clear previous data and intervals
    setHistoricalData([]);
    setLivePriceData([]);
    setRealTimeData(null);
    setLastMarketPrice(null);
    
    // Clear intervals
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (liveIntervalRef.current) {
      clearInterval(liveIntervalRef.current);
      liveIntervalRef.current = null;
    }
    if (realTimeIntervalRef.current) {
      clearInterval(realTimeIntervalRef.current);
      realTimeIntervalRef.current = null;
    }
    
    // Destroy chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
      chartInstanceRef.current = null;
      priceSeriesRef.current = null;
      volumeSeriesRef.current = null;
    }
    
    // Force chart remount
    setChartKey(prev => prev + 1);

    // Check current market status
    checkMarketStatus();

    try {
      setLoading(true);
      const stock = await getStockDetails(searchQuery, '1d');
      setStockSymbol(searchQuery.toUpperCase());
      setStockDetails(stock);
      setRealTimeData(stock);
      setLastMarketPrice(stock.currentPrice);
      setPrice(stock.currentPrice.toFixed(2));
      setValidationError(null);
      
      // Set to live mode by default if market is open
      if (marketStatus === 'open') {
        setIsLiveMode(true);
        setChartTimeframe('Live');
      }
    } catch (error) {
      console.error('Error fetching stock details:', error);
      setValidationError('Failed to fetch stock details. Please check the symbol and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePopularStockClick = (symbol: string) => {
    setSearchQuery(symbol.replace('.NS', ''));
    setTimeout(() => {
      handleSearchWithSymbol(symbol);
    }, 0);
  };

  const handleSearchWithSymbol = async (symbol: string) => {
    // Clear previous data and intervals
    setHistoricalData([]);
    setLivePriceData([]);
    setRealTimeData(null);
    setLastMarketPrice(null);
    
    // Clear intervals
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (liveIntervalRef.current) {
      clearInterval(liveIntervalRef.current);
      liveIntervalRef.current = null;
    }
    if (realTimeIntervalRef.current) {
      clearInterval(realTimeIntervalRef.current);
      realTimeIntervalRef.current = null;
    }
    
    // Destroy chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
      chartInstanceRef.current = null;
      priceSeriesRef.current = null;
      volumeSeriesRef.current = null;
    }
    
    // Force chart remount
    setChartKey(prev => prev + 1);

    // Check current market status
    checkMarketStatus();

    try {
      setLoading(true);
      const stock = await getStockDetails(symbol, '1d');
      setStockSymbol(symbol);
      setStockDetails(stock);
      setRealTimeData(stock);
      setLastMarketPrice(stock.currentPrice);
      setPrice(stock.currentPrice.toFixed(2));
      setValidationError(null);
      
      // Set to live mode by default if market is open
      if (marketStatus === 'open') {
        setIsLiveMode(true);
        setChartTimeframe('Live');
      }
    } catch (error) {
      console.error('Error fetching stock details:', error);
      setValidationError('Failed to fetch stock details. Please check the symbol and try again.');
    } finally {
      setLoading(false);
    }
  };

  // Handler for live mode toggle
  const handleLiveModeToggle = () => {
    const newLiveMode = !isLiveMode;
    setIsLiveMode(newLiveMode);
    
    if (newLiveMode) {
      setChartTimeframe('Live');
      fetchLivePriceData();
    } else {
      setChartTimeframe('1D');
      setLivePriceData([]);
    }
    
    // Force chart remount
    setChartKey(prev => prev + 1);
  };

  // Handler for changing live data interval
  const handleIntervalChange = (interval: number) => {
    setLiveDataInterval(interval);
    
    if (isLiveMode && liveIntervalRef.current) {
      clearInterval(liveIntervalRef.current);
      if (marketStatus === 'open') {
        liveIntervalRef.current = setInterval(() => {
          if (!isFetching) {
            fetchLivePriceData();
          }
        }, interval * 1000);
      }
    }
    
    toast({
      title: 'Update Interval Changed',
      description: `Live data will now update every ${interval} second${interval > 1 ? 's' : ''}.`,
    });
  };

  // Add Buy/Sell handlers for live trading
  const handleLiveTrade = (tradeType: 'BUY' | 'SELL') => {
    if (!stockDetails) return;
    
    setTradeType(tradeType);
    // Use last market price if market is closed, otherwise use current price
    const tradePrice = marketStatus === 'closed' && lastMarketPrice !== null 
      ? lastMarketPrice 
      : stockDetails.currentPrice;
    setPrice(tradePrice.toFixed(2));
    setShowConfirmation(true);
  };

  // Fixed validateOrder function to use trading account balance
  const validateOrder = () => {
    if (!stockDetails) {
      setValidationError('Please search and select a stock');
      return false;
    }

    // Validate that it's an NSE stock
    if (!stockDetails.symbol.endsWith('.NS')) {
      setValidationError('Only NSE stocks are supported for trading.');
      return false;
    }

    const quantityNum = parseInt(quantity);
    if (isNaN(quantityNum) || quantityNum <= 0) {
      setValidationError('Please enter a valid quantity');
      return false;
    }

    // Use last market price if market is closed, otherwise use real-time price or stock details price
    let currentPrice;
    if (marketStatus === 'closed' && lastMarketPrice !== null) {
      currentPrice = lastMarketPrice;
    } else if (realTimeData) {
      currentPrice = realTimeData.currentPrice;
    } else {
      currentPrice = (stockDetails as Stock).currentPrice;
    }
    
    const priceNum = orderType === 'MARKET' 
      ? currentPrice 
      : parseFloat(price);
      
    if (orderType === 'LIMIT' && (isNaN(priceNum) || priceNum <= 0)) {
      setValidationError('Please enter a valid price');
      return false;
    }

    if (tradeType === 'BUY') {
      const totalCost = quantityNum * priceNum;
      // Use trading account balance instead of walletBalance prop
      const availableBalance = tradingAccount?.walletBalance || walletBalance || 0;
      
      if (totalCost > availableBalance) {
        setValidationError('Insufficient wallet balance');
        return false;
      }
    }

    // For SELL orders, check if user has sufficient holdings
    if (tradeType === 'SELL') {
      const holding = getCurrentHolding();
      if (!holding || holding.quantity < quantityNum) {
        const availableQuantity = holding ? holding.quantity : 0;
        setValidationError(`Insufficient holdings. You have ${availableQuantity} shares of ${stockDetails.symbol}`);
        return false;
      }
    }

    return true;
  };

  // Fixed handlePlaceOrder function to use real-time price for market orders
  const handlePlaceOrder = async () => {
    if (!validateOrder()) return;

    const quantityNum = parseInt(quantity);
    
    // Use last market price if market is closed, otherwise use real-time price or stock details price
    let currentPrice;
    if (marketStatus === 'closed' && lastMarketPrice !== null) {
      currentPrice = lastMarketPrice;
    } else if (realTimeData) {
      currentPrice = realTimeData.currentPrice;
    } else {
      currentPrice = (stockDetails as Stock).currentPrice;
    }
    
    const priceNum = orderType === 'MARKET' 
      ? currentPrice 
      : parseFloat(price);
      
    const totalValue = quantityNum * priceNum;

    // Extract stock ID from stock details
    const stockId = stockDetails?._id || stockDetails?.id;
    
    setOrderDetails({
      symbol: stockDetails!.symbol,
      stockId: stockId,
      type: tradeType,
      quantity: quantityNum,
      price: priceNum,
      totalValue,
      orderType
    });
    setShowConfirmation(true);
  };

  // Format currency to 2 decimal places
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount)
  };

  // Format percentage to 2 decimal places
  const formatPercentage = (percent: number) => {
    return `${percent >= 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  // Fixed confirmOrder function to properly handle order placement
  const confirmOrder = async () => {
    try {
      setLoading(true);
      
      // Use last market price if market is closed, otherwise use real-time price or stock details price
      let currentPrice;
      if (marketStatus === 'closed' && lastMarketPrice !== null) {
        currentPrice = lastMarketPrice;
      } else if (realTimeData) {
        currentPrice = realTimeData.currentPrice;
      } else {
        currentPrice = (stockDetails as Stock).currentPrice;
      }
      
      // For market orders, ensure we're using the current real-time price
      const finalPrice = orderDetails.orderType === 'MARKET' 
        ? currentPrice 
        : orderDetails.price;
      
      const orderPayload: any = {
        symbol: orderDetails.symbol,
        type: orderDetails.type,
        quantity: orderDetails.quantity,
        orderType: orderDetails.orderType
      };
      
      if (orderDetails.stockId && typeof orderDetails.stockId === 'string') {
        orderPayload.stock = orderDetails.stockId;
      }
      
      if (orderDetails.orderType === 'LIMIT') {
        orderPayload.price = orderDetails.price;
      } else {
        // For market orders, explicitly set the current price
        orderPayload.price = finalPrice;
      }
      
      await placeOrder(orderPayload);

      toast({
        title: 'Success',
        description: `${orderDetails.type === 'BUY' ? 'Bought' : 'Sold'} ${orderDetails.quantity} ${orderDetails.symbol} @ ₹${finalPrice.toFixed(2)}`,
      });

      // Reset form
      setStockSymbol(null);
      setStockDetails(null);
      setRealTimeData(null);
      setLastMarketPrice(null);
      setQuantity('');
      setPrice('');
      setSearchQuery('');
      setShowConfirmation(false);
      setValidationError(null);
      onOrderPlaced();
    } catch (error: any) {
      console.error('Order placement error:', error);
      
      // Handle price slippage error specifically
      if (error.message && error.message.includes("Price slippage")) {
        toast({
          title: 'Price Changed',
          description: `The price has changed since you viewed it. Current price: ${realTimeData ? formatCurrency(realTimeData.currentPrice) : formatCurrency((stockDetails as Stock).currentPrice)}. Do you want to proceed?`,
          variant: 'default',
          action: (
            <Button 
              onClick={() => {
                // Retry with the current price
                confirmOrder();
              }}
              size="sm"
            >
              Retry
            </Button>
          ),
        });
      } else if (error.message && error.message.includes("Your trading account needs to be set up")) {
        toast({
          title: 'Account Setup Required',
          description: error.message,
          variant: 'destructive',
        });
        
        try {
          await initializeTradingAccount();
          toast({
            title: 'Account Initialized',
            description: 'Your trading account has been set up. Please try placing your order again.',
          });
        } catch (initError: any) {
          console.error('Failed to initialize account:', initError);
          toast({
            title: 'Initialization Failed',
            description: 'Failed to set up your trading account. Please try again later.',
            variant: 'destructive',
          });
        }
      } else if (error.message && error.message.includes("Insufficient holdings")) {
        setValidationError(error.message);
        setShowConfirmation(false);
      } else if (error.message && error.message.includes("Only NSE stocks are supported")) {
        setValidationError(error.message);
        setShowConfirmation(false);
      } else if (error.message && error.message.includes("Cannot read properties of undefined (reading 'totalTrades')")) {
        // Handle the specific error about trading account initialization
        toast({
          title: 'Account Initialization Error',
          description: 'Your trading account needs to be initialized. Please try again.',
          variant: 'destructive',
        });
        
        try {
          await initializeTradingAccount();
          toast({
            title: 'Account Initialized',
            description: 'Your trading account has been initialized. Please try placing your order again.',
          });
        } catch (initError: any) {
          console.error('Failed to initialize account:', initError);
          toast({
            title: 'Initialization Failed',
            description: 'Failed to initialize your trading account. Please try again later.',
            variant: 'destructive',
          });
        }
      } else {
        toast({
          title: 'Error',
          description: error.message || 'Failed to place order',
          variant: 'destructive',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Get current holding for display
  const currentHolding = getCurrentHolding();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Place Order</CardTitle>
      </CardHeader>
      <CardContent>
        {validationError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}
        
        {!apiHealth && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              API Connection Issue - Some features may be limited. Please check your connection.
            </AlertDescription>
          </Alert>
        )}
        
        {accountLoading && (
          <Alert className="mb-4">
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertDescription>Loading trading account data...</AlertDescription>
          </Alert>
        )}
        
        <form onSubmit={(e) => { e.preventDefault(); handlePlaceOrder(); }} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="stock-search">NSE Stock Symbol</Label>
            <div className="flex gap-2">
              <Input
                id="stock-search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value.toUpperCase())}
                placeholder="Enter NSE stock symbol (e.g., RELIANCE, TCS, INFY)"
                disabled={loading}
              />
              <Button 
                type="button" 
                onClick={handleSearch} 
                disabled={loading || !searchQuery}
                className="px-3"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Only NSE stocks are supported. .NS suffix will be added automatically.
            </p>
          </div>

          {/* Popular NSE Stocks Section */}
          <div className="space-y-2">
            <Label>Popular NSE Stocks</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {popularStocks.map((stock) => (
                <Button
                  key={stock.symbol}
                  variant="outline"
                  size="sm"
                  onClick={() => handlePopularStockClick(stock.symbol)}
                  className="text-xs h-8 truncate"
                  title={stock.name}
                >
                  {stock.symbol.replace('.NS', '')}
                </Button>
              ))}
            </div>
          </div>

          {stockDetails && (
            <>
              {/* Market Status Banner - Updated to show IST time */}
              <div className={`p-3 rounded-lg mb-4 ${marketStatus === 'open' ? "bg-green-100 border-green-200" : "bg-red-100 border-red-200"}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-2 ${marketStatus === 'open' ? "bg-green-500" : "bg-red-500"}`}></div>
                    <span className={`font-medium ${marketStatus === 'open' ? "text-green-800" : "text-red-800"}`}>
                      Market {marketStatus === 'open' ? 'Live' : 'Closed'}
                    </span>
                    {isFetching && <Activity className="h-4 w-4 ml-2 animate-spin text-blue-500" />}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm ${marketStatus === 'open' ? "text-green-700" : "text-red-700"}`}>
                      {marketStatus === 'open' ? 'Trading at real-time prices' : 'Trading at last market price'}
                    </span>
                    {lastUpdated && (
                      <span className={`text-xs ${marketStatus === 'open' ? "text-green-600" : "text-red-600"}`}>
                        IST: {getISTTime().toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}
                      </span>
                    )}
                  </div>
                </div>
                {marketStatus === 'closed' && lastMarketPrice !== null && (
                  <p className="text-red-700 mt-1 text-sm">
                    Last market price: {formatCurrency(lastMarketPrice)}
                  </p>
                )}
              </div>

              {/* Stock Price Card - Always shows real-time data */}
              <Card className={isDarkMode ? "bg-[#121212] border-[#3d3d3d]" : "bg-white border-gray-200"}>
                <CardContent className="p-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className={`text-lg font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {stockDetails.symbol}
                        {isRealTimeFetching && <Activity className="h-4 w-4 ml-2 inline-block animate-spin text-blue-500" />}
                      </h3>
                      <p className={`text-sm ${isDarkMode ? 'text-slate-300' : 'text-gray-600'}`}>{stockDetails.name}</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        {realTimeData ? formatCurrency(realTimeData.currentPrice) : formatCurrency((stockDetails as Stock).currentPrice)}
                      </div>
                      {(realTimeData || (stockDetails as Stock)) && (
                        <div className={`flex items-center gap-1 ${
                          ((realTimeData ? realTimeData.change : (((stockDetails as Stock).change ?? 0))) as number) >= 0 ? 'text-green-500' : 'text-red-500'
                        }`}>
                          {(((realTimeData ? realTimeData.change : (((stockDetails as Stock).change ?? 0))) as number) >= 0) ? (
                            <TrendingUp className="h-4 w-4" />
                          ) : (
                            <TrendingDown className="h-4 w-4" />
                          )}
                          <span className="font-medium">
                            {formatPercentage(((realTimeData ? realTimeData.change : (((stockDetails as Stock).change ?? 0))) as number))}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Always show last live data timestamp */}
                  {lastUpdated && (
                    <div className="mt-2 text-xs text-gray-500">
                      Last updated: {lastUpdated.toLocaleString()}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Chart Section */}
              <StockChart
                stockSymbol={stockSymbol}
                stockDetails={stockDetails}
                isLiveMode={isLiveMode}
                chartTimeframe={chartTimeframe}
                setChartTimeframe={setChartTimeframe}
                setIsLiveMode={setIsLiveMode}
                livePriceData={livePriceData}
                showMA={showMA}
                setShowMA={setShowMA}
                showVolume={showVolume}
                setShowVolume={setShowVolume}
                isDarkMode={isDarkMode}
                marketStatus={marketStatus}
                liveDataInterval={liveDataInterval}
                handleIntervalChange={handleIntervalChange}
                apiHealth={apiHealth}
                forceChartUpdate={forceChartUpdate}
                chartKey={chartKey}
              />

              {/* Trading Section */}
              <Card className={isDarkMode ? "bg-[#121212] border-[#3d3d3d]" : "bg-white border-gray-200"}>
                <CardHeader>
                  <CardTitle className={`text-lg ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                    Trading
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Show trading form - now always visible */}
                  <div className="space-y-4">
                    {/* Order Type Selection */}
                    <div className="space-y-2">
                      <Label>Order Type</Label>
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant={orderType === 'MARKET' ? 'default' : 'outline'}
                          onClick={() => setOrderType('MARKET')}
                          className="flex-1"
                        >
                          Market Order
                        </Button>
                        <Button
                          type="button"
                          variant={orderType === 'LIMIT' ? 'default' : 'outline'}
                          onClick={() => setOrderType('LIMIT')}
                          className="flex-1"
                        >
                          Limit Order
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {orderType === 'MARKET' 
                          ? 'Market orders execute immediately at the current market price.'
                          : 'Limit orders execute only at your specified price or better.'}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input
                          id="quantity"
                          type="number"
                          value={quantity}
                          onChange={(e) => setQuantity(e.target.value)}
                          min="1"
                          placeholder="Enter quantity"
                          disabled={loading}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="price">
                          {orderType === 'MARKET' ? 'Market Price' : 'Limit Price'}
                        </Label>
                        <Input
                          id="price"
                          type="number"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          min="0.01"
                          step="0.01"
                          placeholder={orderType === 'MARKET' ? "Market price" : "Enter limit price"}
                          disabled={loading || orderType === 'MARKET'}
                          className={orderType === 'MARKET' ? "bg-muted" : ""}
                        />
                        {orderType === 'MARKET' && (
                          <p className="text-xs text-muted-foreground">
                            Market orders execute at the current market price
                          </p>
                        )}
                      </div>
                    </div>

                    {tradeType === 'SELL' && currentHolding && (
                      <div className={`p-3 rounded-lg border ${isDarkMode ? "bg-blue-900/20 border-blue-800" : "bg-blue-50 border-blue-200"}`}>
                        <div className="flex justify-between items-center">
                          <span className={`text-sm font-medium ${isDarkMode ? "text-blue-300" : "text-blue-800"}`}>Your Holdings</span>
                          <Badge variant="outline">{currentHolding?.quantity} shares</Badge>
                        </div>
                        <div className={`text-xs mt-1 ${isDarkMode ? "text-blue-400" : "text-blue-600"}`}>
                          Avg. Price: {formatCurrency(currentHolding?.averagePrice || 0)} | 
                          Current Value: {formatCurrency((currentHolding?.quantity || 0) * (currentHolding?.currentPrice || 0))}
                        </div>
                      </div>
                    )}

                    {quantity && (
                      <div className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}>
                        Total Value: {formatCurrency(parseFloat(quantity) * (
                          orderType === 'LIMIT' && price ? parseFloat(price) :
                          marketStatus === 'closed' && lastMarketPrice !== null ? lastMarketPrice : 
                          realTimeData ? realTimeData.currentPrice : (stockDetails as Stock).currentPrice
                        ))}
                      </div>
                    )}

                    {/* Add balance check for buy orders */}
                    {tradeType === 'BUY' && quantity && (
                      <div className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-600"}`}>
                        Available Balance: {formatCurrency(tradingAccount?.walletBalance || walletBalance || 0)}
                      </div>
                    )}

                    {/* Add market status indicator */}
                    <div className={`text-sm ${isDarkMode ? "text-slate-400" : "text-gray-600"} mb-4`}>
                      <Badge variant={marketStatus === 'open' ? 'default' : 'secondary'}>
                        {marketStatus === 'open' ? 'Market Live - Real-time Trading' : 'Market Closed - Trading at Last Price'}
                      </Badge>
                    </div>

                    <div className="flex gap-3">
                      <Button 
                        onClick={() => {
                          setTradeType('BUY');
                          // Use last market price if market is closed, otherwise use current price
                          const currentPrice = marketStatus === 'closed' && lastMarketPrice !== null 
                            ? lastMarketPrice 
                            : realTimeData ? realTimeData.currentPrice : (stockDetails as Stock).currentPrice;
                          setPrice(currentPrice.toFixed(2));
                          setShowConfirmation(true);
                        }}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        disabled={loading || !quantity || !apiHealth}
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Buy
                      </Button>
                      <Button 
                        onClick={() => {
                          setTradeType('SELL');
                          // Use last market price if market is closed, otherwise use current price
                          const currentPrice = marketStatus === 'closed' && lastMarketPrice !== null 
                            ? lastMarketPrice 
                            : realTimeData ? realTimeData.currentPrice : (stockDetails as Stock).currentPrice;
                          setPrice(currentPrice.toFixed(2));
                          setShowConfirmation(true);
                        }}
                        className="flex-1 bg-red-600 hover:bg-red-700"
                        disabled={loading || !quantity || !apiHealth}
                      >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                        Sell
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Force Refresh Button */}
              {stockDetails && (
                <div className="flex gap-3 mt-4">
                  <Button 
                    onClick={() => {
                      if (isLiveMode) {
                        fetchLivePriceData();
                      } else {
                        // Force refresh by generating new cache buster
                        const cacheBuster = Date.now();
                        getStockDetails(stockDetails.symbol, '1d', cacheBuster);
                      }
                      fetchRealTimeData();
                    }}
                    variant="outline"
                    size="sm"
                    disabled={isFetching}
                  >
                    {isFetching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                    Force Refresh
                  </Button>
                  <Button 
                    onClick={() => setForceChartUpdate(prev => prev + 1)}
                    variant="outline"
                    size="sm"
                  >
                    Redraw Chart
                  </Button>
                </div>
              )}
            </>
          )}
        </form>

        {/* Order Confirmation Dialog */}
        <Dialog open={showConfirmation} onOpenChange={setShowConfirmation}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Confirm Order</DialogTitle>
              <DialogDescription>
                Are you sure you want to place this order?
              </DialogDescription>
            </DialogHeader>
            {orderDetails && (
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Symbol:</span>
                  <span className="font-medium">{orderDetails.symbol}</span>
                </div>
                <div className="flex justify-between">
                  <span>Type:</span>
                  <Badge variant={orderDetails.type === 'BUY' ? 'default' : 'destructive'}>
                    {orderDetails.type}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>Order Type:</span>
                  <Badge variant="outline">{orderDetails.orderType}</Badge>
                </div>
                <div className="flex justify-between">
                  <span>Quantity:</span>
                  <span>{orderDetails.quantity}</span>
                </div>
                <div className="flex justify-between">
                  <span>Price:</span>
                  <span>{formatCurrency(orderDetails.price)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Market Status:</span>
                  <Badge variant={marketStatus === 'open' ? 'default' : 'secondary'}>
                    {marketStatus === 'open' ? 'Live' : 'Closed'}
                  </Badge>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total Value:</span>
                  <span>{formatCurrency(orderDetails.totalValue)}</span>
                </div>
                {/* Add balance info to confirmation dialog */}
                {orderDetails.type === 'BUY' && (
                  <div className="flex justify-between">
                    <span>Available Balance:</span>
                    <span>{formatCurrency(tradingAccount?.walletBalance || walletBalance || 0)}</span>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowConfirmation(false)}>
                Cancel
              </Button>
              <Button onClick={confirmOrder} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirm Order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}