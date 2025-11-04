# python-service/app.py
from flask import Flask, jsonify, request
from flask_cors import CORS
import yfinance as yf
import pandas as pd
from datetime import datetime
import os

app = Flask(__name__)
CORS(app)

def get_nse_stock_details(symbol):
    """
    Fetches detailed information for a given NSE stock symbol
    """
    try:
        # Format symbol for NSE (add .NS suffix if not present)
        ticker_symbol = f"{symbol.upper()}.NS" if not symbol.upper().endswith('.NS') else symbol.upper()
        
        # Create ticker object
        ticker = yf.Ticker(ticker_symbol)
        
        # Fetch basic info
        info = ticker.info
        
        # Validate if we got meaningful data
        if not info or 'regularMarketPrice' not in info:
            return {"error": f"No data found for symbol: {ticker_symbol}"}
        
        # Get historical data for additional metrics
        hist = ticker.history(period="1mo")
        
        # Calculate 30-day average volume
        avg_volume = hist['Volume'].mean() if not hist.empty else 0
        
        # Prepare stock details
        stock_details = {
            "symbol": ticker_symbol,
            "name": info.get('longName', 'N/A'),
            "current_price": info.get('regularMarketPrice', 0),
            "previous_close": info.get('previousClose', 0),
            "open": info.get('open', 0),
            "day_range": f"{info.get('dayLow', 0)} - {info.get('dayHigh', 0)}",
            "52_week_range": f"{info.get('fiftyTwoWeekLow', 0)} - {info.get('fiftyTwoWeekHigh', 0)}",
            "volume": info.get('volume', 0),
            "avg_volume": avg_volume,
            "market_cap": info.get('marketCap', 0),
            "pe_ratio": info.get('trailingPE', 0),
            "dividend_yield": info.get('dividendYield', 0) * 100 if info.get('dividendYield') else 0,
            "eps": info.get('trailingEps', 0),
            "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "change": info.get('regularMarketPrice', 0) - info.get('previousClose', 0),
            "change_percent": ((info.get('regularMarketPrice', 0) - info.get('previousClose', 0)) / info.get('previousClose', 1)) * 100 if info.get('previousClose', 0) > 0 else 0
        }
        
        return stock_details
    
    except Exception as e:
        return {"error": f"Error fetching data: {str(e)}"}

def search_stocks(query):
    """
    Search for stocks matching the query
    """
    try:
        # List of popular NSE stocks for search
        popular_stocks = [
            "RELIANCE", "TCS", "HDFCBANK", "INFY", "HINDUNILVR", "ICICIBANK", "ITC", "SBIN",
            "BHARTIARTL", "KOTAKBANK", "LT", "AXISBANK", "MARUTI", "SUNPHARMA", "TITAN",
            "BAJFINANCE", "WIPRO", "HCLTECH", "NESTLEIND", "ULTRACEMCO", "ADANIENT",
            "TATASTEEL", "JSWSTEEL", "COALINDIA", "NTPC", "ONGC", "POWERGRID", "BHEL",
            "GAIL", "IOC", "BPCL", "CONCOR", "DIVISLAB", "DRREDDY", "EICHERMOT",
            "GRASIM", "HDFCLIFE", "HEROMOTOCO", "HINDALCO", "INDUSINDBK", "M&M",
            "MOTHERSUMI", "MRF", "NATIONALUM", "NAUKRI", "NMDC", "OBEROIRLTY", "OFSS",
            "PETRONET", "PFC", "PIDILITIND", "PNB", "RECLTD", "SHREECEM", "SIEMENS",
            "SRF", "SUNTV", "TATACONSUM", "TATAMOTORS", "TECHM", "TORNTPHARM", "TORNTPOWER",
            "UPL", "VEDL", "ZEEL", "ZYDUSWELL"
        ]
        
        results = []
        query_lower = query.lower()
        
        for symbol in popular_stocks:
            if query_lower in symbol.lower():
                details = get_nse_stock_details(symbol)
                if 'error' not in details:
                    results.append(details)
        
        return results
    except Exception as e:
        return {"error": f"Error searching stocks: {str(e)}"}

@app.route('/stock/<symbol>')
def get_stock(symbol):
    details = get_nse_stock_details(symbol)
    return jsonify(details)

@app.route('/search')
def search_stocks_route():
    query = request.args.get('q', '')
    if not query:
        return jsonify({"error": "Query parameter 'q' is required"})
    
    results = search_stocks(query)
    return jsonify({"stocks": results})

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)