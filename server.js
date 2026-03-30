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
import { google } from 'googleapis';
import { saveGmailTokensToDb } from './src/services/dbService.js';

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

// OAuth callback at root level - duplicate handler for /oauth2callback
app.get('/oauth2callback', async (req, res) => {
  console.log('📨 OAuth callback received at root level');
  const code = req.query.code;
  if (!code) {
    console.error('❌ No authorization code provided');
    return res.status(400).send('No code provided');
  }

  try {
    console.log('🔄 Exchanging code for tokens...');
    const oauth2Client = new google.auth.OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      process.env.GMAIL_REDIRECT_URI
    );
    
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    // Save tokens to database
    await saveGmailTokensToDb(tokens);
    
    console.log('✅ Gmail OAuth: Tokens received and saved');
    console.log('   - Access token:', tokens.access_token ? 'Present' : 'Missing');
    console.log('   - Refresh token:', tokens.refresh_token ? 'Present ✅' : 'Missing ❌');
    
    const frontendUrl = process.env.FRONTEND_URL || process.env.VITE_FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
    console.log('   - Redirecting to:', frontendUrl);
    
    const tokensJson = JSON.stringify(tokens);
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Authentication Successful</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              background: #000000;
              color: #f2f2f2;
            }
            .container {
              background: #141414;
              padding: 48px;
              border-radius: 8px;
              border: 1px solid #333333;
              text-align: center;
              max-width: 400px;
            }
            .icon {
              width: 64px;
              height: 64px;
              margin: 0 auto 24px;
              background: #22c55e;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 32px;
            }
            h2 {
              font-size: 24px;
              font-weight: 600;
              margin-bottom: 12px;
              color: #f2f2f2;
            }
            p {
              color: #999999;
              font-size: 14px;
              margin-bottom: 32px;
            }
            .spinner {
              border: 3px solid #333333;
              border-top: 3px solid #f2f2f2;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              animation: spin 0.8s linear infinite;
              margin: 0 auto;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">✓</div>
            <h2>Authentication Successful</h2>
            <p>Redirecting to your dashboard...</p>
            <div class="spinner"></div>
          </div>
          <script>
            try {
              console.log('Storing Gmail tokens...');
              localStorage.setItem('gmail_tokens', ${JSON.stringify(tokensJson)});
              console.log('Tokens stored, redirecting...');
              setTimeout(function() {
                window.location.href = '${frontendUrl}?auth=success';
              }, 500);
            } catch (error) {
              console.error('Error storing tokens:', error);
              document.body.innerHTML = '<div class="container"><div class="icon" style="background:#ef4444;">✕</div><h2>Error</h2><p>' + error.message + '</p></div>';
            }
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('❌ Error in OAuth callback:', error);
    const frontendUrl = process.env.FRONTEND_URL || process.env.VITE_FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
    res.status(500).send(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <title>Authentication Failed</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              background: #000000;
              color: #f2f2f2;
            }
            .container {
              background: #141414;
              padding: 48px;
              border-radius: 8px;
              border: 1px solid #333333;
              text-align: center;
              max-width: 400px;
            }
            .icon {
              width: 64px;
              height: 64px;
              margin: 0 auto 24px;
              background: #ef4444;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              font-size: 32px;
            }
            h2 {
              font-size: 24px;
              font-weight: 600;
              margin-bottom: 12px;
              color: #f2f2f2;
            }
            p {
              color: #999999;
              font-size: 14px;
              margin-bottom: 24px;
            }
            a {
              display: inline-block;
              padding: 12px 24px;
              background: #f2f2f2;
              color: #000000;
              text-decoration: none;
              border-radius: 6px;
              font-weight: 500;
              transition: background 0.2s;
            }
            a:hover {
              background: #e5e5e5;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="icon">✕</div>
            <h2>Authentication Failed</h2>
            <p>${error.message}</p>
            <a href="${frontendUrl}">Return to Dashboard</a>
          </div>
        </body>
      </html>
    `);
  }
});

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
