import express from 'express';
import cors from 'cors';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import * as cheerio from 'cheerio';

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
    
    // Redirect back to the frontend app with success parameter
    const frontendUrl = process.env.VITE_FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}?auth=success`);
  } catch (error) {
    console.error('Error getting tokens:', error);
    const frontendUrl = process.env.VITE_FRONTEND_URL || 'http://localhost:5173';
    res.redirect(`${frontendUrl}?auth=error&message=${encodeURIComponent(error.message)}`);
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

// ===== News API Endpoints =====

// Check if NewsAPI is configured
app.get('/api/news/status', (req, res) => {
  const apiKey = process.env.NEWS_API_KEY;
  const configured = !!apiKey;
  res.json({ configured });
});

// Fetch news headlines
app.get('/api/news', async (req, res) => {
  try {
    const { country = 'us', category = 'general' } = req.query;
    const apiKey = process.env.NEWS_API_KEY;
    
    if (!apiKey) {
      return res.status(401).json({ 
        error: 'NewsAPI key not configured',
        message: 'Please add NEWS_API_KEY to your .env file. Get a free key from https://newsapi.org',
        articles: []
      });
    }

    // Fetch news from NewsAPI
    const response = await fetch(
      `https://newsapi.org/v2/top-headlines?country=${country}&category=${category}&pageSize=20&apiKey=${apiKey}`
    );
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'NewsAPI request failed');
    }

    const data = await response.json();
    
    // Filter out articles with removed content
    const articles = (data.articles || []).filter(article => 
      article.title && 
      article.title !== '[Removed]' && 
      article.url
    );
    
    res.json({ articles });
  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({ 
      error: 'Failed to fetch news',
      message: error.message,
      articles: []
    });
  }
});

// ===== Web Search API Endpoint =====

// Perform web search using Tavily AI Search API
app.post('/api/search', async (req, res) => {
  try {
    const { query } = req.body;
    
    if (!query) {
      return res.status(400).json({ 
        error: 'Query is required',
        message: 'Please provide a search query'
      });
    }

    // Get Tavily API key from request headers
    const tavilyApiKey = req.headers['x-tavily-api-key'];
    
    if (!tavilyApiKey) {
      return res.status(401).json({ 
        error: 'Tavily API key not configured',
        message: 'Please add your Tavily API key in Settings > Secrets to enable web search',
        results: []
      });
    }

    // Use Tavily AI Search API
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: tavilyApiKey,
        query: query,
        search_depth: 'basic', // 'basic' or 'advanced'
        include_answer: false,
        include_images: false,
        include_raw_content: false,
        max_results: 5,
      }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || errorData.message || 'Tavily API request failed');
    }

    const data = await response.json();
    
    // Format results
    const results = [];
    
    // Process Tavily results
    if (data.results && Array.isArray(data.results)) {
      data.results.forEach(result => {
        results.push({
          title: result.title || 'No title',
          snippet: result.content || result.snippet || '',
          url: result.url || '',
          score: result.score || 0,
        });
      });
    }
    
    // If no results, return empty array with helpful message
    if (results.length === 0) {
      return res.json({ 
        results: [],
        message: 'No search results found for this query'
      });
    }
    
    res.json({ results });
  } catch (error) {
    console.error('Error performing search:', error);
    res.status(500).json({ 
      error: 'Search failed',
      message: error.message,
      results: [] // Return empty results on error
    });
  }
});

// ===== Daily Star Scraper API Endpoints =====

// Cache for Daily Star news (to avoid excessive scraping)
let dailyStarCache = {
  articles: [],
  lastFetched: null,
  cacheExpiry: 30 * 60 * 1000 // 30 minutes in milliseconds
};

// Check if Daily Star scraper is operational
app.get('/api/dailystar/status', (req, res) => {
  res.json({ operational: true });
});

// Scrape latest news from The Daily Star
app.get('/api/dailystar/news', async (req, res) => {
  try {
    // Check if cache is still valid
    const now = Date.now();
    if (dailyStarCache.lastFetched && 
        (now - dailyStarCache.lastFetched) < dailyStarCache.cacheExpiry &&
        dailyStarCache.articles.length > 0) {
      console.log('Returning cached Daily Star news');
      return res.json({ 
        articles: dailyStarCache.articles,
        cached: true,
        lastFetched: new Date(dailyStarCache.lastFetched).toISOString()
      });
    }

    console.log('Scraping fresh Daily Star news...');
    
    // Fetch the homepage
    const response = await axios.get('https://www.thedailystar.net/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      },
      timeout: 10000
    });

    const $ = cheerio.load(response.data);
    const articles = [];

    // Scrape articles from the homepage
    // The Daily Star uses various article containers, we'll try multiple selectors
    const articleSelectors = [
      '.card-lg',
      '.card-md', 
      '.card-sm',
      'article',
      '.news-item'
    ];

    articleSelectors.forEach(selector => {
      $(selector).each((index, element) => {
        if (articles.length >= 20) return false; // Limit to 20 articles

        const $el = $(element);
        
        // Try to find title
        const titleEl = $el.find('h1, h2, h3, h4, .title, .headline').first();
        const title = titleEl.text().trim();
        
        // Try to find link
        let link = $el.find('a').first().attr('href') || titleEl.find('a').attr('href');
        if (link && !link.startsWith('http')) {
          link = `https://www.thedailystar.net${link.startsWith('/') ? '' : '/'}${link}`;
        }
        
        // Try to find description
        const description = $el.find('p, .excerpt, .description').first().text().trim();
        
        // Try to find image
        let image = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src');
        if (image && !image.startsWith('http')) {
          image = `https://www.thedailystar.net${image.startsWith('/') ? '' : '/'}${image}`;
        }
        
        // Try to find time/date
        const timeEl = $el.find('time, .time, .date, .published').first();
        const publishedAt = timeEl.attr('datetime') || timeEl.text().trim() || new Date().toISOString();

        // Only add if we have at least a title and link
        if (title && link && title.length > 10) {
          // Check if article already exists (avoid duplicates)
          const exists = articles.some(a => a.url === link || a.title === title);
          if (!exists) {
            articles.push({
              title,
              description: description || title,
              url: link,
              image: image || null,
              publishedAt: publishedAt,
              source: 'The Daily Star'
            });
          }
        }
      });
    });

    // If we didn't find enough articles with the above selectors, try a more generic approach
    if (articles.length < 10) {
      $('a').each((index, element) => {
        if (articles.length >= 20) return false;

        const $link = $(element);
        const href = $link.attr('href');
        
        // Look for article links (usually contain specific patterns)
        if (href && (href.includes('/news/') || href.includes('/article/') || href.includes('/story/'))) {
          const title = $link.text().trim() || $link.find('h1, h2, h3, h4').text().trim();
          
          let fullUrl = href;
          if (!fullUrl.startsWith('http')) {
            fullUrl = `https://www.thedailystar.net${href.startsWith('/') ? '' : '/'}${href}`;
          }

          if (title && title.length > 20) {
            const exists = articles.some(a => a.url === fullUrl || a.title === title);
            if (!exists) {
              articles.push({
                title,
                description: title,
                url: fullUrl,
                image: null,
                publishedAt: new Date().toISOString(),
                source: 'The Daily Star'
              });
            }
          }
        }
      });
    }

    // Update cache
    dailyStarCache = {
      articles: articles.slice(0, 20), // Keep only top 20
      lastFetched: now,
      cacheExpiry: 30 * 60 * 1000
    };

    console.log(`Scraped ${articles.length} articles from Daily Star`);
    
    res.json({ 
      articles: dailyStarCache.articles,
      cached: false,
      lastFetched: new Date(now).toISOString()
    });
  } catch (error) {
    console.error('Error scraping Daily Star:', error);
    
    // If we have cached data, return it even if expired
    if (dailyStarCache.articles.length > 0) {
      console.log('Returning stale cache due to error');
      return res.json({ 
        articles: dailyStarCache.articles,
        cached: true,
        stale: true,
        lastFetched: dailyStarCache.lastFetched ? new Date(dailyStarCache.lastFetched).toISOString() : null
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to scrape Daily Star news',
      message: error.message,
      articles: []
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`\nTo authenticate with Gmail, visit: http://localhost:${PORT}/api/auth/url`);
});
