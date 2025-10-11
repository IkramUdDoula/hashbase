import express from 'express';
import cors from 'cors';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Path to store tokens
const TOKEN_PATH = path.join(__dirname, 'token.json');

// Initialize OAuth2 client
function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI || 'http://localhost:3001/oauth2callback'
  );
}

// Load saved credentials if they exist
function loadSavedCredentials() {
  try {
    if (fs.existsSync(TOKEN_PATH)) {
      const content = fs.readFileSync(TOKEN_PATH, 'utf-8');
      const credentials = JSON.parse(content);
      const oauth2Client = getOAuth2Client();
      oauth2Client.setCredentials(credentials);
      return oauth2Client;
    }
  } catch (err) {
    console.error('Error loading saved credentials:', err);
  }
  return null;
}

// Save credentials to file
function saveCredentials(client) {
  const credentials = client.credentials;
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(credentials));
}

// Get authorization URL
app.get('/api/auth/url', (req, res) => {
  const oauth2Client = getOAuth2Client();
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: ['https://www.googleapis.com/auth/gmail.readonly'],
  });
  res.json({ url: authUrl });
});

// OAuth2 callback
app.get('/oauth2callback', async (req, res) => {
  const code = req.query.code;
  if (!code) {
    return res.status(400).send('No code provided');
  }

  try {
    const oauth2Client = getOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    saveCredentials(oauth2Client);
    
    // Redirect back to the frontend app
    const frontendUrl = process.env.VITE_FRONTEND_URL || 'http://localhost:5173';
    res.send(`
      <html>
        <head>
          <title>Authentication Successful</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
            }
            .container {
              text-align: center;
              padding: 2rem;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 1rem;
              backdrop-filter: blur(10px);
            }
            h1 { margin: 0 0 1rem 0; }
            p { margin: 0 0 1.5rem 0; opacity: 0.9; }
            .spinner {
              border: 3px solid rgba(255, 255, 255, 0.3);
              border-top: 3px solid white;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              animation: spin 1s linear infinite;
              margin: 0 auto;
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
          <script>
            setTimeout(() => {
              window.location.href = '${frontendUrl}';
            }, 2000);
          </script>
        </head>
        <body>
          <div class="container">
            <h1>✅ Authentication Successful!</h1>
            <p>Redirecting you back to the app...</p>
            <div class="spinner"></div>
          </div>
        </body>
      </html>
    `);
  } catch (error) {
    console.error('Error getting tokens:', error);
    res.status(500).send(`
      <html>
        <head>
          <title>Authentication Failed</title>
          <style>
            body {
              font-family: system-ui, -apple-system, sans-serif;
              display: flex;
              align-items: center;
              justify-content: center;
              height: 100vh;
              margin: 0;
              background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
              color: white;
            }
            .container {
              text-align: center;
              padding: 2rem;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 1rem;
              backdrop-filter: blur(10px);
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1>❌ Authentication Failed</h1>
            <p>Error: ${error.message}</p>
            <p><a href="${process.env.VITE_FRONTEND_URL || 'http://localhost:5173'}" style="color: white;">Return to app</a></p>
          </div>
        </body>
      </html>
    `);
  }
});

// Check if authenticated
app.get('/api/auth/status', (req, res) => {
  const client = loadSavedCredentials();
  res.json({ authenticated: !!client });
});

// Fetch unread emails
app.get('/api/gmail/unread', async (req, res) => {
  try {
    const auth = loadSavedCredentials();
    
    if (!auth) {
      return res.status(401).json({ 
        error: 'Not authenticated',
        message: 'Please authenticate with Gmail first'
      });
    }

    const gmail = google.gmail({ version: 'v1', auth });
    
    // Get list of unread messages
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread',
      maxResults: 20,
    });

    const messages = response.data.messages || [];
    
    // Fetch details for each message
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
    
    res.json({ emails });
  } catch (error) {
    console.error('Error fetching emails:', error);
    res.status(500).json({ 
      error: 'Failed to fetch emails',
      message: error.message 
    });
  }
});

// Mark email as read
app.post('/api/gmail/mark-read', async (req, res) => {
  try {
    const { messageId } = req.body;
    const auth = loadSavedCredentials();
    
    if (!auth) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const gmail = google.gmail({ version: 'v1', auth });
    
    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        removeLabelIds: ['UNREAD'],
      },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error marking email as read:', error);
    res.status(500).json({ 
      error: 'Failed to mark email as read',
      message: error.message 
    });
  }
});

// ===== Netlify API Endpoints =====

// Check if Netlify is configured
app.get('/api/netlify/status', (req, res) => {
  // Only check headers - no fallback to .env
  const accessToken = req.headers['x-netlify-access-token'];
  const configured = !!accessToken;
  res.json({ configured });
});

// Fetch all deploys from all sites
app.get('/api/netlify/deploys', async (req, res) => {
  try {
    // Only accept token from headers - no fallback to .env
    const accessToken = req.headers['x-netlify-access-token'];
    
    if (!accessToken) {
      return res.status(401).json({ 
        error: 'Not configured',
        message: 'Please add your Netlify access token in Settings > Secrets'
      });
    }

    // Fetch all sites
    const sitesResponse = await fetch('https://api.netlify.com/api/v1/sites', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!sitesResponse.ok) {
      throw new Error(`Failed to fetch sites: ${sitesResponse.statusText}`);
    }

    const sites = await sitesResponse.json();
    
    // Fetch latest deploys for each site
    const deployPromises = sites.map(async (site) => {
      try {
        const deploysResponse = await fetch(
          `https://api.netlify.com/api/v1/sites/${site.id}/deploys?per_page=1`,
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );

        if (!deploysResponse.ok) {
          console.error(`Failed to fetch deploys for site ${site.name}`);
          return null;
        }

        const deploys = await deploysResponse.json();
        
        if (deploys.length === 0) {
          return null;
        }

        const deploy = deploys[0];
        
        return {
          id: deploy.id,
          siteId: site.id,
          siteName: site.name,
          state: deploy.state,
          context: deploy.context,
          branch: deploy.branch,
          commitRef: deploy.commit_ref,
          commitUrl: deploy.commit_url,
          createdAt: deploy.created_at,
          publishedAt: deploy.published_at,
          deployUrl: deploy.deploy_ssl_url || deploy.deploy_url,
          siteUrl: site.url,
          errorMessage: deploy.error_message,
          buildTime: deploy.deploy_time,
        };
      } catch (error) {
        console.error(`Error fetching deploys for site ${site.name}:`, error);
        return null;
      }
    });

    const allDeploys = await Promise.all(deployPromises);
    const validDeploys = allDeploys.filter(deploy => deploy !== null);
    
    // Sort by creation date (most recent first)
    validDeploys.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    res.json({ deploys: validDeploys });
  } catch (error) {
    console.error('Error fetching Netlify deploys:', error);
    res.status(500).json({ 
      error: 'Failed to fetch deploys',
      message: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`\nTo authenticate with Gmail, visit: http://localhost:${PORT}/api/auth/url`);
});
