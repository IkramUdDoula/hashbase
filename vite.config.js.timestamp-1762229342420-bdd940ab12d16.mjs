// vite.config.js
import { defineConfig } from "file:///D:/Dev/hashbase/node_modules/vite/dist/node/index.js";
import react from "file:///D:/Dev/hashbase/node_modules/@vitejs/plugin-react/dist/index.js";
import path from "path";
import express from "file:///D:/Dev/hashbase/node_modules/express/index.js";
import cors from "file:///D:/Dev/hashbase/node_modules/cors/lib/index.js";
import { google } from "file:///D:/Dev/hashbase/node_modules/googleapis/build/src/index.js";
import dotenv from "file:///D:/Dev/hashbase/node_modules/dotenv/lib/main.js";
import { fileURLToPath } from "url";
import Parser from "file:///D:/Dev/hashbase/node_modules/rss-parser/index.js";
var __vite_injected_original_import_meta_url = "file:///D:/Dev/hashbase/vite.config.js";
var __filename = fileURLToPath(__vite_injected_original_import_meta_url);
var __dirname = path.dirname(__filename);
dotenv.config();
function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GMAIL_CLIENT_ID,
    process.env.GMAIL_CLIENT_SECRET,
    process.env.GMAIL_REDIRECT_URI
  );
}
function loadCredentialsFromHeader(req) {
  try {
    const tokenHeader = req.headers["x-gmail-token"];
    if (!tokenHeader) {
      return null;
    }
    const credentials = JSON.parse(tokenHeader);
    const oauth2Client = getOAuth2Client();
    oauth2Client.setCredentials(credentials);
    return oauth2Client;
  } catch (err) {
    console.error("Error loading credentials from header:", err);
    return null;
  }
}
function createApiServer() {
  const app = express();
  app.use(express.json());
  app.get("/api/auth/url", (req, res) => {
    const oauth2Client = getOAuth2Client();
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: ["https://www.googleapis.com/auth/gmail.readonly"]
    });
    res.json({ url: authUrl });
  });
  app.get("/oauth2callback", async (req, res) => {
    const code = req.query.code;
    if (!code) {
      return res.status(400).send("No code provided");
    }
    try {
      const oauth2Client = getOAuth2Client();
      const { tokens } = await oauth2Client.getToken(code);
      oauth2Client.setCredentials(tokens);
      const tokensJson = JSON.stringify(tokens);
      const frontendUrl = process.env.VITE_FRONTEND_URL;
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
      `);
    } catch (error) {
      console.error("Error getting tokens:", error);
      const frontendUrl = process.env.VITE_FRONTEND_URL;
      const errorMessage = encodeURIComponent(error.message);
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
      `);
    }
  });
  app.get("/api/auth/status", (req, res) => {
    const tokenHeader = req.headers["x-gmail-token"];
    res.json({ authenticated: !!tokenHeader });
  });
  app.get("/api/gmail/unread", async (req, res) => {
    try {
      const auth = loadCredentialsFromHeader(req);
      if (!auth) {
        console.log("\u274C Gmail: Not authenticated - no token provided in header");
        return res.status(401).json({
          error: "Not authenticated",
          message: "Please authenticate with Gmail first"
        });
      }
      console.log("\u2705 Gmail: Credentials loaded, fetching emails...");
      const gmail = google.gmail({ version: "v1", auth });
      const response = await gmail.users.messages.list({
        userId: "me",
        q: "is:unread",
        maxResults: 20
      });
      const messages = response.data.messages || [];
      console.log(`\u{1F4E7} Gmail: Found ${messages.length} unread messages`);
      const emailPromises = messages.map(async (message) => {
        const details = await gmail.users.messages.get({
          userId: "me",
          id: message.id,
          format: "full"
        });
        const headers = details.data.payload.headers;
        const subject = headers.find((h) => h.name === "Subject")?.value || "No Subject";
        const from = headers.find((h) => h.name === "From")?.value || "Unknown";
        const date = headers.find((h) => h.name === "Date")?.value || (/* @__PURE__ */ new Date()).toISOString();
        return {
          id: message.id,
          subject,
          from,
          date: new Date(date).toISOString(),
          snippet: details.data.snippet
        };
      });
      const emails = await Promise.all(emailPromises);
      res.json({ emails });
    } catch (error) {
      console.error("\u274C Gmail API Error:", error.message);
      console.error("Full error:", error);
      res.status(500).json({
        error: "Failed to fetch emails",
        message: error.message
      });
    }
  });
  app.post("/api/gmail/mark-read", async (req, res) => {
    try {
      const { messageId } = req.body;
      const auth = loadCredentialsFromHeader(req);
      if (!auth) {
        return res.status(401).json({ error: "Not authenticated" });
      }
      const gmail = google.gmail({ version: "v1", auth });
      await gmail.users.messages.modify({
        userId: "me",
        id: messageId,
        requestBody: {
          removeLabelIds: ["UNREAD"]
        }
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking email as read:", error);
      res.status(500).json({
        error: "Failed to mark email as read",
        message: error.message
      });
    }
  });
  app.get("/api/netlify/status", (req, res) => {
    const accessToken = req.headers["x-netlify-access-token"];
    const configured = !!accessToken;
    res.json({ configured });
  });
  app.get("/api/news/status", (req, res) => {
    const apiKey = process.env.NEWS_API_KEY;
    const configured = !!apiKey;
    res.json({ configured });
  });
  app.get("/api/news", async (req, res) => {
    try {
      const { country = "us", category = "general" } = req.query;
      const apiKey = process.env.NEWS_API_KEY;
      if (!apiKey) {
        return res.status(401).json({
          error: "NewsAPI key not configured",
          message: "Please add NEWS_API_KEY to your .env file. Get a free key from https://newsapi.org",
          articles: []
        });
      }
      const response = await fetch(
        `https://newsapi.org/v2/top-headlines?country=${country}&category=${category}&pageSize=20&apiKey=${apiKey}`
      );
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "NewsAPI request failed");
      }
      const data = await response.json();
      const articles = (data.articles || []).filter(
        (article) => article.title && article.title !== "[Removed]" && article.url
      );
      res.json({ articles });
    } catch (error) {
      console.error("Error fetching news:", error);
      res.status(500).json({
        error: "Failed to fetch news",
        message: error.message,
        articles: []
      });
    }
  });
  app.post("/api/search", async (req, res) => {
    try {
      const { query } = req.body;
      if (!query) {
        return res.status(400).json({
          error: "Query is required",
          message: "Please provide a search query"
        });
      }
      const tavilyApiKey = req.headers["x-tavily-api-key"];
      if (!tavilyApiKey) {
        return res.status(401).json({
          error: "Tavily API key not configured",
          message: "Please add your Tavily API key in Settings > Secrets to enable web search",
          results: []
        });
      }
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          api_key: tavilyApiKey,
          query,
          search_depth: "basic",
          // 'basic' or 'advanced'
          include_answer: false,
          include_images: false,
          include_raw_content: false,
          max_results: 5
        })
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || errorData.message || "Tavily API request failed");
      }
      const data = await response.json();
      const results = [];
      if (data.results && Array.isArray(data.results)) {
        data.results.forEach((result) => {
          results.push({
            title: result.title || "No title",
            snippet: result.content || result.snippet || "",
            url: result.url || "",
            score: result.score || 0
          });
        });
      }
      if (results.length === 0) {
        return res.json({
          results: [],
          message: "No search results found for this query"
        });
      }
      res.json({ results });
    } catch (error) {
      console.error("Error performing search:", error);
      res.status(500).json({
        error: "Search failed",
        message: error.message,
        results: []
        // Return empty results on error
      });
    }
  });
  app.get("/api/netlify/sites", async (req, res) => {
    try {
      const accessToken = req.headers["x-netlify-access-token"];
      if (!accessToken) {
        return res.status(401).json({
          error: "Not configured",
          message: "Please add your Netlify access token in Settings > Secrets"
        });
      }
      const sitesResponse = await fetch("https://api.netlify.com/api/v1/sites", {
        headers: {
          "Authorization": `Bearer ${accessToken}`
        }
      });
      if (!sitesResponse.ok) {
        throw new Error(`Failed to fetch sites: ${sitesResponse.statusText}`);
      }
      const sites = await sitesResponse.json();
      const simplifiedSites = sites.map((site) => ({
        id: site.id,
        name: site.name,
        url: site.url,
        customDomain: site.custom_domain,
        createdAt: site.created_at
      }));
      res.json({ sites: simplifiedSites });
    } catch (error) {
      console.error("Error fetching Netlify sites:", error);
      res.status(500).json({
        error: "Failed to fetch sites",
        message: error.message
      });
    }
  });
  app.get("/api/netlify/deploys", async (req, res) => {
    try {
      const accessToken = req.headers["x-netlify-access-token"];
      const siteIdsParam = req.query.siteIds;
      if (!accessToken) {
        return res.status(401).json({
          error: "Not configured",
          message: "Please add your Netlify access token in Settings > Secrets"
        });
      }
      const sitesResponse = await fetch("https://api.netlify.com/api/v1/sites", {
        headers: {
          "Authorization": `Bearer ${accessToken}`
        }
      });
      if (!sitesResponse.ok) {
        throw new Error(`Failed to fetch sites: ${sitesResponse.statusText}`);
      }
      let sites = await sitesResponse.json();
      if (siteIdsParam) {
        const selectedSiteIds = siteIdsParam.split(",");
        sites = sites.filter((site) => selectedSiteIds.includes(site.id));
      }
      const deployPromises = sites.map(async (site) => {
        try {
          const deploysResponse = await fetch(
            `https://api.netlify.com/api/v1/sites/${site.id}/deploys?per_page=1`,
            {
              headers: {
                "Authorization": `Bearer ${accessToken}`
              }
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
            buildTime: deploy.deploy_time
          };
        } catch (error) {
          console.error(`Error fetching deploys for site ${site.name}:`, error);
          return null;
        }
      });
      const allDeploys = await Promise.all(deployPromises);
      const validDeploys = allDeploys.filter((deploy) => deploy !== null);
      validDeploys.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      res.json({
        deploys: validDeploys,
        filteredSites: siteIdsParam ? siteIdsParam.split(",").length : sites.length
      });
    } catch (error) {
      console.error("Error fetching Netlify deploys:", error);
      res.status(500).json({
        error: "Failed to fetch deploys",
        message: error.message
      });
    }
  });
  app.get("/api/netlify/deploy/:deployId", async (req, res) => {
    try {
      const accessToken = req.headers["x-netlify-access-token"];
      const { deployId } = req.params;
      if (!accessToken) {
        return res.status(401).json({
          error: "Not configured",
          message: "Please add your Netlify access token in Settings > Secrets"
        });
      }
      const deployResponse = await fetch(
        `https://api.netlify.com/api/v1/deploys/${deployId}`,
        {
          headers: {
            "Authorization": `Bearer ${accessToken}`
          }
        }
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
        // Timestamps
        createdAt: deploy.created_at,
        updatedAt: deploy.updated_at,
        publishedAt: deploy.published_at,
        // URLs
        deployUrl: deploy.deploy_ssl_url || deploy.deploy_url,
        adminUrl: deploy.admin_url,
        screenshotUrl: deploy.screenshot_url,
        // Build info
        buildTime: deploy.deploy_time,
        errorMessage: deploy.error_message,
        // Summary
        summary: deploy.summary || {},
        // Framework
        framework: deploy.framework,
        // User info
        deployedBy: deploy.published_deploy ? {
          name: deploy.published_deploy.name,
          email: deploy.published_deploy.email
        } : null,
        // File changes
        filesChanged: deploy.summary?.status === "ready" ? {
          newFiles: deploy.summary?.messages?.filter((m) => m.type === "new").length || 0,
          updatedFiles: deploy.summary?.messages?.filter((m) => m.type === "changed").length || 0,
          deletedFiles: deploy.summary?.messages?.filter((m) => m.type === "deleted").length || 0
        } : null,
        // Functions and edge functions
        functions: deploy.functions || [],
        edgeFunctions: deploy.edge_functions || [],
        // Build log URL (if available)
        buildLogUrl: deploy.build_log_url
      };
      res.json({ deploy: details });
    } catch (error) {
      console.error("Error fetching deploy details:", error);
      res.status(500).json({
        error: "Failed to fetch deploy details",
        message: error.message
      });
    }
  });
  app.post("/api/openai/chat", async (req, res) => {
    try {
      const { messages, model, settings } = req.body;
      const apiKey = req.headers["x-openai-api-key"];
      console.log("\u{1F916} OpenAI: Request received");
      console.log("   Model:", model);
      console.log("   Messages count:", messages?.length);
      console.log("   API Key present:", !!apiKey);
      if (!apiKey) {
        console.error("\u274C OpenAI: No API key provided");
        return res.status(401).json({
          error: "OpenAI API key not configured",
          message: "Please add your OpenAI API key in Settings > Secrets"
        });
      }
      console.log("\u{1F916} OpenAI: Proxying request for model:", model);
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          temperature: settings?.temperature || 0.7,
          max_tokens: settings?.maxTokens || 2e3,
          top_p: settings?.topP || 1,
          frequency_penalty: settings?.frequencyPenalty || 0,
          presence_penalty: settings?.presencePenalty || 0
        })
      });
      console.log("\u{1F916} OpenAI: Response status:", response.status);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: "Unknown error" } }));
        console.error("\u274C OpenAI API Error:");
        console.error("   Status:", response.status);
        console.error("   Error:", JSON.stringify(error, null, 2));
        return res.status(response.status).json({
          error: error.error?.message || "OpenAI API request failed"
        });
      }
      console.log("\u2705 OpenAI: Streaming response...");
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      const reader = response.body.getReader();
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log("\u2705 OpenAI: Stream completed");
              res.end();
              break;
            }
            res.write(value);
          }
        } catch (error) {
          console.error("\u274C OpenAI Stream error:");
          console.error("   Error:", error.message);
          console.error("   Stack:", error.stack);
          res.end();
        }
      };
      pump();
    } catch (error) {
      console.error("\u274C Error proxying OpenAI request:");
      console.error("   Message:", error.message);
      console.error("   Stack:", error.stack);
      console.error("   Full error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          error: "Failed to process OpenAI request",
          message: error.message
        });
      }
    }
  });
  app.post("/api/claude/messages", async (req, res) => {
    try {
      const { messages, model, settings, system } = req.body;
      const apiKey = req.headers["x-claude-api-key"];
      console.log("\u{1F916} Claude: Request received");
      console.log("   Model:", model);
      console.log("   Messages count:", messages?.length);
      console.log("   API Key present:", !!apiKey);
      console.log("   System message:", !!system);
      if (!apiKey) {
        console.error("\u274C Claude: No API key provided");
        return res.status(401).json({
          error: "Claude API key not configured",
          message: "Please add your Claude API key in Settings > Secrets"
        });
      }
      console.log("\u{1F916} Claude: Proxying request for model:", model);
      const requestBody = {
        model,
        messages,
        max_tokens: settings?.maxTokens || 2e3,
        stream: true,
        temperature: settings?.temperature || 0.7,
        top_p: settings?.topP || 1
      };
      if (system) {
        requestBody.system = system;
      }
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify(requestBody)
      });
      console.log("\u{1F916} Claude: Response status:", response.status);
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: { message: "Unknown error" } }));
        console.error("\u274C Claude API Error:");
        console.error("   Status:", response.status);
        console.error("   Error:", JSON.stringify(error, null, 2));
        return res.status(response.status).json({
          error: error.error?.message || "Claude API request failed"
        });
      }
      console.log("\u2705 Claude: Streaming response...");
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      const reader = response.body.getReader();
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              console.log("\u2705 Claude: Stream completed");
              res.end();
              break;
            }
            res.write(value);
          }
        } catch (error) {
          console.error("\u274C Claude Stream error:");
          console.error("   Error:", error.message);
          console.error("   Stack:", error.stack);
          res.end();
        }
      };
      pump();
    } catch (error) {
      console.error("\u274C Error proxying Claude request:");
      console.error("   Message:", error.message);
      console.error("   Stack:", error.stack);
      console.error("   Full error:", error);
      if (!res.headersSent) {
        res.status(500).json({
          error: "Failed to process Claude request",
          message: error.message
        });
      }
    }
  });
  let bd24LiveCache = {
    articles: [],
    lastFetched: null,
    cacheExpiry: 30 * 60 * 1e3
    // 30 minutes in milliseconds
  };
  const rssParser = new Parser({
    customFields: {
      item: [
        ["media:content", "media:content", { keepArray: false }],
        ["media:thumbnail", "media:thumbnail", { keepArray: false }]
      ]
    }
  });
  app.get("/api/bd24live/status", (req, res) => {
    res.json({ operational: true });
  });
  app.post("/api/bd24live/clear-cache", (req, res) => {
    bd24LiveCache = {
      articles: [],
      lastFetched: null,
      cacheExpiry: 30 * 60 * 1e3
    };
    console.log("\u{1F5D1}\uFE0F  BD24 Live cache cleared");
    res.json({ success: true, message: "Cache cleared" });
  });
  app.get("/api/bd24live/news", async (req, res) => {
    try {
      const now = Date.now();
      if (bd24LiveCache.lastFetched && now - bd24LiveCache.lastFetched < bd24LiveCache.cacheExpiry && bd24LiveCache.articles.length > 0) {
        console.log("\u2705 Returning cached BD24 Live news");
        return res.json({
          articles: bd24LiveCache.articles,
          cached: true,
          lastFetched: new Date(bd24LiveCache.lastFetched).toISOString()
        });
      }
      console.log("\u{1F504} Fetching fresh BD24 Live news from RSS feed...");
      const feed = await rssParser.parseURL("https://www.bd24live.com/bangla/feed");
      console.log(`\u{1F4F0} RSS Feed: ${feed.title}`);
      console.log(`\u{1F4CA} Total items in feed: ${feed.items.length}`);
      const articles = feed.items.slice(0, 20).map((item, index) => {
        let image = null;
        if (item["media:content"]) {
          if (item["media:content"]["$"] && item["media:content"]["$"].url) {
            image = decodeURIComponent(item["media:content"]["$"].url);
          } else if (item["media:content"].url) {
            image = decodeURIComponent(item["media:content"].url);
          } else if (typeof item["media:content"] === "string") {
            image = decodeURIComponent(item["media:content"]);
          }
        } else if (item.enclosure && item.enclosure.url) {
          image = decodeURIComponent(item.enclosure.url);
        }
        return {
          title: item.title || "No Title",
          description: item.contentSnippet || item.content || item.description || "",
          url: item.link || item.guid || "",
          image,
          publishedAt: item.pubDate || item.isoDate || (/* @__PURE__ */ new Date()).toISOString(),
          source: feed.title || "BD24 Live"
        };
      });
      console.log(`
\u{1F4CA} ========== RSS PARSING SUMMARY ==========`);
      console.log(`Total articles parsed: ${articles.length}`);
      if (articles.length > 0) {
        console.log(`\u{1F4C5} Sample articles:`);
        articles.slice(0, 3).forEach((article, idx) => {
          console.log(`  ${idx + 1}. ${article.title.substring(0, 60)}...`);
          console.log(`     Published: ${article.publishedAt}`);
        });
        console.log(`========================================
`);
      }
      bd24LiveCache = {
        articles,
        lastFetched: now,
        cacheExpiry: 30 * 60 * 1e3
      };
      res.json({
        articles: bd24LiveCache.articles,
        cached: false,
        lastFetched: new Date(now).toISOString()
      });
    } catch (error) {
      console.error("\u274C Error fetching BD24 Live RSS:", error);
      if (bd24LiveCache.articles.length > 0) {
        console.log("\u26A0\uFE0F  Returning stale cache due to error");
        return res.json({
          articles: bd24LiveCache.articles,
          cached: true,
          stale: true,
          lastFetched: bd24LiveCache.lastFetched ? new Date(bd24LiveCache.lastFetched).toISOString() : null
        });
      }
      res.status(500).json({
        error: "Failed to fetch BD24 Live news",
        message: error.message,
        articles: []
      });
    }
  });
  return app;
}
var vite_config_default = defineConfig({
  plugins: [
    react(),
    {
      name: "api-server",
      configureServer(server) {
        const apiApp = createApiServer();
        server.middlewares.use(apiApp);
        console.log("\n\u2705 API server integrated with Vite dev server");
        const port = process.env.PORT || 5e3;
        console.log(`\u{1F4E7} Gmail authentication available at: http://localhost:${port}/api/auth/url
`);
      }
    }
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  server: {
    port: 5e3
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxEZXZcXFxcaGFzaGJhc2VcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkQ6XFxcXERldlxcXFxoYXNoYmFzZVxcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovRGV2L2hhc2hiYXNlL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcclxuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xyXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJ1xyXG5pbXBvcnQgZXhwcmVzcyBmcm9tICdleHByZXNzJ1xyXG5pbXBvcnQgY29ycyBmcm9tICdjb3JzJ1xyXG5pbXBvcnQgeyBnb29nbGUgfSBmcm9tICdnb29nbGVhcGlzJ1xyXG5pbXBvcnQgZG90ZW52IGZyb20gJ2RvdGVudidcclxuaW1wb3J0IGZzIGZyb20gJ2ZzJ1xyXG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAndXJsJ1xyXG5pbXBvcnQgUGFyc2VyIGZyb20gJ3Jzcy1wYXJzZXInXHJcblxyXG5jb25zdCBfX2ZpbGVuYW1lID0gZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpXHJcbmNvbnN0IF9fZGlybmFtZSA9IHBhdGguZGlybmFtZShfX2ZpbGVuYW1lKVxyXG5cclxuZG90ZW52LmNvbmZpZygpXHJcblxyXG4vLyBJbml0aWFsaXplIE9BdXRoMiBjbGllbnRcclxuZnVuY3Rpb24gZ2V0T0F1dGgyQ2xpZW50KCkge1xyXG4gIHJldHVybiBuZXcgZ29vZ2xlLmF1dGguT0F1dGgyKFxyXG4gICAgcHJvY2Vzcy5lbnYuR01BSUxfQ0xJRU5UX0lELFxyXG4gICAgcHJvY2Vzcy5lbnYuR01BSUxfQ0xJRU5UX1NFQ1JFVCxcclxuICAgIHByb2Nlc3MuZW52LkdNQUlMX1JFRElSRUNUX1VSSVxyXG4gIClcclxufVxyXG5cclxuLy8gTG9hZCBjcmVkZW50aWFscyBmcm9tIHJlcXVlc3QgaGVhZGVyXHJcbmZ1bmN0aW9uIGxvYWRDcmVkZW50aWFsc0Zyb21IZWFkZXIocmVxKSB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHRva2VuSGVhZGVyID0gcmVxLmhlYWRlcnNbJ3gtZ21haWwtdG9rZW4nXVxyXG4gICAgaWYgKCF0b2tlbkhlYWRlcikge1xyXG4gICAgICByZXR1cm4gbnVsbFxyXG4gICAgfVxyXG4gICAgY29uc3QgY3JlZGVudGlhbHMgPSBKU09OLnBhcnNlKHRva2VuSGVhZGVyKVxyXG4gICAgY29uc3Qgb2F1dGgyQ2xpZW50ID0gZ2V0T0F1dGgyQ2xpZW50KClcclxuICAgIG9hdXRoMkNsaWVudC5zZXRDcmVkZW50aWFscyhjcmVkZW50aWFscylcclxuICAgIHJldHVybiBvYXV0aDJDbGllbnRcclxuICB9IGNhdGNoIChlcnIpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGxvYWRpbmcgY3JlZGVudGlhbHMgZnJvbSBoZWFkZXI6JywgZXJyKVxyXG4gICAgcmV0dXJuIG51bGxcclxuICB9XHJcbn1cclxuXHJcbi8vIENyZWF0ZSBFeHByZXNzIGFwcCBmb3IgQVBJIHJvdXRlc1xyXG5mdW5jdGlvbiBjcmVhdGVBcGlTZXJ2ZXIoKSB7XHJcbiAgY29uc3QgYXBwID0gZXhwcmVzcygpXHJcbiAgYXBwLnVzZShleHByZXNzLmpzb24oKSlcclxuXHJcbiAgLy8gR2V0IGF1dGhvcml6YXRpb24gVVJMXHJcbiAgYXBwLmdldCgnL2FwaS9hdXRoL3VybCcsIChyZXEsIHJlcykgPT4ge1xyXG4gICAgY29uc3Qgb2F1dGgyQ2xpZW50ID0gZ2V0T0F1dGgyQ2xpZW50KClcclxuICAgIGNvbnN0IGF1dGhVcmwgPSBvYXV0aDJDbGllbnQuZ2VuZXJhdGVBdXRoVXJsKHtcclxuICAgICAgYWNjZXNzX3R5cGU6ICdvZmZsaW5lJyxcclxuICAgICAgc2NvcGU6IFsnaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vYXV0aC9nbWFpbC5yZWFkb25seSddLFxyXG4gICAgfSlcclxuICAgIHJlcy5qc29uKHsgdXJsOiBhdXRoVXJsIH0pXHJcbiAgfSlcclxuXHJcbiAgLy8gT0F1dGgyIGNhbGxiYWNrXHJcbiAgYXBwLmdldCgnL29hdXRoMmNhbGxiYWNrJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XHJcbiAgICBjb25zdCBjb2RlID0gcmVxLnF1ZXJ5LmNvZGVcclxuICAgIGlmICghY29kZSkge1xyXG4gICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDApLnNlbmQoJ05vIGNvZGUgcHJvdmlkZWQnKVxyXG4gICAgfVxyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IG9hdXRoMkNsaWVudCA9IGdldE9BdXRoMkNsaWVudCgpXHJcbiAgICAgIGNvbnN0IHsgdG9rZW5zIH0gPSBhd2FpdCBvYXV0aDJDbGllbnQuZ2V0VG9rZW4oY29kZSlcclxuICAgICAgb2F1dGgyQ2xpZW50LnNldENyZWRlbnRpYWxzKHRva2VucylcclxuICAgICAgXHJcbiAgICAgIC8vIFJldHVybiB0b2tlbnMgdG8gYmUgc3RvcmVkIGluIGxvY2FsU3RvcmFnZVxyXG4gICAgICBjb25zdCB0b2tlbnNKc29uID0gSlNPTi5zdHJpbmdpZnkodG9rZW5zKVxyXG4gICAgICBcclxuICAgICAgLy8gUmVkaXJlY3QgYmFjayB0byB0aGUgZnJvbnRlbmQgYXBwIHdpdGggc3VjY2VzcyBwYXJhbWV0ZXJcclxuICAgICAgY29uc3QgZnJvbnRlbmRVcmwgPSBwcm9jZXNzLmVudi5WSVRFX0ZST05URU5EX1VSTFxyXG4gICAgICByZXMuc2VuZChgXHJcbiAgICAgICAgPGh0bWw+XHJcbiAgICAgICAgICA8aGVhZD5cclxuICAgICAgICAgICAgPHRpdGxlPkF1dGhlbnRpY2F0aW9uIFN1Y2Nlc3NmdWw8L3RpdGxlPlxyXG4gICAgICAgICAgICA8c2NyaXB0PlxyXG4gICAgICAgICAgICAgIC8vIFN0b3JlIHRva2VucyBpbiBsb2NhbFN0b3JhZ2VcclxuICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnZ21haWxfdG9rZW5zJywgJyR7dG9rZW5zSnNvbi5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIil9JylcclxuICAgICAgICAgICAgICAvLyBSZWRpcmVjdCBpbW1lZGlhdGVseSB3aXRoIHN1Y2Nlc3MgcGFyYW1ldGVyXHJcbiAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSAnJHtmcm9udGVuZFVybH0/YXV0aD1zdWNjZXNzJztcclxuICAgICAgICAgICAgPC9zY3JpcHQ+XHJcbiAgICAgICAgICA8L2hlYWQ+XHJcbiAgICAgICAgICA8Ym9keT5cclxuICAgICAgICAgICAgPHA+UmVkaXJlY3RpbmcuLi48L3A+XHJcbiAgICAgICAgICA8L2JvZHk+XHJcbiAgICAgICAgPC9odG1sPlxyXG4gICAgICBgKVxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2V0dGluZyB0b2tlbnM6JywgZXJyb3IpXHJcbiAgICAgIGNvbnN0IGZyb250ZW5kVXJsID0gcHJvY2Vzcy5lbnYuVklURV9GUk9OVEVORF9VUkxcclxuICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gZW5jb2RlVVJJQ29tcG9uZW50KGVycm9yLm1lc3NhZ2UpXHJcbiAgICAgIHJlcy5zdGF0dXMoNTAwKS5zZW5kKGBcclxuICAgICAgICA8aHRtbD5cclxuICAgICAgICAgIDxoZWFkPlxyXG4gICAgICAgICAgICA8dGl0bGU+QXV0aGVudGljYXRpb24gRmFpbGVkPC90aXRsZT5cclxuICAgICAgICAgICAgPHNjcmlwdD5cclxuICAgICAgICAgICAgICAvLyBSZWRpcmVjdCB3aXRoIGVycm9yIHBhcmFtZXRlclxyXG4gICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gJyR7ZnJvbnRlbmRVcmx9P2F1dGg9ZXJyb3ImbWVzc2FnZT0ke2Vycm9yTWVzc2FnZX0nO1xyXG4gICAgICAgICAgICA8L3NjcmlwdD5cclxuICAgICAgICAgIDwvaGVhZD5cclxuICAgICAgICAgIDxib2R5PlxyXG4gICAgICAgICAgICA8cD5SZWRpcmVjdGluZy4uLjwvcD5cclxuICAgICAgICAgIDwvYm9keT5cclxuICAgICAgICA8L2h0bWw+XHJcbiAgICAgIGApXHJcbiAgICB9XHJcbiAgfSlcclxuXHJcbiAgLy8gQ2hlY2sgaWYgYXV0aGVudGljYXRlZCAoY2hlY2tzIGlmIHRva2VuIGlzIHByb3ZpZGVkIGluIGhlYWRlcilcclxuICBhcHAuZ2V0KCcvYXBpL2F1dGgvc3RhdHVzJywgKHJlcSwgcmVzKSA9PiB7XHJcbiAgICBjb25zdCB0b2tlbkhlYWRlciA9IHJlcS5oZWFkZXJzWyd4LWdtYWlsLXRva2VuJ11cclxuICAgIHJlcy5qc29uKHsgYXV0aGVudGljYXRlZDogISF0b2tlbkhlYWRlciB9KVxyXG4gIH0pXHJcblxyXG4gIC8vIEZldGNoIHVucmVhZCBlbWFpbHNcclxuICBhcHAuZ2V0KCcvYXBpL2dtYWlsL3VucmVhZCcsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgYXV0aCA9IGxvYWRDcmVkZW50aWFsc0Zyb21IZWFkZXIocmVxKVxyXG4gICAgICBcclxuICAgICAgaWYgKCFhdXRoKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ1x1Mjc0QyBHbWFpbDogTm90IGF1dGhlbnRpY2F0ZWQgLSBubyB0b2tlbiBwcm92aWRlZCBpbiBoZWFkZXInKVxyXG4gICAgICAgIHJldHVybiByZXMuc3RhdHVzKDQwMSkuanNvbih7IFxyXG4gICAgICAgICAgZXJyb3I6ICdOb3QgYXV0aGVudGljYXRlZCcsXHJcbiAgICAgICAgICBtZXNzYWdlOiAnUGxlYXNlIGF1dGhlbnRpY2F0ZSB3aXRoIEdtYWlsIGZpcnN0J1xyXG4gICAgICAgIH0pXHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnNvbGUubG9nKCdcdTI3MDUgR21haWw6IENyZWRlbnRpYWxzIGxvYWRlZCwgZmV0Y2hpbmcgZW1haWxzLi4uJylcclxuICAgICAgY29uc3QgZ21haWwgPSBnb29nbGUuZ21haWwoeyB2ZXJzaW9uOiAndjEnLCBhdXRoIH0pXHJcbiAgICAgIFxyXG4gICAgICAvLyBHZXQgbGlzdCBvZiB1bnJlYWQgbWVzc2FnZXNcclxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBnbWFpbC51c2Vycy5tZXNzYWdlcy5saXN0KHtcclxuICAgICAgICB1c2VySWQ6ICdtZScsXHJcbiAgICAgICAgcTogJ2lzOnVucmVhZCcsXHJcbiAgICAgICAgbWF4UmVzdWx0czogMjAsXHJcbiAgICAgIH0pXHJcblxyXG4gICAgICBjb25zdCBtZXNzYWdlcyA9IHJlc3BvbnNlLmRhdGEubWVzc2FnZXMgfHwgW11cclxuICAgICAgY29uc29sZS5sb2coYFx1RDgzRFx1RENFNyBHbWFpbDogRm91bmQgJHttZXNzYWdlcy5sZW5ndGh9IHVucmVhZCBtZXNzYWdlc2ApXHJcbiAgICAgIFxyXG4gICAgICAvLyBGZXRjaCBkZXRhaWxzIGZvciBlYWNoIG1lc3NhZ2VcclxuICAgICAgY29uc3QgZW1haWxQcm9taXNlcyA9IG1lc3NhZ2VzLm1hcChhc3luYyAobWVzc2FnZSkgPT4ge1xyXG4gICAgICAgIGNvbnN0IGRldGFpbHMgPSBhd2FpdCBnbWFpbC51c2Vycy5tZXNzYWdlcy5nZXQoe1xyXG4gICAgICAgICAgdXNlcklkOiAnbWUnLFxyXG4gICAgICAgICAgaWQ6IG1lc3NhZ2UuaWQsXHJcbiAgICAgICAgICBmb3JtYXQ6ICdmdWxsJyxcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBjb25zdCBoZWFkZXJzID0gZGV0YWlscy5kYXRhLnBheWxvYWQuaGVhZGVyc1xyXG4gICAgICAgIGNvbnN0IHN1YmplY3QgPSBoZWFkZXJzLmZpbmQoaCA9PiBoLm5hbWUgPT09ICdTdWJqZWN0Jyk/LnZhbHVlIHx8ICdObyBTdWJqZWN0J1xyXG4gICAgICAgIGNvbnN0IGZyb20gPSBoZWFkZXJzLmZpbmQoaCA9PiBoLm5hbWUgPT09ICdGcm9tJyk/LnZhbHVlIHx8ICdVbmtub3duJ1xyXG4gICAgICAgIGNvbnN0IGRhdGUgPSBoZWFkZXJzLmZpbmQoaCA9PiBoLm5hbWUgPT09ICdEYXRlJyk/LnZhbHVlIHx8IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgaWQ6IG1lc3NhZ2UuaWQsXHJcbiAgICAgICAgICBzdWJqZWN0LFxyXG4gICAgICAgICAgZnJvbSxcclxuICAgICAgICAgIGRhdGU6IG5ldyBEYXRlKGRhdGUpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgICBzbmlwcGV0OiBkZXRhaWxzLmRhdGEuc25pcHBldCxcclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcblxyXG4gICAgICBjb25zdCBlbWFpbHMgPSBhd2FpdCBQcm9taXNlLmFsbChlbWFpbFByb21pc2VzKVxyXG4gICAgICBcclxuICAgICAgcmVzLmpzb24oeyBlbWFpbHMgfSlcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1x1Mjc0QyBHbWFpbCBBUEkgRXJyb3I6JywgZXJyb3IubWVzc2FnZSlcclxuICAgICAgY29uc29sZS5lcnJvcignRnVsbCBlcnJvcjonLCBlcnJvcilcclxuICAgICAgcmVzLnN0YXR1cyg1MDApLmpzb24oeyBcclxuICAgICAgICBlcnJvcjogJ0ZhaWxlZCB0byBmZXRjaCBlbWFpbHMnLFxyXG4gICAgICAgIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UgXHJcbiAgICAgIH0pXHJcbiAgICB9XHJcbiAgfSlcclxuXHJcbiAgLy8gTWFyayBlbWFpbCBhcyByZWFkXHJcbiAgYXBwLnBvc3QoJy9hcGkvZ21haWwvbWFyay1yZWFkJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCB7IG1lc3NhZ2VJZCB9ID0gcmVxLmJvZHlcclxuICAgICAgY29uc3QgYXV0aCA9IGxvYWRDcmVkZW50aWFsc0Zyb21IZWFkZXIocmVxKVxyXG4gICAgICBcclxuICAgICAgaWYgKCFhdXRoKSB7XHJcbiAgICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDAxKS5qc29uKHsgZXJyb3I6ICdOb3QgYXV0aGVudGljYXRlZCcgfSlcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3QgZ21haWwgPSBnb29nbGUuZ21haWwoeyB2ZXJzaW9uOiAndjEnLCBhdXRoIH0pXHJcbiAgICAgIFxyXG4gICAgICBhd2FpdCBnbWFpbC51c2Vycy5tZXNzYWdlcy5tb2RpZnkoe1xyXG4gICAgICAgIHVzZXJJZDogJ21lJyxcclxuICAgICAgICBpZDogbWVzc2FnZUlkLFxyXG4gICAgICAgIHJlcXVlc3RCb2R5OiB7XHJcbiAgICAgICAgICByZW1vdmVMYWJlbElkczogWydVTlJFQUQnXSxcclxuICAgICAgICB9LFxyXG4gICAgICB9KVxyXG5cclxuICAgICAgcmVzLmpzb24oeyBzdWNjZXNzOiB0cnVlIH0pXHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBtYXJraW5nIGVtYWlsIGFzIHJlYWQ6JywgZXJyb3IpXHJcbiAgICAgIHJlcy5zdGF0dXMoNTAwKS5qc29uKHsgXHJcbiAgICAgICAgZXJyb3I6ICdGYWlsZWQgdG8gbWFyayBlbWFpbCBhcyByZWFkJyxcclxuICAgICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlIFxyXG4gICAgICB9KVxyXG4gICAgfVxyXG4gIH0pXHJcblxyXG4gIC8vID09PT09IE5ldGxpZnkgQVBJIEVuZHBvaW50cyA9PT09PVxyXG5cclxuICAvLyBDaGVjayBpZiBOZXRsaWZ5IGlzIGNvbmZpZ3VyZWRcclxuICBhcHAuZ2V0KCcvYXBpL25ldGxpZnkvc3RhdHVzJywgKHJlcSwgcmVzKSA9PiB7XHJcbiAgICBjb25zdCBhY2Nlc3NUb2tlbiA9IHJlcS5oZWFkZXJzWyd4LW5ldGxpZnktYWNjZXNzLXRva2VuJ11cclxuICAgIGNvbnN0IGNvbmZpZ3VyZWQgPSAhIWFjY2Vzc1Rva2VuXHJcbiAgICByZXMuanNvbih7IGNvbmZpZ3VyZWQgfSlcclxuICB9KVxyXG5cclxuICAvLyA9PT09PSBOZXdzIEFQSSBFbmRwb2ludHMgPT09PT1cclxuXHJcbiAgLy8gQ2hlY2sgaWYgTmV3c0FQSSBpcyBjb25maWd1cmVkXHJcbiAgYXBwLmdldCgnL2FwaS9uZXdzL3N0YXR1cycsIChyZXEsIHJlcykgPT4ge1xyXG4gICAgY29uc3QgYXBpS2V5ID0gcHJvY2Vzcy5lbnYuTkVXU19BUElfS0VZXHJcbiAgICBjb25zdCBjb25maWd1cmVkID0gISFhcGlLZXlcclxuICAgIHJlcy5qc29uKHsgY29uZmlndXJlZCB9KVxyXG4gIH0pXHJcblxyXG4gIC8vIEZldGNoIG5ld3MgaGVhZGxpbmVzXHJcbiAgYXBwLmdldCgnL2FwaS9uZXdzJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCB7IGNvdW50cnkgPSAndXMnLCBjYXRlZ29yeSA9ICdnZW5lcmFsJyB9ID0gcmVxLnF1ZXJ5XHJcbiAgICAgIGNvbnN0IGFwaUtleSA9IHByb2Nlc3MuZW52Lk5FV1NfQVBJX0tFWVxyXG4gICAgICBcclxuICAgICAgaWYgKCFhcGlLZXkpIHtcclxuICAgICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDEpLmpzb24oeyBcclxuICAgICAgICAgIGVycm9yOiAnTmV3c0FQSSBrZXkgbm90IGNvbmZpZ3VyZWQnLFxyXG4gICAgICAgICAgbWVzc2FnZTogJ1BsZWFzZSBhZGQgTkVXU19BUElfS0VZIHRvIHlvdXIgLmVudiBmaWxlLiBHZXQgYSBmcmVlIGtleSBmcm9tIGh0dHBzOi8vbmV3c2FwaS5vcmcnLFxyXG4gICAgICAgICAgYXJ0aWNsZXM6IFtdXHJcbiAgICAgICAgfSlcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gRmV0Y2ggbmV3cyBmcm9tIE5ld3NBUElcclxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChcclxuICAgICAgICBgaHR0cHM6Ly9uZXdzYXBpLm9yZy92Mi90b3AtaGVhZGxpbmVzP2NvdW50cnk9JHtjb3VudHJ5fSZjYXRlZ29yeT0ke2NhdGVnb3J5fSZwYWdlU2l6ZT0yMCZhcGlLZXk9JHthcGlLZXl9YFxyXG4gICAgICApXHJcbiAgICAgIFxyXG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XHJcbiAgICAgICAgY29uc3QgZXJyb3JEYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpLmNhdGNoKCgpID0+ICh7fSkpXHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGVycm9yRGF0YS5tZXNzYWdlIHx8ICdOZXdzQVBJIHJlcXVlc3QgZmFpbGVkJylcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKVxyXG4gICAgICBcclxuICAgICAgLy8gRmlsdGVyIG91dCBhcnRpY2xlcyB3aXRoIHJlbW92ZWQgY29udGVudFxyXG4gICAgICBjb25zdCBhcnRpY2xlcyA9IChkYXRhLmFydGljbGVzIHx8IFtdKS5maWx0ZXIoYXJ0aWNsZSA9PiBcclxuICAgICAgICBhcnRpY2xlLnRpdGxlICYmIFxyXG4gICAgICAgIGFydGljbGUudGl0bGUgIT09ICdbUmVtb3ZlZF0nICYmIFxyXG4gICAgICAgIGFydGljbGUudXJsXHJcbiAgICAgIClcclxuICAgICAgXHJcbiAgICAgIHJlcy5qc29uKHsgYXJ0aWNsZXMgfSlcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGZldGNoaW5nIG5ld3M6JywgZXJyb3IpXHJcbiAgICAgIHJlcy5zdGF0dXMoNTAwKS5qc29uKHsgXHJcbiAgICAgICAgZXJyb3I6ICdGYWlsZWQgdG8gZmV0Y2ggbmV3cycsXHJcbiAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcclxuICAgICAgICBhcnRpY2xlczogW11cclxuICAgICAgfSlcclxuICAgIH1cclxuICB9KVxyXG5cclxuICAvLyA9PT09PSBXZWIgU2VhcmNoIEFQSSBFbmRwb2ludCA9PT09PVxyXG5cclxuICAvLyBQZXJmb3JtIHdlYiBzZWFyY2ggdXNpbmcgVGF2aWx5IEFJIFNlYXJjaCBBUElcclxuICBhcHAucG9zdCgnL2FwaS9zZWFyY2gnLCBhc3luYyAocmVxLCByZXMpID0+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHsgcXVlcnkgfSA9IHJlcS5ib2R5XHJcbiAgICAgIFxyXG4gICAgICBpZiAoIXF1ZXJ5KSB7XHJcbiAgICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDAwKS5qc29uKHsgXHJcbiAgICAgICAgICBlcnJvcjogJ1F1ZXJ5IGlzIHJlcXVpcmVkJyxcclxuICAgICAgICAgIG1lc3NhZ2U6ICdQbGVhc2UgcHJvdmlkZSBhIHNlYXJjaCBxdWVyeSdcclxuICAgICAgICB9KVxyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBHZXQgVGF2aWx5IEFQSSBrZXkgZnJvbSByZXF1ZXN0IGhlYWRlcnNcclxuICAgICAgY29uc3QgdGF2aWx5QXBpS2V5ID0gcmVxLmhlYWRlcnNbJ3gtdGF2aWx5LWFwaS1rZXknXVxyXG4gICAgICBcclxuICAgICAgaWYgKCF0YXZpbHlBcGlLZXkpIHtcclxuICAgICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDEpLmpzb24oeyBcclxuICAgICAgICAgIGVycm9yOiAnVGF2aWx5IEFQSSBrZXkgbm90IGNvbmZpZ3VyZWQnLFxyXG4gICAgICAgICAgbWVzc2FnZTogJ1BsZWFzZSBhZGQgeW91ciBUYXZpbHkgQVBJIGtleSBpbiBTZXR0aW5ncyA+IFNlY3JldHMgdG8gZW5hYmxlIHdlYiBzZWFyY2gnLFxyXG4gICAgICAgICAgcmVzdWx0czogW11cclxuICAgICAgICB9KVxyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBVc2UgVGF2aWx5IEFJIFNlYXJjaCBBUElcclxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCgnaHR0cHM6Ly9hcGkudGF2aWx5LmNvbS9zZWFyY2gnLCB7XHJcbiAgICAgICAgbWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGFwaV9rZXk6IHRhdmlseUFwaUtleSxcclxuICAgICAgICAgIHF1ZXJ5OiBxdWVyeSxcclxuICAgICAgICAgIHNlYXJjaF9kZXB0aDogJ2Jhc2ljJywgLy8gJ2Jhc2ljJyBvciAnYWR2YW5jZWQnXHJcbiAgICAgICAgICBpbmNsdWRlX2Fuc3dlcjogZmFsc2UsXHJcbiAgICAgICAgICBpbmNsdWRlX2ltYWdlczogZmFsc2UsXHJcbiAgICAgICAgICBpbmNsdWRlX3Jhd19jb250ZW50OiBmYWxzZSxcclxuICAgICAgICAgIG1heF9yZXN1bHRzOiA1LFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9KVxyXG4gICAgICBcclxuICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xyXG4gICAgICAgIGNvbnN0IGVycm9yRGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKS5jYXRjaCgoKSA9PiAoe30pKVxyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihlcnJvckRhdGEuZGV0YWlsIHx8IGVycm9yRGF0YS5tZXNzYWdlIHx8ICdUYXZpbHkgQVBJIHJlcXVlc3QgZmFpbGVkJylcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKVxyXG4gICAgICBcclxuICAgICAgLy8gRm9ybWF0IHJlc3VsdHNcclxuICAgICAgY29uc3QgcmVzdWx0cyA9IFtdXHJcbiAgICAgIFxyXG4gICAgICAvLyBQcm9jZXNzIFRhdmlseSByZXN1bHRzXHJcbiAgICAgIGlmIChkYXRhLnJlc3VsdHMgJiYgQXJyYXkuaXNBcnJheShkYXRhLnJlc3VsdHMpKSB7XHJcbiAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2gocmVzdWx0ID0+IHtcclxuICAgICAgICAgIHJlc3VsdHMucHVzaCh7XHJcbiAgICAgICAgICAgIHRpdGxlOiByZXN1bHQudGl0bGUgfHwgJ05vIHRpdGxlJyxcclxuICAgICAgICAgICAgc25pcHBldDogcmVzdWx0LmNvbnRlbnQgfHwgcmVzdWx0LnNuaXBwZXQgfHwgJycsXHJcbiAgICAgICAgICAgIHVybDogcmVzdWx0LnVybCB8fCAnJyxcclxuICAgICAgICAgICAgc2NvcmU6IHJlc3VsdC5zY29yZSB8fCAwLFxyXG4gICAgICAgICAgfSlcclxuICAgICAgICB9KVxyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICAvLyBJZiBubyByZXN1bHRzLCByZXR1cm4gZW1wdHkgYXJyYXkgd2l0aCBoZWxwZnVsIG1lc3NhZ2VcclxuICAgICAgaWYgKHJlc3VsdHMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgcmV0dXJuIHJlcy5qc29uKHsgXHJcbiAgICAgICAgICByZXN1bHRzOiBbXSxcclxuICAgICAgICAgIG1lc3NhZ2U6ICdObyBzZWFyY2ggcmVzdWx0cyBmb3VuZCBmb3IgdGhpcyBxdWVyeSdcclxuICAgICAgICB9KVxyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICByZXMuanNvbih7IHJlc3VsdHMgfSlcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHBlcmZvcm1pbmcgc2VhcmNoOicsIGVycm9yKVxyXG4gICAgICByZXMuc3RhdHVzKDUwMCkuanNvbih7IFxyXG4gICAgICAgIGVycm9yOiAnU2VhcmNoIGZhaWxlZCcsXHJcbiAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcclxuICAgICAgICByZXN1bHRzOiBbXSAvLyBSZXR1cm4gZW1wdHkgcmVzdWx0cyBvbiBlcnJvclxyXG4gICAgICB9KVxyXG4gICAgfVxyXG4gIH0pXHJcblxyXG4gIC8vIEZldGNoIGFsbCBOZXRsaWZ5IHNpdGVzXHJcbiAgYXBwLmdldCgnL2FwaS9uZXRsaWZ5L3NpdGVzJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBhY2Nlc3NUb2tlbiA9IHJlcS5oZWFkZXJzWyd4LW5ldGxpZnktYWNjZXNzLXRva2VuJ11cclxuICAgICAgXHJcbiAgICAgIGlmICghYWNjZXNzVG9rZW4pIHtcclxuICAgICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDEpLmpzb24oeyBcclxuICAgICAgICAgIGVycm9yOiAnTm90IGNvbmZpZ3VyZWQnLFxyXG4gICAgICAgICAgbWVzc2FnZTogJ1BsZWFzZSBhZGQgeW91ciBOZXRsaWZ5IGFjY2VzcyB0b2tlbiBpbiBTZXR0aW5ncyA+IFNlY3JldHMnXHJcbiAgICAgICAgfSlcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gRmV0Y2ggYWxsIHNpdGVzXHJcbiAgICAgIGNvbnN0IHNpdGVzUmVzcG9uc2UgPSBhd2FpdCBmZXRjaCgnaHR0cHM6Ly9hcGkubmV0bGlmeS5jb20vYXBpL3YxL3NpdGVzJywge1xyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdBdXRob3JpemF0aW9uJzogYEJlYXJlciAke2FjY2Vzc1Rva2VufWAsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSlcclxuXHJcbiAgICAgIGlmICghc2l0ZXNSZXNwb25zZS5vaykge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIGZldGNoIHNpdGVzOiAke3NpdGVzUmVzcG9uc2Uuc3RhdHVzVGV4dH1gKVxyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCBzaXRlcyA9IGF3YWl0IHNpdGVzUmVzcG9uc2UuanNvbigpXHJcbiAgICAgIFxyXG4gICAgICAvLyBSZXR1cm4gc2ltcGxpZmllZCBzaXRlIGluZm9cclxuICAgICAgY29uc3Qgc2ltcGxpZmllZFNpdGVzID0gc2l0ZXMubWFwKHNpdGUgPT4gKHtcclxuICAgICAgICBpZDogc2l0ZS5pZCxcclxuICAgICAgICBuYW1lOiBzaXRlLm5hbWUsXHJcbiAgICAgICAgdXJsOiBzaXRlLnVybCxcclxuICAgICAgICBjdXN0b21Eb21haW46IHNpdGUuY3VzdG9tX2RvbWFpbixcclxuICAgICAgICBjcmVhdGVkQXQ6IHNpdGUuY3JlYXRlZF9hdCxcclxuICAgICAgfSkpXHJcbiAgICAgIFxyXG4gICAgICByZXMuanNvbih7IHNpdGVzOiBzaW1wbGlmaWVkU2l0ZXMgfSlcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGZldGNoaW5nIE5ldGxpZnkgc2l0ZXM6JywgZXJyb3IpXHJcbiAgICAgIHJlcy5zdGF0dXMoNTAwKS5qc29uKHsgXHJcbiAgICAgICAgZXJyb3I6ICdGYWlsZWQgdG8gZmV0Y2ggc2l0ZXMnLFxyXG4gICAgICAgIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UgXHJcbiAgICAgIH0pXHJcbiAgICB9XHJcbiAgfSlcclxuXHJcbiAgLy8gRmV0Y2ggYWxsIGRlcGxveXMgZnJvbSBhbGwgc2l0ZXMgb3Igc2VsZWN0ZWQgc2l0ZXNcclxuICBhcHAuZ2V0KCcvYXBpL25ldGxpZnkvZGVwbG95cycsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgYWNjZXNzVG9rZW4gPSByZXEuaGVhZGVyc1sneC1uZXRsaWZ5LWFjY2Vzcy10b2tlbiddXHJcbiAgICAgIGNvbnN0IHNpdGVJZHNQYXJhbSA9IHJlcS5xdWVyeS5zaXRlSWRzXHJcbiAgICAgIFxyXG4gICAgICBpZiAoIWFjY2Vzc1Rva2VuKSB7XHJcbiAgICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDAxKS5qc29uKHsgXHJcbiAgICAgICAgICBlcnJvcjogJ05vdCBjb25maWd1cmVkJyxcclxuICAgICAgICAgIG1lc3NhZ2U6ICdQbGVhc2UgYWRkIHlvdXIgTmV0bGlmeSBhY2Nlc3MgdG9rZW4gaW4gU2V0dGluZ3MgPiBTZWNyZXRzJ1xyXG4gICAgICAgIH0pXHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIEZldGNoIGFsbCBzaXRlc1xyXG4gICAgICBjb25zdCBzaXRlc1Jlc3BvbnNlID0gYXdhaXQgZmV0Y2goJ2h0dHBzOi8vYXBpLm5ldGxpZnkuY29tL2FwaS92MS9zaXRlcycsIHtcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQXV0aG9yaXphdGlvbic6IGBCZWFyZXIgJHthY2Nlc3NUb2tlbn1gLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pXHJcblxyXG4gICAgICBpZiAoIXNpdGVzUmVzcG9uc2Uub2spIHtcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBmZXRjaCBzaXRlczogJHtzaXRlc1Jlc3BvbnNlLnN0YXR1c1RleHR9YClcclxuICAgICAgfVxyXG5cclxuICAgICAgbGV0IHNpdGVzID0gYXdhaXQgc2l0ZXNSZXNwb25zZS5qc29uKClcclxuICAgICAgXHJcbiAgICAgIC8vIEZpbHRlciBzaXRlcyBpZiBzaXRlSWRzIHByb3ZpZGVkXHJcbiAgICAgIGlmIChzaXRlSWRzUGFyYW0pIHtcclxuICAgICAgICBjb25zdCBzZWxlY3RlZFNpdGVJZHMgPSBzaXRlSWRzUGFyYW0uc3BsaXQoJywnKVxyXG4gICAgICAgIHNpdGVzID0gc2l0ZXMuZmlsdGVyKHNpdGUgPT4gc2VsZWN0ZWRTaXRlSWRzLmluY2x1ZGVzKHNpdGUuaWQpKVxyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICAvLyBGZXRjaCBsYXRlc3QgZGVwbG95cyBmb3IgZWFjaCBzaXRlXHJcbiAgICAgIGNvbnN0IGRlcGxveVByb21pc2VzID0gc2l0ZXMubWFwKGFzeW5jIChzaXRlKSA9PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgIGNvbnN0IGRlcGxveXNSZXNwb25zZSA9IGF3YWl0IGZldGNoKFxyXG4gICAgICAgICAgICBgaHR0cHM6Ly9hcGkubmV0bGlmeS5jb20vYXBpL3YxL3NpdGVzLyR7c2l0ZS5pZH0vZGVwbG95cz9wZXJfcGFnZT0xYCxcclxuICAgICAgICAgICAge1xyXG4gICAgICAgICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICAgICAgICdBdXRob3JpemF0aW9uJzogYEJlYXJlciAke2FjY2Vzc1Rva2VufWAsXHJcbiAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgKVxyXG5cclxuICAgICAgICAgIGlmICghZGVwbG95c1Jlc3BvbnNlLm9rKSB7XHJcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEZhaWxlZCB0byBmZXRjaCBkZXBsb3lzIGZvciBzaXRlICR7c2l0ZS5uYW1lfWApXHJcbiAgICAgICAgICAgIHJldHVybiBudWxsXHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgY29uc3QgZGVwbG95cyA9IGF3YWl0IGRlcGxveXNSZXNwb25zZS5qc29uKClcclxuICAgICAgICAgIFxyXG4gICAgICAgICAgaWYgKGRlcGxveXMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsXHJcbiAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgY29uc3QgZGVwbG95ID0gZGVwbG95c1swXVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICBpZDogZGVwbG95LmlkLFxyXG4gICAgICAgICAgICBzaXRlSWQ6IHNpdGUuaWQsXHJcbiAgICAgICAgICAgIHNpdGVOYW1lOiBzaXRlLm5hbWUsXHJcbiAgICAgICAgICAgIHN0YXRlOiBkZXBsb3kuc3RhdGUsXHJcbiAgICAgICAgICAgIGNvbnRleHQ6IGRlcGxveS5jb250ZXh0LFxyXG4gICAgICAgICAgICBicmFuY2g6IGRlcGxveS5icmFuY2gsXHJcbiAgICAgICAgICAgIGNvbW1pdFJlZjogZGVwbG95LmNvbW1pdF9yZWYsXHJcbiAgICAgICAgICAgIGNvbW1pdFVybDogZGVwbG95LmNvbW1pdF91cmwsXHJcbiAgICAgICAgICAgIGNyZWF0ZWRBdDogZGVwbG95LmNyZWF0ZWRfYXQsXHJcbiAgICAgICAgICAgIHB1Ymxpc2hlZEF0OiBkZXBsb3kucHVibGlzaGVkX2F0LFxyXG4gICAgICAgICAgICBkZXBsb3lVcmw6IGRlcGxveS5kZXBsb3lfc3NsX3VybCB8fCBkZXBsb3kuZGVwbG95X3VybCxcclxuICAgICAgICAgICAgc2l0ZVVybDogc2l0ZS51cmwsXHJcbiAgICAgICAgICAgIGVycm9yTWVzc2FnZTogZGVwbG95LmVycm9yX21lc3NhZ2UsXHJcbiAgICAgICAgICAgIGJ1aWxkVGltZTogZGVwbG95LmRlcGxveV90aW1lLFxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICBjb25zb2xlLmVycm9yKGBFcnJvciBmZXRjaGluZyBkZXBsb3lzIGZvciBzaXRlICR7c2l0ZS5uYW1lfTpgLCBlcnJvcilcclxuICAgICAgICAgIHJldHVybiBudWxsXHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG5cclxuICAgICAgY29uc3QgYWxsRGVwbG95cyA9IGF3YWl0IFByb21pc2UuYWxsKGRlcGxveVByb21pc2VzKVxyXG4gICAgICBjb25zdCB2YWxpZERlcGxveXMgPSBhbGxEZXBsb3lzLmZpbHRlcihkZXBsb3kgPT4gZGVwbG95ICE9PSBudWxsKVxyXG4gICAgICBcclxuICAgICAgLy8gU29ydCBieSBjcmVhdGlvbiBkYXRlIChtb3N0IHJlY2VudCBmaXJzdClcclxuICAgICAgdmFsaWREZXBsb3lzLnNvcnQoKGEsIGIpID0+IG5ldyBEYXRlKGIuY3JlYXRlZEF0KSAtIG5ldyBEYXRlKGEuY3JlYXRlZEF0KSlcclxuICAgICAgXHJcbiAgICAgIHJlcy5qc29uKHsgXHJcbiAgICAgICAgZGVwbG95czogdmFsaWREZXBsb3lzLFxyXG4gICAgICAgIGZpbHRlcmVkU2l0ZXM6IHNpdGVJZHNQYXJhbSA/IHNpdGVJZHNQYXJhbS5zcGxpdCgnLCcpLmxlbmd0aCA6IHNpdGVzLmxlbmd0aFxyXG4gICAgICB9KVxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgZmV0Y2hpbmcgTmV0bGlmeSBkZXBsb3lzOicsIGVycm9yKVxyXG4gICAgICByZXMuc3RhdHVzKDUwMCkuanNvbih7IFxyXG4gICAgICAgIGVycm9yOiAnRmFpbGVkIHRvIGZldGNoIGRlcGxveXMnLFxyXG4gICAgICAgIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UgXHJcbiAgICAgIH0pXHJcbiAgICB9XHJcbiAgfSlcclxuXHJcbiAgLy8gRmV0Y2ggZGV0YWlsZWQgZGVwbG95IGluZm9ybWF0aW9uXHJcbiAgYXBwLmdldCgnL2FwaS9uZXRsaWZ5L2RlcGxveS86ZGVwbG95SWQnLCBhc3luYyAocmVxLCByZXMpID0+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGFjY2Vzc1Rva2VuID0gcmVxLmhlYWRlcnNbJ3gtbmV0bGlmeS1hY2Nlc3MtdG9rZW4nXVxyXG4gICAgICBjb25zdCB7IGRlcGxveUlkIH0gPSByZXEucGFyYW1zXHJcbiAgICAgIFxyXG4gICAgICBpZiAoIWFjY2Vzc1Rva2VuKSB7XHJcbiAgICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDAxKS5qc29uKHsgXHJcbiAgICAgICAgICBlcnJvcjogJ05vdCBjb25maWd1cmVkJyxcclxuICAgICAgICAgIG1lc3NhZ2U6ICdQbGVhc2UgYWRkIHlvdXIgTmV0bGlmeSBhY2Nlc3MgdG9rZW4gaW4gU2V0dGluZ3MgPiBTZWNyZXRzJ1xyXG4gICAgICAgIH0pXHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIEZldGNoIGRlcGxveSBkZXRhaWxzXHJcbiAgICAgIGNvbnN0IGRlcGxveVJlc3BvbnNlID0gYXdhaXQgZmV0Y2goXHJcbiAgICAgICAgYGh0dHBzOi8vYXBpLm5ldGxpZnkuY29tL2FwaS92MS9kZXBsb3lzLyR7ZGVwbG95SWR9YCxcclxuICAgICAgICB7XHJcbiAgICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAgICdBdXRob3JpemF0aW9uJzogYEJlYXJlciAke2FjY2Vzc1Rva2VufWAsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH1cclxuICAgICAgKVxyXG5cclxuICAgICAgaWYgKCFkZXBsb3lSZXNwb25zZS5vaykge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIGZldGNoIGRlcGxveTogJHtkZXBsb3lSZXNwb25zZS5zdGF0dXNUZXh0fWApXHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnN0IGRlcGxveSA9IGF3YWl0IGRlcGxveVJlc3BvbnNlLmpzb24oKVxyXG4gICAgICBcclxuICAgICAgLy8gRm9ybWF0IHRoZSByZXNwb25zZSB3aXRoIGFsbCBhdmFpbGFibGUgZGV0YWlsc1xyXG4gICAgICBjb25zdCBkZXRhaWxzID0ge1xyXG4gICAgICAgIGlkOiBkZXBsb3kuaWQsXHJcbiAgICAgICAgc2l0ZUlkOiBkZXBsb3kuc2l0ZV9pZCxcclxuICAgICAgICBzaXRlTmFtZTogZGVwbG95Lm5hbWUsXHJcbiAgICAgICAgc3RhdGU6IGRlcGxveS5zdGF0ZSxcclxuICAgICAgICBjb250ZXh0OiBkZXBsb3kuY29udGV4dCxcclxuICAgICAgICBicmFuY2g6IGRlcGxveS5icmFuY2gsXHJcbiAgICAgICAgY29tbWl0UmVmOiBkZXBsb3kuY29tbWl0X3JlZixcclxuICAgICAgICBjb21taXRVcmw6IGRlcGxveS5jb21taXRfdXJsLFxyXG4gICAgICAgIHRpdGxlOiBkZXBsb3kudGl0bGUsXHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gVGltZXN0YW1wc1xyXG4gICAgICAgIGNyZWF0ZWRBdDogZGVwbG95LmNyZWF0ZWRfYXQsXHJcbiAgICAgICAgdXBkYXRlZEF0OiBkZXBsb3kudXBkYXRlZF9hdCxcclxuICAgICAgICBwdWJsaXNoZWRBdDogZGVwbG95LnB1Ymxpc2hlZF9hdCxcclxuICAgICAgICBcclxuICAgICAgICAvLyBVUkxzXHJcbiAgICAgICAgZGVwbG95VXJsOiBkZXBsb3kuZGVwbG95X3NzbF91cmwgfHwgZGVwbG95LmRlcGxveV91cmwsXHJcbiAgICAgICAgYWRtaW5Vcmw6IGRlcGxveS5hZG1pbl91cmwsXHJcbiAgICAgICAgc2NyZWVuc2hvdFVybDogZGVwbG95LnNjcmVlbnNob3RfdXJsLFxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIEJ1aWxkIGluZm9cclxuICAgICAgICBidWlsZFRpbWU6IGRlcGxveS5kZXBsb3lfdGltZSxcclxuICAgICAgICBlcnJvck1lc3NhZ2U6IGRlcGxveS5lcnJvcl9tZXNzYWdlLFxyXG4gICAgICAgIFxyXG4gICAgICAgIC8vIFN1bW1hcnlcclxuICAgICAgICBzdW1tYXJ5OiBkZXBsb3kuc3VtbWFyeSB8fCB7fSxcclxuICAgICAgICBcclxuICAgICAgICAvLyBGcmFtZXdvcmtcclxuICAgICAgICBmcmFtZXdvcms6IGRlcGxveS5mcmFtZXdvcmssXHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gVXNlciBpbmZvXHJcbiAgICAgICAgZGVwbG95ZWRCeTogZGVwbG95LnB1Ymxpc2hlZF9kZXBsb3kgPyB7XHJcbiAgICAgICAgICBuYW1lOiBkZXBsb3kucHVibGlzaGVkX2RlcGxveS5uYW1lLFxyXG4gICAgICAgICAgZW1haWw6IGRlcGxveS5wdWJsaXNoZWRfZGVwbG95LmVtYWlsXHJcbiAgICAgICAgfSA6IG51bGwsXHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gRmlsZSBjaGFuZ2VzXHJcbiAgICAgICAgZmlsZXNDaGFuZ2VkOiBkZXBsb3kuc3VtbWFyeT8uc3RhdHVzID09PSAncmVhZHknID8ge1xyXG4gICAgICAgICAgbmV3RmlsZXM6IGRlcGxveS5zdW1tYXJ5Py5tZXNzYWdlcz8uZmlsdGVyKG0gPT4gbS50eXBlID09PSAnbmV3JykubGVuZ3RoIHx8IDAsXHJcbiAgICAgICAgICB1cGRhdGVkRmlsZXM6IGRlcGxveS5zdW1tYXJ5Py5tZXNzYWdlcz8uZmlsdGVyKG0gPT4gbS50eXBlID09PSAnY2hhbmdlZCcpLmxlbmd0aCB8fCAwLFxyXG4gICAgICAgICAgZGVsZXRlZEZpbGVzOiBkZXBsb3kuc3VtbWFyeT8ubWVzc2FnZXM/LmZpbHRlcihtID0+IG0udHlwZSA9PT0gJ2RlbGV0ZWQnKS5sZW5ndGggfHwgMCxcclxuICAgICAgICB9IDogbnVsbCxcclxuICAgICAgICBcclxuICAgICAgICAvLyBGdW5jdGlvbnMgYW5kIGVkZ2UgZnVuY3Rpb25zXHJcbiAgICAgICAgZnVuY3Rpb25zOiBkZXBsb3kuZnVuY3Rpb25zIHx8IFtdLFxyXG4gICAgICAgIGVkZ2VGdW5jdGlvbnM6IGRlcGxveS5lZGdlX2Z1bmN0aW9ucyB8fCBbXSxcclxuICAgICAgICBcclxuICAgICAgICAvLyBCdWlsZCBsb2cgVVJMIChpZiBhdmFpbGFibGUpXHJcbiAgICAgICAgYnVpbGRMb2dVcmw6IGRlcGxveS5idWlsZF9sb2dfdXJsLFxyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICByZXMuanNvbih7IGRlcGxveTogZGV0YWlscyB9KVxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgZmV0Y2hpbmcgZGVwbG95IGRldGFpbHM6JywgZXJyb3IpXHJcbiAgICAgIHJlcy5zdGF0dXMoNTAwKS5qc29uKHsgXHJcbiAgICAgICAgZXJyb3I6ICdGYWlsZWQgdG8gZmV0Y2ggZGVwbG95IGRldGFpbHMnLFxyXG4gICAgICAgIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UgXHJcbiAgICAgIH0pXHJcbiAgICB9XHJcbiAgfSlcclxuXHJcbiAgLy8gPT09PT0gT3BlbkFJIEFQSSBQcm94eSBFbmRwb2ludCA9PT09PVxyXG5cclxuICAvLyBQcm94eSBPcGVuQUkgY2hhdCBjb21wbGV0aW9ucyAoc3RyZWFtaW5nKVxyXG4gIGFwcC5wb3N0KCcvYXBpL29wZW5haS9jaGF0JywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCB7IG1lc3NhZ2VzLCBtb2RlbCwgc2V0dGluZ3MgfSA9IHJlcS5ib2R5XHJcbiAgICAgIGNvbnN0IGFwaUtleSA9IHJlcS5oZWFkZXJzWyd4LW9wZW5haS1hcGkta2V5J11cclxuICAgICAgXHJcbiAgICAgIGNvbnNvbGUubG9nKCdcdUQ4M0VcdUREMTYgT3BlbkFJOiBSZXF1ZXN0IHJlY2VpdmVkJylcclxuICAgICAgY29uc29sZS5sb2coJyAgIE1vZGVsOicsIG1vZGVsKVxyXG4gICAgICBjb25zb2xlLmxvZygnICAgTWVzc2FnZXMgY291bnQ6JywgbWVzc2FnZXM/Lmxlbmd0aClcclxuICAgICAgY29uc29sZS5sb2coJyAgIEFQSSBLZXkgcHJlc2VudDonLCAhIWFwaUtleSlcclxuICAgICAgXHJcbiAgICAgIGlmICghYXBpS2V5KSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignXHUyNzRDIE9wZW5BSTogTm8gQVBJIGtleSBwcm92aWRlZCcpXHJcbiAgICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDAxKS5qc29uKHsgXHJcbiAgICAgICAgICBlcnJvcjogJ09wZW5BSSBBUEkga2V5IG5vdCBjb25maWd1cmVkJyxcclxuICAgICAgICAgIG1lc3NhZ2U6ICdQbGVhc2UgYWRkIHlvdXIgT3BlbkFJIEFQSSBrZXkgaW4gU2V0dGluZ3MgPiBTZWNyZXRzJ1xyXG4gICAgICAgIH0pXHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnNvbGUubG9nKCdcdUQ4M0VcdUREMTYgT3BlbkFJOiBQcm94eWluZyByZXF1ZXN0IGZvciBtb2RlbDonLCBtb2RlbClcclxuXHJcbiAgICAgIC8vIE1ha2UgcmVxdWVzdCB0byBPcGVuQUkgQVBJXHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goJ2h0dHBzOi8vYXBpLm9wZW5haS5jb20vdjEvY2hhdC9jb21wbGV0aW9ucycsIHtcclxuICAgICAgICBtZXRob2Q6ICdQT1NUJyxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0F1dGhvcml6YXRpb24nOiBgQmVhcmVyICR7YXBpS2V5fWAsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBtb2RlbCxcclxuICAgICAgICAgIG1lc3NhZ2VzLFxyXG4gICAgICAgICAgc3RyZWFtOiB0cnVlLFxyXG4gICAgICAgICAgdGVtcGVyYXR1cmU6IHNldHRpbmdzPy50ZW1wZXJhdHVyZSB8fCAwLjcsXHJcbiAgICAgICAgICBtYXhfdG9rZW5zOiBzZXR0aW5ncz8ubWF4VG9rZW5zIHx8IDIwMDAsXHJcbiAgICAgICAgICB0b3BfcDogc2V0dGluZ3M/LnRvcFAgfHwgMSxcclxuICAgICAgICAgIGZyZXF1ZW5jeV9wZW5hbHR5OiBzZXR0aW5ncz8uZnJlcXVlbmN5UGVuYWx0eSB8fCAwLFxyXG4gICAgICAgICAgcHJlc2VuY2VfcGVuYWx0eTogc2V0dGluZ3M/LnByZXNlbmNlUGVuYWx0eSB8fCAwLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9KVxyXG5cclxuICAgICAgY29uc29sZS5sb2coJ1x1RDgzRVx1REQxNiBPcGVuQUk6IFJlc3BvbnNlIHN0YXR1czonLCByZXNwb25zZS5zdGF0dXMpXHJcblxyXG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XHJcbiAgICAgICAgY29uc3QgZXJyb3IgPSBhd2FpdCByZXNwb25zZS5qc29uKCkuY2F0Y2goKCkgPT4gKHsgZXJyb3I6IHsgbWVzc2FnZTogJ1Vua25vd24gZXJyb3InIH0gfSkpXHJcbiAgICAgICAgY29uc29sZS5lcnJvcignXHUyNzRDIE9wZW5BSSBBUEkgRXJyb3I6JylcclxuICAgICAgICBjb25zb2xlLmVycm9yKCcgICBTdGF0dXM6JywgcmVzcG9uc2Uuc3RhdHVzKVxyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJyAgIEVycm9yOicsIEpTT04uc3RyaW5naWZ5KGVycm9yLCBudWxsLCAyKSlcclxuICAgICAgICByZXR1cm4gcmVzLnN0YXR1cyhyZXNwb25zZS5zdGF0dXMpLmpzb24oe1xyXG4gICAgICAgICAgZXJyb3I6IGVycm9yLmVycm9yPy5tZXNzYWdlIHx8ICdPcGVuQUkgQVBJIHJlcXVlc3QgZmFpbGVkJ1xyXG4gICAgICAgIH0pXHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnNvbGUubG9nKCdcdTI3MDUgT3BlbkFJOiBTdHJlYW1pbmcgcmVzcG9uc2UuLi4nKVxyXG5cclxuICAgICAgLy8gU2V0IGhlYWRlcnMgZm9yIHN0cmVhbWluZ1xyXG4gICAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAndGV4dC9ldmVudC1zdHJlYW0nKVxyXG4gICAgICByZXMuc2V0SGVhZGVyKCdDYWNoZS1Db250cm9sJywgJ25vLWNhY2hlJylcclxuICAgICAgcmVzLnNldEhlYWRlcignQ29ubmVjdGlvbicsICdrZWVwLWFsaXZlJylcclxuXHJcbiAgICAgIC8vIFN0cmVhbSB0aGUgcmVzcG9uc2UgdXNpbmcgV2ViIFN0cmVhbXMgQVBJXHJcbiAgICAgIGNvbnN0IHJlYWRlciA9IHJlc3BvbnNlLmJvZHkuZ2V0UmVhZGVyKClcclxuICAgICAgY29uc3QgcHVtcCA9IGFzeW5jICgpID0+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgd2hpbGUgKHRydWUpIHtcclxuICAgICAgICAgICAgY29uc3QgeyBkb25lLCB2YWx1ZSB9ID0gYXdhaXQgcmVhZGVyLnJlYWQoKVxyXG4gICAgICAgICAgICBpZiAoZG9uZSkge1xyXG4gICAgICAgICAgICAgIGNvbnNvbGUubG9nKCdcdTI3MDUgT3BlbkFJOiBTdHJlYW0gY29tcGxldGVkJylcclxuICAgICAgICAgICAgICByZXMuZW5kKClcclxuICAgICAgICAgICAgICBicmVha1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJlcy53cml0ZSh2YWx1ZSlcclxuICAgICAgICAgIH1cclxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAgICAgY29uc29sZS5lcnJvcignXHUyNzRDIE9wZW5BSSBTdHJlYW0gZXJyb3I6JylcclxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJyAgIEVycm9yOicsIGVycm9yLm1lc3NhZ2UpXHJcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCcgICBTdGFjazonLCBlcnJvci5zdGFjaylcclxuICAgICAgICAgIHJlcy5lbmQoKVxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBwdW1wKClcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1x1Mjc0QyBFcnJvciBwcm94eWluZyBPcGVuQUkgcmVxdWVzdDonKVxyXG4gICAgICBjb25zb2xlLmVycm9yKCcgICBNZXNzYWdlOicsIGVycm9yLm1lc3NhZ2UpXHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyAgIFN0YWNrOicsIGVycm9yLnN0YWNrKVxyXG4gICAgICBjb25zb2xlLmVycm9yKCcgICBGdWxsIGVycm9yOicsIGVycm9yKVxyXG4gICAgICBpZiAoIXJlcy5oZWFkZXJzU2VudCkge1xyXG4gICAgICAgIHJlcy5zdGF0dXMoNTAwKS5qc29uKHsgXHJcbiAgICAgICAgICBlcnJvcjogJ0ZhaWxlZCB0byBwcm9jZXNzIE9wZW5BSSByZXF1ZXN0JyxcclxuICAgICAgICAgIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UgXHJcbiAgICAgICAgfSlcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH0pXHJcblxyXG4gIC8vID09PT09IENsYXVkZSBBUEkgUHJveHkgRW5kcG9pbnQgPT09PT1cclxuXHJcbiAgLy8gUHJveHkgQ2xhdWRlIG1lc3NhZ2VzIChzdHJlYW1pbmcpXHJcbiAgYXBwLnBvc3QoJy9hcGkvY2xhdWRlL21lc3NhZ2VzJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCB7IG1lc3NhZ2VzLCBtb2RlbCwgc2V0dGluZ3MsIHN5c3RlbSB9ID0gcmVxLmJvZHlcclxuICAgICAgY29uc3QgYXBpS2V5ID0gcmVxLmhlYWRlcnNbJ3gtY2xhdWRlLWFwaS1rZXknXVxyXG4gICAgICBcclxuICAgICAgY29uc29sZS5sb2coJ1x1RDgzRVx1REQxNiBDbGF1ZGU6IFJlcXVlc3QgcmVjZWl2ZWQnKVxyXG4gICAgICBjb25zb2xlLmxvZygnICAgTW9kZWw6JywgbW9kZWwpXHJcbiAgICAgIGNvbnNvbGUubG9nKCcgICBNZXNzYWdlcyBjb3VudDonLCBtZXNzYWdlcz8ubGVuZ3RoKVxyXG4gICAgICBjb25zb2xlLmxvZygnICAgQVBJIEtleSBwcmVzZW50OicsICEhYXBpS2V5KVxyXG4gICAgICBjb25zb2xlLmxvZygnICAgU3lzdGVtIG1lc3NhZ2U6JywgISFzeXN0ZW0pXHJcbiAgICAgIFxyXG4gICAgICBpZiAoIWFwaUtleSkge1xyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ1x1Mjc0QyBDbGF1ZGU6IE5vIEFQSSBrZXkgcHJvdmlkZWQnKVxyXG4gICAgICAgIHJldHVybiByZXMuc3RhdHVzKDQwMSkuanNvbih7IFxyXG4gICAgICAgICAgZXJyb3I6ICdDbGF1ZGUgQVBJIGtleSBub3QgY29uZmlndXJlZCcsXHJcbiAgICAgICAgICBtZXNzYWdlOiAnUGxlYXNlIGFkZCB5b3VyIENsYXVkZSBBUEkga2V5IGluIFNldHRpbmdzID4gU2VjcmV0cydcclxuICAgICAgICB9KVxyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zb2xlLmxvZygnXHVEODNFXHVERDE2IENsYXVkZTogUHJveHlpbmcgcmVxdWVzdCBmb3IgbW9kZWw6JywgbW9kZWwpXHJcblxyXG4gICAgICBjb25zdCByZXF1ZXN0Qm9keSA9IHtcclxuICAgICAgICBtb2RlbCxcclxuICAgICAgICBtZXNzYWdlcyxcclxuICAgICAgICBtYXhfdG9rZW5zOiBzZXR0aW5ncz8ubWF4VG9rZW5zIHx8IDIwMDAsXHJcbiAgICAgICAgc3RyZWFtOiB0cnVlLFxyXG4gICAgICAgIHRlbXBlcmF0dXJlOiBzZXR0aW5ncz8udGVtcGVyYXR1cmUgfHwgMC43LFxyXG4gICAgICAgIHRvcF9wOiBzZXR0aW5ncz8udG9wUCB8fCAxLFxyXG4gICAgICB9XHJcblxyXG4gICAgICBpZiAoc3lzdGVtKSB7XHJcbiAgICAgICAgcmVxdWVzdEJvZHkuc3lzdGVtID0gc3lzdGVtXHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIE1ha2UgcmVxdWVzdCB0byBDbGF1ZGUgQVBJXHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2goJ2h0dHBzOi8vYXBpLmFudGhyb3BpYy5jb20vdjEvbWVzc2FnZXMnLCB7XHJcbiAgICAgICAgbWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICd4LWFwaS1rZXknOiBhcGlLZXksXHJcbiAgICAgICAgICAnYW50aHJvcGljLXZlcnNpb24nOiAnMjAyMy0wNi0wMScsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShyZXF1ZXN0Qm9keSksXHJcbiAgICAgIH0pXHJcblxyXG4gICAgICBjb25zb2xlLmxvZygnXHVEODNFXHVERDE2IENsYXVkZTogUmVzcG9uc2Ugc3RhdHVzOicsIHJlc3BvbnNlLnN0YXR1cylcclxuXHJcbiAgICAgIGlmICghcmVzcG9uc2Uub2spIHtcclxuICAgICAgICBjb25zdCBlcnJvciA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKS5jYXRjaCgoKSA9PiAoeyBlcnJvcjogeyBtZXNzYWdlOiAnVW5rbm93biBlcnJvcicgfSB9KSlcclxuICAgICAgICBjb25zb2xlLmVycm9yKCdcdTI3NEMgQ2xhdWRlIEFQSSBFcnJvcjonKVxyXG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJyAgIFN0YXR1czonLCByZXNwb25zZS5zdGF0dXMpXHJcbiAgICAgICAgY29uc29sZS5lcnJvcignICAgRXJyb3I6JywgSlNPTi5zdHJpbmdpZnkoZXJyb3IsIG51bGwsIDIpKVxyXG4gICAgICAgIHJldHVybiByZXMuc3RhdHVzKHJlc3BvbnNlLnN0YXR1cykuanNvbih7XHJcbiAgICAgICAgICBlcnJvcjogZXJyb3IuZXJyb3I/Lm1lc3NhZ2UgfHwgJ0NsYXVkZSBBUEkgcmVxdWVzdCBmYWlsZWQnXHJcbiAgICAgICAgfSlcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc29sZS5sb2coJ1x1MjcwNSBDbGF1ZGU6IFN0cmVhbWluZyByZXNwb25zZS4uLicpXHJcblxyXG4gICAgICAvLyBTZXQgaGVhZGVycyBmb3Igc3RyZWFtaW5nXHJcbiAgICAgIHJlcy5zZXRIZWFkZXIoJ0NvbnRlbnQtVHlwZScsICd0ZXh0L2V2ZW50LXN0cmVhbScpXHJcbiAgICAgIHJlcy5zZXRIZWFkZXIoJ0NhY2hlLUNvbnRyb2wnLCAnbm8tY2FjaGUnKVxyXG4gICAgICByZXMuc2V0SGVhZGVyKCdDb25uZWN0aW9uJywgJ2tlZXAtYWxpdmUnKVxyXG5cclxuICAgICAgLy8gU3RyZWFtIHRoZSByZXNwb25zZSB1c2luZyBXZWIgU3RyZWFtcyBBUElcclxuICAgICAgY29uc3QgcmVhZGVyID0gcmVzcG9uc2UuYm9keS5nZXRSZWFkZXIoKVxyXG4gICAgICBjb25zdCBwdW1wID0gYXN5bmMgKCkgPT4ge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICB3aGlsZSAodHJ1ZSkge1xyXG4gICAgICAgICAgICBjb25zdCB7IGRvbmUsIHZhbHVlIH0gPSBhd2FpdCByZWFkZXIucmVhZCgpXHJcbiAgICAgICAgICAgIGlmIChkb25lKSB7XHJcbiAgICAgICAgICAgICAgY29uc29sZS5sb2coJ1x1MjcwNSBDbGF1ZGU6IFN0cmVhbSBjb21wbGV0ZWQnKVxyXG4gICAgICAgICAgICAgIHJlcy5lbmQoKVxyXG4gICAgICAgICAgICAgIGJyZWFrXHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmVzLndyaXRlKHZhbHVlKVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdcdTI3NEMgQ2xhdWRlIFN0cmVhbSBlcnJvcjonKVxyXG4gICAgICAgICAgY29uc29sZS5lcnJvcignICAgRXJyb3I6JywgZXJyb3IubWVzc2FnZSlcclxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJyAgIFN0YWNrOicsIGVycm9yLnN0YWNrKVxyXG4gICAgICAgICAgcmVzLmVuZCgpXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIHB1bXAoKVxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignXHUyNzRDIEVycm9yIHByb3h5aW5nIENsYXVkZSByZXF1ZXN0OicpXHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyAgIE1lc3NhZ2U6JywgZXJyb3IubWVzc2FnZSlcclxuICAgICAgY29uc29sZS5lcnJvcignICAgU3RhY2s6JywgZXJyb3Iuc3RhY2spXHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJyAgIEZ1bGwgZXJyb3I6JywgZXJyb3IpXHJcbiAgICAgIGlmICghcmVzLmhlYWRlcnNTZW50KSB7XHJcbiAgICAgICAgcmVzLnN0YXR1cyg1MDApLmpzb24oeyBcclxuICAgICAgICAgIGVycm9yOiAnRmFpbGVkIHRvIHByb2Nlc3MgQ2xhdWRlIHJlcXVlc3QnLFxyXG4gICAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZSBcclxuICAgICAgICB9KVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfSlcclxuXHJcbiAgLy8gPT09PT0gQkQyNCBMaXZlIFJTUyBGZWVkIEFQSSBFbmRwb2ludHMgPT09PT1cclxuXHJcbiAgLy8gQ2FjaGUgZm9yIEJEMjQgTGl2ZSBuZXdzICh0byBhdm9pZCBleGNlc3NpdmUgcmVxdWVzdHMpXHJcbiAgbGV0IGJkMjRMaXZlQ2FjaGUgPSB7XHJcbiAgICBhcnRpY2xlczogW10sXHJcbiAgICBsYXN0RmV0Y2hlZDogbnVsbCxcclxuICAgIGNhY2hlRXhwaXJ5OiAzMCAqIDYwICogMTAwMCAvLyAzMCBtaW51dGVzIGluIG1pbGxpc2Vjb25kc1xyXG4gIH1cclxuXHJcbiAgLy8gSW5pdGlhbGl6ZSBSU1MgcGFyc2VyIHdpdGggY3VzdG9tIGZpZWxkc1xyXG4gIGNvbnN0IHJzc1BhcnNlciA9IG5ldyBQYXJzZXIoe1xyXG4gICAgY3VzdG9tRmllbGRzOiB7XHJcbiAgICAgIGl0ZW06IFtcclxuICAgICAgICBbJ21lZGlhOmNvbnRlbnQnLCAnbWVkaWE6Y29udGVudCcsIHtrZWVwQXJyYXk6IGZhbHNlfV0sXHJcbiAgICAgICAgWydtZWRpYTp0aHVtYm5haWwnLCAnbWVkaWE6dGh1bWJuYWlsJywge2tlZXBBcnJheTogZmFsc2V9XVxyXG4gICAgICBdXHJcbiAgICB9XHJcbiAgfSlcclxuXHJcbiAgLy8gQ2hlY2sgaWYgQkQyNCBMaXZlIFJTUyBmZWVkIGlzIG9wZXJhdGlvbmFsXHJcbiAgYXBwLmdldCgnL2FwaS9iZDI0bGl2ZS9zdGF0dXMnLCAocmVxLCByZXMpID0+IHtcclxuICAgIHJlcy5qc29uKHsgb3BlcmF0aW9uYWw6IHRydWUgfSlcclxuICB9KVxyXG5cclxuICAvLyBDbGVhciBCRDI0IExpdmUgY2FjaGUgKGZvciBkZWJ1Z2dpbmcpXHJcbiAgYXBwLnBvc3QoJy9hcGkvYmQyNGxpdmUvY2xlYXItY2FjaGUnLCAocmVxLCByZXMpID0+IHtcclxuICAgIGJkMjRMaXZlQ2FjaGUgPSB7XHJcbiAgICAgIGFydGljbGVzOiBbXSxcclxuICAgICAgbGFzdEZldGNoZWQ6IG51bGwsXHJcbiAgICAgIGNhY2hlRXhwaXJ5OiAzMCAqIDYwICogMTAwMFxyXG4gICAgfVxyXG4gICAgY29uc29sZS5sb2coJ1x1RDgzRFx1REREMVx1RkUwRiAgQkQyNCBMaXZlIGNhY2hlIGNsZWFyZWQnKVxyXG4gICAgcmVzLmpzb24oeyBzdWNjZXNzOiB0cnVlLCBtZXNzYWdlOiAnQ2FjaGUgY2xlYXJlZCcgfSlcclxuICB9KVxyXG5cclxuICAvLyBGZXRjaCBsYXRlc3QgbmV3cyBmcm9tIEJEMjQgTGl2ZSBSU1MgZmVlZFxyXG4gIGFwcC5nZXQoJy9hcGkvYmQyNGxpdmUvbmV3cycsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gQ2hlY2sgaWYgY2FjaGUgaXMgc3RpbGwgdmFsaWRcclxuICAgICAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKVxyXG4gICAgICBpZiAoYmQyNExpdmVDYWNoZS5sYXN0RmV0Y2hlZCAmJiBcclxuICAgICAgICAgIChub3cgLSBiZDI0TGl2ZUNhY2hlLmxhc3RGZXRjaGVkKSA8IGJkMjRMaXZlQ2FjaGUuY2FjaGVFeHBpcnkgJiZcclxuICAgICAgICAgIGJkMjRMaXZlQ2FjaGUuYXJ0aWNsZXMubGVuZ3RoID4gMCkge1xyXG4gICAgICAgIGNvbnNvbGUubG9nKCdcdTI3MDUgUmV0dXJuaW5nIGNhY2hlZCBCRDI0IExpdmUgbmV3cycpXHJcbiAgICAgICAgcmV0dXJuIHJlcy5qc29uKHsgXHJcbiAgICAgICAgICBhcnRpY2xlczogYmQyNExpdmVDYWNoZS5hcnRpY2xlcyxcclxuICAgICAgICAgIGNhY2hlZDogdHJ1ZSxcclxuICAgICAgICAgIGxhc3RGZXRjaGVkOiBuZXcgRGF0ZShiZDI0TGl2ZUNhY2hlLmxhc3RGZXRjaGVkKS50b0lTT1N0cmluZygpXHJcbiAgICAgICAgfSlcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc29sZS5sb2coJ1x1RDgzRFx1REQwNCBGZXRjaGluZyBmcmVzaCBCRDI0IExpdmUgbmV3cyBmcm9tIFJTUyBmZWVkLi4uJylcclxuICAgICAgXHJcbiAgICAgIC8vIFBhcnNlIFJTUyBmZWVkXHJcbiAgICAgIGNvbnN0IGZlZWQgPSBhd2FpdCByc3NQYXJzZXIucGFyc2VVUkwoJ2h0dHBzOi8vd3d3LmJkMjRsaXZlLmNvbS9iYW5nbGEvZmVlZCcpXHJcbiAgICAgIFxyXG4gICAgICBjb25zb2xlLmxvZyhgXHVEODNEXHVEQ0YwIFJTUyBGZWVkOiAke2ZlZWQudGl0bGV9YClcclxuICAgICAgY29uc29sZS5sb2coYFx1RDgzRFx1RENDQSBUb3RhbCBpdGVtcyBpbiBmZWVkOiAke2ZlZWQuaXRlbXMubGVuZ3RofWApXHJcbiAgICAgIFxyXG4gICAgICAvLyBDb252ZXJ0IFJTUyBpdGVtcyB0byBhcnRpY2xlIGZvcm1hdFxyXG4gICAgICBjb25zdCBhcnRpY2xlcyA9IGZlZWQuaXRlbXMuc2xpY2UoMCwgMjApLm1hcCgoaXRlbSwgaW5kZXgpID0+IHtcclxuICAgICAgICAvLyBFeHRyYWN0IGltYWdlIGZyb20gbWVkaWE6Y29udGVudCBvciBlbmNsb3N1cmVcclxuICAgICAgICBsZXQgaW1hZ2UgPSBudWxsXHJcbiAgICAgICAgXHJcbiAgICAgICAgLy8gVHJ5IGRpZmZlcmVudCBwb3NzaWJsZSBzdHJ1Y3R1cmVzXHJcbiAgICAgICAgaWYgKGl0ZW1bJ21lZGlhOmNvbnRlbnQnXSkge1xyXG4gICAgICAgICAgaWYgKGl0ZW1bJ21lZGlhOmNvbnRlbnQnXVsnJCddICYmIGl0ZW1bJ21lZGlhOmNvbnRlbnQnXVsnJCddLnVybCkge1xyXG4gICAgICAgICAgICBpbWFnZSA9IGRlY29kZVVSSUNvbXBvbmVudChpdGVtWydtZWRpYTpjb250ZW50J11bJyQnXS51cmwpXHJcbiAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW1bJ21lZGlhOmNvbnRlbnQnXS51cmwpIHtcclxuICAgICAgICAgICAgaW1hZ2UgPSBkZWNvZGVVUklDb21wb25lbnQoaXRlbVsnbWVkaWE6Y29udGVudCddLnVybClcclxuICAgICAgICAgIH0gZWxzZSBpZiAodHlwZW9mIGl0ZW1bJ21lZGlhOmNvbnRlbnQnXSA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgaW1hZ2UgPSBkZWNvZGVVUklDb21wb25lbnQoaXRlbVsnbWVkaWE6Y29udGVudCddKVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0gZWxzZSBpZiAoaXRlbS5lbmNsb3N1cmUgJiYgaXRlbS5lbmNsb3N1cmUudXJsKSB7XHJcbiAgICAgICAgICBpbWFnZSA9IGRlY29kZVVSSUNvbXBvbmVudChpdGVtLmVuY2xvc3VyZS51cmwpXHJcbiAgICAgICAgfVxyXG4gICAgICAgIFxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICB0aXRsZTogaXRlbS50aXRsZSB8fCAnTm8gVGl0bGUnLFxyXG4gICAgICAgICAgZGVzY3JpcHRpb246IGl0ZW0uY29udGVudFNuaXBwZXQgfHwgaXRlbS5jb250ZW50IHx8IGl0ZW0uZGVzY3JpcHRpb24gfHwgJycsXHJcbiAgICAgICAgICB1cmw6IGl0ZW0ubGluayB8fCBpdGVtLmd1aWQgfHwgJycsXHJcbiAgICAgICAgICBpbWFnZTogaW1hZ2UsXHJcbiAgICAgICAgICBwdWJsaXNoZWRBdDogaXRlbS5wdWJEYXRlIHx8IGl0ZW0uaXNvRGF0ZSB8fCBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgICBzb3VyY2U6IGZlZWQudGl0bGUgfHwgJ0JEMjQgTGl2ZSdcclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcblxyXG4gICAgICBjb25zb2xlLmxvZyhgXFxuXHVEODNEXHVEQ0NBID09PT09PT09PT0gUlNTIFBBUlNJTkcgU1VNTUFSWSA9PT09PT09PT09YClcclxuICAgICAgY29uc29sZS5sb2coYFRvdGFsIGFydGljbGVzIHBhcnNlZDogJHthcnRpY2xlcy5sZW5ndGh9YClcclxuICAgICAgXHJcbiAgICAgIGlmIChhcnRpY2xlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYFx1RDgzRFx1RENDNSBTYW1wbGUgYXJ0aWNsZXM6YClcclxuICAgICAgICBhcnRpY2xlcy5zbGljZSgwLCAzKS5mb3JFYWNoKChhcnRpY2xlLCBpZHgpID0+IHtcclxuICAgICAgICAgIGNvbnNvbGUubG9nKGAgICR7aWR4ICsgMX0uICR7YXJ0aWNsZS50aXRsZS5zdWJzdHJpbmcoMCwgNjApfS4uLmApXHJcbiAgICAgICAgICBjb25zb2xlLmxvZyhgICAgICBQdWJsaXNoZWQ6ICR7YXJ0aWNsZS5wdWJsaXNoZWRBdH1gKVxyXG4gICAgICAgIH0pXHJcbiAgICAgICAgY29uc29sZS5sb2coYD09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cXG5gKVxyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBVcGRhdGUgY2FjaGVcclxuICAgICAgYmQyNExpdmVDYWNoZSA9IHtcclxuICAgICAgICBhcnRpY2xlczogYXJ0aWNsZXMsXHJcbiAgICAgICAgbGFzdEZldGNoZWQ6IG5vdyxcclxuICAgICAgICBjYWNoZUV4cGlyeTogMzAgKiA2MCAqIDEwMDBcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgcmVzLmpzb24oeyBcclxuICAgICAgICBhcnRpY2xlczogYmQyNExpdmVDYWNoZS5hcnRpY2xlcyxcclxuICAgICAgICBjYWNoZWQ6IGZhbHNlLFxyXG4gICAgICAgIGxhc3RGZXRjaGVkOiBuZXcgRGF0ZShub3cpLnRvSVNPU3RyaW5nKClcclxuICAgICAgfSlcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1x1Mjc0QyBFcnJvciBmZXRjaGluZyBCRDI0IExpdmUgUlNTOicsIGVycm9yKVxyXG4gICAgICBcclxuICAgICAgLy8gSWYgd2UgaGF2ZSBjYWNoZWQgZGF0YSwgcmV0dXJuIGl0IGV2ZW4gaWYgZXhwaXJlZFxyXG4gICAgICBpZiAoYmQyNExpdmVDYWNoZS5hcnRpY2xlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ1x1MjZBMFx1RkUwRiAgUmV0dXJuaW5nIHN0YWxlIGNhY2hlIGR1ZSB0byBlcnJvcicpXHJcbiAgICAgICAgcmV0dXJuIHJlcy5qc29uKHsgXHJcbiAgICAgICAgICBhcnRpY2xlczogYmQyNExpdmVDYWNoZS5hcnRpY2xlcyxcclxuICAgICAgICAgIGNhY2hlZDogdHJ1ZSxcclxuICAgICAgICAgIHN0YWxlOiB0cnVlLFxyXG4gICAgICAgICAgbGFzdEZldGNoZWQ6IGJkMjRMaXZlQ2FjaGUubGFzdEZldGNoZWQgPyBuZXcgRGF0ZShiZDI0TGl2ZUNhY2hlLmxhc3RGZXRjaGVkKS50b0lTT1N0cmluZygpIDogbnVsbFxyXG4gICAgICAgIH0pXHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIHJlcy5zdGF0dXMoNTAwKS5qc29uKHsgXHJcbiAgICAgICAgZXJyb3I6ICdGYWlsZWQgdG8gZmV0Y2ggQkQyNCBMaXZlIG5ld3MnLFxyXG4gICAgICAgIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UsXHJcbiAgICAgICAgYXJ0aWNsZXM6IFtdXHJcbiAgICAgIH0pXHJcbiAgICB9XHJcbiAgfSlcclxuXHJcbiAgcmV0dXJuIGFwcFxyXG59XHJcblxyXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xyXG5leHBvcnQgZGVmYXVsdCBkZWZpbmVDb25maWcoe1xyXG4gIHBsdWdpbnM6IFtcclxuICAgIHJlYWN0KCksXHJcbiAgICB7XHJcbiAgICAgIG5hbWU6ICdhcGktc2VydmVyJyxcclxuICAgICAgY29uZmlndXJlU2VydmVyKHNlcnZlcikge1xyXG4gICAgICAgIGNvbnN0IGFwaUFwcCA9IGNyZWF0ZUFwaVNlcnZlcigpXHJcbiAgICAgICAgc2VydmVyLm1pZGRsZXdhcmVzLnVzZShhcGlBcHApXHJcbiAgICAgICAgY29uc29sZS5sb2coJ1xcblx1MjcwNSBBUEkgc2VydmVyIGludGVncmF0ZWQgd2l0aCBWaXRlIGRldiBzZXJ2ZXInKVxyXG4gICAgICAgIGNvbnN0IHBvcnQgPSBwcm9jZXNzLmVudi5QT1JUIHx8IDUwMDBcclxuICAgICAgICBjb25zb2xlLmxvZyhgXHVEODNEXHVEQ0U3IEdtYWlsIGF1dGhlbnRpY2F0aW9uIGF2YWlsYWJsZSBhdDogaHR0cDovL2xvY2FsaG9zdDoke3BvcnR9L2FwaS9hdXRoL3VybFxcbmApXHJcbiAgICAgIH1cclxuICAgIH1cclxuICBdLFxyXG4gIHJlc29sdmU6IHtcclxuICAgIGFsaWFzOiB7XHJcbiAgICAgICdAJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjJyksXHJcbiAgICB9LFxyXG4gIH0sXHJcbiAgc2VydmVyOiB7XHJcbiAgICBwb3J0OiA1MDAwLFxyXG4gIH0sXHJcbn0pXHJcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBcU8sU0FBUyxvQkFBb0I7QUFDbFEsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUNqQixPQUFPLGFBQWE7QUFDcEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMsY0FBYztBQUN2QixPQUFPLFlBQVk7QUFFbkIsU0FBUyxxQkFBcUI7QUFDOUIsT0FBTyxZQUFZO0FBVHdILElBQU0sMkNBQTJDO0FBVzVMLElBQU0sYUFBYSxjQUFjLHdDQUFlO0FBQ2hELElBQU0sWUFBWSxLQUFLLFFBQVEsVUFBVTtBQUV6QyxPQUFPLE9BQU87QUFHZCxTQUFTLGtCQUFrQjtBQUN6QixTQUFPLElBQUksT0FBTyxLQUFLO0FBQUEsSUFDckIsUUFBUSxJQUFJO0FBQUEsSUFDWixRQUFRLElBQUk7QUFBQSxJQUNaLFFBQVEsSUFBSTtBQUFBLEVBQ2Q7QUFDRjtBQUdBLFNBQVMsMEJBQTBCLEtBQUs7QUFDdEMsTUFBSTtBQUNGLFVBQU0sY0FBYyxJQUFJLFFBQVEsZUFBZTtBQUMvQyxRQUFJLENBQUMsYUFBYTtBQUNoQixhQUFPO0FBQUEsSUFDVDtBQUNBLFVBQU0sY0FBYyxLQUFLLE1BQU0sV0FBVztBQUMxQyxVQUFNLGVBQWUsZ0JBQWdCO0FBQ3JDLGlCQUFhLGVBQWUsV0FBVztBQUN2QyxXQUFPO0FBQUEsRUFDVCxTQUFTLEtBQUs7QUFDWixZQUFRLE1BQU0sMENBQTBDLEdBQUc7QUFDM0QsV0FBTztBQUFBLEVBQ1Q7QUFDRjtBQUdBLFNBQVMsa0JBQWtCO0FBQ3pCLFFBQU0sTUFBTSxRQUFRO0FBQ3BCLE1BQUksSUFBSSxRQUFRLEtBQUssQ0FBQztBQUd0QixNQUFJLElBQUksaUJBQWlCLENBQUMsS0FBSyxRQUFRO0FBQ3JDLFVBQU0sZUFBZSxnQkFBZ0I7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
