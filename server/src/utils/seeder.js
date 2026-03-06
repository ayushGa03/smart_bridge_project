// src/utils/seeder.js
require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('../config/db');
const User = require('../models/User.model');
const Stock = require('../models/Stock.model');
const Portfolio = require('../models/Portfolio.model');
const Watchlist = require('../models/Watchlist.model');

// Generate 90 days of realistic price history
const generatePriceHistory = (basePrice, days = 90) => {
  const history = [];
  let price = basePrice * 0.85; // Start slightly lower
  const now = new Date();

  for (let i = days; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);
    if (date.getDay() === 0 || date.getDay() === 6) continue; // Skip weekends

    const volatility = 0.02;
    const change = price * volatility * (Math.random() - 0.48);
    const open = parseFloat(price.toFixed(2));
    const close = parseFloat((price + change).toFixed(2));
    const high = parseFloat((Math.max(open, close) * (1 + Math.random() * 0.01)).toFixed(2));
    const low = parseFloat((Math.min(open, close) * (1 - Math.random() * 0.01)).toFixed(2));

    history.push({
      date,
      open,
      high,
      low,
      close,
      volume: Math.floor(Math.random() * 50000000 + 10000000),
    });

    price = close;
  }
  return history;
};

const stocks = [
  { symbol: 'AAPL', name: 'Apple Inc.', exchange: 'NASDAQ', sector: 'Technology', currentPrice: 189.30, previousClose: 187.15, marketCap: 2950000000000, description: 'Consumer electronics, software, and online services.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', exchange: 'NASDAQ', sector: 'Technology', currentPrice: 415.20, previousClose: 412.80, marketCap: 3080000000000, description: 'Cloud computing, software, and hardware.' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', exchange: 'NASDAQ', sector: 'Communication', currentPrice: 175.50, previousClose: 173.90, marketCap: 2200000000000, description: 'Internet search, advertising, and cloud.' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', exchange: 'NASDAQ', sector: 'Consumer', currentPrice: 192.80, previousClose: 190.50, marketCap: 1980000000000, description: 'E-commerce, cloud computing, and logistics.' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation', exchange: 'NASDAQ', sector: 'Technology', currentPrice: 875.40, previousClose: 868.20, marketCap: 2150000000000, description: 'GPUs, AI chips, and data center solutions.' },
  { symbol: 'META', name: 'Meta Platforms Inc.', exchange: 'NASDAQ', sector: 'Communication', currentPrice: 505.60, previousClose: 499.80, marketCap: 1290000000000, description: 'Social media, advertising, and metaverse.' },
  { symbol: 'TSLA', name: 'Tesla Inc.', exchange: 'NASDAQ', sector: 'Consumer', currentPrice: 248.50, previousClose: 252.10, marketCap: 790000000000, description: 'Electric vehicles and clean energy.' },
  { symbol: 'JPM', name: 'JPMorgan Chase & Co.', exchange: 'NYSE', sector: 'Finance', currentPrice: 198.40, previousClose: 196.90, marketCap: 572000000000, description: 'Global banking and financial services.' },
  { symbol: 'JNJ', name: 'Johnson & Johnson', exchange: 'NYSE', sector: 'Healthcare', currentPrice: 152.30, previousClose: 151.80, marketCap: 367000000000, description: 'Pharmaceuticals, medical devices, and consumer health.' },
  { symbol: 'XOM', name: 'Exxon Mobil Corp.', exchange: 'NYSE', sector: 'Energy', currentPrice: 112.60, previousClose: 111.20, marketCap: 452000000000, description: 'Upstream, downstream, and chemical operations.' },
  { symbol: 'V', name: 'Visa Inc.', exchange: 'NYSE', sector: 'Finance', currentPrice: 274.80, previousClose: 272.50, marketCap: 565000000000, description: 'Global payments technology.' },
  { symbol: 'MA', name: 'Mastercard Inc.', exchange: 'NYSE', sector: 'Finance', currentPrice: 471.20, previousClose: 468.30, marketCap: 439000000000, description: 'Global payment solutions and services.' },
  { symbol: 'WMT', name: 'Walmart Inc.', exchange: 'NYSE', sector: 'Consumer', currentPrice: 68.90, previousClose: 68.20, marketCap: 555000000000, description: 'Retail, e-commerce, and Sam\'s Club.' },
  { symbol: 'PG', name: 'Procter & Gamble Co.', exchange: 'NYSE', sector: 'Consumer', currentPrice: 162.40, previousClose: 161.80, marketCap: 382000000000, description: 'Consumer goods and personal care.' },
  { symbol: 'HD', name: 'The Home Depot Inc.', exchange: 'NYSE', sector: 'Consumer', currentPrice: 342.60, previousClose: 339.90, marketCap: 339000000000, description: 'Home improvement retail.' },
  { symbol: 'DIS', name: 'The Walt Disney Co.', exchange: 'NYSE', sector: 'Communication', currentPrice: 112.80, previousClose: 111.50, marketCap: 206000000000, description: 'Entertainment, theme parks, and streaming.' },
  { symbol: 'NFLX', name: 'Netflix Inc.', exchange: 'NASDAQ', sector: 'Communication', currentPrice: 628.40, previousClose: 622.10, marketCap: 272000000000, description: 'Streaming entertainment service.' },
  { symbol: 'AMD', name: 'Advanced Micro Devices', exchange: 'NASDAQ', sector: 'Technology', currentPrice: 168.50, previousClose: 165.90, marketCap: 272000000000, description: 'Processors, graphics, and data center chips.' },
  { symbol: 'CRM', name: 'Salesforce Inc.', exchange: 'NYSE', sector: 'Technology', currentPrice: 298.70, previousClose: 295.40, marketCap: 289000000000, description: 'CRM software and cloud business solutions.' },
  { symbol: 'PYPL', name: 'PayPal Holdings Inc.', exchange: 'NASDAQ', sector: 'Finance', currentPrice: 62.80, previousClose: 61.90, marketCap: 68000000000, description: 'Digital payments and fintech.' },
];

const seed = async () => {
  try {
    await connectDB();
    console.log('🌱 Seeding database...\n');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Stock.deleteMany({}),
      Portfolio.deleteMany({}),
      Watchlist.deleteMany({}),
    ]);
    console.log('🗑️  Cleared existing data');

    // Create admin user
    const adminPassword = await bcrypt.hash('Admin@123', 12);
    const admin = await User.create({
      name: 'Admin User',
      email: 'admin@sbstocks.com',
      password: adminPassword,
      role: 'admin',
    });
    console.log('👑 Admin created: admin@sbstocks.com / Admin@123');

    // Create demo user
    const userPassword = await bcrypt.hash('Demo@123', 12);
    const demoUser = await User.create({
      name: 'Demo Trader',
      email: 'demo@sbstocks.com',
      password: userPassword,
      role: 'user',
    });
    console.log('👤 Demo user created: demo@sbstocks.com / Demo@123');

    // Create portfolios and watchlists
    await Portfolio.create({ user: admin._id });
    await Portfolio.create({ user: demoUser._id, cashBalance: 100000 });
    await Watchlist.create({ user: admin._id, stocks: [] });
    await Watchlist.create({ user: demoUser._id, stocks: [] });
    console.log('💼 Portfolios and watchlists created');

    // Seed stocks with price history
    console.log('📈 Seeding stocks with price history...');
    const stockDocs = stocks.map((s) => ({
      ...s,
      openPrice: s.currentPrice * 0.998,
      dayHigh: s.currentPrice * 1.012,
      dayLow: s.currentPrice * 0.988,
      volume: Math.floor(Math.random() * 80000000 + 20000000),
      peRatio: parseFloat((Math.random() * 35 + 10).toFixed(1)),
      dividendYield: parseFloat((Math.random() * 3).toFixed(2)),
      priceHistory: generatePriceHistory(s.currentPrice),
    }));

    await Stock.insertMany(stockDocs);
    console.log(`✅ ${stockDocs.length} stocks seeded`);

    console.log('\n🎉 Seeding complete!\n');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
};

seed();
