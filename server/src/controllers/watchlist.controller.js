// src/controllers/watchlist.controller.js
const Watchlist = require('../models/Watchlist.model');
const Stock = require('../models/Stock.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// Helper: get or create watchlist for a user
const getOrCreateWatchlist = async (userId) => {
  let watchlist = await Watchlist.findOne({ user: userId });
  if (!watchlist) {
    watchlist = await Watchlist.create({ user: userId, stocks: [] });
  }
  return watchlist;
};

// GET /api/watchlist
const getWatchlist = asyncHandler(async (req, res) => {
  const watchlist = await getOrCreateWatchlist(req.user._id);

  await watchlist.populate('stocks', 'symbol name currentPrice previousClose sector exchange');

  const enriched = watchlist.stocks.map((s) => ({
    _id: s._id,
    symbol: s.symbol,
    name: s.name,
    sector: s.sector,
    exchange: s.exchange,
    currentPrice: s.currentPrice,
    previousClose: s.previousClose,
    change: parseFloat((s.currentPrice - s.previousClose).toFixed(2)),
    changePercent: s.previousClose
      ? parseFloat((((s.currentPrice - s.previousClose) / s.previousClose) * 100).toFixed(2))
      : 0,
  }));

  res.json(new ApiResponse(200, enriched, 'Watchlist fetched'));
});

// POST /api/watchlist/:symbol
const addToWatchlist = asyncHandler(async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();

  const stock = await Stock.findOne({ symbol, isActive: true });
  if (!stock) throw new ApiError(404, `Stock "${symbol}" not found.`);

  const watchlist = await getOrCreateWatchlist(req.user._id);

  // Check if already in watchlist
  const alreadyAdded = watchlist.stocks.some(
    (id) => id.toString() === stock._id.toString()
  );
  if (alreadyAdded) {
    return res.json(new ApiResponse(200, null, `${symbol} is already in your watchlist`));
  }

  watchlist.stocks.push(stock._id);
  await watchlist.save();

  res.json(new ApiResponse(200, null, `${symbol} added to watchlist`));
});

// DELETE /api/watchlist/:symbol
const removeFromWatchlist = asyncHandler(async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();

  const stock = await Stock.findOne({ symbol });
  if (!stock) throw new ApiError(404, `Stock "${symbol}" not found.`);

  await Watchlist.findOneAndUpdate(
    { user: req.user._id },
    { $pull: { stocks: stock._id } }
  );

  res.json(new ApiResponse(200, null, `${symbol} removed from watchlist`));
});

module.exports = { getWatchlist, addToWatchlist, removeFromWatchlist };
