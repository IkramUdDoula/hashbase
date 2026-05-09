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
// Track ongoing refresh operations to prevent duplicate refreshes
const ongoingRefreshes = new Map();

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
    
    // Only log token checks occasionally to reduce noise (every 30 seconds)
    const lastLogKey = 'gmail_token_check_last_log';
    const lastLog = global[lastLogKey] || 0;
    if (now - lastLog > 30000) {
      console.log(`🔍 Gmail: Token check - Expiry: ${expiryDate ? new Date(expiryDate).toISOString() : 'Not set'}, Now: ${new Date(now).toISOString()}`);
      global[lastLogKey] = now;
    }
    
    if (expiryDate && (now >= expiryDate - fiveMinutes)) {
      const isAlreadyExpired = now >= expiryDate;
      
      // Check if a refresh is already in progress for this token
      const refreshKey = credentials.refresh_token;
      if (ongoingRefreshes.has(refreshKey)) {
        console.log('⏳ Gmail: Token refresh already in progress, waiting...');
        try {
          // Wait for the ongoing refresh to complete
          const result = await ongoingRefreshes.get(refreshKey);
          return result;
        } catch (error) {
          console.error('❌ Gmail: Ongoing refresh failed:', error.message);
          ongoingRefreshes.delete(refreshKey);
          return { error: 'REFRESH_FAILED', message: error.message };
        }
      }
      
      console.log(`🔄 Gmail: Access token ${isAlreadyExpired ? 'expired' : 'expiring soon'}, refreshing...`);
      
      // Create a promise for this refresh operation
      const refreshPromise = (async () => {
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
          throw refreshError;
        } finally {
          // Clean up the ongoing refresh tracking
          ongoingRefreshes.delete(refreshKey);
        }
      })();
      
      // Store the promise so other concurrent requests can wait for it
      ongoingRefreshes.set(refreshKey, refreshPromise);
      
      try {
        return await refreshPromise;
      } catch (refreshError) {
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
  console.log('📨 OAuth callback received');
  console.log('   Query params:', Object.keys(req.query));
  
  const code = req.query.code;
  if (!code) {
    console.error('❌ No authorization code provided');
    return res.status(400).send('No code provided');
  }

  try {
    console.log('🔄 Exchanging code for tokens...');
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
    
    console.log('✅ Gmail OAuth: Tokens received and saved');
    console.log('   - Access token:', tokens.access_token ? 'Present' : 'Missing');
    console.log('   - Refresh token:', tokens.refresh_token ? 'Present ✅' : 'Missing ❌');
    console.log('   - Expiry date:', tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : 'Not set');
    
    // Get frontend URL - use FRONTEND_URL or VITE_FRONTEND_URL or construct from request
    const frontendUrl = process.env.FRONTEND_URL || process.env.VITE_FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
    console.log('   - Redirecting to:', frontendUrl);
    
    if (!tokens.refresh_token) {
      console.warn('⚠️  WARNING: No refresh token received from Google!');
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
            (function() {
              console.log('═══════════════════════════════════════════════════');
              console.log('📝 OAuth Callback: Starting token storage process');
              console.log('═══════════════════════════════════════════════════');
              
              try {
                // Parse the token object directly (not double-stringified)
                const tokensString = '${tokensJson.replace(/'/g, "\\'")}';
                console.log('   Step 1: Token string received');
                console.log('   Token string length:', tokensString.length);
                console.log('   Token string preview:', tokensString.substring(0, 100) + '...');
                
                console.log('   Step 2: Parsing token JSON...');
                const tokens = JSON.parse(tokensString);
                console.log('   ✅ Token parsed successfully');
                console.log('   Token keys:', Object.keys(tokens).join(', '));
                
                console.log('   Step 3: Validating token fields...');
                console.log('   - access_token:', tokens.access_token ? '✅ Present (' + tokens.access_token.substring(0, 20) + '...)' : '❌ Missing');
                console.log('   - refresh_token:', tokens.refresh_token ? '✅ Present (' + tokens.refresh_token.substring(0, 20) + '...)' : '❌ Missing');
                console.log('   - token_type:', tokens.token_type || 'Not set');
                console.log('   - expiry_date:', tokens.expiry_date || 'Not set');
                
                if (tokens.expiry_date) {
                  const expiry = new Date(tokens.expiry_date);
                  const now = new Date();
                  const minutesUntilExpiry = Math.floor((expiry - now) / 60000);
                  console.log('   Token expiry:', expiry.toISOString());
                  console.log('   Current time:', now.toISOString());
                  console.log('   Time until expiry:', minutesUntilExpiry, 'minutes');
                  
                  if (minutesUntilExpiry < 0) {
                    console.error('   ⚠️  WARNING: Token is already expired!');
                  } else if (minutesUntilExpiry < 5) {
                    console.warn('   ⚠️  WARNING: Token expires in less than 5 minutes!');
                  }
                }
                
                if (!tokens.refresh_token) {
                  console.error('   ❌ CRITICAL: No refresh_token! Token cannot be refreshed after expiry!');
                }
                
                console.log('   Step 4: Storing token in localStorage...');
                console.log('   Storage key:', 'gmail_tokens');
                localStorage.setItem('gmail_tokens', tokensString);
                console.log('   ✅ Token stored successfully');
                
                // Verify storage
                console.log('   Step 5: Verifying storage...');
                const storedToken = localStorage.getItem('gmail_tokens');
                if (storedToken === tokensString) {
                  console.log('   ✅ Storage verification passed');
                } else {
                  console.error('   ❌ Storage verification failed!');
                  console.error('   Stored length:', storedToken?.length || 0);
                  console.error('   Expected length:', tokensString.length);
                }
                
                console.log('   Step 6: Preparing redirect...');
                console.log('   Redirect URL: ${frontendUrl}?auth=success');
                
                // Wait a bit to ensure localStorage is fully written
                setTimeout(function() {
                  console.log('   🔄 Redirecting to app...');
                  console.log('═══════════════════════════════════════════════════');
                  window.location.href = '${frontendUrl}?auth=success';
                }, 500);
              } catch (error) {
                console.error('═══════════════════════════════════════════════════');
                console.error('❌ OAuth Callback: FATAL ERROR');
                console.error('═══════════════════════════════════════════════════');
                console.error('Error type:', error.name);
                console.error('Error message:', error.message);
                console.error('Error stack:', error.stack);
                console.error('═══════════════════════════════════════════════════');
                document.body.innerHTML = '<div class="container"><h2>❌ Error</h2><p>' + error.message + '</p><pre>' + error.stack + '</pre></div>';
              }
            })();
          </script>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('❌ Error getting tokens:', error);
    const frontendUrl = process.env.FRONTEND_URL || process.env.VITE_FRONTEND_URL || `${req.protocol}://${req.get('host')}`;
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
