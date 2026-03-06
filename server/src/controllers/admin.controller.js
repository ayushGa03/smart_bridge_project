// src/controllers/admin.controller.js
const Stock = require('../models/Stock.model');
const User = require('../models/User.model');
const Portfolio = require('../models/Portfolio.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// ─── Stocks ───────────────────────────────────────────────────

// POST /api/admin/stocks
const createStock = asyncHandler(async (req, res) => {
  const stock = await Stock.create(req.body);
  res.status(201).json(new ApiResponse(201, stock, 'Stock created'));
});

// PUT /api/admin/stocks/:id
const updateStock = asyncHandler(async (req, res) => {
  const stock = await Stock.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!stock) throw new ApiError(404, 'Stock not found.');
  res.json(new ApiResponse(200, stock, 'Stock updated'));
});

// DELETE /api/admin/stocks/:id  (soft delete)
const deleteStock = asyncHandler(async (req, res) => {
  const stock = await Stock.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );
  if (!stock) throw new ApiError(404, 'Stock not found.');
  res.json(new ApiResponse(200, null, `${stock.symbol} deactivated`));
});

// POST /api/admin/stocks/:id/price-history — Add OHLCV data point
const addPriceHistory = asyncHandler(async (req, res) => {
  const { date, open, high, low, close, volume } = req.body;
  const stock = await Stock.findByIdAndUpdate(
    req.params.id,
    { $push: { priceHistory: { date, open, high, low, close, volume } } },
    { new: true }
  );
  if (!stock) throw new ApiError(404, 'Stock not found.');
  res.json(new ApiResponse(200, stock, 'Price history added'));
});

// ─── Users ───────────────────────────────────────────────────

// GET /api/admin/users
const getAllUsers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, search } = req.query;
  const query = {};
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
    ];
  }
  const skip = (parseInt(page) - 1) * parseInt(limit);
  const [users, total] = await Promise.all([
    User.find(query).sort({ createdAt: -1 }).skip(skip).limit(parseInt(limit)),
    User.countDocuments(query),
  ]);
  res.json(new ApiResponse(200, { users, total }, 'Users fetched'));
});

// PUT /api/admin/users/:id/toggle-active
const toggleUserActive = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found.');
  if (user._id.toString() === req.user._id.toString()) {
    throw new ApiError(400, 'Cannot deactivate your own account.');
  }
  user.isActive = !user.isActive;
  await user.save({ validateBeforeSave: false });
  res.json(new ApiResponse(200, user, `User ${user.isActive ? 'activated' : 'deactivated'}`));
});

// GET /api/admin/stats
const getAdminStats = asyncHandler(async (req, res) => {
  const [totalUsers, totalStocks, totalPortfolios] = await Promise.all([
    User.countDocuments({ role: 'user' }),
    Stock.countDocuments({ isActive: true }),
    Portfolio.countDocuments(),
  ]);

  const recentUsers = await User.find({ role: 'user' })
    .sort({ createdAt: -1 })
    .limit(5)
    .select('name email createdAt isActive');

  res.json(
    new ApiResponse(200, { totalUsers, totalStocks, totalPortfolios, recentUsers }, 'Stats fetched')
  );
});

module.exports = {
  createStock,
  updateStock,
  deleteStock,
  addPriceHistory,
  getAllUsers,
  toggleUserActive,
  getAdminStats,
};
