"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { getWatchlist, addToWatchlist, removeFromWatchlist } from "@/lib/stock-api"
import { Plus, Search, Trash2, TrendingUp, TrendingDown } from "lucide-react"
import { toast } from "sonner"
import { formatCurrency, getChangeColor, getChangeIcon } from "@/lib/utils"

interface WatchlistItem {
  _id: string
  stock: {
    symbol: string
    name: string
    sector: string
  }
  currentPrice?: number
  change?: number
  changePercent?: number
  targetPrice?: number
  notes?: string
  addedAt: string
}

export function Watchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [isSearching, setIsSearching] = useState(false)

  const fetchWatchlist = async () => {
    try {
      setIsLoading(true)
      const data = await getWatchlist()
      // Normalize to WatchlistItem shape if API returns stocks directly
      const normalized: WatchlistItem[] = (data as any[]).map((s: any, idx: number) => ({
        _id: s._id || s.id || `${s.symbol}-${idx}`,
        stock: { symbol: s.symbol, name: s.name, sector: s.sector || 'Unknown' },
        currentPrice: s.currentPrice,
        change: s.change,
        changePercent: s.changePercent,
        addedAt: new Date().toISOString()
      }))
      setWatchlist(normalized)
    } catch (error) {
      console.error("Error fetching watchlist:", error)
      toast.error("Failed to fetch watchlist")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    
    try {
      setIsSearching(true)
      const { searchStocks } = await import("@/lib/stock-api")
      const results = await searchStocks(searchQuery)
      setSearchResults(results.slice(0, 5)) // Limit to 5 results
    } catch (error) {
      console.error("Error searching stocks:", error)
      toast.error("Failed to search stocks")
    } finally {
      setIsSearching(false)
    }
  }

  const handleAddToWatchlist = async (symbol: string) => {
    try {
      await addToWatchlist(symbol)
      toast.success("Added to watchlist")
      setSearchQuery("")
      setSearchResults([])
      fetchWatchlist()
    } catch (error) {
      console.error("Error adding to watchlist:", error)
      toast.error("Failed to add to watchlist")
    }
  }

  const handleRemoveFromWatchlist = async (id: string) => {
    try {
      await removeFromWatchlist(id)
      toast.success("Removed from watchlist")
      fetchWatchlist()
    } catch (error) {
      console.error("Error removing from watchlist:", error)
      toast.error("Failed to remove from watchlist")
    }
  }

  useEffect(() => {
    fetchWatchlist()
  }, [])

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchQuery) {
        handleSearch()
      } else {
        setSearchResults([])
      }
    }, 500)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery])

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle>Watchlist</CardTitle>
            <CardDescription>Your favorite stocks with live prices</CardDescription>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1" />
                Add Stock
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add to Watchlist</DialogTitle>
                <DialogDescription>
                  Search for a stock to add to your watchlist
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex">
                  <Input
                    placeholder="Search stocks..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="mr-2"
                  />
                  <Button onClick={handleSearch} disabled={isSearching}>
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                
                {searchResults.length > 0 && (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {searchResults.map((stock) => (
                      <div key={stock.symbol} className="flex justify-between items-center p-2 border rounded">
                        <div>
                          <div className="font-medium">{stock.symbol}</div>
                          <div className="text-sm text-muted-foreground">{stock.name}</div>
                        </div>
                        <Button 
                          size="sm" 
                          onClick={() => handleAddToWatchlist(stock.symbol)}
                        >
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : watchlist.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center">
            <p className="text-muted-foreground mb-2">Your watchlist is empty</p>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Add Stocks
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add to Watchlist</DialogTitle>
                  <DialogDescription>
                    Search for a stock to add to your watchlist
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="flex">
                    <Input
                      placeholder="Search stocks..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="mr-2"
                    />
                    <Button onClick={handleSearch} disabled={isSearching}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {searchResults.length > 0 && (
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {searchResults.map((stock) => (
                        <div key={stock.symbol} className="flex justify-between items-center p-2 border rounded">
                          <div>
                            <div className="font-medium">{stock.symbol}</div>
                            <div className="text-sm text-muted-foreground">{stock.name}</div>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => handleAddToWatchlist(stock.symbol)}
                          >
                            Add
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {watchlist.map((item) => (
              <Card key={item._id} className="relative">
                <CardContent className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-bold">{item.stock.symbol}</div>
                      <div className="text-sm text-muted-foreground truncate">{item.stock.name}</div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => handleRemoveFromWatchlist(item._id)}
                      className="h-6 w-6 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  <div className="text-lg font-bold mb-1">₹{item.currentPrice?.toFixed(2)}</div>
                  
                  {item.change !== undefined && (
                    <div className={`flex items-center mb-3 ${getChangeColor(item.change)}`}>
                      {getChangeIcon(item.change)}
                      <span>
                        {item.change >= 0 ? '+' : ''}{item.change?.toFixed(2)} ({item.changePercent?.toFixed(2)}%)
                      </span>
                    </div>
                  )}
                  
                  <div className="flex space-x-2">
                    <Button size="sm" className="flex-1">Buy</Button>
                    <Button size="sm" variant="outline" className="flex-1">Sell</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}