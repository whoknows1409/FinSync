from flask import Flask, request, jsonify
import yfinance as yf
import logging
from datetime import datetime, timedelta
import time
import re
from typing import Dict, List, Optional, Any
from scripts.fetch_nse_stocks import nse_scraper

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)

# Popular NSE stocks for fallback
POPULAR_STOCKS = [
    'RELIANCE.NS', 'TCS.NS', 'HDFCBANK.NS', 'INFY.NS', 'HINDUNILVR.NS',
    'ICICIBANK.NS', 'SBIN.NS', 'BHARTIARTL.NS', 'KOTAKBANK.NS', 'LT.NS',
    'AXISBANK.NS', 'ITC.NS', 'HCLTECH.NS', 'ASIANPAINT.NS', 'DMART.NS',
    'SUNPHARMA.NS', 'WIPRO.NS', 'TATAMOTORS.NS', 'MARUTI.NS', 'ULTRACEMCO.NS'
]

# Helper functions
def validate_stock_symbol(symbol: str) -> bool:
    """Validate stock symbol format"""
    if not symbol:
        return False
    # Basic validation for NSE symbols
    return bool(re.match(r'^[A-Z]{1,5}(\.NS)?$', symbol.upper()))

def format_currency(amount: float) -> str:
    """Format currency in INR"""
    return f"₹{amount:,.2f}"

def format_volume(volume: int) -> str:
    """Format volume in human-readable format"""
    if volume >= 10000000:
        return f"{volume/10000000:.2f} Cr"
    elif volume >= 100000:
        return f"{volume/100000:.2f} L"
    elif volume >= 1000:
        return f"{volume/1000:.2f} K"
    return str(volume)

def format_percentage(value: float) -> str:
    """Format percentage with + for positive values"""
    return f"{'+' if value >= 0 else ''}{value:.2f}%"

# API Routes
@app.route('/api/stocks-analysis/stock-data', methods=['GET'])
def get_stock_data():
    """Get stock data for a given symbol"""
    symbol = request.args.get('symbol')
    if not symbol or not validate_stock_symbol(symbol):
        return jsonify({'error': 'Invalid stock symbol'}), 400
    
    # Ensure symbol has .NS suffix
    formatted_symbol = symbol.upper() if symbol.upper().endswith('.NS') else f"{symbol.upper()}.NS"
    
    try:
        ticker = yf.Ticker(formatted_symbol)
        info = ticker.info
        
        stock_data = {
            'symbol': info.get('symbol', formatted_symbol),
            'name': info.get('longName', info.get('shortName', '')),
            'currentPrice': info.get('regularMarketPrice', 0),
            'previousClose': info.get('regularMarketPreviousClose', 0),
            'marketCap': info.get('marketCap', 0),
            'peRatio': info.get('trailingPE', 0),
            'dividendYield': info.get('dividendYield', 0),
            'fiftyTwoWeekHigh': info.get('fiftyTwoWeekHigh', 0),
            'fiftyTwoWeekLow': info.get('fiftyTwoWeekLow', 0),
            'volume': info.get('regularMarketVolume', 0),
            'averageVolume': info.get('averageDailyVolume3Month', 0),
            'beta': info.get('beta', 0)
        }
        
        return jsonify(stock_data)
    except Exception as e:
        logger.error(f"Error fetching stock data: {e}")
        return jsonify({'error': 'Failed to fetch stock data'}), 500

@app.route('/api/stocks-analysis/historical-data', methods=['GET'])
def get_historical_data():
    """Get historical stock data for charts"""
    symbol = request.args.get('symbol')
    period = request.args.get('period', '1mo')
    interval = request.args.get('interval', '1d')
    
    if not symbol or not validate_stock_symbol(symbol):
        return jsonify({'error': 'Invalid stock symbol'}), 400
    
    # Ensure symbol has .NS suffix
    formatted_symbol = symbol.upper() if symbol.upper().endswith('.NS') else f"{symbol.upper()}.NS"
    
    try:
        ticker = yf.Ticker(formatted_symbol)
        hist = ticker.history(period=period, interval=interval)
        
        formatted_data = []
        for date, row in hist.iterrows():
            formatted_data.append({
                'date': date.strftime('%Y-%m-%d'),
                'close': row['Close']
            })
            
        return jsonify(formatted_data)
    except Exception as e:
        logger.error(f"Error fetching historical data: {e}")
        return jsonify({'error': 'Failed to fetch historical data'}), 500

@app.route('/api/stocks-analysis/top-gainers-losers', methods=['GET'])
def get_top_gainers_losers():
    """Get top gainers and losers from NSE"""
    try:
        try:
            # Try to scrape from NSE website
            data = nse_scraper.scrape_top_gainers_losers()
            logger.info("Successfully scraped NSE data")
            return jsonify(data)
        except Exception as scrape_error:
            logger.warn(f"Failed to scrape NSE data, falling back to Yahoo Finance: {scrape_error}")
            
            # Fallback to Yahoo Finance data
            stock_quotes = []
            for symbol in POPULAR_STOCKS:
                try:
                    ticker = yf.Ticker(symbol)
                    info = ticker.info
                    if info.get('regularMarketPrice') and info.get('regularMarketPreviousClose'):
                        current_price = info['regularMarketPrice']
                        prev_close = info['regularMarketPreviousClose']
                        change_percent = ((current_price - prev_close) / prev_close) * 100
                        
                        stock_quotes.append({
                            'symbol': symbol,
                            'name': info.get('longName', info.get('shortName', symbol)),
                            'currentPrice': current_price,
                            'previousClose': prev_close,
                            'changePercent': change_percent
                        })
                except Exception as e:
                    logger.error(f"Error fetching data for {symbol}: {e}")
                    continue
            
            # Get top 10 gainers and losers
            gainers = sorted(stock_quotes, key=lambda x: x['changePercent'], reverse=True)[:10]
            losers = sorted(stock_quotes, key=lambda x: x['changePercent'])[:10]
            
            return jsonify({
                'gainers': gainers,
                'losers': losers,
                'totalStocks': len(stock_quotes),
                'timestamp': datetime.now().isoformat(),
                'source': 'Yahoo Finance (Fallback)'
            })
    except Exception as e:
        logger.error(f"Error fetching top gainers and losers: {e}")
        return jsonify({'error': 'Failed to fetch market data'}), 500

@app.route('/api/stocks-analysis/top-gainers-losers-detailed', methods=['GET'])
def get_top_gainers_losers_detailed():
    """Get detailed top gainers and losers with more data"""
    try:
        try:
            # Try to scrape detailed data from NSE website
            data = nse_scraper.scrape_all_top_gainers_losers()
            logger.info("Successfully scraped detailed NSE data")
            return jsonify(data)
        except Exception as scrape_error:
            logger.warn(f"Failed to scrape detailed NSE data, falling back to basic data: {scrape_error}")
            
            # Fall back to the basic top gainers/losers endpoint
            data = nse_scraper.scrape_top_gainers_losers()
            return jsonify({
                **data,
                'source': 'NSE India (Basic)'
            })
    except Exception as e:
        logger.error(f"Error fetching detailed top gainers and losers: {e}")
        return jsonify({'error': 'Failed to fetch detailed market data'}), 500

@app.route('/api/stocks-analysis/nifty50-data', methods=['GET'])
def get_nifty50_data():
    """Get NIFTY 50 data"""
    try:
        try:
            # Try to scrape from NSE website
            data = nse_scraper.scrape_nifty50_data()
            data['source'] = 'NSE India'
            logger.info("Successfully scraped NIFTY 50 data")
            return jsonify(data)
        except Exception as scrape_error:
            logger.warn(f"Failed to scrape NIFTY 50 data, falling back to Yahoo Finance: {scrape_error}")
            
            # Fallback to Yahoo Finance
            ticker = yf.Ticker('^NSEI')
            info = ticker.info
            
            return jsonify({
                'ltp': info.get('regularMarketPrice', 0),
                'change': info.get('regularMarketPrice', 0) - info.get('regularMarketPreviousClose', 0),
                'changePercent': ((info.get('regularMarketPrice', 0) - info.get('regularMarketPreviousClose', 0)) / info.get('regularMarketPreviousClose', 1)) * 100,
                'previousClose': info.get('regularMarketPreviousClose', 0),
                'source': 'Yahoo Finance (Fallback)'
            })
    except Exception as e:
        logger.error(f"Error fetching NIFTY 50 data: {e}")
        return jsonify({'error': 'Failed to fetch NIFTY 50 data'}), 500

@app.route('/api/stocks-analysis/compare', methods=['GET'])
def compare_stocks():
    """Compare two stocks"""
    symbol1 = request.args.get('symbol1')
    symbol2 = request.args.get('symbol2')
    
    if not symbol1 or not symbol2 or not validate_stock_symbol(symbol1) or not validate_stock_symbol(symbol2):
        return jsonify({'error': 'Invalid stock symbols'}), 400
    
    # Ensure symbols have .NS suffix
    formatted_symbol1 = symbol1.upper() if symbol1.upper().endswith('.NS') else f"{symbol1.upper()}.NS"
    formatted_symbol2 = symbol2.upper() if symbol2.upper().endswith('.NS') else f"{symbol2.upper()}.NS"
    
    try:
        # Fetch data for both stocks
        ticker1 = yf.Ticker(formatted_symbol1)
        ticker2 = yf.Ticker(formatted_symbol2)
        
        info1 = ticker1.info
        info2 = ticker2.info
        
        # Calculate monthly change for both stocks
        one_month_ago = datetime.now() - timedelta(days=30)
        hist1 = ticker1.history(start=one_month_ago)
        hist2 = ticker2.history(start=one_month_ago)
        
        monthly_change1 = 0
        monthly_change2 = 0
        
        if len(hist1) > 1:
            monthly_change1 = ((info1['regularMarketPrice'] - hist1['Close'].iloc[0]) / hist1['Close'].iloc[0]) * 100
            
        if len(hist2) > 1:
            monthly_change2 = ((info2['regularMarketPrice'] - hist2['Close'].iloc[0]) / hist2['Close'].iloc[0]) * 100
        
        # Format stock data
        stock1 = {
            'symbol': info1.get('symbol', formatted_symbol1),
            'name': info1.get('longName', info1.get('shortName', '')),
            'currentPrice': info1.get('regularMarketPrice', 0),
            'previousClose': info1.get('regularMarketPreviousClose', 0),
            'marketCap': info1.get('marketCap', 0),
            'peRatio': info1.get('trailingPE', 0),
            'fiftyTwoWeekHigh': info1.get('fiftyTwoWeekHigh', 0),
            'fiftyTwoWeekLow': info1.get('fiftyTwoWeekLow', 0),
            'monthlyChange': monthly_change1
        }
        
        stock2 = {
            'symbol': info2.get('symbol', formatted_symbol2),
            'name': info2.get('longName', info2.get('shortName', '')),
            'currentPrice': info2.get('regularMarketPrice', 0),
            'previousClose': info2.get('regularMarketPreviousClose', 0),
            'marketCap': info2.get('marketCap', 0),
            'peRatio': info2.get('trailingPE', 0),
            'fiftyTwoWeekHigh': info2.get('fiftyTwoWeekHigh', 0),
            'fiftyTwoWeekLow': info2.get('fiftyTwoWeekLow', 0),
            'monthlyChange': monthly_change2
        }
        
        # Note: AI comparison would require Gemini API integration
        # For now, we'll skip this part
        
        return jsonify({
            'stock1': stock1,
            'stock2': stock2,
            'aiSummary': 'AI comparison feature coming soon'
        })
    except Exception as e:
        logger.error(f"Error comparing stocks: {e}")
        return jsonify({'error': 'Failed to compare stocks'}), 500

@app.route('/api/stocks-analysis/search', methods=['GET'])
def search_stocks():
    """Get stock search suggestions"""
    query = request.args.get('q', '').strip().upper()
    
    if not query:
        return jsonify({'error': 'Search query is required'}), 400
    
    # Popular NSE stocks for search
    popular_stocks = [
        {'symbol': 'RELIANCE.NS', 'name': 'Reliance Industries Ltd.'},
        {'symbol': 'TCS.NS', 'name': 'Tata Consultancy Services Ltd.'},
        {'symbol': 'HDFCBANK.NS', 'name': 'HDFC Bank Ltd.'},
        {'symbol': 'INFY.NS', 'name': 'Infosys Ltd.'},
        {'symbol': 'HINDUNILVR.NS', 'name': 'Hindustan Unilever Ltd.'},
        {'symbol': 'ICICIBANK.NS', 'name': 'ICICI Bank Ltd.'},
        {'symbol': 'SBIN.NS', 'name': 'State Bank of India'},
        {'symbol': 'BHARTIARTL.NS', 'name': 'Bharti Airtel Ltd.'},
        {'symbol': 'KOTAKBANK.NS', 'name': 'Kotak Mahindra Bank Ltd.'},
        {'symbol': 'LT.NS', 'name': 'Larsen & Toubro Ltd.'},
        {'symbol': 'AXISBANK.NS', 'name': 'Axis Bank Ltd.'},
        {'symbol': 'ITC.NS', 'name': 'ITC Ltd.'},
        {'symbol': 'HCLTECH.NS', 'name': 'HCL Technologies Ltd.'},
        {'symbol': 'ASIANPAINT.NS', 'name': 'Asian Paints Ltd.'},
        {'symbol': 'DMART.NS', 'name': 'Avenue Supermarts Ltd.'},
        {'symbol': 'SUNPHARMA.NS', 'name': 'Sun Pharmaceutical Industries Ltd.'},
        {'symbol': 'WIPRO.NS', 'name': 'Wipro Ltd.'},
        {'symbol': 'TATAMOTORS.NS', 'name': 'Tata Motors Ltd.'},
        {'symbol': 'MARUTI.NS', 'name': 'Maruti Suzuki India Ltd.'},
        {'symbol': 'ULTRACEMCO.NS', 'name': 'UltraTech Cement Ltd.'}
    ]
    
    # Filter stocks based on query
    filtered_stocks = [
        stock for stock in popular_stocks 
        if query in stock['symbol'] or query in stock['name'].upper()
    ]
    
    return jsonify({
        'stocks': filtered_stocks[:10]  # Return top 10 matches
    })

@app.route('/api/stocks-analysis/sector-performance', methods=['GET'])
def get_sector_performance():
    """Get sector-wise performance"""
    # Mock sector data - in a real implementation, this would come from an API
    sector_data = [
        {'sector': 'IT', 'change': 2.5, 'stocks': ['TCS.NS', 'INFY.NS', 'WIPRO.NS', 'HCLTECH.NS', 'TECHM.NS']},
        {'sector': 'Banking', 'change': -1.2, 'stocks': ['HDFCBANK.NS', 'ICICIBANK.NS', 'SBIN.NS', 'KOTAKBANK.NS', 'AXISBANK.NS']},
        {'sector': 'Pharma', 'change': 0.8, 'stocks': ['SUNPHARMA.NS', 'DRREDDY.NS', 'CIPLA.NS', 'LUPIN.NS', 'BIOCON.NS']},
        {'sector': 'FMCG', 'change': 1.1, 'stocks': ['HINDUNILVR.NS', 'ITC.NS', 'BRITANNIA.NS', 'DABUR.NS', 'GODREJCP.NS']},
        {'sector': 'Auto', 'change': -0.5, 'stocks': ['TATAMOTORS.NS', 'MARUTI.NS', 'EICHERMOT.NS', 'M&M.NS', 'BAJAJAUTO.NS']},
        {'sector': 'Oil & Gas', 'change': 1.8, 'stocks': ['RELIANCE.NS', 'ONGC.NS', 'BPCL.NS', 'IOC.NS', 'GAIL.NS']},
        {'sector': 'Metal', 'change': 3.2, 'stocks': ['TATASTEEL.NS', 'JSWSTEEL.NS', 'HINDALCO.NS', 'VEDL.NS', 'SAIL.NS']},
        {'sector': 'Cement', 'change': 0.3, 'stocks': ['ULTRACEMCO.NS', 'ACC.NS', 'AMBUJACEM.NS', 'SHREECEM.NS', 'JKCEMENT.NS']}
    ]
    
    return jsonify({
        'sectors': sector_data,
        'timestamp': datetime.now().isoformat()
    })

@app.route('/api/stocks-analysis/market-summary', methods=['GET'])
def get_market_summary():
    """Get market summary"""
    try:
        # Try to get NIFTY 50 data
        try:
            nifty_data = nse_scraper.scrape_nifty50_data()
        except:
            # Fallback to Yahoo Finance
            ticker = yf.Ticker('^NSEI')
            info = ticker.info
            nifty_data = {
                'ltp': info.get('regularMarketPrice', 0),
                'change': info.get('regularMarketPrice', 0) - info.get('regularMarketPreviousClose', 0),
                'changePercent': ((info.get('regularMarketPrice', 0) - info.get('regularMarketPreviousClose', 0)) / info.get('regularMarketPreviousClose', 1)) * 100,
                'previousClose': info.get('regularMarketPreviousClose', 0)
            }
        
        # Get SENSEX data
        try:
            ticker = yf.Ticker('^BSESN')
            info = ticker.info
            sensex_data = {
                'ltp': info.get('regularMarketPrice', 0),
                'change': info.get('regularMarketPrice', 0) - info.get('regularMarketPreviousClose', 0),
                'changePercent': ((info.get('regularMarketPrice', 0) - info.get('regularMarketPreviousClose', 0)) / info.get('regularMarketPreviousClose', 1)) * 100,
                'previousClose': info.get('regularMarketPreviousClose', 0)
            }
        except:
            sensex_data = None
        
        # Get top gainers and losers
        try:
            market_movers = nse_scraper.scrape_top_gainers_losers()
        except:
            market_movers = None
        
        return jsonify({
            'indices': {
                'nifty': nifty_data,
                'sensex': sensex_data
            },
            'marketMovers': market_movers,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Error fetching market summary: {e}")
        return jsonify({'error': 'Failed to fetch market summary'}), 500

@app.route('/api/stocks-analysis/popular-stocks', methods=['GET'])
def get_popular_stocks():
    """Get popular stocks"""
    try:
        # Popular NSE stocks with market cap
        popular_stocks = [
            {'symbol': 'RELIANCE.NS', 'name': 'Reliance Industries Ltd.', 'marketCap': 1700000},
            {'symbol': 'TCS.NS', 'name': 'Tata Consultancy Services Ltd.', 'marketCap': 1200000},
            {'symbol': 'HDFCBANK.NS', 'name': 'HDFC Bank Ltd.', 'marketCap': 900000},
            {'symbol': 'INFY.NS', 'name': 'Infosys Ltd.', 'marketCap': 600000},
            {'symbol': 'HINDUNILVR.NS', 'name': 'Hindustan Unilever Ltd.', 'marketCap': 550000},
            {'symbol': 'ICICIBANK.NS', 'name': 'ICICI Bank Ltd.', 'marketCap': 450000},
            {'symbol': 'SBIN.NS', 'name': 'State Bank of India', 'marketCap': 400000},
            {'symbol': 'BHARTIARTL.NS', 'name': 'Bharti Airtel Ltd.', 'marketCap': 380000},
            {'symbol': 'KOTAKBANK.NS', 'name': 'Kotak Mahindra Bank Ltd.', 'marketCap': 350000},
            {'symbol': 'LT.NS', 'name': 'Larsen & Toubro Ltd.', 'marketCap': 320000},
            {'symbol': 'AXISBANK.NS', 'name': 'Axis Bank Ltd.', 'marketCap': 280000},
            {'symbol': 'ITC.NS', 'name': 'ITC Ltd.', 'marketCap': 250000},
            {'symbol': 'HCLTECH.NS', 'name': 'HCL Technologies Ltd.', 'marketCap': 220000},
            {'symbol': 'ASIANPAINT.NS', 'name': 'Asian Paints Ltd.', 'marketCap': 200000},
            {'symbol': 'DMART.NS', 'name': 'Avenue Supermarts Ltd.', 'marketCap': 180000},
            {'symbol': 'SUNPHARMA.NS', 'name': 'Sun Pharmaceutical Industries Ltd.', 'marketCap': 170000},
            {'symbol': 'WIPRO.NS', 'name': 'Wipro Ltd.', 'marketCap': 160000},
            {'symbol': 'TATAMOTORS.NS', 'name': 'Tata Motors Ltd.', 'marketCap': 150000},
            {'symbol': 'MARUTI.NS', 'name': 'Maruti Suzuki India Ltd.', 'marketCap': 140000},
            {'symbol': 'ULTRACEMCO.NS', 'name': 'UltraTech Cement Ltd.', 'marketCap': 130000}
        ]
        
        # Fetch current data for popular stocks
        stock_data = []
        for stock in popular_stocks:
            try:
                ticker = yf.Ticker(stock['symbol'])
                info = ticker.info
                
                current_price = info.get('regularMarketPrice', 0)
                prev_close = info.get('regularMarketPreviousClose', 0)
                change_percent = ((current_price - prev_close) / prev_close) * 100 if prev_close > 0 else 0
                
                stock_data.append({
                    **stock,
                    'currentPrice': current_price,
                    'previousClose': prev_close,
                    'changePercent': change_percent
                })
            except Exception as e:
                logger.error(f"Error fetching data for {stock['symbol']}: {e}")
                stock_data.append({
                    **stock,
                    'currentPrice': 0,
                    'previousClose': 0,
                    'changePercent': 0
                })
        
        return jsonify({
            'stocks': stock_data,
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Error fetching popular stocks: {e}")
        return jsonify({'error': 'Failed to fetch popular stocks'}), 500

@app.route('/api/stocks-analysis/market-status', methods=['GET'])
def get_market_status():
    """Get market status"""
    try:
        # Check if market is open (simplified logic)
        now = datetime.now()
        day = now.weekday()  # Monday is 0, Sunday is 6
        hours = now.hour
        minutes = now.minute
        
        # Market is open Monday to Friday, 9:15 AM to 3:30 PM
        is_market_open = (day >= 0 and day <= 4 and 
                         ((hours == 9 and minutes >= 15) or 
                          (hours > 9 and hours < 15) or
                          (hours == 15 and minutes <= 30)))
        
        # Get NIFTY 50 data
        try:
            nifty_data = nse_scraper.scrape_nifty50_data()
        except:
            ticker = yf.Ticker('^NSEI')
            info = ticker.info
            nifty_data = {
                'ltp': info.get('regularMarketPrice', 0),
                'change': info.get('regularMarketPrice', 0) - info.get('regularMarketPreviousClose', 0),
                'changePercent': ((info.get('regularMarketPrice', 0) - info.get('regularMarketPreviousClose', 0)) / info.get('regularMarketPreviousClose', 1)) * 100,
                'previousClose': info.get('regularMarketPreviousClose', 0)
            }
        
        # Get top gainers and losers count
        top_gainers_count = 0
        top_losers_count = 0
        try:
            market_movers = nse_scraper.scrape_top_gainers_losers()
            top_gainers_count = len(market_movers.get('gainers', []))
            top_losers_count = len(market_movers.get('losers', []))
        except:
            logger.warn("Failed to get market movers for status")
        
        # Calculate next market open and close times
        next_open = get_next_market_open(now)
        next_close = get_next_market_close(now)
        
        return jsonify({
            'marketStatus': {
                'isOpen': is_market_open,
                'nextOpen': next_open.isoformat(),
                'nextClose': next_close.isoformat()
            },
            'indices': {
                'nifty': nifty_data
            },
            'marketMovers': {
                'topGainers': top_gainers_count,
                'topLosers': top_losers_count
            },
            'timestamp': datetime.now().isoformat()
        })
    except Exception as e:
        logger.error(f"Error fetching market status: {e}")
        return jsonify({'error': 'Failed to fetch market status'}), 500

def get_next_market_open(now):
    """Get next market open time"""
    next_open = datetime(now.year, now.month, now.day, 9, 15)
    
    # If today is weekend or market is closed for the day
    if now.weekday() >= 5 or (now.hour >= 15 and now.minute >= 30):
        # Move to next day
        next_open += timedelta(days=1)
        
        # If next day is weekend, move to Monday
        while next_open.weekday() >= 5:
            next_open += timedelta(days=1)
    
    return next_open

def get_next_market_close(now):
    """Get next market close time"""
    next_close = datetime(now.year, now.month, now.day, 15, 30)
    
    # If market is already closed for the day
    if now.hour >= 15 and now.minute >= 30:
        # Move to next day
        next_close += timedelta(days=1)
        
        # If next day is weekend, move to Monday
        while next_close.weekday() >= 5:
            next_close += timedelta(days=1)
    
    return next_close

@app.errorhandler(Exception)
def handle_exception(e):
    """Handle all exceptions"""
    logger.error(f"Unhandled error: {e}")
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)