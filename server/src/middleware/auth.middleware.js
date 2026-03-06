// src/middleware/auth.middleware.js
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { verifyAccessToken } = require('../utils/jwt');
const User = require('../models/User.model');

/**
 * Protect route: verify JWT and attach user to request
 */
const protect = asyncHandler(async (req, res, next) => {
  let token;

  if (req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    throw new ApiError(401, 'Authentication required. Please log in.');
  }

  const decoded = verifyAccessToken(token);
  const user = await User.findById(decoded.id).select('-password -refreshToken');

  if (!user) {
    throw new ApiError(401, 'User no longer exists.');
  }

  if (!user.isActive) {
    throw new ApiError(403, 'Your account has been deactivated.');
  }

  req.user = user;
  next();
});

/**
 * Admin-only guard — must be used AFTER protect
 */
const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') {
    throw new ApiError(403, 'Access denied. Admins only.');
  }
  next();
};

module.exports = { protect, adminOnly };
