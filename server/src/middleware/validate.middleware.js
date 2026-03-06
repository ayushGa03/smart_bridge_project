// src/middleware/validate.middleware.js
const Joi = require('joi');
const ApiError = require('../utils/ApiError');

// Generic validator factory
const validate = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], { abortEarly: false });
    if (error) {
      const errors = error.details.map((d) => ({
        field: d.path.join('.'),
        message: d.message.replace(/['"]/g, ''),
      }));
      throw new ApiError(400, 'Validation failed', errors);
    }
    req[property] = value; // Replace with sanitized value
    next();
  };
};

// ── Auth Schemas ─────────────────────────────────────────────
const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

// ── Trade Schemas ─────────────────────────────────────────────
const tradeSchema = Joi.object({
  stockId: Joi.string().hex().length(24).required(),
  quantity: Joi.number().integer().min(1).max(10000).required(),
});

// ── Stock Schemas ─────────────────────────────────────────────
const stockSchema = Joi.object({
  symbol: Joi.string().uppercase().min(1).max(10).required(),
  name: Joi.string().min(2).max(100).required(),
  exchange: Joi.string().valid('NYSE', 'NASDAQ', 'AMEX', 'OTC').default('NASDAQ'),
  sector: Joi.string().valid(
    'Technology', 'Finance', 'Healthcare', 'Energy',
    'Consumer', 'Industrial', 'Materials', 'Utilities',
    'Real Estate', 'Communication', 'Other'
  ).default('Other'),
  currentPrice: Joi.number().min(0.01).required(),
  previousClose: Joi.number().min(0).default(0),
  openPrice: Joi.number().min(0).default(0),
  dayHigh: Joi.number().min(0).default(0),
  dayLow: Joi.number().min(0).default(0),
  volume: Joi.number().min(0).default(0),
  marketCap: Joi.number().min(0).default(0),
  description: Joi.string().max(500).allow('').default(''),
});

module.exports = {
  validate,
  registerSchema,
  loginSchema,
  tradeSchema,
  stockSchema,
};
