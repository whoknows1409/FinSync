"""Alpha Vantage API service for Python"""
import requests
import os
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

ALPHA_VANTAGE_BASE_URL = 'https://www.alphavantage.co/query'

class AlphaVantageService:
    def __init__(self):
        self.api_key = os.getenv('ALPHA_VANTAGE_API_KEY')
        if not self.api_key:
            logger.warning('ALPHA_VANTAGE_API_KEY not set in environment variables')
    
    def _clean_symbol(self, symbol: str) -> str:
        """Remove .NS or .BSE suffix from symbol"""
        return symbol.replace('.NS', '').replace('.BSE', '')
    
    def get_quote(self, symbol: str) -> Dict[str, Any]:
        """Get real-time quote for a symbol"""
        try:
            clean_symbol = self._clean_symbol(symbol)
            
            response = requests.get(ALPHA_VANTAGE_BASE_URL, params={
                'function': 'GLOBAL_QUOTE',
                'symbol': clean_symbol,
                'apikey': self.api_key
            })
            
            response.raise_for_status()
            data = response.json()
            
            quote = data.get('Global Quote', {})
            
            if not quote:
                raise ValueError(f"No data found for symbol: {clean_symbol}")
            
            return {
                'symbol': clean_symbol,
                'regularMarketPrice': float(quote.get('05. price', 0)),
                'regularMarketPreviousClose': float(quote.get('08. previous close', 0)),
                'regularMarketVolume': int(quote.get('06. volume', 0)),
                'regularMarketChange': float(quote.get('09. change', 0)),
                'regularMarketChangePercent': float(quote.get('10. change percent', '0').replace('%', '')),
                'regularMarketOpen': float(quote.get('02. open', 0)),
                'regularMarketDayHigh': float(quote.get('03. high', 0)),
                'regularMarketDayLow': float(quote.get('04. low', 0)),
                'longName': clean_symbol,
                'shortName': clean_symbol
            }
        except Exception as e:
            logger.error(f"Error fetching quote for {symbol}: {e}")
            raise
    
    def get_company_overview(self, symbol: str) -> Dict[str, Any]:
        """Get company overview including fundamentals"""
        try:
            clean_symbol = self._clean_symbol(symbol)
            
            response = requests.get(ALPHA_VANTAGE_BASE_URL, params={
                'function': 'OVERVIEW',
                'symbol': clean_symbol,
                'apikey': self.api_key
            })
            
            response.raise_for_status()
            data = response.json()
            
            # Check if we got rate limited or no data
            if not data or 'Note' in data or not data.get('Symbol'):
                return {
                    'Symbol': clean_symbol,
                    'Name': clean_symbol,
                    'MarketCapitalization': '0',
                    'PERatio': None,
                    'DividendYield': None,
                    '52WeekHigh': None,
                    '52WeekLow': None,
                    'Beta': None,
                    'Sector': 'Unknown',
                    'Industry': 'Unknown'
                }
            
            return data
        except Exception as e:
            logger.error(f"Error fetching company overview for {symbol}: {e}")
            return {
                'Symbol': self._clean_symbol(symbol),
                'Name': self._clean_symbol(symbol),
                'MarketCapitalization': '0',
                'PERatio': None,
                'DividendYield': None,
                '52WeekHigh': None,
                '52WeekLow': None,
                'Beta': None,
                'Sector': 'Unknown',
                'Industry': 'Unknown'
            }
    
    def get_detailed_quote(self, symbol: str) -> Dict[str, Any]:
        """Get comprehensive stock data combining quote and overview"""
        try:
            quote = self.get_quote(symbol)
            overview = self.get_company_overview(symbol)
            
            # Merge the data
            return {
                'symbol': quote['symbol'],
                'longName': overview.get('Name', quote['symbol']),
                'shortName': overview.get('Name', quote['symbol']),
                'regularMarketPrice': quote['regularMarketPrice'],
                'regularMarketPreviousClose': quote['regularMarketPreviousClose'],
                'regularMarketVolume': quote['regularMarketVolume'],
                'marketCap': int(float(overview.get('MarketCapitalization', 0))),
                'trailingPE': float(overview['PERatio']) if overview.get('PERatio') else None,
                'dividendYield': float(overview['DividendYield']) if overview.get('DividendYield') else None,
                'fiftyTwoWeekHigh': float(overview['52WeekHigh']) if overview.get('52WeekHigh') else None,
                'fiftyTwoWeekLow': float(overview['52WeekLow']) if overview.get('52WeekLow') else None,
                'beta': float(overview['Beta']) if overview.get('Beta') else None,
                'sector': overview.get('Sector', 'Unknown'),
                'industry': overview.get('Industry', 'Unknown')
            }
        except Exception as e:
            logger.error(f"Error fetching detailed quote for {symbol}: {e}")
            raise
    
    def get_historical_data(self, symbol: str, outputsize: str = 'compact') -> List[Dict[str, Any]]:
        """Get historical daily data"""
        try:
            clean_symbol = self._clean_symbol(symbol)
            
            response = requests.get(ALPHA_VANTAGE_BASE_URL, params={
                'function': 'TIME_SERIES_DAILY',
                'symbol': clean_symbol,
                'outputsize': outputsize,  # 'compact' (100 days) or 'full' (20+ years)
                'apikey': self.api_key
            })
            
            response.raise_for_status()
            data = response.json()
            
            time_series = data.get('Time Series (Daily)', {})
            
            if not time_series:
                raise ValueError(f"No historical data found for symbol: {clean_symbol}")
            
            # Convert to list format
            historical_data = []
            for date_str, values in time_series.items():
                historical_data.append({
                    'date': date_str,
                    'open': float(values['1. open']),
                    'high': float(values['2. high']),
                    'low': float(values['3. low']),
                    'close': float(values['4. close']),
                    'volume': int(values['5. volume'])
                })
            
            # Sort by date ascending
            historical_data.sort(key=lambda x: x['date'])
            
            return historical_data
        except Exception as e:
            logger.error(f"Error fetching historical data for {symbol}: {e}")
            raise
    
    def get_intraday_data(self, symbol: str, interval: str = '5min') -> List[Dict[str, Any]]:
        """Get intraday data"""
        try:
            clean_symbol = self._clean_symbol(symbol)
            
            response = requests.get(ALPHA_VANTAGE_BASE_URL, params={
                'function': 'TIME_SERIES_INTRADAY',
                'symbol': clean_symbol,
                'interval': interval,
                'apikey': self.api_key
            })
            
            response.raise_for_status()
            data = response.json()
            
            time_series = data.get(f'Time Series ({interval})', {})
            
            if not time_series:
                raise ValueError(f"No intraday data found for symbol: {clean_symbol}")
            
            intraday_data = []
            for datetime_str, values in time_series.items():
                intraday_data.append({
                    'datetime': datetime_str,
                    'open': float(values['1. open']),
                    'high': float(values['2. high']),
                    'low': float(values['3. low']),
                    'close': float(values['4. close']),
                    'volume': int(values['5. volume'])
                })
            
            return intraday_data
        except Exception as e:
            logger.error(f"Error fetching intraday data for {symbol}: {e}")
            raise

# Create singleton instance
alpha_vantage_service = AlphaVantageService()
