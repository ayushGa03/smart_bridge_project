// src/models/Portfolio.model.js
const mongoose = require('mongoose');

const holdingSchema = new mongoose.Schema(
  {
    stock: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stock',
      required: true,
    },
    symbol: { type: String, required: true, uppercase: true },
    companyName: { type: String, required: true },
    quantity: {
      type: Number,
      required: true,
      min: [0, 'Quantity cannot be negative'],
    },
    avgBuyPrice: {
      type: Number,
      required: true,
      min: [0, 'Average buy price cannot be negative'],
    },
    totalInvested: {
      type: Number,
      required: true,
      min: [0, 'Total invested cannot be negative'],
    },
  },
  { _id: false }
);

const portfolioSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // One portfolio per user
    },
    cashBalance: {
      type: Number,
      default: parseFloat(process.env.INITIAL_BALANCE) || 100000,
      min: [0, 'Cash balance cannot be negative'],
    },
    totalDeposited: {
      type: Number,
      default: parseFloat(process.env.INITIAL_BALANCE) || 100000,
    },
    holdings: [holdingSchema],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: total invested in stocks
portfolioSchema.virtual('totalInvested').get(function () {
  return this.holdings.reduce((sum, h) => sum + h.totalInvested, 0);
});

// Index (user unique is already handled by schema definition above)

module.exports = mongoose.model('Portfolio', portfolioSchema);
