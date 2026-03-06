// src/models/Transaction.model.js
const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    stock: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Stock',
      required: true,
    },
    // Denormalized for query speed — no $lookup needed
    symbol: { type: String, required: true, uppercase: true },
    companyName: { type: String, required: true },
    type: {
      type: String,
      enum: ['BUY', 'SELL'],
      required: true,
    },
    quantity: {
      type: Number,
      required: true,
      min: [1, 'Quantity must be at least 1'],
    },
    pricePerShare: {
      type: Number,
      required: true,
      min: [0.01, 'Price must be positive'],
    },
    totalAmount: {
      type: Number,
      required: true,
    },
    // Snapshot of cash balance AFTER this transaction
    balanceAfter: {
      type: Number,
      required: true,
    },
    // For SELL: realized profit/loss
    realizedPnL: {
      type: Number,
      default: null,
    },
    notes: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true, // createdAt = executedAt
  }
);

// Compound indexes for fast user history queries
transactionSchema.index({ user: 1, createdAt: -1 });
transactionSchema.index({ user: 1, symbol: 1 });
transactionSchema.index({ user: 1, type: 1 });

module.exports = mongoose.model('Transaction', transactionSchema);
