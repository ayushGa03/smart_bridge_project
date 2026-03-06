// src/routes/portfolio.routes.js
const express = require('express');
const router = express.Router();
const { getPortfolio, getTransactions, getSummary } = require('../controllers/portfolio.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);
router.get('/', getPortfolio);
router.get('/summary', getSummary);
router.get('/transactions', getTransactions);

module.exports = router;
