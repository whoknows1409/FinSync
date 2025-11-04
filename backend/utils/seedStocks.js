const mongoose = require('mongoose');
const Stock = require('../models/Stock');
const dotenv = require('dotenv');

// Load environment variables
 dotenv.config({ path: './config.env' });

// Sample stock data
const stocks = [
  {
    symbol: 'AAPL',
    name: 'Apple Inc.',
    sector: 'Technology',
    currentPrice: 180.23,
    previousClose: 178.94,
    volume: 55423000,
    marketCap: 2856000000000
  },
  {
    symbol: 'MSFT',
    name: 'Microsoft Corporation',
    sector: 'Technology',
    currentPrice: 410.55,
    previousClose: 408.32,
    volume: 24651000,
    marketCap: 3230000000000
  },
  {
    symbol: 'GOOGL',
    name: 'Alphabet Inc.',
    sector: 'Technology',
    currentPrice: 176.34,
    previousClose: 175.89,
    volume: 12458000,
    marketCap: 1810000000000
  },
  {
    symbol: 'AMZN',
    name: 'Amazon.com Inc.',
    sector: 'Consumer Cyclical',
    currentPrice: 178.23,
    previousClose: 176.45,
    volume: 32456000,
    marketCap: 1840000000000
  },
  {
    symbol: 'META',
    name: 'Meta Platforms Inc.',
    sector: 'Technology',
    currentPrice: 480.76,
    previousClose: 478.32,
    volume: 18923000,
    marketCap: 865000000000
  },
  {
    symbol: 'TSLA',
    name: 'Tesla Inc.',
    sector: 'Automotive',
    currentPrice: 245.89,
    previousClose: 243.67,
    volume: 98765000,
    marketCap: 780000000000
  },
  {
    symbol: 'JPM',
    name: 'JPMorgan Chase & Co.',
    sector: 'Financial Services',
    currentPrice: 165.34,
    previousClose: 164.89,
    volume: 12458000,
    marketCap: 425000000000
  },
  {
    symbol: 'JNJ',
    name: 'Johnson & Johnson',
    sector: 'Healthcare',
    currentPrice: 148.76,
    previousClose: 148.23,
    volume: 8956000,
    marketCap: 410000000000
  },
  {
    symbol: 'PG',
    name: 'Procter & Gamble Co.',
    sector: 'Consumer Defensive',
    currentPrice: 162.45,
    previousClose: 161.98,
    volume: 7896000,
    marketCap: 365000000000
  },
  {
    symbol: 'DIS',
    name: 'Walt Disney Co.',
    sector: 'Media',
    currentPrice: 98.23,
    previousClose: 97.89,
    volume: 15689000,
    marketCap: 160000000000
  }
];

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DATABASE_URI || 'mongodb://localhost:27017/finsync', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB Connected...');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

// Seed stocks
const seedStocks = async () => {
  try {
    await connectDB();
    
    // Delete existing stocks
    await Stock.deleteMany({});
    console.log('Existing stocks deleted');
    
    // Insert new stocks
    await Stock.insertMany(stocks);
    console.log('Stocks seeded successfully');
    
    // Close the connection
    mongoose.connection.close();
  } catch (err) {
    console.error('Error seeding stocks:', err);
    process.exit(1);
  }
};

seedStocks();