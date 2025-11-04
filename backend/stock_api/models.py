from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from pydantic import BaseModel

class HistoricalData(BaseModel):
    date: str
    open: float
    high: float
    low: float
    close: float
    volume: int

class StockData(BaseModel):
    symbol: str
    name: str
    currentPrice: float
    previousClose: float
    change: float
    changePercent: float
    marketCap: float
    volume: int
    pe: Optional[float] = None
    sector: Optional[str] = None
    historicalData: Optional[List[HistoricalData]] = None

class StockSummary(BaseModel):
    symbol: str
    recommendation: str
    priceTrend: str
    keyFundamentals: str
    risksAndOpportunities: str

class SummaryRequest(BaseModel):
    symbol: str
    stockData: StockData
    historicalData: List[HistoricalData]