/**
 * External API routes (Netlify, News, OpenAI, Claude, BD24Live, Railway)
 */

import Parser from 'rss-parser';

// BD24 Live cache
let bd24LiveCache = {
  articles: [],
  lastFetched: null,
  cacheExpiry: 30 * 60 * 1000
};

const rssParser = new Parser({
  customFields: {
    item: [
      ['media:content', 'media:content', {keepArray: false}],
      ['media:thumbnail', 'media:thumbnail', {keepArray: false}]
    ]
  }
});

// Helper function for fetch with timeout and retry
async function fetchWithTimeout(url, options = {}, timeout = 30000, retries = 2) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    
    // Retry on timeout or connection errors
    if (retries > 0 && (error.name === 'AbortError' || error.code === 'UND_ERR_CONNECT_TIMEOUT')) {
      console.log(`⚠️  Fetch timeout/error for ${url}, retrying... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s before retry
      return fetchWithTimeout(url, options, timeout, retries - 1);
    }
    
    throw error;
  }
}

export function addExternalRoutes(router) {
  // ===== Netlify API Endpoints =====
  
  router.get('/netlify/status', (req, res) => {
    const accessToken = req.headers['x-netlify-access-token'];
    res.json({ configured: !!accessToken });
  });

  router.get('/netlify/sites', async (req, res) => {
    try {
      const accessToken = req.headers['x-netlify-access-token'];
      
      if (!accessToken) {
        return res.status(401).json({ 
          error: 'Not configured',
          message: 'Please add your Netlify access token in Settings > Secrets'
        });
      }

      const sitesResponse = await fetchWithTimeout('https://api.netlify.com/api/v1/sites', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      if (!sitesResponse.ok) {
        throw new Error(`Failed to fetch sites: ${sitesResponse.statusText}`);
      }

      const sites = await sitesResponse.json();
      
      const simplifiedSites = sites.map(site => ({
        id: site.id,
        name: site.name,
        url: site.url,
        customDomain: site.custom_domain,
        createdAt: site.created_at,
      }));
      
      res.json({ sites: simplifiedSites });
    } catch (error) {
      console.error('Error fetching Netlify sites:', error);
      res.status(500).json({ 
        error: 'Failed to fetch sites',
        message: error.message 
      });
    }
  });

  router.get('/netlify/deploys', async (req, res) => {
    try {
      const accessToken = req.headers['x-netlify-access-token'];
      const siteIdsParam = req.query.siteIds;
      
      if (!accessToken) {
        return res.status(401).json({ 
          error: 'Not configured',
          message: 'Please add your Netlify access token in Settings > Secrets'
        });
      }

      const sitesResponse = await fetchWithTimeout('https://api.netlify.com/api/v1/sites', {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });

      if (!sitesResponse.ok) {
        throw new Error(`Failed to fetch sites: ${sitesResponse.statusText}`);
      }

      let sites = await sitesResponse.json();
      
      if (siteIdsParam) {
        const selectedSiteIds = siteIdsParam.split(',');
        sites = sites.filter(site => selectedSiteIds.includes(site.id));
      }
      
      const deployPromises = sites.map(async (site) => {
        try {
          const deploysResponse = await fetchWithTimeout(
            `https://api.netlify.com/api/v1/sites/${site.id}/deploys?per_page=1`,
            { headers: { 'Authorization': `Bearer ${accessToken}` } }
          );

          if (!deploysResponse.ok) return null;

          const deploys = await deploysResponse.json();
          if (deploys.length === 0) return null;

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
          return null;
        }
      });

      const allDeploys = await Promise.all(deployPromises);
      const validDeploys = allDeploys.filter(deploy => deploy !== null);
      validDeploys.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      res.json({ 
        deploys: validDeploys,
        filteredSites: siteIdsParam ? siteIdsParam.split(',').length : sites.length
      });
    } catch (error) {
      console.error('Error fetching Netlify deploys:', error);
      res.status(500).json({ 
        error: 'Failed to fetch deploys',
        message: error.message 
      });
    }
  });

  router.get('/netlify/deploy/:deployId', async (req, res) => {
    try {
      const accessToken = req.headers['x-netlify-access-token'];
      const { deployId } = req.params;
      
      if (!accessToken) {
        return res.status(401).json({ 
          error: 'Not configured',
          message: 'Please add your Netlify access token in Settings > Secrets'
        });
      }

      const deployResponse = await fetchWithTimeout(
        `https://api.netlify.com/api/v1/deploys/${deployId}`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      if (!deployResponse.ok) {
        throw new Error(`Failed to fetch deploy: ${deployResponse.statusText}`);
      }

      const deploy = await deployResponse.json();
      
      const details = {
        id: deploy.id,
        siteId: deploy.site_id,
        siteName: deploy.name,
        state: deploy.state,
        context: deploy.context,
        branch: deploy.branch,
        commitRef: deploy.commit_ref,
        commitUrl: deploy.commit_url,
        title: deploy.title,
        createdAt: deploy.created_at,
        updatedAt: deploy.updated_at,
        publishedAt: deploy.published_at,
        deployUrl: deploy.deploy_ssl_url || deploy.deploy_url,
        adminUrl: deploy.admin_url,
        screenshotUrl: deploy.screenshot_url,
        buildTime: deploy.deploy_time,
        errorMessage: deploy.error_message,
        summary: deploy.summary || {},
        framework: deploy.framework,
        functions: deploy.functions || [],
        edgeFunctions: deploy.edge_functions || [],
        buildLogUrl: deploy.build_log_url,
      };
      
      res.json({ deploy: details });
    } catch (error) {
      console.error('Error fetching deploy details:', error);
      res.status(500).json({ 
        error: 'Failed to fetch deploy details',
        message: error.message 
      });
    }
  });


  // ===== News API Endpoints =====
  
  router.get('/news/status', (req, res) => {
    const apiKey = process.env.NEWS_API_KEY;
    res.json({ configured: !!apiKey });
  });

  router.get('/news', async (req, res) => {
    try {
      const { country = 'us', category = 'general' } = req.query;
      const apiKey = process.env.NEWS_API_KEY;
      
      if (!apiKey) {
        return res.status(401).json({ 
          error: 'NewsAPI key not configured',
          message: 'Please add NEWS_API_KEY to your .env file',
          articles: []
        });
      }

      const response = await fetch(
        `https://newsapi.org/v2/top-headlines?country=${country}&category=${category}&pageSize=20&apiKey=${apiKey}`
      );
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'NewsAPI request failed');
      }

      const data = await response.json();
      
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
  
  router.post('/search', async (req, res) => {
    try {
      const { query } = req.body;
      
      if (!query) {
        return res.status(400).json({ 
          error: 'Query is required',
          message: 'Please provide a search query'
        });
      }

      const tavilyApiKey = req.headers['x-tavily-api-key'];
      
      if (!tavilyApiKey) {
        return res.status(401).json({ 
          error: 'Tavily API key not configured',
          message: 'Please add your Tavily API key in Settings > Secrets',
          results: []
        });
      }

      const response = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: tavilyApiKey,
          query: query,
          search_depth: 'basic',
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
      
      const results = [];
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
        results: []
      });
    }
  });


  // ===== OpenAI API Proxy =====
  
  router.post('/openai/chat', async (req, res) => {
    try {
      const { messages, model, settings } = req.body;
      const apiKey = req.headers['x-openai-api-key'];
      
      if (!apiKey) {
        return res.status(401).json({ 
          error: 'OpenAI API key not configured',
          message: 'Please add your OpenAI API key in Settings > Secrets'
        });
      }

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          temperature: settings?.temperature || 0.7,
          max_tokens: settings?.maxTokens || 2000,
          top_p: settings?.topP || 1,
          frequency_penalty: settings?.frequencyPenalty || 0,
          presence_penalty: settings?.presencePenalty || 0,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        return res.status(response.status).json({
          error: error.error?.message || 'OpenAI API request failed'
        });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = response.body.getReader();
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              res.end();
              break;
            }
            res.write(value);
          }
        } catch (error) {
          console.error('OpenAI Stream error:', error.message);
          res.end();
        }
      };
      pump();
    } catch (error) {
      console.error('Error proxying OpenAI request:', error.message);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Failed to process OpenAI request',
          message: error.message 
        });
      }
    }
  });

  // ===== Claude API Proxy =====
  
  router.post('/claude/messages', async (req, res) => {
    try {
      const { messages, model, settings, system } = req.body;
      const apiKey = req.headers['x-claude-api-key'];
      
      if (!apiKey) {
        return res.status(401).json({ 
          error: 'Claude API key not configured',
          message: 'Please add your Claude API key in Settings > Secrets'
        });
      }

      const requestBody = {
        model,
        messages,
        max_tokens: settings?.maxTokens || 2000,
        stream: true,
        temperature: settings?.temperature || 0.7,
        top_p: settings?.topP || 1,
      };

      if (system) {
        requestBody.system = system;
      }

      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
        return res.status(response.status).json({
          error: error.error?.message || 'Claude API request failed'
        });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = response.body.getReader();
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              res.end();
              break;
            }
            res.write(value);
          }
        } catch (error) {
          console.error('Claude Stream error:', error.message);
          res.end();
        }
      };
      pump();
    } catch (error) {
      console.error('Error proxying Claude request:', error.message);
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Failed to process Claude request',
          message: error.message 
        });
      }
    }
  });


  // ===== BD24 Live RSS Feed =====
  
  router.get('/bd24live/status', (req, res) => {
    res.json({ operational: true });
  });

  router.post('/bd24live/clear-cache', (req, res) => {
    bd24LiveCache = {
      articles: [],
      lastFetched: null,
      cacheExpiry: 30 * 60 * 1000
    };
    res.json({ success: true, message: 'Cache cleared' });
  });

  router.get('/bd24live/news', async (req, res) => {
    try {
      const now = Date.now();
      if (bd24LiveCache.lastFetched && 
          (now - bd24LiveCache.lastFetched) < bd24LiveCache.cacheExpiry &&
          bd24LiveCache.articles.length > 0) {
        return res.json({ 
          articles: bd24LiveCache.articles,
          cached: true,
          lastFetched: new Date(bd24LiveCache.lastFetched).toISOString()
        });
      }

      const feed = await rssParser.parseURL('https://www.bd24live.com/bangla/feed');
      
      const articles = feed.items.slice(0, 20).map((item) => {
        let image = null;
        
        if (item['media:content']) {
          if (item['media:content']['$'] && item['media:content']['$'].url) {
            image = decodeURIComponent(item['media:content']['$'].url);
          } else if (item['media:content'].url) {
            image = decodeURIComponent(item['media:content'].url);
          } else if (typeof item['media:content'] === 'string') {
            image = decodeURIComponent(item['media:content']);
          }
        } else if (item.enclosure && item.enclosure.url) {
          image = decodeURIComponent(item.enclosure.url);
        }
        
        return {
          title: item.title || 'No Title',
          description: item.contentSnippet || item.content || item.description || '',
          url: item.link || item.guid || '',
          image: image,
          publishedAt: item.pubDate || item.isoDate || new Date().toISOString(),
          source: feed.title || 'BD24 Live'
        };
      });

      bd24LiveCache = {
        articles: articles,
        lastFetched: now,
        cacheExpiry: 30 * 60 * 1000
      };
      
      res.json({ 
        articles: bd24LiveCache.articles,
        cached: false,
        lastFetched: new Date(now).toISOString()
      });
    } catch (error) {
      console.error('Error fetching BD24 Live RSS:', error);
      
      if (bd24LiveCache.articles.length > 0) {
        return res.json({ 
          articles: bd24LiveCache.articles,
          cached: true,
          stale: true,
          lastFetched: bd24LiveCache.lastFetched ? new Date(bd24LiveCache.lastFetched).toISOString() : null
        });
      }
      
      res.status(500).json({ 
        error: 'Failed to fetch BD24 Live news',
        message: error.message,
        articles: []
      });
    }
  });

  // ===== Railway API Proxy =====
  
  router.post('/railway/graphql', async (req, res) => {
    try {
      const { query, variables } = req.body;
      const token = req.headers['x-railway-token'];
      
      if (!token) {
        return res.status(401).json({ 
          error: 'Railway token not configured',
          message: 'Please add your Railway API token in Settings > Secrets'
        });
      }

      const response = await fetch('https://backboard.railway.com/graphql/v2', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ query, variables }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ errors: [{ message: 'Unknown error' }] }));
        return res.status(response.status).json(error);
      }

      const data = await response.json();
      
      if (data.errors) {
        return res.status(400).json(data);
      }

      res.json(data);
    } catch (error) {
      console.error('Error proxying Railway request:', error);
      res.status(500).json({ 
        errors: [{ message: error.message }]
      });
    }
  });
}
