// src/routes/stock.routes.js
const express = require('express');
const router = express.Router();
const { getAllStocks, getStockBySymbol, getStockHistory, getSectors } = require('../controllers/stock.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect); // All stock routes require auth

router.get('/', getAllStocks);
router.get('/sectors', getSectors);
router.get('/:symbol', getStockBySymbol);
router.get('/:symbol/history', getStockHistory);

module.exports = router;
