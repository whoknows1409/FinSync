import google.generativeai as genai
from typing import List, Dict, Any
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import requests
import json
import os
import sys
from io import StringIO
from config import GEMINI_API_KEY
from models import StockData, HistoricalData, StockSummary

# Add parent directory to path to import alpha_vantage_service
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from utils.alpha_vantage_service import alpha_vantage_service

# Configure Gemini
genai.configure(api_key=GEMINI_API_KEY)

def get_all_nse_symbols():
    """Fetch all NSE symbols from NSE website"""
    try:
        # URL to fetch all NSE symbols
        url = "https://www.nseindia.com/api/equity-master"
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
            "Accept": "application/json",
        }
        
        response = requests.get(url, headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            # Extract symbols from the response
            symbols = [item["symbol"] for item in data]
            return symbols
        else:
            # Fallback to a predefined list if API fails
            return get_fallback_symbols()
    except Exception as e:
        print(f"Error fetching NSE symbols: {e}")
        return get_fallback_symbols()

def get_fallback_symbols():
    """Fallback list of NSE symbols if API fails"""
    # This is a subset for demonstration - in production, you'd want the full list
    return [
        "RELIANCE", "TCS", "HDFCBANK", "INFY", "HINDUNILVR",
        "ICICIBANK", "ITC", "SBIN", "BHARTIARTL", "KOTAKBANK",
        "LT", "AXISBANK", "ASIANPAINT", "DMART", "MARUTI",
        "HCLTECH", "SUNPHARMA", "TITAN", "TECHM", "WIPRO",
        "NESTLEIND", "ULTRACEMCO", "BAJFINANCE", "BAJAJFINSV", "DIVISLAB",
        "DRREDDY", "ADANIENT", "TATAMOTORS", "POWERGRID", "NTPC",
        "HDFCLIFE", "SBILIFE", "IOC", "HINDALCO", "JSWSTEEL",
        "INDUSINDBK", "TATACONSUM", "UPL", "M&M", "EICHERMOT",
        "GRASIM", "HEROMOTOCO", "BPCL", "COALINDIA", "BRITANNIA",
        "SHREECEM", "CIPLA", "TATACHEM", "HDFCAMC", "GAIL",
        "VEDL", "PNB", "DABUR", "GODREJCP", "HDFCBANK", "INFY",
        "ITC", "KOTAKBANK", "LT", "M&M", "MARUTI",
        "NESTLEIND", "ONGC", "POWERGRID", "RELIANCE", "SBIN",
        "SUNPHARMA", "TCS", "TATAMOTORS", "TITAN", "ULTRACEMCO",
        "WIPRO"
    ]

def get_top_gainers() -> List[StockData]:
    """Get top gaining stocks from NSE"""
    try:
        # Get all NSE symbols
        nse_symbols = get_all_nse_symbols()
        
        # Convert to yfinance format (add .NS suffix)
        yf_symbols = [f"{symbol}.NS" for symbol in nse_symbols]
        
        # Split into batches to avoid overwhelming the API
        batch_size = 100
        all_gainers = []
        
        for i in range(0, len(yf_symbols), batch_size):
            batch = yf_symbols[i:i+batch_size]
            try:
                data = yf.download(" ".join(batch), period="1d", group_by="ticker")
                
                for symbol in batch:
                    try:
                        if symbol not in data.columns:
                            continue
                            
                        ticker = yf.Ticker(symbol)
                        info = ticker.info
                        
                        # Calculate change
                        close = data[symbol]['Close'].iloc[-1]
                        open_price = data[symbol]['Open'].iloc[-1]
                        change = close - open_price
                        change_percent = (change / open_price) * 100
                        
                        if change_percent > 0:  # Only include gainers
                            all_gainers.append(StockData(
                                symbol=symbol.replace(".NS", ""),
                                name=info.get("longName", ""),
                                currentPrice=float(close),
                                previousClose=float(data[symbol]['Close'].iloc[-2]) if len(data[symbol]) > 1 else float(open_price),
                                change=float(change),
                                changePercent=float(change_percent),
                                marketCap=info.get("marketCap", 0),
                                volume=int(data[symbol]['Volume'].iloc[-1]),
                                pe=info.get("trailingPE"),
                                sector=info.get("sector")
                            ))
                    except Exception as e:
                        print(f"Error processing {symbol}: {e}")
                        continue
            except Exception as e:
                print(f"Error processing batch {i//batch_size + 1}: {e}")
                continue
        
        # Sort by change percent descending and take top 10
        all_gainers.sort(key=lambda x: x.changePercent, reverse=True)
        return all_gainers[:10]
    except Exception as e:
        print(f"Error getting top gainers: {e}")
        return []

def get_top_losers() -> List[StockData]:
    """Get top losing stocks from NSE"""
    try:
        # Get all NSE symbols
        nse_symbols = get_all_nse_symbols()
        
        # Convert to yfinance format (add .NS suffix)
        yf_symbols = [f"{symbol}.NS" for symbol in nse_symbols]
        
        # Split into batches to avoid overwhelming the API
        batch_size = 100
        all_losers = []
        
        for i in range(0, len(yf_symbols), batch_size):
            batch = yf_symbols[i:i+batch_size]
            try:
                data = yf.download(" ".join(batch), period="1d", group_by="ticker")
                
                for symbol in batch:
                    try:
                        if symbol not in data.columns:
                            continue
                            
                        ticker = yf.Ticker(symbol)
                        info = ticker.info
                        
                        # Calculate change
                        close = data[symbol]['Close'].iloc[-1]
                        open_price = data[symbol]['Open'].iloc[-1]
                        change = close - open_price
                        change_percent = (change / open_price) * 100
                        
                        if change_percent < 0:  # Only include losers
                            all_losers.append(StockData(
                                symbol=symbol.replace(".NS", ""),
                                name=info.get("longName", ""),
                                currentPrice=float(close),
                                previousClose=float(data[symbol]['Close'].iloc[-2]) if len(data[symbol]) > 1 else float(open_price),
                                change=float(change),
                                changePercent=float(change_percent),
                                marketCap=info.get("marketCap", 0),
                                volume=int(data[symbol]['Volume'].iloc[-1]),
                                pe=info.get("trailingPE"),
                                sector=info.get("sector")
                            ))
                    except Exception as e:
                        print(f"Error processing {symbol}: {e}")
                        continue
            except Exception as e:
                print(f"Error processing batch {i//batch_size + 1}: {e}")
                continue
        
        # Sort by change percent ascending and take top 10
        all_losers.sort(key=lambda x: x.changePercent)
        return all_losers[:10]
    except Exception as e:
        print(f"Error getting top losers: {e}")
        return []

def get_stock_data(symbol: str) -> StockData:
    """Get detailed stock data for a specific symbol"""
    try:
        ticker_symbol = f"{symbol}.NS"
        ticker = yf.Ticker(ticker_symbol)
        hist = ticker.history(period="1y")
        
        # Get the latest data
        latest = hist.iloc[-1]
        previous = hist.iloc[-2] if len(hist) > 1 else latest
        
        # Get historical data for the past year
        historical_data = []
        for date, row in hist.iterrows():
            historical_data.append(HistoricalData(
                date=date.strftime("%Y-%m-%d"),
                open=float(row['Open']),
                high=float(row['High']),
                low=float(row['Low']),
                close=float(row['Close']),
                volume=int(row['Volume'])
            ))
        
        # Get company info
        info = ticker.info
        
        return StockData(
            symbol=symbol,
            name=info.get("longName", ""),
            currentPrice=float(latest['Close']),
            previousClose=float(previous['Close']),
            change=float(latest['Close'] - previous['Close']),
            changePercent=float((latest['Close'] - previous['Close']) / previous['Close'] * 100),
            marketCap=info.get("marketCap", 0),
            volume=int(latest['Volume']),
            pe=info.get("trailingPE"),
            sector=info.get("sector"),
            historicalData=historical_data
        )
    except Exception as e:
        print(f"Error getting stock data for {symbol}: {e}")
        raise ValueError(f"Failed to retrieve stock data: {str(e)}")

def search_stocks(query: str) -> List[StockData]:
    """Search stocks by symbol or name"""
    try:
        # Get all NSE symbols
        nse_symbols = get_all_nse_symbols()
        
        # Convert to yfinance format (add .NS suffix)
        yf_symbols = [f"{symbol}.NS" for symbol in nse_symbols]
        
        results = []
        
        # Split into batches to avoid overwhelming the API
        batch_size = 100
        
        for i in range(0, len(yf_symbols), batch_size):
            batch = yf_symbols[i:i+batch_size]
            try:
                data = yf.download(" ".join(batch), period="1d", group_by="ticker")
                
                for symbol in batch:
                    try:
                        if symbol not in data.columns:
                            continue
                            
                        ticker = yf.Ticker(symbol)
                        info = ticker.info
                        symbol_name = info.get("longName", "")
                        symbol_code = symbol.replace(".NS", "")
                        
                        if query.lower() in symbol_code.lower() or query.lower() in symbol_name.lower():
                            hist = ticker.history(period="1d")
                            latest = hist.iloc[-1]
                            previous = hist.iloc[-2] if len(hist) > 1 else latest
                            
                            results.append(StockData(
                                symbol=symbol_code,
                                name=symbol_name,
                                currentPrice=float(latest['Close']),
                                previousClose=float(previous['Close']),
                                change=float(latest['Close'] - previous['Close']),
                                changePercent=float((latest['Close'] - previous['Close']) / previous['Close'] * 100),
                                marketCap=info.get("marketCap", 0),
                                volume=int(latest['Volume']),
                                pe=info.get("trailingPE"),
                                sector=info.get("sector")
                            ))
                    except Exception as e:
                        print(f"Error processing {symbol}: {e}")
                        continue
            except Exception as e:
                print(f"Error processing batch {i//batch_size + 1}: {e}")
                continue
        
        return results
    except Exception as e:
        print(f"Error searching stocks: {e}")
        return []

def generate_stock_summary(symbol: str, stock_data: StockData, historical_data: List[HistoricalData]) -> StockSummary:
    """Generate AI-powered stock summary using Gemini"""
    try:
        # Prepare the data for Gemini
        prompt = f"""
        Analyze the following stock data for {symbol} and provide a comprehensive summary:
        
        Current Price: ₹{stock_data.currentPrice}
        Previous Close: ₹{stock_data.previousClose}
        Change: ₹{stock_data.change} ({stock_data.changePercent}%)
        Market Cap: ₹{stock_data.marketCap}
        Volume: {stock_data.volume}
        P/E Ratio: {stock_data.pe if stock_data.pe else 'N/A'}
        Sector: {stock_data.sector if stock_data.sector else 'N/A'}
        
        Historical Data (last 5 days):
        {historical_data[-5:] if historical_data else 'No historical data available'}
        
        Please provide:
        1. Price Trend: A brief description of the price trend.
        2. Key Fundamentals: Analysis of key fundamentals like P/E ratio, market cap, etc.
        3. Risks and Opportunities: Potential risks and investment opportunities.
        4. Recommendation: Buy, Sell, or Hold with a brief explanation.
        
        Format your response as a JSON object with the following keys:
        - "priceTrend": string
        - "keyFundamentals": string
        - "risksAndOpportunities": string
        - "recommendation": string (one of "Buy", "Sell", "Hold")
        """
        
        model = genai.GenerativeModel('gemini-pro')
        response = model.generate_content(prompt)
        
        # Parse the response as JSON
        try:
            summary_data = eval(response.text.strip())
            return StockSummary(
                symbol=symbol,
                recommendation=summary_data["recommendation"],
                priceTrend=summary_data["priceTrend"],
                keyFundamentals=summary_data["keyFundamentals"],
                risksAndOpportunities=summary_data["risksAndOpportunities"]
            )
        except Exception as e:
            print(f"Error parsing Gemini response: {e}")
            # Return a default summary
            return StockSummary(
                symbol=symbol,
                recommendation="Hold",
                priceTrend="Unable to determine price trend.",
                keyFundamentals="Fundamental analysis not available.",
                risksAndOpportunities="Risks and opportunities analysis not available."
            )
    except Exception as e:
        print(f"Error generating stock summary: {e}")
        raise ValueError(f"Failed to generate stock summary: {str(e)}")