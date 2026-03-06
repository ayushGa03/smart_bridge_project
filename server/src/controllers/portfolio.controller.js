// src/controllers/portfolio.controller.js
const Portfolio = require('../models/Portfolio.model');
const Transaction = require('../models/Transaction.model');
const Stock = require('../models/Stock.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// ─────────────────────────────────────────────────────────────
// GET /api/portfolio  — Full portfolio with live P&L
// ─────────────────────────────────────────────────────────────
const getPortfolio = asyncHandler(async (req, res) => {
  const portfolio = await Portfolio.findOne({ user: req.user._id })
    .populate('holdings.stock', 'symbol name currentPrice previousClose sector logoUrl');

  if (!portfolio) throw new ApiError(404, 'Portfolio not found.');

  // Enrich holdings with current P&L
  let totalCurrentValue = 0;
  let totalCostBasis = 0;

  const enrichedHoldings = portfolio.holdings.map((h) => {
    const currentPrice = h.stock?.currentPrice || 0;
    const currentValue = parseFloat((currentPrice * h.quantity).toFixed(2));
    const costBasis = parseFloat((h.avgBuyPrice * h.quantity).toFixed(2));
    const unrealizedPnL = parseFloat((currentValue - costBasis).toFixed(2));
    const unrealizedPnLPct = costBasis > 0
      ? parseFloat(((unrealizedPnL / costBasis) * 100).toFixed(2))
      : 0;

    totalCurrentValue += currentValue;
    totalCostBasis += costBasis;

    return {
      stock: h.stock,
      symbol: h.symbol,
      companyName: h.companyName,
      quantity: h.quantity,
      avgBuyPrice: h.avgBuyPrice,
      totalInvested: h.totalInvested,
      currentPrice,
      currentValue,
      unrealizedPnL,
      unrealizedPnLPct,
    };
  });

  const totalPortfolioValue = parseFloat((portfolio.cashBalance + totalCurrentValue).toFixed(2));
  const totalUnrealizedPnL = parseFloat((totalCurrentValue - totalCostBasis).toFixed(2));
  const totalReturn = parseFloat((totalPortfolioValue - portfolio.totalDeposited).toFixed(2));
  const totalReturnPct = portfolio.totalDeposited > 0
    ? parseFloat(((totalReturn / portfolio.totalDeposited) * 100).toFixed(2))
    : 0;

  res.json(
    new ApiResponse(200, {
      cashBalance: portfolio.cashBalance,
      totalDeposited: portfolio.totalDeposited,
      holdings: enrichedHoldings,
      summary: {
        totalPortfolioValue,
        totalCurrentValue,
        totalCostBasis,
        totalUnrealizedPnL,
        totalReturn,
        totalReturnPct,
      },
    }, 'Portfolio fetched')
  );
});

// ─────────────────────────────────────────────────────────────
// GET /api/portfolio/transactions  — Transaction history
// ─────────────────────────────────────────────────────────────
const getTransactions = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, type, symbol } = req.query;

  const query = { user: req.user._id };
  if (type) query.type = type.toUpperCase();
  if (symbol) query.symbol = symbol.toUpperCase();

  const skip = (parseInt(page) - 1) * parseInt(limit);
  const limitNum = Math.min(parseInt(limit), 100);

  const [transactions, total] = await Promise.all([
    Transaction.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Transaction.countDocuments(query),
  ]);

  // Aggregate stats
  const stats = await Transaction.aggregate([
    { $match: { user: req.user._id } },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalAmount: { $sum: '$totalAmount' },
        totalPnL: { $sum: { $ifNull: ['$realizedPnL', 0] } },
      },
    },
  ]);

  res.json(
    new ApiResponse(200, {
      transactions,
      stats,
      pagination: {
        total,
        page: parseInt(page),
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    }, 'Transactions fetched')
  );
});

// ─────────────────────────────────────────────────────────────
// GET /api/portfolio/summary — Dashboard summary card
// ─────────────────────────────────────────────────────────────
const getSummary = asyncHandler(async (req, res) => {
  const portfolio = await Portfolio.findOne({ user: req.user._id })
    .populate('holdings.stock', 'currentPrice symbol');

  if (!portfolio) throw new ApiError(404, 'Portfolio not found.');

  let stocksValue = 0;
  portfolio.holdings.forEach((h) => {
    stocksValue += (h.stock?.currentPrice || 0) * h.quantity;
  });

  const totalValue = parseFloat((portfolio.cashBalance + stocksValue).toFixed(2));
  const totalReturn = parseFloat((totalValue - portfolio.totalDeposited).toFixed(2));
  const returnPct = parseFloat(((totalReturn / portfolio.totalDeposited) * 100).toFixed(2));

  const recentTxns = await Transaction.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .limit(5)
    .lean();

  res.json(
    new ApiResponse(200, {
      cashBalance: portfolio.cashBalance,
      stocksValue: parseFloat(stocksValue.toFixed(2)),
      totalValue,
      totalReturn,
      returnPct,
      holdingsCount: portfolio.holdings.length,
      recentTransactions: recentTxns,
    }, 'Summary fetched')
  );
});

module.exports = { getPortfolio, getTransactions, getSummary };
