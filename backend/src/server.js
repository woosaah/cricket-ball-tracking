const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const { pool } = require('./config/database');
const authRoutes = require('./routes/auth');
const bowlersRoutes = require('./routes/bowlers');
const sessionsRoutes = require('./routes/sessions');
const deliveriesRoutes = require('./routes/deliveries');
const vrRoutes = require('./routes/vr');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3001'],
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files (uploaded videos)
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'cricket-coach-api',
    database: pool.totalCount > 0 ? 'connected' : 'disconnected'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/bowlers', bowlersRoutes);
app.use('/api/sessions', sessionsRoutes);
app.use('/api/deliveries', deliveriesRoutes);
app.use('/api/vr', vrRoutes);

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Cricket Coaching AI - Backend API',
    version: '1.0.0',
    endpoints: {
      auth: '/api/auth',
      bowlers: '/api/bowlers',
      sessions: '/api/sessions',
      deliveries: '/api/deliveries',
      vr: '/api/vr',
      health: '/health'
    },
    documentation: '/api-docs'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        maxSize: `${process.env.MAX_FILE_SIZE_MB || 500}MB`
      });
    }
    return res.status(400).json({ error: err.message });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log('🏏 Cricket Coaching AI - Backend Server');
  console.log(`📡 Server running on http://localhost:${PORT}`);
  console.log(`🗄️  Database: ${process.env.DATABASE_URL ? 'Configured' : 'Not configured'}`);
  console.log(`🤖 AI Service: ${process.env.AI_SERVICE_URL || 'http://localhost:5001'}`);
  console.log(`📁 Upload directory: ${process.env.UPLOAD_DIR || './uploads/videos'}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, closing server...');
  server.close(async () => {
    console.log('Server closed');
    await pool.end();
    console.log('Database pool closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('\nSIGINT received, closing server...');
  server.close(async () => {
    console.log('Server closed');
    await pool.end();
    console.log('Database pool closed');
    process.exit(0);
  });
});

module.exports = app;
