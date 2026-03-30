/**
 * Production Server for Hashbase
 * Serves built frontend and provides API endpoints
 */

import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Import API routes
import { createApiRouter } from './src/api/routes.js';
import { initDatabase, testDatabaseConnection } from './src/services/dbService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize database
console.log('🔌 Initializing database connection...');
initDatabase();

// Test database connection
testDatabaseConnection().then(success => {
  if (success) {
    console.log('✅ Database ready');
  } else {
    console.warn('⚠️  Database not available - Gmail tokens will not persist');
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// API routes
const apiRouter = createApiRouter();
app.use('/api', apiRouter);
app.use('/oauth2callback', apiRouter);

// Serve static files from dist directory
app.use(express.static(path.join(__dirname, 'dist')));

// Serve index.html for all other routes (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('\n✅ Hashbase server started');
  console.log(`📍 Server running on port ${PORT}`);
  console.log(`🌐 Frontend: http://localhost:${PORT}`);
  console.log(`🔌 API: http://localhost:${PORT}/api`);
  console.log(`📧 Gmail OAuth: http://localhost:${PORT}/api/auth/url\n`);
});
