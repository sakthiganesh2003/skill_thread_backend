require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDB } = require('./db/database');

const authRoutes = require('./routes/auth');
const orderRoutes = require('./routes/orders');
const garmentRoutes = require('./routes/garments');
const tailorRoutes = require('./routes/tailors');
const measurementRoutes = require('./routes/measurements');
const analyticsRoutes = require('./routes/analytics');
const fabricsRoutes = require('./routes/fabrics');
const customizationRoutes = require('./routes/customizations');
const uploadRoutes = require('./routes/upload');
const customerRoutes = require('./routes/customers');

const app = express();

// Serve uploaded images as static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Middleware
app.use(cors({ origin: ['http://localhost:3000', 'http://localhost:3002'], credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/garments', garmentRoutes);
app.use('/api/tailors', tailorRoutes);
app.use('/api/measurements', measurementRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/fabrics', fabricsRoutes);
app.use('/api/customizations', customizationRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/customers', customerRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok', app: 'Silkthread API' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🪡  Silkthread API running on http://localhost:${PORT}`);
    console.log(`📦  Database initialized`);
  });
}).catch(err => {
  console.error('Failed to initialize DB:', err);
  process.exit(1);
});
