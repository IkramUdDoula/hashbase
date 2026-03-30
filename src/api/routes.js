/**
 * API Routes for Hashbase
 * Extracted from vite.config.js for production use
 */

import express from 'express';
import { google } from 'googleapis';
import Parser from 'rss-parser';
import { 
  saveGmailTokensToDb, 
  loadGmailTokensFromDb, 
  deleteGmailTokensFromDb 
} from '../services/dbService.js';

const router = express.Router();

// Initialize OAuth2 client
function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );
}

// Load credentials from request header and auto-refresh if needed
async function loadCredentialsFromHeader(req) {
  try {
    let tokenHeader = req.headers['x-gmail-token'];
    let credentials = null;
    
    // Try to load from header first
    if (tokenHeader) {
      credentials = JSON.parse(tokenHeader);
      console.log('📨 Gmail: Using token from request header');
      
      // If header token doesn't have refresh_token, try database
      if (!credentials.refresh_token) {
        console.log('⚠️  Gmail: Header token missing refresh_token, checking database...');
        const dbTokens = await loadGmailTokensFromDb();
        if (dbTokens && dbTokens.refresh_token) {
          console.log('✅ Gmail: Found refresh_token in database, merging it');
          credentials.refresh_token = dbTokens.refresh_token;
        } else {
          console.log('❌ Gmail: No refresh_token in database either');
        }
      }
    } else {
      // Fall back to database storage
      credentials = await loadGmailTokensFromDb();
      if (!credentials) {
        console.log('❌ Gmail: No token in header or database');
        return null;
      }
      console.log('📂 Gmail: Using token from database');
    }

    
    // Check if we have a refresh token
    if (!credentials.refresh_token) {
      console.log('❌ Gmail: No refresh token available - cannot refresh');
      return { error: 'REFRESH_FAILED', message: 'No refresh token available' };
    }
    
    const expiryDate = credentials.expiry_date;
    const now = Date.now();
    
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(credentials);
    
    // Check if token is expired or about to expire (within 5 minutes)
    const fiveMinutes = 5 * 60 * 1000;
    
    console.log(`🔍 Gmail: Token check - Expiry: ${expiryDate ? new Date(expiryDate).toISOString() : 'Not set'}, Now: ${new Date(now).toISOString()}`);
    
    if (expiryDate && (now >= expiryDate - fiveMinutes)) {
      const isAlreadyExpired = now >= expiryDate;
      console.log(`🔄 Gmail: Access token ${isAlreadyExpired ? 'expired' : 'expiring soon'}, refreshing...`);
      try {
        const { credentials: newCredentials } = await oauth2Client.refreshAccessToken();
        
        console.log(`   Refresh response - has refresh_token: ${!!newCredentials.refresh_token}`);
        
        // Preserve the refresh token if not returned
        if (!newCredentials.refresh_token && credentials.refresh_token) {
          console.log('   ⚠️ Google did not return refresh_token, preserving from original');
          newCredentials.refresh_token = credentials.refresh_token;
        }
        
        oauth2Client.setCredentials(newCredentials);
        
        // Save refreshed tokens to database
        await saveGmailTokensToDb(newCredentials);
        
        console.log('✅ Gmail: Token refreshed successfully');
        console.log(`   New expiry: ${newCredentials.expiry_date ? new Date(newCredentials.expiry_date).toISOString() : 'Not set'}`);
        console.log(`   Has refresh_token: ${!!newCredentials.refresh_token ? '✅' : '❌'}`);
        
        return { oauth2Client, newCredentials };
      } catch (refreshError) {
        console.error('❌ Gmail: Failed to refresh token:', refreshError.message);
        return { error: 'REFRESH_FAILED', message: refreshError.message };
      }
    }
    
    return { oauth2Client, newCredentials: null };
  } catch (err) {
    console.error('Error loading credentials from header:', err);
    return null;
  }
}

// ===== Gmail API Endpoints =====

// Get authorization URL
router.get('/auth/url', (req, res) => {
  const oauth2Client = getOAuth2Client();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.modify'
    ],
  });
  res.json({ url: authUrl });
});


// OAuth2 callback
router.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send('No code provided');
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    
    // Check for existing refresh token
    const existingTokenHeader = req.headers['x-gmail-token'];
    let existingRefreshToken = null;
    
    if (existingTokenHeader) {
      try {
        const existingCreds = JSON.parse(existingTokenHeader);
        existingRefreshToken = existingCreds.refresh_token;
      } catch (e) {
        // Ignore parsing errors
      }
    }
    
    // If Google didn't return a refresh token but we have an existing one, preserve it
    if (!tokens.refresh_token && existingRefreshToken) {
      console.log('⚠️  Google did not return a new refresh token, preserving existing one');
      tokens.refresh_token = existingRefreshToken;
    }
    
    oauth2Client.setCredentials(tokens);
    
    // Save tokens to database
    await saveGmailTokensToDb(tokens);
    
    console.log('✅ Gmail OAuth: Tokens received');
    console.log('   - Access token:', tokens.access_token ? 'Present' : 'Missing');
    console.log('   - Refresh token:', tokens.refresh_token ? 'Present ✅' : 'Missing ❌');
    console.log('   - Expiry date:', tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : 'Not set');
    
    if (!tokens.refresh_token) {
      console.warn('⚠️  WARNING: No refresh token received from Google!');
      const frontendUrl = process.env.VITE_FRONTEND_URL;
      return res.send(`
        <html>
          <head>
            <title>Authentication Issue</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; background: #fee2e2; }
              .container { background: white; padding: 30px; border-radius: 8px; border: 2px solid #dc2626; }
              h1 { color: #dc2626; margin-top: 0; }
              .warning { background: #fef3c7; padding: 15px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #f59e0b; }
              button { background: #dc2626; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; cursor: pointer; margin: 10px 5px; }
              button:hover { background: #b91c1c; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>⚠️ No Refresh Token Received</h1>
              <div class="warning">
                <strong>Problem:</strong> Google did not provide a refresh token.<br><br>
                <strong>Fix:</strong> Revoke access at <a href="https://myaccount.google.com/permissions" target="_blank">Google Permissions</a> and try again.
              </div>
              <button onclick="window.location.href='${frontendUrl}'">Return to App</button>
            </div>
          </body>
        </html>
      `);
    }
    
    const tokensJson = JSON.stringify(tokens);
    const frontendUrl = process.env.VITE_FRONTEND_URL;
    res.send(`
      <html>
        <head>
          <title>Authentication Successful</title>
          <script>
            localStorage.setItem('gmail_tokens', '${tokensJson.replace(/'/g, "\\'")}');
            window.location.href = '${frontendUrl}?auth=success';
          </script>
        </head>
        <body><p>Redirecting...</p></body>
      </html>
    `);
  } catch (error) {
    console.error('Error getting tokens:', error);
    const frontendUrl = process.env.VITE_FRONTEND_URL;
    const errorMessage = encodeURIComponent(error.message);
    res.status(500).send(`
      <html>
        <head>
          <title>Authentication Failed</title>
          <script>
            window.location.href = '${frontendUrl}?auth=error&message=${errorMessage}';
          </script>
        </head>
        <body><p>Redirecting...</p></body>
      </html>
    `);
  }
});


// Check auth status
router.get('/auth/status', async (req, res) => {
  try {
    const result = await loadCredentialsFromHeader(req);
    
    if (!result) {
      return res.json({ authenticated: false });
    }
    
    if (result.error === 'REFRESH_FAILED') {
      return res.json({ 
        authenticated: false,
        requiresReauth: true,
        error: result.message
      });
    }
    
    if (result.newCredentials) {
      return res.json({ 
        authenticated: true, 
        refreshed: true,
        tokens: result.newCredentials 
      });
    }
    
    res.json({ authenticated: true });
  } catch (error) {
    console.error('Error checking auth status:', error);
    res.json({ authenticated: false });
  }
});

// Logout
router.post('/auth/logout', async (req, res) => {
  try {
    await deleteGmailTokensFromDb();
    res.json({ success: true, message: 'Tokens cleared successfully' });
  } catch (error) {
    console.error('Error clearing tokens:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Fetch unread emails
router.get('/gmail/unread', async (req, res) => {
  try {
    const result = await loadCredentialsFromHeader(req);
    
    if (!result) {
      return res.status(401).json({ 
        error: 'Not authenticated',
        message: 'Please authenticate with Gmail first',
        requiresReauth: true
      });
    }
    
    if (result.error === 'REFRESH_FAILED') {
      return res.status(401).json({ 
        error: 'Token refresh failed',
        message: result.message,
        requiresReauth: true
      });
    }

    const gmail = google.gmail({ version: 'v1', auth: result.oauth2Client });
    
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread',
      maxResults: 20,
    });

    const messages = response.data.messages || [];
    
    const emailPromises = messages.map(async (message) => {
      const details = await gmail.users.messages.get({
        userId: 'me',
        id: message.id,
        format: 'full',
      });

      const headers = details.data.payload.headers;
      const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
      const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
      const date = headers.find(h => h.name === 'Date')?.value || new Date().toISOString();

      return {
        id: message.id,
        subject,
        from,
        date: new Date(date).toISOString(),
        snippet: details.data.snippet,
      };
    });

    const emails = await Promise.all(emailPromises);
    
    if (result.newCredentials) {
      res.set('x-gmail-token-refreshed', JSON.stringify(result.newCredentials));
    }
    
    res.json({ emails });
  } catch (error) {
    console.error('❌ Gmail API Error:', error.message);
    res.status(500).json({ 
      error: 'Failed to fetch emails',
      message: error.message 
    });
  }
});


// Import additional route handlers
import { addGmailRoutes } from './gmailRoutes.js';
import { addExternalRoutes } from './externalRoutes.js';

// Export router creation function
export function createApiRouter() {
  // Add Gmail-specific routes
  addGmailRoutes(router, loadCredentialsFromHeader);
  
  // Add external API routes
  addExternalRoutes(router);
  
  return router;
}
