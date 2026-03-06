// src/routes/admin.routes.js
const express = require('express');
const router = express.Router();
const {
  createStock, updateStock, deleteStock, addPriceHistory,
  getAllUsers, toggleUserActive, getAdminStats,
} = require('../controllers/admin.controller');
const { protect, adminOnly } = require('../middleware/auth.middleware');
const { validate, stockSchema } = require('../middleware/validate.middleware');

router.use(protect, adminOnly); // All admin routes require admin role

router.get('/stats', getAdminStats);

// Stock management
router.post('/stocks', validate(stockSchema), createStock);
router.put('/stocks/:id', updateStock);
router.delete('/stocks/:id', deleteStock);
router.post('/stocks/:id/history', addPriceHistory);

// User management
router.get('/users', getAllUsers);
router.put('/users/:id/toggle-active', toggleUserActive);

module.exports = router;
