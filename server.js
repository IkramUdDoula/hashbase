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
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              justify-content: center;
              align-items: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .container {
              background: white;
              padding: 40px;
              border-radius: 12px;
              box-shadow: 0 10px 40px rgba(0,0,0,0.2);
              text-align: center;
            }
            .spinner {
              border: 4px solid #f3f3f3;
              border-top: 4px solid #667eea;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              animation: spin 1s linear infinite;
              margin: 20px auto;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h2>✅ Authentication Successful</h2>
            <div class="spinner"></div>
            <p>Redirecting to dashboard...</p>
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
              document.body.innerHTML = '<div class="container"><h2>Error</h2><p>' + error.message + '</p></div>';
            }
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('❌ Error in OAuth callback:', error);
    const frontendUrl = process.env.FRONTEND_URL || process.env.VITE_FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
    res.status(500).send(`
      <html>
        <head>
          <title>Authentication Failed</title>
        </head>
        <body>
          <h1>Authentication Failed</h1>
          <p>${error.message}</p>
          <a href="${frontendUrl}">Return to App</a>
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
