import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import express from 'express'
import cors from 'cors'
import { google } from 'googleapis'
import dotenv from 'dotenv'
import fs from 'fs'
import { fileURLToPath } from 'url'
import Parser from 'rss-parser'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config()

// Initialize OAuth2 client
function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI || 'http://localhost:5000/oauth2callback'
  )
}

// Load credentials from request header
function loadCredentialsFromHeader(req) {
  try {
    const tokenHeader = req.headers['x-gmail-token']
    if (!tokenHeader) {
      return null
    }
    const credentials = JSON.parse(tokenHeader)
    const oauth2Client = getOAuth2Client()
    oauth2Client.setCredentials(credentials)
    return oauth2Client
  } catch (err) {
    console.error('Error loading credentials from header:', err)
    return null
  }
}

// Create Express app for API routes
function createApiServer() {
  const app = express()
  app.use(express.json())

  // Get authorization URL
  app.get('/api/auth/url', (req, res) => {
    const oauth2Client = getOAuth2Client()
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/gmail.readonly'],
    })
    res.json({ url: authUrl })
  })

  // OAuth2 callback
  app.get('/oauth2callback', async (req, res) => {
    const code = req.query.code
    if (!code) {
      return res.status(400).send('No code provided')
    }

    try {
      const oauth2Client = getOAuth2Client()
      const { tokens } = await oauth2Client.getToken(code)
      oauth2Client.setCredentials(tokens)
      
      // Return tokens to be stored in localStorage
      const tokensJson = JSON.stringify(tokens)
      
      // Redirect back to the frontend app with success parameter
      const frontendUrl = process.env.VITE_FRONTEND_URL || 'http://localhost:5000'
      res.send(`
        <html>
          <head>
            <title>Authentication Successful</title>
            <script>
              // Store tokens in localStorage
              localStorage.setItem('gmail_tokens', '${tokensJson.replace(/'/g, "\\'")}')
              // Redirect immediately with success parameter
              window.location.href = '${frontendUrl}?auth=success';
            </script>
          </head>
          <body>
            <p>Redirecting...</p>
          </body>
        </html>
      `)
    } catch (error) {
      console.error('Error getting tokens:', error)
      const frontendUrl = process.env.VITE_FRONTEND_URL || 'http://localhost:5000'
      const errorMessage = encodeURIComponent(error.message)
      res.status(500).send(`
        <html>
          <head>
            <title>Authentication Failed</title>
            <script>
              // Redirect with error parameter
              window.location.href = '${frontendUrl}?auth=error&message=${errorMessage}';
            </script>
          </head>
          <body>
            <p>Redirecting...</p>
          </body>
        </html>
      `)
    }
  })

  // Check if authenticated (checks if token is provided in header)
  app.get('/api/auth/status', (req, res) => {
    const tokenHeader = req.headers['x-gmail-token']
    res.json({ authenticated: !!tokenHeader })
  })

  // Fetch unread emails
  app.get('/api/gmail/unread', async (req, res) => {
    try {
      const auth = loadCredentialsFromHeader(req)
      
      if (!auth) {
        console.log('❌ Gmail: Not authenticated - no token provided in header')
        return res.status(401).json({ 
          error: 'Not authenticated',
          message: 'Please authenticate with Gmail first'
        })
      }

      console.log('✅ Gmail: Credentials loaded, fetching emails...')
      const gmail = google.gmail({ version: 'v1', auth })
      
      // Get list of unread messages
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: 'is:unread',
        maxResults: 20,
      })

      const messages = response.data.messages || []
      console.log(`📧 Gmail: Found ${messages.length} unread messages`)
      
      // Fetch details for each message
      const emailPromises = messages.map(async (message) => {
        const details = await gmail.users.messages.get({
          userId: 'me',
          id: message.id,
          format: 'full',
        })

        const headers = details.data.payload.headers
        const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject'
        const from = headers.find(h => h.name === 'From')?.value || 'Unknown'
        const date = headers.find(h => h.name === 'Date')?.value || new Date().toISOString()

        return {
          id: message.id,
          subject,
          from,
          date: new Date(date).toISOString(),
          snippet: details.data.snippet,
        }
      })

      const emails = await Promise.all(emailPromises)
      
      res.json({ emails })
    } catch (error) {
      console.error('❌ Gmail API Error:', error.message)
      console.error('Full error:', error)
      res.status(500).json({ 
        error: 'Failed to fetch emails',
        message: error.message 
      })
    }
  })

  // Mark email as read
  app.post('/api/gmail/mark-read', async (req, res) => {
    try {
      const { messageId } = req.body
      const auth = loadCredentialsFromHeader(req)
      
      if (!auth) {
        return res.status(401).json({ error: 'Not authenticated' })
      }

      const gmail = google.gmail({ version: 'v1', auth })
      
      await gmail.users.messages.modify({
        userId: 'me',
        id: messageId,
        requestBody: {
          removeLabelIds: ['UNREAD'],
        },
      })

      res.json({ success: true })
    } catch (error) {
      console.error('Error marking email as read:', error)
      res.status(500).json({ 
        error: 'Failed to mark email as read',
        message: error.message 
      })
    }
  })

  // ===== Netlify API Endpoints =====

  // Check if Netlify is configured
  app.get('/api/netlify/status', (req, res) => {
    const accessToken = req.headers['x-netlify-access-token']
    const configured = !!accessToken
    res.json({ configured })
  })

  // ===== News API Endpoints =====

  // Check if NewsAPI is configured
  app.get('/api/news/status', (req, res) => {
    const apiKey = process.env.NEWS_API_KEY
    const configured = !!apiKey
    res.json({ configured })
  })

  // Fetch news headlines
  app.get('/api/news', async (req, res) => {
    try {
      const { country = 'us', category = 'general' } = req.query
      const apiKey = process.env.NEWS_API_KEY
      
      if (!apiKey) {
        return res.status(401).json({ 
          error: 'NewsAPI key not configured',
          message: 'Please add NEWS_API_KEY to your .env file. Get a free key from https://newsapi.org',
          articles: []
        })
      }

      // Fetch news from NewsAPI
      const response = await fetch(
        `https://newsapi.org/v2/top-headlines?country=${country}&category=${category}&pageSize=20&apiKey=${apiKey}`
      )
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || 'NewsAPI request failed')
      }

      const data = await response.json()
      
      // Filter out articles with removed content
      const articles = (data.articles || []).filter(article => 
        article.title && 
        article.title !== '[Removed]' && 
        article.url
      )
      
      res.json({ articles })
    } catch (error) {
      console.error('Error fetching news:', error)
      res.status(500).json({ 
        error: 'Failed to fetch news',
        message: error.message,
        articles: []
      })
    }
  })

  // ===== Web Search API Endpoint =====

  // Perform web search using Tavily AI Search API
  app.post('/api/search', async (req, res) => {
    try {
      const { query } = req.body
      
      if (!query) {
        return res.status(400).json({ 
          error: 'Query is required',
          message: 'Please provide a search query'
        })
      }

      // Get Tavily API key from request headers
      const tavilyApiKey = req.headers['x-tavily-api-key']
      
      if (!tavilyApiKey) {
        return res.status(401).json({ 
          error: 'Tavily API key not configured',
          message: 'Please add your Tavily API key in Settings > Secrets to enable web search',
          results: []
        })
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
      })
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || errorData.message || 'Tavily API request failed')
      }

      const data = await response.json()
      
      // Format results
      const results = []
      
      // Process Tavily results
      if (data.results && Array.isArray(data.results)) {
        data.results.forEach(result => {
          results.push({
            title: result.title || 'No title',
            snippet: result.content || result.snippet || '',
            url: result.url || '',
            score: result.score || 0,
          })
        })
      }
      
      // If no results, return empty array with helpful message
      if (results.length === 0) {
        return res.json({ 
          results: [],
          message: 'No search results found for this query'
        })
      }
      
      res.json({ results })
    } catch (error) {
      console.error('Error performing search:', error)
      res.status(500).json({ 
        error: 'Search failed',
        message: error.message,
        results: [] // Return empty results on error
      })
    }
  })

  // Fetch all deploys from all sites
  app.get('/api/netlify/deploys', async (req, res) => {
    try {
      const accessToken = req.headers['x-netlify-access-token']
      
      if (!accessToken) {
        return res.status(401).json({ 
          error: 'Not configured',
          message: 'Please add your Netlify access token in Settings > Secrets'
        })
      }

      // Fetch all sites
      const sitesResponse = await fetch('https://api.netlify.com/api/v1/sites', {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      })

      if (!sitesResponse.ok) {
        throw new Error(`Failed to fetch sites: ${sitesResponse.statusText}`)
      }

      const sites = await sitesResponse.json()
      
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
          )

          if (!deploysResponse.ok) {
            console.error(`Failed to fetch deploys for site ${site.name}`)
            return null
          }

          const deploys = await deploysResponse.json()
          
          if (deploys.length === 0) {
            return null
          }

          const deploy = deploys[0]
          
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
          }
        } catch (error) {
          console.error(`Error fetching deploys for site ${site.name}:`, error)
          return null
        }
      })

      const allDeploys = await Promise.all(deployPromises)
      const validDeploys = allDeploys.filter(deploy => deploy !== null)
      
      // Sort by creation date (most recent first)
      validDeploys.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      
      res.json({ deploys: validDeploys })
    } catch (error) {
      console.error('Error fetching Netlify deploys:', error)
      res.status(500).json({ 
        error: 'Failed to fetch deploys',
        message: error.message 
      })
    }
  })

  // ===== OpenAI API Proxy Endpoint =====

  // Proxy OpenAI chat completions (streaming)
  app.post('/api/openai/chat', async (req, res) => {
    try {
      const { messages, model, settings } = req.body
      const apiKey = req.headers['x-openai-api-key']
      
      console.log('🤖 OpenAI: Request received')
      console.log('   Model:', model)
      console.log('   Messages count:', messages?.length)
      console.log('   API Key present:', !!apiKey)
      
      if (!apiKey) {
        console.error('❌ OpenAI: No API key provided')
        return res.status(401).json({ 
          error: 'OpenAI API key not configured',
          message: 'Please add your OpenAI API key in Settings > Secrets'
        })
      }

      console.log('🤖 OpenAI: Proxying request for model:', model)

      // Make request to OpenAI API
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
      })

      console.log('🤖 OpenAI: Response status:', response.status)

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
        console.error('❌ OpenAI API Error:')
        console.error('   Status:', response.status)
        console.error('   Error:', JSON.stringify(error, null, 2))
        return res.status(response.status).json({
          error: error.error?.message || 'OpenAI API request failed'
        })
      }

      console.log('✅ OpenAI: Streaming response...')

      // Set headers for streaming
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')

      // Stream the response using Web Streams API
      const reader = response.body.getReader()
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              console.log('✅ OpenAI: Stream completed')
              res.end()
              break
            }
            res.write(value)
          }
        } catch (error) {
          console.error('❌ OpenAI Stream error:')
          console.error('   Error:', error.message)
          console.error('   Stack:', error.stack)
          res.end()
        }
      }
      pump()
    } catch (error) {
      console.error('❌ Error proxying OpenAI request:')
      console.error('   Message:', error.message)
      console.error('   Stack:', error.stack)
      console.error('   Full error:', error)
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Failed to process OpenAI request',
          message: error.message 
        })
      }
    }
  })

  // ===== Claude API Proxy Endpoint =====

  // Proxy Claude messages (streaming)
  app.post('/api/claude/messages', async (req, res) => {
    try {
      const { messages, model, settings, system } = req.body
      const apiKey = req.headers['x-claude-api-key']
      
      console.log('🤖 Claude: Request received')
      console.log('   Model:', model)
      console.log('   Messages count:', messages?.length)
      console.log('   API Key present:', !!apiKey)
      console.log('   System message:', !!system)
      
      if (!apiKey) {
        console.error('❌ Claude: No API key provided')
        return res.status(401).json({ 
          error: 'Claude API key not configured',
          message: 'Please add your Claude API key in Settings > Secrets'
        })
      }

      console.log('🤖 Claude: Proxying request for model:', model)

      const requestBody = {
        model,
        messages,
        max_tokens: settings?.maxTokens || 2000,
        stream: true,
        temperature: settings?.temperature || 0.7,
        top_p: settings?.topP || 1,
      }

      if (system) {
        requestBody.system = system
      }

      // Make request to Claude API
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify(requestBody),
      })

      console.log('🤖 Claude: Response status:', response.status)

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }))
        console.error('❌ Claude API Error:')
        console.error('   Status:', response.status)
        console.error('   Error:', JSON.stringify(error, null, 2))
        return res.status(response.status).json({
          error: error.error?.message || 'Claude API request failed'
        })
      }

      console.log('✅ Claude: Streaming response...')

      // Set headers for streaming
      res.setHeader('Content-Type', 'text/event-stream')
      res.setHeader('Cache-Control', 'no-cache')
      res.setHeader('Connection', 'keep-alive')

      // Stream the response using Web Streams API
      const reader = response.body.getReader()
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) {
              console.log('✅ Claude: Stream completed')
              res.end()
              break
            }
            res.write(value)
          }
        } catch (error) {
          console.error('❌ Claude Stream error:')
          console.error('   Error:', error.message)
          console.error('   Stack:', error.stack)
          res.end()
        }
      }
      pump()
    } catch (error) {
      console.error('❌ Error proxying Claude request:')
      console.error('   Message:', error.message)
      console.error('   Stack:', error.stack)
      console.error('   Full error:', error)
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Failed to process Claude request',
          message: error.message 
        })
      }
    }
  })

  // ===== BD24 Live RSS Feed API Endpoints =====

  // Cache for BD24 Live news (to avoid excessive requests)
  let bd24LiveCache = {
    articles: [],
    lastFetched: null,
    cacheExpiry: 30 * 60 * 1000 // 30 minutes in milliseconds
  }

  // Initialize RSS parser
  const rssParser = new Parser()

  // Check if BD24 Live RSS feed is operational
  app.get('/api/bd24live/status', (req, res) => {
    res.json({ operational: true })
  })

  // Fetch latest news from BD24 Live RSS feed
  app.get('/api/bd24live/news', async (req, res) => {
    try {
      // Check if cache is still valid
      const now = Date.now()
      if (bd24LiveCache.lastFetched && 
          (now - bd24LiveCache.lastFetched) < bd24LiveCache.cacheExpiry &&
          bd24LiveCache.articles.length > 0) {
        console.log('✅ Returning cached BD24 Live news')
        return res.json({ 
          articles: bd24LiveCache.articles,
          cached: true,
          lastFetched: new Date(bd24LiveCache.lastFetched).toISOString()
        })
      }

      console.log('🔄 Fetching fresh BD24 Live news from RSS feed...')
      
      // Parse RSS feed
      const feed = await rssParser.parseURL('https://www.bd24live.com/bangla/feed')
      
      console.log(`📰 RSS Feed: ${feed.title}`)
      console.log(`📊 Total items in feed: ${feed.items.length}`)
      
      // Convert RSS items to article format
      const articles = feed.items.slice(0, 20).map((item, index) => {
        // Extract image from media:content or enclosure
        let image = null
        if (item['media:content'] && item['media:content']['$'] && item['media:content']['$'].url) {
          image = item['media:content']['$'].url
        } else if (item.enclosure && item.enclosure.url) {
          image = item.enclosure.url
        }
        
        return {
          title: item.title || 'No Title',
          description: item.contentSnippet || item.content || item.description || '',
          url: item.link || item.guid || '',
          image: image,
          publishedAt: item.pubDate || item.isoDate || new Date().toISOString(),
          source: feed.title || 'BD24 Live'
        }
      })

      console.log(`\n📊 ========== RSS PARSING SUMMARY ==========`)
      console.log(`Total articles parsed: ${articles.length}`)
      
      if (articles.length > 0) {
        console.log(`📅 Sample articles:`)
        articles.slice(0, 3).forEach((article, idx) => {
          console.log(`  ${idx + 1}. ${article.title.substring(0, 60)}...`)
          console.log(`     Published: ${article.publishedAt}`)
        })
        console.log(`========================================\n`)
      }

      // Update cache
      bd24LiveCache = {
        articles: articles,
        lastFetched: now,
        cacheExpiry: 30 * 60 * 1000
      }
      
      res.json({ 
        articles: bd24LiveCache.articles,
        cached: false,
        lastFetched: new Date(now).toISOString()
      })
    } catch (error) {
      console.error('❌ Error fetching BD24 Live RSS:', error)
      
      // If we have cached data, return it even if expired
      if (bd24LiveCache.articles.length > 0) {
        console.log('⚠️  Returning stale cache due to error')
        return res.json({ 
          articles: bd24LiveCache.articles,
          cached: true,
          stale: true,
          lastFetched: bd24LiveCache.lastFetched ? new Date(bd24LiveCache.lastFetched).toISOString() : null
        })
      }
      
      res.status(500).json({ 
        error: 'Failed to fetch BD24 Live news',
        message: error.message,
        articles: []
      })
    }
  })

  return app
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-server',
      configureServer(server) {
        const apiApp = createApiServer()
        server.middlewares.use(apiApp)
        console.log('\n✅ API server integrated with Vite dev server')
        console.log('📧 Gmail authentication available at: http://localhost:5000/api/auth/url\n')
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5000,
  },
})
