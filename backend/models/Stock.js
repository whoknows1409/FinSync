// backend/models/Stock.js
const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
  symbol: {
    type: String,
    required: true,
    uppercase: true,
    trim: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  sector: {
    type: String,
    required: true,
    trim: true,
  },
  industry: {
    type: String,
    trim: true,
  },
  interval: {
    type: String,
    trim: true,
    default: '1d',
  },
  currentPrice: {
    type: Number,
    required: true,
    min: [0, 'Price cannot be negative'],
  },
  previousClose: {
    type: Number,
    min: [0, 'Previous close cannot be negative'],
  },
  change: {
    type: Number,
    default: 0,
  },
  changePercent: {
    type: Number,
    default: 0,
  },
  volume: {
    type: Number,
    default: 0,
    min: [0, 'Volume cannot be negative'],
  },
  marketCap: {
    type: Number,
    min: [0, 'Market cap cannot be negative'],
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, {
  timestamps: true,
});

// Indexes for better query performance
stockSchema.index({ symbol: 1 });
stockSchema.index({ sector: 1 });
stockSchema.index({ marketCap: -1 });
stockSchema.index({ changePercent: -1 });
stockSchema.index({ volume: -1 });

// Virtual for price change color
stockSchema.virtual('changeColor').get(function() {
  return this.change >= 0 ? 'green' : 'red';
});

// Virtual for market cap category
stockSchema.virtual('marketCapCategory').get(function() {
  if (!this.marketCap) return 'Unknown';
  if (this.marketCap >= 20000) return 'Large Cap';
  if (this.marketCap >= 5000) return 'Mid Cap';
  return 'Small Cap';
});

// Method to update price
stockSchema.methods.updatePrice = function(newPrice) {
  this.previousClose = this.currentPrice;
  this.currentPrice = newPrice;
  this.change = newPrice - this.previousClose;
  this.changePercent = this.previousClose !== 0 ? (this.change / this.previousClose) * 100 : 0;
  this.lastUpdated = new Date();
  return this.save();
};

// Static method to get top gainers
stockSchema.statics.getTopGainers = function(limit = 10) {
  return this.find({
    isActive: true,
    changePercent: { $gt: 0 },
  })
    .sort({ changePercent: -1 })
    .limit(limit);
};

// Static method to get top losers
stockSchema.statics.getTopLosers = function(limit = 10) {
  return this.find({
    isActive: true,
    changePercent: { $lt: 0 },
  })
    .sort({ changePercent: 1 })
    .limit(limit);
};

// Static method to get stocks by sector
stockSchema.statics.getBySector = function(sector) {
  return this.find({
    sector: sector,
    isActive: true,
  }).sort({ marketCap: -1 });
};

// Static method to get all sectors
stockSchema.statics.getAllSectors = function() {
  return this.distinct('sector', { isActive: true }).sort();
};

// Static method to search stocks
stockSchema.statics.search = function(query, limit = 20) {
  const regex = new RegExp(query, 'i');
  return this.find({
    $or: [
      { symbol: regex },
      { name: regex },
      { sector: regex },
    ],
    isActive: true,
  })
    .sort({ marketCap: -1 })
    .limit(limit);
};

// Static method to get market summary
stockSchema.statics.getMarketSummary = function() {
  return this.aggregate([
    {
      $match: { isActive: true },
    },
    {
      $group: {
        _id: null,
        totalStocks: { $sum: 1 },
        totalMarketCap: { $sum: '$marketCap' },
        avgChangePercent: { $avg: '$changePercent' },
        gainers: {
          $sum: { $cond: [{ $gt: ['$changePercent', 0] }, 1, 0] },
        },
        losers: {
          $sum: { $cond: [{ $lt: ['$changePercent', 0] }, 1, 0] },
        },
        unchanged: {
          $sum: { $cond: [{ $eq: ['$changePercent', 0] }, 1, 0] },
        },
      },
    },
  ]);
};

// Static method to get sector performance
stockSchema.statics.getSectorPerformance = function() {
  return this.aggregate([
    {
      $match: { isActive: true },
    },
    {
      $group: {
        _id: '$sector',
        stockCount: { $sum: 1 },
        avgChangePercent: { $avg: '$changePercent' },
        totalMarketCap: { $sum: '$marketCap' },
        gainers: {
          $sum: { $cond: [{ $gt: ['$changePercent', 0] }, 1, 0] },
        },
        losers: {
          $sum: { $cond: [{ $lt: ['$changePercent', 0] }, 1, 0] },
        },
      },
    },
    {
      $addFields: {
        performance: {
          $cond: [
            { $gt: ['$avgChangePercent', 0] },
            'bullish',
            { $cond: [{ $lt: ['$avgChangePercent', 0] }, 'bearish', 'neutral'] },
          ],
        },
      },
    },
    {
      $sort: { avgChangePercent: -1 },
    },
  ]);
};

module.exports = mongoose.model('Stock', stockSchema);