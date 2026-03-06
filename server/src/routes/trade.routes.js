// src/routes/trade.routes.js
const express = require('express');
const router = express.Router();
const { buyStock, sellStock } = require('../controllers/trade.controller');
const { protect } = require('../middleware/auth.middleware');
const { validate, tradeSchema } = require('../middleware/validate.middleware');

router.use(protect);
router.post('/buy', validate(tradeSchema), buyStock);
router.post('/sell', validate(tradeSchema), sellStock);

module.exports = router;
