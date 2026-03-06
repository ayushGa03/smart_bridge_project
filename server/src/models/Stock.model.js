// src/models/Stock.model.js
const mongoose = require('mongoose');

const pricePointSchema = new mongoose.Schema(
  {
    date: { type: Date, required: true },
    open: { type: Number, required: true },
    high: { type: Number, required: true },
    low: { type: Number, required: true },
    close: { type: Number, required: true },
    volume: { type: Number, default: 0 },
  },
  { _id: false }
);

const stockSchema = new mongoose.Schema(
  {
    symbol: {
      type: String,
      required: [true, 'Stock symbol is required'],
      unique: true,
      uppercase: true,
      trim: true,
      maxlength: [10, 'Symbol cannot exceed 10 characters'],
    },
    name: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
    },
    exchange: {
      type: String,
      enum: ['NYSE', 'NASDAQ', 'AMEX', 'OTC'],
      default: 'NASDAQ',
    },
    sector: {
      type: String,
      enum: [
        'Technology', 'Finance', 'Healthcare', 'Energy',
        'Consumer', 'Industrial', 'Materials', 'Utilities',
        'Real Estate', 'Communication', 'Other',
      ],
      default: 'Other',
    },
    currentPrice: {
      type: Number,
      required: [true, 'Current price is required'],
      min: [0.01, 'Price must be positive'],
    },
    previousClose: {
      type: Number,
      default: 0,
    },
    openPrice: { type: Number, default: 0 },
    dayHigh: { type: Number, default: 0 },
    dayLow: { type: Number, default: 0 },
    volume: { type: Number, default: 0 },
    marketCap: { type: Number, default: 0 },
    peRatio: { type: Number, default: 0 },
    dividendYield: { type: Number, default: 0 },
    description: { type: String, default: '' },
    logoUrl: { type: String, default: '' },
    // Embedded price history (last 90 days)
    priceHistory: [pricePointSchema],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: price change
stockSchema.virtual('change').get(function () {
  if (!this.previousClose || this.previousClose === 0) return 0;
  return parseFloat((this.currentPrice - this.previousClose).toFixed(2));
});

// Virtual: percent change
stockSchema.virtual('changePercent').get(function () {
  if (!this.previousClose || this.previousClose === 0) return 0;
  return parseFloat((((this.currentPrice - this.previousClose) / this.previousClose) * 100).toFixed(2));
});

// Indexes (symbol unique is already handled by schema definition above)
stockSchema.index({ sector: 1 });
stockSchema.index({ name: 'text', symbol: 'text' });
stockSchema.index({ isActive: 1 });

module.exports = mongoose.model('Stock', stockSchema);
