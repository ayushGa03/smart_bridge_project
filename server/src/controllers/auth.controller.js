// src/controllers/auth.controller.js
const User = require('../models/User.model');
const Portfolio = require('../models/Portfolio.model');
const Watchlist = require('../models/Watchlist.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const { generateTokenPair, verifyRefreshToken } = require('../utils/jwt');

// ─────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────
const register = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  const existingUser = await User.findOne({ email });
  if (existingUser) throw new ApiError(409, 'Email already registered.');

  const user = await User.create({ name, email, password });

  // Create portfolio and watchlist for new user
  await Portfolio.create({ user: user._id });
  await Watchlist.create({ user: user._id, stocks: [] });

  const { accessToken, refreshToken } = generateTokenPair(user);

  // Store hashed refresh token
  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  res.status(201).json(
    new ApiResponse(201, { user, accessToken, refreshToken }, 'Account created successfully')
  );
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────
const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email }).select('+password');
  if (!user) throw new ApiError(401, 'Invalid email or password.');

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw new ApiError(401, 'Invalid email or password.');

  if (!user.isActive) throw new ApiError(403, 'Account deactivated. Contact support.');

  const { accessToken, refreshToken } = generateTokenPair(user);

  user.refreshToken = refreshToken;
  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  res.json(
    new ApiResponse(200, { user, accessToken, refreshToken }, 'Login successful')
  );
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/refresh
// ─────────────────────────────────────────────────────────────
const refresh = asyncHandler(async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw new ApiError(401, 'Refresh token required.');

  const decoded = verifyRefreshToken(refreshToken);
  const user = await User.findById(decoded.id).select('+refreshToken');

  if (!user || user.refreshToken !== refreshToken) {
    throw new ApiError(401, 'Invalid refresh token.');
  }

  const { accessToken, refreshToken: newRefreshToken } = generateTokenPair(user);
  user.refreshToken = newRefreshToken;
  await user.save({ validateBeforeSave: false });

  res.json(
    new ApiResponse(200, { accessToken, refreshToken: newRefreshToken }, 'Token refreshed')
  );
});

// ─────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────
const logout = asyncHandler(async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
  res.json(new ApiResponse(200, null, 'Logged out successfully'));
});

// ─────────────────────────────────────────────────────────────
// GET /api/auth/me
// ─────────────────────────────────────────────────────────────
const getMe = asyncHandler(async (req, res) => {
  res.json(new ApiResponse(200, req.user, 'Profile fetched'));
});

// ─────────────────────────────────────────────────────────────
// PUT /api/auth/me
// ─────────────────────────────────────────────────────────────
const updateProfile = asyncHandler(async (req, res) => {
  const allowed = ['name'];
  const updates = {};
  allowed.forEach((field) => {
    if (req.body[field] !== undefined) updates[field] = req.body[field];
  });

  const user = await User.findByIdAndUpdate(req.user._id, updates, {
    new: true,
    runValidators: true,
  });
  res.json(new ApiResponse(200, user, 'Profile updated'));
});

module.exports = { register, login, refresh, logout, getMe, updateProfile };
