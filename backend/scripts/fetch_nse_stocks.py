# scripts/fetch_nse_stocks.py
import os
import sys
import time
import logging
from datetime import datetime, timedelta
import pandas as pd
import pymongo
from pymongo import MongoClient
from dotenv import load_dotenv
import schedule

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('/path/to/your/project/logs/stock_fetch.log'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# MongoDB connection
MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/finsync')
try:
    client = MongoClient(MONGO_URI)
    db = client.get_default_database()
    stocks_collection = db.stocks
    logger.info("Connected to MongoDB")
except Exception as e:
    logger.error(f"Failed to connect to MongoDB: {e}")
    sys.exit(1)

# Import NSE functions
try:
    from nsepython import *
    logger.info("NSE Python library imported successfully")
except ImportError as e:
    logger.error(f"Failed to import NSE Python library: {e}")
    sys.exit(1)

def get_nifty50_symbols():
    """Get all NIFTY 50 stock symbols"""
    try:
        nifty50_list = nifty50_list()
        symbols = [stock['symbol'] for stock in nifty50_list]
        logger.info(f"Fetched {len(symbols)} NIFTY 50 symbols")
        return symbols
    except Exception as e:
        logger.error(f"Error fetching NIFTY 50 symbols: {e}")
        return []

def get_nifty500_symbols():
    """Get all NIFTY 500 stock symbols"""
    try:
        nifty500_list = nifty500_list()
        symbols = [stock['symbol'] for stock in nifty500_list]
        logger.info(f"Fetched {len(symbols)} NIFTY 500 symbols")
        return symbols
    except Exception as e:
        logger.error(f"Error fetching NIFTY 500 symbols: {e}")
        return []

def get_stock_quote(symbol):
    """Get stock quote for a specific symbol"""
    try:
        quote = nsefetch(f"https://www.nseindia.com/api/quote-equity?symbol={symbol}")
        
        if 'info' not in quote or 'priceInfo' not in quote:
            logger.warning(f"Invalid quote data for {symbol}")
            return None
            
        info = quote['info']
        price_info = quote['priceInfo']
        metadata = quote.get('metadata', {})
        
        # Extract sector information
        industry = info.get('industry', 'Unknown')
        
        return {
            'symbol': symbol,
            'name': info.get('companyName', ''),
            'sector': industry,
            'industry': industry,
            'currentPrice': price_info.get('lastPrice', 0),
            'previousClose': price_info.get('previousClose', 0),
            'change': price_info.get('change', 0),
            'changePercent': price_info.get('pChange', 0),
            'volume': price_info.get('totalTradedVolume', 0),
            'marketCap': metadata.get('marketCap', 0),
            'lastUpdated': datetime.now()
        }
    except Exception as e:
        logger.error(f"Error fetching quote for {symbol}: {e}")
        return None

def get_index_stocks(index_symbol="NIFTY 50"):
    """Get all stocks in a specific index"""
    try:
        index_data = nsefetch(f"https://www.nseindia.com/api/equity-stockIndices?index={index_symbol.replace(' ', '%20')}")
        
        if 'data' not in index_data:
            logger.warning(f"Invalid index data for {index_symbol}")
            return []
            
        stocks = []
        for stock in index_data['data']:
            stocks.append({
                'symbol': stock['symbol'],
                'name': stock['meta']['companyName'],
                'sector': 'Unknown',  # Will be updated with individual quote
                'industry': 'Unknown',
                'currentPrice': stock['lastPrice'],
                'previousClose': stock['previousClose'],
                'change': stock['change'],
                'changePercent': stock['pChange'],
                'volume': stock['totalTradedVolume'],
                'marketCap': stock.get('marketCap', 0),
                'lastUpdated': datetime.now()
            })
        
        logger.info(f"Fetched {len(stocks)} stocks from {index_symbol}")
        return stocks
    except Exception as e:
        logger.error(f"Error fetching stocks from {index_symbol}: {e}")
        return []

def update_stocks():
    """Update stock data in the database"""
    logger.info("Starting stock data update...")
    
    # Get stocks from NIFTY 50 and NIFTY 500
    nifty50_stocks = get_index_stocks("NIFTY 50")
    nifty500_stocks = get_index_stocks("NIFTY 500")
    
    # Combine and deduplicate stocks
    all_stocks = nifty50_stocks + nifty500_stocks
    unique_stocks = {stock['symbol']: stock for stock in all_stocks}.values()
    
    logger.info(f"Found {len(unique_stocks)} unique stocks")
    
    if not unique_stocks:
        logger.warning("No stocks found. Exiting.")
        return
    
    # Update each stock in the database
    updated_count = 0
    error_count = 0
    
    for i, stock in enumerate(unique_stocks):
        try:
            logger.info(f"Processing {i+1}/{len(unique_stocks)}: {stock['symbol']}")
            
            # Update or insert in database
            result = stocks_collection.replace_one(
                {'symbol': stock['symbol']},
                stock,
                upsert=True
            )
            
            if result.upserted_id or result.modified_count > 0:
                updated_count += 1
            
            # Sleep to avoid rate limiting
            time.sleep(0.5)
            
        except Exception as e:
            logger.error(f"Error processing {stock['symbol']}: {e}")
            error_count += 1
    
    logger.info(f"Stock data update completed. Updated: {updated_count}, Errors: {error_count}")

def job():
    """Scheduled job function"""
    logger.info("Running scheduled stock data update...")
    update_stocks()

def main():
    """Main function"""
    logger.info("Starting NSE stock data fetch...")
    
    # Run immediately
    update_stocks()
    
    # Schedule to run every hour
    schedule.every().hour.do(job)
    
    # Keep the script running
    while True:
        schedule.run_pending()
        time.sleep(60)

if __name__ == "__main__":
    # If run with "now" argument, just run once and exit
    if len(sys.argv) > 1 and sys.argv[1] == "now":
        update_stocks()
    else:
        main()