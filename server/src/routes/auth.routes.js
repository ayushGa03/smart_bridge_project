// src/routes/auth.routes.js
const express = require('express');
const router = express.Router();
const { register, login, refresh, logout, getMe, updateProfile } = require('../controllers/auth.controller');
const { protect } = require('../middleware/auth.middleware');
const { validate, registerSchema, loginSchema } = require('../middleware/validate.middleware');

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/refresh', refresh);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/me', protect, updateProfile);

module.exports = router;
