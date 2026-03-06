// src/controllers/trade.controller.js
const mongoose = require('mongoose');
const Stock = require('../models/Stock.model');
const Portfolio = require('../models/Portfolio.model');
const Transaction = require('../models/Transaction.model');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

// ─────────────────────────────────────────────────────────────
// POST /api/trade/buy
// Body: { stockId, quantity }
// ─────────────────────────────────────────────────────────────
const buyStock = asyncHandler(async (req, res) => {
  const { stockId, quantity } = req.body;
  const userId = req.user._id;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Fetch stock (active only)
    const stock = await Stock.findOne({ _id: stockId, isActive: true }).session(session);
    if (!stock) throw new ApiError(404, 'Stock not found or not tradeable.');

    const totalCost = parseFloat((stock.currentPrice * quantity).toFixed(2));

    // 2. Fetch portfolio and verify sufficient funds
    const portfolio = await Portfolio.findOne({ user: userId }).session(session);
    if (!portfolio) throw new ApiError(404, 'Portfolio not found.');

    if (portfolio.cashBalance < totalCost) {
      throw new ApiError(400, `Insufficient funds. Need $${totalCost.toLocaleString()}, have $${portfolio.cashBalance.toLocaleString()}.`);
    }

    // 3. Deduct cash balance
    portfolio.cashBalance = parseFloat((portfolio.cashBalance - totalCost).toFixed(2));

    // 4. Update holdings (upsert logic)
    const holdingIndex = portfolio.holdings.findIndex(
      (h) => h.stock.toString() === stockId
    );

    if (holdingIndex >= 0) {
      // Existing holding: recalculate weighted average buy price
      const existing = portfolio.holdings[holdingIndex];
      const newTotalQty = existing.quantity + quantity;
      const newTotalInvested = existing.totalInvested + totalCost;
      existing.quantity = newTotalQty;
      existing.avgBuyPrice = parseFloat((newTotalInvested / newTotalQty).toFixed(4));
      existing.totalInvested = parseFloat(newTotalInvested.toFixed(2));
    } else {
      // New holding
      portfolio.holdings.push({
        stock: stock._id,
        symbol: stock.symbol,
        companyName: stock.name,
        quantity,
        avgBuyPrice: stock.currentPrice,
        totalInvested: totalCost,
      });
    }

    await portfolio.save({ session });

    // 5. Record transaction
    const transaction = await Transaction.create(
      [{
        user: userId,
        stock: stock._id,
        symbol: stock.symbol,
        companyName: stock.name,
        type: 'BUY',
        quantity,
        pricePerShare: stock.currentPrice,
        totalAmount: totalCost,
        balanceAfter: portfolio.cashBalance,
        realizedPnL: null,
      }],
      { session }
    );

    await session.commitTransaction();

    res.status(201).json(
      new ApiResponse(201, {
        transaction: transaction[0],
        portfolio: {
          cashBalance: portfolio.cashBalance,
          holdings: portfolio.holdings,
        },
      }, `Successfully bought ${quantity} share(s) of ${stock.symbol}`)
    );

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/trade/sell
// Body: { stockId, quantity }
// ─────────────────────────────────────────────────────────────
const sellStock = asyncHandler(async (req, res) => {
  const { stockId, quantity } = req.body;
  const userId = req.user._id;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const stock = await Stock.findOne({ _id: stockId, isActive: true }).session(session);
    if (!stock) throw new ApiError(404, 'Stock not found.');

    const portfolio = await Portfolio.findOne({ user: userId }).session(session);
    if (!portfolio) throw new ApiError(404, 'Portfolio not found.');

    const holdingIndex = portfolio.holdings.findIndex(
      (h) => h.stock.toString() === stockId
    );

    if (holdingIndex < 0) {
      throw new ApiError(400, `You don't own any shares of ${stock.symbol}.`);
    }

    const holding = portfolio.holdings[holdingIndex];

    if (holding.quantity < quantity) {
      throw new ApiError(
        400,
        `Insufficient shares. You own ${holding.quantity} share(s) of ${stock.symbol}, trying to sell ${quantity}.`
      );
    }

    const totalRevenue = parseFloat((stock.currentPrice * quantity).toFixed(2));
    const costBasis = parseFloat((holding.avgBuyPrice * quantity).toFixed(2));
    const realizedPnL = parseFloat((totalRevenue - costBasis).toFixed(2));

    // Update portfolio cash
    portfolio.cashBalance = parseFloat((portfolio.cashBalance + totalRevenue).toFixed(2));

    // Update or remove holding
    const newQty = holding.quantity - quantity;
    if (newQty === 0) {
      portfolio.holdings.splice(holdingIndex, 1);
    } else {
      portfolio.holdings[holdingIndex].quantity = newQty;
      portfolio.holdings[holdingIndex].totalInvested = parseFloat(
        (holding.avgBuyPrice * newQty).toFixed(2)
      );
    }

    await portfolio.save({ session });

    const transaction = await Transaction.create(
      [{
        user: userId,
        stock: stock._id,
        symbol: stock.symbol,
        companyName: stock.name,
        type: 'SELL',
        quantity,
        pricePerShare: stock.currentPrice,
        totalAmount: totalRevenue,
        balanceAfter: portfolio.cashBalance,
        realizedPnL,
      }],
      { session }
    );

    await session.commitTransaction();

    res.json(
      new ApiResponse(200, {
        transaction: transaction[0],
        realizedPnL,
        portfolio: {
          cashBalance: portfolio.cashBalance,
          holdings: portfolio.holdings,
        },
      }, `Successfully sold ${quantity} share(s) of ${stock.symbol}`)
    );

  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
});

module.exports = { buyStock, sellStock };
