// src/models/Watchlist.model.js
const mongoose = require('mongoose');

const watchlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true, // One watchlist per user
    },
    stocks: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Stock',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index (user unique is already handled by schema definition above)

module.exports = mongoose.model('Watchlist', watchlistSchema);
