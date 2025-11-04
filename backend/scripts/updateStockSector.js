const mongoose = require('mongoose');
const Stock = require('../models/Stock');
const stockService = require('../services/stockService');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/finsync-2')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Sector mapping for known stocks
const stockSectorMap = {
  'RELIANCE.NS': 'Energy',
  'TCS.NS': 'Information Technology',
  'INFY.NS': 'Information Technology',
  'HDFC.NS': 'Financial Services',
  'ICICIBANK.NS': 'Financial Services',
  'HINDUNILVR.NS': 'Consumer Goods',
  'ITC.NS': 'Consumer Goods',
  'KOTAKBANK.NS': 'Financial Services',
  'SBIN.NS': 'Financial Services',
  'L&T.NS': 'Construction',
  'RELIANCE': 'Energy',
  'TCS': 'Information Technology',
  'INFY': 'Information Technology',
  'HDFC': 'Financial Services',
  'ICICIBANK': 'Financial Services',
  'HINDUNILVR': 'Consumer Goods',
  'ITC': 'Consumer Goods',
  'KOTAKBANK': 'Financial Services',
  'SBIN': 'Financial Services',
  'L&T': 'Construction'
};

// Extended sector mapping for more stocks
const extendedSectorMap = {
  // Indian Stocks
  'WIPRO.NS': 'Information Technology',
  'TECHM.NS': 'Information Technology',
  'HCLTECH.NS': 'Information Technology',
  'BPCL.NS': 'Energy',
  'IOC.NS': 'Energy',
  'ONGC.NS': 'Energy',
  'COALINDIA.NS': 'Energy',
  'NTPC.NS': 'Power',
  'POWERGRID.NS': 'Power',
  'ADANIGREEN.NS': 'Energy',
  'ADANIPORTS.NS': 'Infrastructure',
  'TATAMOTORS.NS': 'Automobile',
  'MARUTI.NS': 'Automobile',
  'BAJAJ-AUTO.NS': 'Automobile',
  'M&M.NS': 'Automobile',
  'ASIANPAINT.NS': 'Paints',
  'NESTLEIND.NS': 'Consumer Goods',
  'BRITANNIA.NS': 'Consumer Goods',
  'DABUR.NS': 'Consumer Goods',
  'ULTRACEMCO.NS': 'Cement',
  'ACC.NS': 'Cement',
  'SHREECEM.NS': 'Cement',
  'TATASTEEL.NS': 'Metals & Mining',
  'JSWSTEEL.NS': 'Metals & Mining',
  'HINDALCO.NS': 'Metals & Mining',
  'VEDL.NS': 'Metals & Mining',
  'SUNPHARMA.NS': 'Pharmaceuticals',
  'DRREDDY.NS': 'Pharmaceuticals',
  'CIPLA.NS': 'Pharmaceuticals',
  'AUROPHARMA.NS': 'Pharmaceuticals',
  'DIVISLAB.NS': 'Pharmaceuticals',
  'BHARTIARTL.NS': 'Telecommunications',
  'JIOFIN.NS': 'Financial Services',
  'INDUSINDBK.NS': 'Financial Services',
  'AXISBANK.NS': 'Financial Services',
  'FEDERALBNK.NS': 'Financial Services',
  'BANDHANBNK.NS': 'Financial Services',
  'PNB.NS': 'Financial Services',
  'BANKBARODA.NS': 'Financial Services',
  'TITAN.NS': 'Consumer Durables',
  'PAGEIND.NS': 'Textiles',
  'UPL.NS': 'Agrochemicals',
  'GAIL.NS': 'Gas',
  'SIEMENS.NS': 'Industrial Equipment',
  'LT.NS': 'Construction',
  'DLF.NS': 'Real Estate',
  'MUTHOOTFIN.NS': 'Financial Services',
  'BAJFINANCE.NS': 'Financial Services',
  'CHOLAFIN.NS': 'Financial Services',
  'TATACONSUM.NS': 'Consumer Goods',
  'GODREJCP.NS': 'Consumer Goods',
  'HAVELLS.NS': 'Electrical Equipment',
  'BERGEPAINT.NS': 'Paints',
  'PEL.NS': 'Consumer Electronics',
  'DMART.NS': 'Retail',
  'ADANITRANS.NS': 'Logistics',
  'TATACOMM.NS': 'Telecommunications',
  
  // US Stocks
  'AAPL': 'Technology',
  'MSFT': 'Technology',
  'GOOGL': 'Technology',
  'AMZN': 'Consumer Discretionary',
  'META': 'Technology',
  'TSLA': 'Consumer Discretionary',
  'NVDA': 'Technology',
  'JPM': 'Financial Services',
  'JNJ': 'Healthcare',
  'V': 'Financial Services',
  'PG': 'Consumer Staples',
  'UNH': 'Healthcare',
  'HD': 'Consumer Discretionary',
  'BAC': 'Financial Services',
  'XOM': 'Energy',
  'PFE': 'Healthcare',
  'CSCO': 'Technology',
  'ADBE': 'Technology',
  'CRM': 'Technology',
  'NFLX': 'Communication Services',
  'ACN': 'Information Technology',
  'ORCL': 'Information Technology',
  'WMT': 'Consumer Staples',
  'IBM': 'Information Technology',
  'INTC': 'Technology',
  'MDT': 'Healthcare',
  'LIN': 'Industrial',
  'TXN': 'Technology',
  'PLD': 'Real Estate',
  'ABT': 'Healthcare',
  'COST': 'Consumer Staples',
  'CVX': 'Energy',
  'COP': 'Energy',
  'HD': 'Consumer Discretionary',
  'MA': 'Financial Services',
  'UNP': 'Industrial',
  'UPS': 'Industrial',
  'LMT': 'Aerospace & Defense',
  'HON': 'Industrial',
  'T': 'Communication Services',
  'MO': 'Consumer Staples',
  'ABBV': 'Healthcare',
  'AVGO': 'Technology',
  'LLY': 'Healthcare',
  'DHR': 'Healthcare',
  'CMCSA': 'Communication Services',
  'WFC': 'Financial Services',
  'PM': 'Consumer Staples',
  'CAT': 'Industrial',
  'DE': 'Industrial',
  'VZ': 'Communication Services',
  'KO': 'Consumer Staples',
  'DIS': 'Communication Services',
  'MRK': 'Healthcare',
  'MMM': 'Industrial',
  'NEE': 'Utilities',
  'GE': 'Industrial',
  'RTX': 'Aerospace & Defense',
  'MS': 'Technology',
  'AMD': 'Technology',
  'SAP': 'Technology',
  'NOW': 'Technology',
  'QCOM': 'Technology',
  'BMY': 'Healthcare',
  'AMGN': 'Healthcare',
  'HCA': 'Healthcare',
  'ISRG': 'Healthcare',
  'GD': 'Aerospace & Defense',
  'LOW': 'Consumer Discretionary',
  'TGT': 'Consumer Discretionary',
  'CVS': 'Healthcare',
  'AMAT': 'Technology',
  'C': 'Financial Services',
  'F': 'Consumer Discretionary',
  'GILD': 'Healthcare',
  'BLK': 'Financial Services',
  'BA': 'Aerospace & Defense',
  'GS': 'Financial Services',
  'MDLZ': 'Consumer Staples',
  'PYPL': 'Technology',
  'ADP': 'Technology',
  'UBER': 'Technology',
  'INTU': 'Technology',
  'VRTX': 'Healthcare',
  'REGN': 'Healthcare',
  'CI': 'Financial Services',
  'CB': 'Financial Services',
  'SLB': 'Energy',
  'PLTR': 'Technology',
  'EOG': 'Energy',
  'NOC': 'Aerospace & Defense',
  'DUK': 'Utilities',
  'SO': 'Utilities',
  'PANW': 'Technology',
  'KLAC': 'Technology',
  'ADI': 'Technology',
  'ETN': 'Industrial',
  'CDNS': 'Technology',
  'SNPS': 'Technology',
  'CME': 'Financial Services',
  'MPC': 'Energy',
  'MAR': 'Consumer Discretionary',
  'HUM': 'Healthcare',
  'ORLY': 'Consumer Discretionary',
  'AJG': 'Financial Services',
  'ROP': 'Industrial',
  'BKNG': 'Consumer Discretionary',
  'ZTS': 'Healthcare',
  'TMUS': 'Communication Services',
  'SPG': 'Real Estate',
  'EQIX': 'Real Estate',
  'DGX': 'Healthcare',
  'CEG': 'Utilities',
  'AON': 'Financial Services',
  'WM': 'Industrial',
  'PGR': 'Financial Services',
  'COP': 'Energy',
  'APH': 'Technology',
  'TEL': 'Industrial',
  'EMR': 'Healthcare',
  'FDX': 'Industrial',
  'AZO': 'Retail',
  'PCAR': 'Industrial',
  'MCO': 'Financial Services',
  'ITW': 'Industrial',
  'DECK': 'Consumer Discretionary',
  'CTAS': 'Industrial',
  'CTSH': 'Technology',
  'CL': 'Consumer Staples',
  'NEM': 'Materials',
  'DHI': 'Consumer Discretionary',
  'KR': 'Consumer Staples',
  'FCX': 'Materials',
  'USB': 'Financial Services',
  'KMB': 'Consumer Staples',
  'TT': 'Industrial',
  'HES': 'Energy',
  'BIIB': 'Healthcare',
  'FIS': 'Technology',
  'ELV': 'Healthcare',
  'ANET': 'Technology',
  'MSCI': 'Financial Services',
  'GWW': 'Industrial',
  'ECL': 'Materials',
  'RSG': 'Industrial',
  'O': 'Energy',
  'XYL': 'Industrial',
  'CDW': 'Technology',
  'WMB': 'Energy',
  'DFS': 'Financial Services',
  'IR': 'Industrial',
  'VLO': 'Energy',
  'STZ': 'Consumer Staples',
  'WTW': 'Technology',
  'IDXX': 'Healthcare',
  'CNC': 'Healthcare',
  'A': 'Healthcare',
  'EW': 'Healthcare',
  'WAT': 'Healthcare',
  'CMG': 'Consumer Discretionary',
  'DAL': 'Consumer Discretionary',
  'WEC': 'Utilities',
  'EXC': 'Utilities',
  'HIG': 'Financial Services',
  'AIG': 'Financial Services',
  'TRV': 'Financial Services',
  'LRCX': 'Technology',
  'TDG': 'Industrial',
  'OTIS': 'Industrial',
  'DD': 'Materials',
  'NDAQ': 'Financial Services',
  'CSX': 'Industrial',
  'AEP': 'Utilities',
  'SYY': 'Consumer Staples',
  'ROK': 'Industrial',
  'PCG': 'Utilities',
  'MCK': 'Healthcare',
  'IFF': 'Materials',
  'HSY': 'Consumer Staples',
  'GIS': 'Consumer Staples',
  'OKE': 'Energy',
  'DVN': 'Energy',
  'KMI': 'Energy',
  'MPC': 'Energy',
  'PSX': 'Energy',
  'VRSK': 'Financial Services',
  'ALL': 'Financial Services',
  'PRU': 'Financial Services',
  'MET': 'Financial Services',
  'LNC': 'Financial Services',
  'PFG': 'Financial Services',
  'TROW': 'Financial Services',
  'IVZ': 'Financial Services',
  'BEN': 'Financial Services',
  'AMT': 'Real Estate',
  'EQIX': 'Real Estate',
  'PLD': 'Real Estate',
  'PSA': 'Real Estate',
  'CCI': 'Real Estate',
  'DLR': 'Real Estate',
  'WELL': 'Real Estate',
  'SPG': 'Real Estate',
  'VICI': 'Real Estate',
  'EXR': 'Real Estate',
  'PRO': 'Real Estate',
  'ESS': 'Utilities',
  'SRE': 'Real Estate',
  'KIM': 'Real Estate',
  'AVB': 'Real Estate',
  'EQR': 'Real Estate',
  'MAA': 'Real Estate',
  'UDR': 'Real Estate',
  'BXP': 'Real Estate',
  'VTR': 'Real Estate',
  'FRT': 'Real Estate',
  'CPT': 'Real Estate',
  'HST': 'Real Estate',
  'ARE': 'Real Estate',
  'O': 'Real Estate',
  'EQIX': 'Real Estate',
  'DLR': 'Real Estate',
  'PLD': 'Real Estate',
  'PSA': 'Real Estate',
  'CCI': 'Real Estate',
  'WELL': 'Real Estate',
  'SPG': 'Real Estate',
  'VICI': 'Real Estate',
  'EXR': 'Real Estate',
  'PRO': 'Real Estate'
};

// Merge the two mappings
const fullSectorMap = { ...stockSectorMap, ...extendedSectorMap };

// Update all stocks with proper sectors
async function updateStockSectors() {
  try {
    console.log('Starting to update stock sectors...');
    
    // Get all stocks
    const stocks = await Stock.find({});
    console.log(`Found ${stocks.length} stocks to update`);
    
    let updateCount = 0;
    let unknownCount = 0;
    
    for (const stock of stocks) {
      let updated = false;
      
      // Check if we have a mapping for this stock
      if (fullSectorMap[stock.symbol]) {
        stock.sector = fullSectorMap[stock.symbol];
        await stock.save();
        console.log(`Updated ${stock.symbol} sector to ${stock.sector} (from mapping)`);
        updateCount++;
        updated = true;
      } else if (!stock.sector || stock.sector === 'Unknown') {
        // Try to get sector from external service
        try {
          const externalStock = await stockService.getStockDetails(stock.symbol);
          if (externalStock.sector && externalStock.sector !== 'Unknown') {
            stock.sector = externalStock.sector;
            await stock.save();
            console.log(`Updated ${stock.symbol} sector to ${stock.sector} (from external service)`);
            updateCount++;
            updated = true;
          }
        } catch (error) {
          console.error(`Error getting sector for ${stock.symbol}:`, error);
        }
      }
      
      // If still unknown, try to infer from symbol
      if (!updated && (!stock.sector || stock.sector === 'Unknown')) {
        // Try to infer sector from symbol patterns
        const symbolUpper = stock.symbol.toUpperCase();
        
        // Bank patterns
        if (symbolUpper.includes('BANK') || 
            symbolUpper.includes('FIN') || 
            symbolUpper === 'AXISBANK' || 
            symbolUpper === 'KOTAKBANK' || 
            symbolUpper === 'ICICIBANK' || 
            symbolUpper === 'HDFCBANK' || 
            symbolUpper === 'SBIN' || 
            symbolUpper === 'INDUSINDBK' || 
            symbolUpper === 'FEDERALBNK' || 
            symbolUpper === 'BANDHANBNK' || 
            symbolUpper === 'PNB' || 
            symbolUpper === 'BANKBARODA') {
          stock.sector = 'Financial Services';
          await stock.save();
          console.log(`Updated ${stock.symbol} sector to ${stock.sector} (inferred from symbol)`);
          updateCount++;
          updated = true;
        }
        
        // Pharma patterns
        else if (symbolUpper.includes('PHARMA') || 
                 symbolUpper.includes('LAB') || 
                 symbolUpper === 'SUNPHARMA' || 
                 symbolUpper === 'DRREDDY' || 
                 symbolUpper === 'CIPLA' || 
                 symbolUpper === 'AUROPHARMA' || 
                 symbolUpper === 'DIVISLAB' || 
                 symbolUpper === 'LUPIN' || 
                 symbolUpper === 'CADILAHC' || 
                 symbolUpper === 'BIOCON' || 
                 symbolUpper === 'GLENMARK') {
          stock.sector = 'Pharmaceuticals';
          await stock.save();
          console.log(`Updated ${stock.symbol} sector to ${stock.sector} (inferred from symbol)`);
          updateCount++;
          updated = true;
        }
        
        // IT patterns
        else if (symbolUpper.includes('TECH') || 
                 symbolUpper.includes('INFOSYS') || 
                 symbolUpper.includes('TCS') || 
                 symbolUpper.includes('WIPRO') || 
                 symbolUpper.includes('HCLTECH') || 
                 symbolUpper.includes('TECHM') || 
                 symbolUpper.includes('MINDTREE') || 
                 symbolUpper.includes('COFORGE')) {
          stock.sector = 'Information Technology';
          await stock.save();
          console.log(`Updated ${stock.symbol} sector to ${stock.sector} (inferred from symbol)`);
          updateCount++;
          updated = true;
        }
        
        // If still unknown, count it
        if (!updated) {
          unknownCount++;
          console.log(`Could not determine sector for ${stock.symbol}`);
        }
      }
    }
    
    console.log(`Updated sectors for ${updateCount} stocks`);
    console.log(`Could not determine sectors for ${unknownCount} stocks`);
    console.log('Stock sector update completed');
    
    // Close the connection
    mongoose.connection.close();
  } catch (error) {
    console.error('Error updating stock sectors:', error);
    mongoose.connection.close();
  }
}

// Run the update
updateStockSectors();