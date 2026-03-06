// src/routes/watchlist.routes.js
const express = require('express');
const router = express.Router();
const { getWatchlist, addToWatchlist, removeFromWatchlist } = require('../controllers/watchlist.controller');
const { protect } = require('../middleware/auth.middleware');

router.use(protect);
router.get('/', getWatchlist);
router.post('/:symbol', addToWatchlist);
router.delete('/:symbol', removeFromWatchlist);

module.exports = router;
