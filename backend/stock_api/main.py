from fastapi import FastAPI, Query, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List
import uvicorn

from models import StockData, StockSummary, SummaryRequest
from services import get_top_gainers, get_top_losers, get_stock_data, search_stocks, generate_stock_summary
from config import API_V1_STR, PROJECT_NAME

app = FastAPI(
    title=PROJECT_NAME,
    openapi_url=f"{API_V1_STR}/openapi.json"
)

# Allow CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check endpoint
@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get(f"{API_V1_STR}/stocks/top-gainers", response_model=List[StockData])
async def top_gainers():
    """Get top gaining stocks from NSE"""
    try:
        return get_top_gainers()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get(f"{API_V1_STR}/stocks/top-losers", response_model=List[StockData])
async def top_losers():
    """Get top losing stocks from NSE"""
    try:
        return get_top_losers()
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get(f"{API_V1_STR}/stocks/{{symbol}}", response_model=StockData)
async def stock_data(symbol: str):
    """Get detailed stock data for a specific symbol"""
    try:
        return get_stock_data(symbol)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get(f"{API_V1_STR}/stocks/search", response_model=List[StockData])
async def search_stocks_endpoint(q: str = Query(..., min_length=1)):
    """Search stocks by symbol or name"""
    try:
        return search_stocks(q)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post(f"{API_V1_STR}/stocks/summary", response_model=StockSummary)
async def stock_summary(request: SummaryRequest):
    """Generate AI-powered stock summary using Gemini"""
    try:
        return generate_stock_summary(
            symbol=request.symbol,
            stock_data=request.stockData,
            historical_data=request.historicalData
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)