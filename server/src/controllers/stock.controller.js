// src/controllers/stock.controller.js
const Stock = require('../models/Stock.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// ─────────────────────────────────────────────────────────────
// GET /api/stocks  — List with search, filter, pagination
// ─────────────────────────────────────────────────────────────
const getAllStocks = asyncHandler(async (req, res) => {
  const {
    search,
    sector,
    exchange,
    sortBy = 'symbol',
    order = 'asc',
    page = 1,
    limit = 20,
  } = req.query;

  const query = { isActive: true };

  if (search) {
    query.$or = [
      { symbol: { $regex: search, $options: 'i' } },
      { name: { $regex: search, $options: 'i' } },
    ];
  }
  if (sector) query.sector = sector;
  if (exchange) query.exchange = exchange;

  const allowedSort = ['symbol', 'name', 'currentPrice', 'changePercent', 'volume', 'marketCap'];
  const sortField = allowedSort.includes(sortBy) ? sortBy : 'symbol';
  const sortOrder = order === 'desc' ? -1 : 1;

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const limitNum = Math.min(parseInt(limit), 100);

  const [stocks, total] = await Promise.all([
    Stock.find(query)
      .select('-priceHistory -__v')
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limitNum)
      .lean({ virtuals: true }),
    Stock.countDocuments(query),
  ]);

  res.json(
    new ApiResponse(200, {
      stocks,
      pagination: {
        total,
        page: parseInt(page),
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    }, 'Stocks fetched')
  );
});

// ─────────────────────────────────────────────────────────────
// GET /api/stocks/:symbol  — Detail with price history
// ─────────────────────────────────────────────────────────────
const getStockBySymbol = asyncHandler(async (req, res) => {
  const stock = await Stock.findOne({
    symbol: req.params.symbol.toUpperCase(),
    isActive: true,
  }).lean({ virtuals: true });

  if (!stock) throw new ApiError(404, `Stock "${req.params.symbol}" not found.`);

  res.json(new ApiResponse(200, stock, 'Stock fetched'));
});

// ─────────────────────────────────────────────────────────────
// GET /api/stocks/:symbol/history — Price history only
// ─────────────────────────────────────────────────────────────
const getStockHistory = asyncHandler(async (req, res) => {
  const { days = 30 } = req.query;
  const stock = await Stock.findOne({
    symbol: req.params.symbol.toUpperCase(),
    isActive: true,
  }).select('symbol name priceHistory');

  if (!stock) throw new ApiError(404, 'Stock not found.');

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - parseInt(days));

  const history = stock.priceHistory
    .filter((p) => new Date(p.date) >= cutoff)
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  res.json(new ApiResponse(200, { symbol: stock.symbol, name: stock.name, history }, 'History fetched'));
});

// ─────────────────────────────────────────────────────────────
// GET /api/stocks/sectors — Distinct sectors
// ─────────────────────────────────────────────────────────────
const getSectors = asyncHandler(async (req, res) => {
  const sectors = await Stock.distinct('sector', { isActive: true });
  res.json(new ApiResponse(200, sectors, 'Sectors fetched'));
});

module.exports = { getAllStocks, getStockBySymbol, getStockHistory, getSectors };
