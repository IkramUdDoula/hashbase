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
    process.env.GMAIL_REDIRECT_URI || "http://localhost:5000/oauth2callback"
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
      const frontendUrl = process.env.VITE_FRONTEND_URL || "http://localhost:5000";
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
      const frontendUrl = process.env.VITE_FRONTEND_URL || "http://localhost:5000";
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
  app.get("/api/netlify/deploys", async (req, res) => {
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
      res.json({ deploys: validDeploys });
    } catch (error) {
      console.error("Error fetching Netlify deploys:", error);
      res.status(500).json({
        error: "Failed to fetch deploys",
        message: error.message
      });
    }
  });
  let bd24LiveCache = {
    articles: [],
    lastFetched: null,
    cacheExpiry: 30 * 60 * 1e3
    // 30 minutes in milliseconds
  };
  const rssParser = new Parser();
  app.get("/api/bd24live/status", (req, res) => {
    res.json({ operational: true });
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
        if (item["media:content"] && item["media:content"]["$"] && item["media:content"]["$"].url) {
          image = item["media:content"]["$"].url;
        } else if (item.enclosure && item.enclosure.url) {
          image = item.enclosure.url;
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
        console.log("\u{1F4E7} Gmail authentication available at: http://localhost:5000/api/auth/url\n");
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJEOlxcXFxEZXZcXFxcaGFzaGJhc2VcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkQ6XFxcXERldlxcXFxoYXNoYmFzZVxcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vRDovRGV2L2hhc2hiYXNlL3ZpdGUuY29uZmlnLmpzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSdcclxuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0J1xyXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJ1xyXG5pbXBvcnQgZXhwcmVzcyBmcm9tICdleHByZXNzJ1xyXG5pbXBvcnQgY29ycyBmcm9tICdjb3JzJ1xyXG5pbXBvcnQgeyBnb29nbGUgfSBmcm9tICdnb29nbGVhcGlzJ1xyXG5pbXBvcnQgZG90ZW52IGZyb20gJ2RvdGVudidcclxuaW1wb3J0IGZzIGZyb20gJ2ZzJ1xyXG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAndXJsJ1xyXG5pbXBvcnQgUGFyc2VyIGZyb20gJ3Jzcy1wYXJzZXInXHJcblxyXG5jb25zdCBfX2ZpbGVuYW1lID0gZmlsZVVSTFRvUGF0aChpbXBvcnQubWV0YS51cmwpXHJcbmNvbnN0IF9fZGlybmFtZSA9IHBhdGguZGlybmFtZShfX2ZpbGVuYW1lKVxyXG5cclxuZG90ZW52LmNvbmZpZygpXHJcblxyXG4vLyBJbml0aWFsaXplIE9BdXRoMiBjbGllbnRcclxuZnVuY3Rpb24gZ2V0T0F1dGgyQ2xpZW50KCkge1xyXG4gIHJldHVybiBuZXcgZ29vZ2xlLmF1dGguT0F1dGgyKFxyXG4gICAgcHJvY2Vzcy5lbnYuR01BSUxfQ0xJRU5UX0lELFxyXG4gICAgcHJvY2Vzcy5lbnYuR01BSUxfQ0xJRU5UX1NFQ1JFVCxcclxuICAgIHByb2Nlc3MuZW52LkdNQUlMX1JFRElSRUNUX1VSSSB8fCAnaHR0cDovL2xvY2FsaG9zdDo1MDAwL29hdXRoMmNhbGxiYWNrJ1xyXG4gIClcclxufVxyXG5cclxuLy8gTG9hZCBjcmVkZW50aWFscyBmcm9tIHJlcXVlc3QgaGVhZGVyXHJcbmZ1bmN0aW9uIGxvYWRDcmVkZW50aWFsc0Zyb21IZWFkZXIocmVxKSB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHRva2VuSGVhZGVyID0gcmVxLmhlYWRlcnNbJ3gtZ21haWwtdG9rZW4nXVxyXG4gICAgaWYgKCF0b2tlbkhlYWRlcikge1xyXG4gICAgICByZXR1cm4gbnVsbFxyXG4gICAgfVxyXG4gICAgY29uc3QgY3JlZGVudGlhbHMgPSBKU09OLnBhcnNlKHRva2VuSGVhZGVyKVxyXG4gICAgY29uc3Qgb2F1dGgyQ2xpZW50ID0gZ2V0T0F1dGgyQ2xpZW50KClcclxuICAgIG9hdXRoMkNsaWVudC5zZXRDcmVkZW50aWFscyhjcmVkZW50aWFscylcclxuICAgIHJldHVybiBvYXV0aDJDbGllbnRcclxuICB9IGNhdGNoIChlcnIpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGxvYWRpbmcgY3JlZGVudGlhbHMgZnJvbSBoZWFkZXI6JywgZXJyKVxyXG4gICAgcmV0dXJuIG51bGxcclxuICB9XHJcbn1cclxuXHJcbi8vIENyZWF0ZSBFeHByZXNzIGFwcCBmb3IgQVBJIHJvdXRlc1xyXG5mdW5jdGlvbiBjcmVhdGVBcGlTZXJ2ZXIoKSB7XHJcbiAgY29uc3QgYXBwID0gZXhwcmVzcygpXHJcbiAgYXBwLnVzZShleHByZXNzLmpzb24oKSlcclxuXHJcbiAgLy8gR2V0IGF1dGhvcml6YXRpb24gVVJMXHJcbiAgYXBwLmdldCgnL2FwaS9hdXRoL3VybCcsIChyZXEsIHJlcykgPT4ge1xyXG4gICAgY29uc3Qgb2F1dGgyQ2xpZW50ID0gZ2V0T0F1dGgyQ2xpZW50KClcclxuICAgIGNvbnN0IGF1dGhVcmwgPSBvYXV0aDJDbGllbnQuZ2VuZXJhdGVBdXRoVXJsKHtcclxuICAgICAgYWNjZXNzX3R5cGU6ICdvZmZsaW5lJyxcclxuICAgICAgc2NvcGU6IFsnaHR0cHM6Ly93d3cuZ29vZ2xlYXBpcy5jb20vYXV0aC9nbWFpbC5yZWFkb25seSddLFxyXG4gICAgfSlcclxuICAgIHJlcy5qc29uKHsgdXJsOiBhdXRoVXJsIH0pXHJcbiAgfSlcclxuXHJcbiAgLy8gT0F1dGgyIGNhbGxiYWNrXHJcbiAgYXBwLmdldCgnL29hdXRoMmNhbGxiYWNrJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XHJcbiAgICBjb25zdCBjb2RlID0gcmVxLnF1ZXJ5LmNvZGVcclxuICAgIGlmICghY29kZSkge1xyXG4gICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDApLnNlbmQoJ05vIGNvZGUgcHJvdmlkZWQnKVxyXG4gICAgfVxyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IG9hdXRoMkNsaWVudCA9IGdldE9BdXRoMkNsaWVudCgpXHJcbiAgICAgIGNvbnN0IHsgdG9rZW5zIH0gPSBhd2FpdCBvYXV0aDJDbGllbnQuZ2V0VG9rZW4oY29kZSlcclxuICAgICAgb2F1dGgyQ2xpZW50LnNldENyZWRlbnRpYWxzKHRva2VucylcclxuICAgICAgXHJcbiAgICAgIC8vIFJldHVybiB0b2tlbnMgdG8gYmUgc3RvcmVkIGluIGxvY2FsU3RvcmFnZVxyXG4gICAgICBjb25zdCB0b2tlbnNKc29uID0gSlNPTi5zdHJpbmdpZnkodG9rZW5zKVxyXG4gICAgICBcclxuICAgICAgLy8gUmVkaXJlY3QgYmFjayB0byB0aGUgZnJvbnRlbmQgYXBwIHdpdGggc3VjY2VzcyBwYXJhbWV0ZXJcclxuICAgICAgY29uc3QgZnJvbnRlbmRVcmwgPSBwcm9jZXNzLmVudi5WSVRFX0ZST05URU5EX1VSTCB8fCAnaHR0cDovL2xvY2FsaG9zdDo1MDAwJ1xyXG4gICAgICByZXMuc2VuZChgXHJcbiAgICAgICAgPGh0bWw+XHJcbiAgICAgICAgICA8aGVhZD5cclxuICAgICAgICAgICAgPHRpdGxlPkF1dGhlbnRpY2F0aW9uIFN1Y2Nlc3NmdWw8L3RpdGxlPlxyXG4gICAgICAgICAgICA8c2NyaXB0PlxyXG4gICAgICAgICAgICAgIC8vIFN0b3JlIHRva2VucyBpbiBsb2NhbFN0b3JhZ2VcclxuICAgICAgICAgICAgICBsb2NhbFN0b3JhZ2Uuc2V0SXRlbSgnZ21haWxfdG9rZW5zJywgJyR7dG9rZW5zSnNvbi5yZXBsYWNlKC8nL2csIFwiXFxcXCdcIil9JylcclxuICAgICAgICAgICAgICAvLyBSZWRpcmVjdCBpbW1lZGlhdGVseSB3aXRoIHN1Y2Nlc3MgcGFyYW1ldGVyXHJcbiAgICAgICAgICAgICAgd2luZG93LmxvY2F0aW9uLmhyZWYgPSAnJHtmcm9udGVuZFVybH0/YXV0aD1zdWNjZXNzJztcclxuICAgICAgICAgICAgPC9zY3JpcHQ+XHJcbiAgICAgICAgICA8L2hlYWQ+XHJcbiAgICAgICAgICA8Ym9keT5cclxuICAgICAgICAgICAgPHA+UmVkaXJlY3RpbmcuLi48L3A+XHJcbiAgICAgICAgICA8L2JvZHk+XHJcbiAgICAgICAgPC9odG1sPlxyXG4gICAgICBgKVxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2V0dGluZyB0b2tlbnM6JywgZXJyb3IpXHJcbiAgICAgIGNvbnN0IGZyb250ZW5kVXJsID0gcHJvY2Vzcy5lbnYuVklURV9GUk9OVEVORF9VUkwgfHwgJ2h0dHA6Ly9sb2NhbGhvc3Q6NTAwMCdcclxuICAgICAgY29uc3QgZXJyb3JNZXNzYWdlID0gZW5jb2RlVVJJQ29tcG9uZW50KGVycm9yLm1lc3NhZ2UpXHJcbiAgICAgIHJlcy5zdGF0dXMoNTAwKS5zZW5kKGBcclxuICAgICAgICA8aHRtbD5cclxuICAgICAgICAgIDxoZWFkPlxyXG4gICAgICAgICAgICA8dGl0bGU+QXV0aGVudGljYXRpb24gRmFpbGVkPC90aXRsZT5cclxuICAgICAgICAgICAgPHNjcmlwdD5cclxuICAgICAgICAgICAgICAvLyBSZWRpcmVjdCB3aXRoIGVycm9yIHBhcmFtZXRlclxyXG4gICAgICAgICAgICAgIHdpbmRvdy5sb2NhdGlvbi5ocmVmID0gJyR7ZnJvbnRlbmRVcmx9P2F1dGg9ZXJyb3ImbWVzc2FnZT0ke2Vycm9yTWVzc2FnZX0nO1xyXG4gICAgICAgICAgICA8L3NjcmlwdD5cclxuICAgICAgICAgIDwvaGVhZD5cclxuICAgICAgICAgIDxib2R5PlxyXG4gICAgICAgICAgICA8cD5SZWRpcmVjdGluZy4uLjwvcD5cclxuICAgICAgICAgIDwvYm9keT5cclxuICAgICAgICA8L2h0bWw+XHJcbiAgICAgIGApXHJcbiAgICB9XHJcbiAgfSlcclxuXHJcbiAgLy8gQ2hlY2sgaWYgYXV0aGVudGljYXRlZCAoY2hlY2tzIGlmIHRva2VuIGlzIHByb3ZpZGVkIGluIGhlYWRlcilcclxuICBhcHAuZ2V0KCcvYXBpL2F1dGgvc3RhdHVzJywgKHJlcSwgcmVzKSA9PiB7XHJcbiAgICBjb25zdCB0b2tlbkhlYWRlciA9IHJlcS5oZWFkZXJzWyd4LWdtYWlsLXRva2VuJ11cclxuICAgIHJlcy5qc29uKHsgYXV0aGVudGljYXRlZDogISF0b2tlbkhlYWRlciB9KVxyXG4gIH0pXHJcblxyXG4gIC8vIEZldGNoIHVucmVhZCBlbWFpbHNcclxuICBhcHAuZ2V0KCcvYXBpL2dtYWlsL3VucmVhZCcsIGFzeW5jIChyZXEsIHJlcykgPT4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgYXV0aCA9IGxvYWRDcmVkZW50aWFsc0Zyb21IZWFkZXIocmVxKVxyXG4gICAgICBcclxuICAgICAgaWYgKCFhdXRoKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ1x1Mjc0QyBHbWFpbDogTm90IGF1dGhlbnRpY2F0ZWQgLSBubyB0b2tlbiBwcm92aWRlZCBpbiBoZWFkZXInKVxyXG4gICAgICAgIHJldHVybiByZXMuc3RhdHVzKDQwMSkuanNvbih7IFxyXG4gICAgICAgICAgZXJyb3I6ICdOb3QgYXV0aGVudGljYXRlZCcsXHJcbiAgICAgICAgICBtZXNzYWdlOiAnUGxlYXNlIGF1dGhlbnRpY2F0ZSB3aXRoIEdtYWlsIGZpcnN0J1xyXG4gICAgICAgIH0pXHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnNvbGUubG9nKCdcdTI3MDUgR21haWw6IENyZWRlbnRpYWxzIGxvYWRlZCwgZmV0Y2hpbmcgZW1haWxzLi4uJylcclxuICAgICAgY29uc3QgZ21haWwgPSBnb29nbGUuZ21haWwoeyB2ZXJzaW9uOiAndjEnLCBhdXRoIH0pXHJcbiAgICAgIFxyXG4gICAgICAvLyBHZXQgbGlzdCBvZiB1bnJlYWQgbWVzc2FnZXNcclxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBnbWFpbC51c2Vycy5tZXNzYWdlcy5saXN0KHtcclxuICAgICAgICB1c2VySWQ6ICdtZScsXHJcbiAgICAgICAgcTogJ2lzOnVucmVhZCcsXHJcbiAgICAgICAgbWF4UmVzdWx0czogMjAsXHJcbiAgICAgIH0pXHJcblxyXG4gICAgICBjb25zdCBtZXNzYWdlcyA9IHJlc3BvbnNlLmRhdGEubWVzc2FnZXMgfHwgW11cclxuICAgICAgY29uc29sZS5sb2coYFx1RDgzRFx1RENFNyBHbWFpbDogRm91bmQgJHttZXNzYWdlcy5sZW5ndGh9IHVucmVhZCBtZXNzYWdlc2ApXHJcbiAgICAgIFxyXG4gICAgICAvLyBGZXRjaCBkZXRhaWxzIGZvciBlYWNoIG1lc3NhZ2VcclxuICAgICAgY29uc3QgZW1haWxQcm9taXNlcyA9IG1lc3NhZ2VzLm1hcChhc3luYyAobWVzc2FnZSkgPT4ge1xyXG4gICAgICAgIGNvbnN0IGRldGFpbHMgPSBhd2FpdCBnbWFpbC51c2Vycy5tZXNzYWdlcy5nZXQoe1xyXG4gICAgICAgICAgdXNlcklkOiAnbWUnLFxyXG4gICAgICAgICAgaWQ6IG1lc3NhZ2UuaWQsXHJcbiAgICAgICAgICBmb3JtYXQ6ICdmdWxsJyxcclxuICAgICAgICB9KVxyXG5cclxuICAgICAgICBjb25zdCBoZWFkZXJzID0gZGV0YWlscy5kYXRhLnBheWxvYWQuaGVhZGVyc1xyXG4gICAgICAgIGNvbnN0IHN1YmplY3QgPSBoZWFkZXJzLmZpbmQoaCA9PiBoLm5hbWUgPT09ICdTdWJqZWN0Jyk/LnZhbHVlIHx8ICdObyBTdWJqZWN0J1xyXG4gICAgICAgIGNvbnN0IGZyb20gPSBoZWFkZXJzLmZpbmQoaCA9PiBoLm5hbWUgPT09ICdGcm9tJyk/LnZhbHVlIHx8ICdVbmtub3duJ1xyXG4gICAgICAgIGNvbnN0IGRhdGUgPSBoZWFkZXJzLmZpbmQoaCA9PiBoLm5hbWUgPT09ICdEYXRlJyk/LnZhbHVlIHx8IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxyXG5cclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgaWQ6IG1lc3NhZ2UuaWQsXHJcbiAgICAgICAgICBzdWJqZWN0LFxyXG4gICAgICAgICAgZnJvbSxcclxuICAgICAgICAgIGRhdGU6IG5ldyBEYXRlKGRhdGUpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgICBzbmlwcGV0OiBkZXRhaWxzLmRhdGEuc25pcHBldCxcclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcblxyXG4gICAgICBjb25zdCBlbWFpbHMgPSBhd2FpdCBQcm9taXNlLmFsbChlbWFpbFByb21pc2VzKVxyXG4gICAgICBcclxuICAgICAgcmVzLmpzb24oeyBlbWFpbHMgfSlcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1x1Mjc0QyBHbWFpbCBBUEkgRXJyb3I6JywgZXJyb3IubWVzc2FnZSlcclxuICAgICAgY29uc29sZS5lcnJvcignRnVsbCBlcnJvcjonLCBlcnJvcilcclxuICAgICAgcmVzLnN0YXR1cyg1MDApLmpzb24oeyBcclxuICAgICAgICBlcnJvcjogJ0ZhaWxlZCB0byBmZXRjaCBlbWFpbHMnLFxyXG4gICAgICAgIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UgXHJcbiAgICAgIH0pXHJcbiAgICB9XHJcbiAgfSlcclxuXHJcbiAgLy8gTWFyayBlbWFpbCBhcyByZWFkXHJcbiAgYXBwLnBvc3QoJy9hcGkvZ21haWwvbWFyay1yZWFkJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCB7IG1lc3NhZ2VJZCB9ID0gcmVxLmJvZHlcclxuICAgICAgY29uc3QgYXV0aCA9IGxvYWRDcmVkZW50aWFsc0Zyb21IZWFkZXIocmVxKVxyXG4gICAgICBcclxuICAgICAgaWYgKCFhdXRoKSB7XHJcbiAgICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDAxKS5qc29uKHsgZXJyb3I6ICdOb3QgYXV0aGVudGljYXRlZCcgfSlcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3QgZ21haWwgPSBnb29nbGUuZ21haWwoeyB2ZXJzaW9uOiAndjEnLCBhdXRoIH0pXHJcbiAgICAgIFxyXG4gICAgICBhd2FpdCBnbWFpbC51c2Vycy5tZXNzYWdlcy5tb2RpZnkoe1xyXG4gICAgICAgIHVzZXJJZDogJ21lJyxcclxuICAgICAgICBpZDogbWVzc2FnZUlkLFxyXG4gICAgICAgIHJlcXVlc3RCb2R5OiB7XHJcbiAgICAgICAgICByZW1vdmVMYWJlbElkczogWydVTlJFQUQnXSxcclxuICAgICAgICB9LFxyXG4gICAgICB9KVxyXG5cclxuICAgICAgcmVzLmpzb24oeyBzdWNjZXNzOiB0cnVlIH0pXHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBtYXJraW5nIGVtYWlsIGFzIHJlYWQ6JywgZXJyb3IpXHJcbiAgICAgIHJlcy5zdGF0dXMoNTAwKS5qc29uKHsgXHJcbiAgICAgICAgZXJyb3I6ICdGYWlsZWQgdG8gbWFyayBlbWFpbCBhcyByZWFkJyxcclxuICAgICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlIFxyXG4gICAgICB9KVxyXG4gICAgfVxyXG4gIH0pXHJcblxyXG4gIC8vID09PT09IE5ldGxpZnkgQVBJIEVuZHBvaW50cyA9PT09PVxyXG5cclxuICAvLyBDaGVjayBpZiBOZXRsaWZ5IGlzIGNvbmZpZ3VyZWRcclxuICBhcHAuZ2V0KCcvYXBpL25ldGxpZnkvc3RhdHVzJywgKHJlcSwgcmVzKSA9PiB7XHJcbiAgICBjb25zdCBhY2Nlc3NUb2tlbiA9IHJlcS5oZWFkZXJzWyd4LW5ldGxpZnktYWNjZXNzLXRva2VuJ11cclxuICAgIGNvbnN0IGNvbmZpZ3VyZWQgPSAhIWFjY2Vzc1Rva2VuXHJcbiAgICByZXMuanNvbih7IGNvbmZpZ3VyZWQgfSlcclxuICB9KVxyXG5cclxuICAvLyA9PT09PSBOZXdzIEFQSSBFbmRwb2ludHMgPT09PT1cclxuXHJcbiAgLy8gQ2hlY2sgaWYgTmV3c0FQSSBpcyBjb25maWd1cmVkXHJcbiAgYXBwLmdldCgnL2FwaS9uZXdzL3N0YXR1cycsIChyZXEsIHJlcykgPT4ge1xyXG4gICAgY29uc3QgYXBpS2V5ID0gcHJvY2Vzcy5lbnYuTkVXU19BUElfS0VZXHJcbiAgICBjb25zdCBjb25maWd1cmVkID0gISFhcGlLZXlcclxuICAgIHJlcy5qc29uKHsgY29uZmlndXJlZCB9KVxyXG4gIH0pXHJcblxyXG4gIC8vIEZldGNoIG5ld3MgaGVhZGxpbmVzXHJcbiAgYXBwLmdldCgnL2FwaS9uZXdzJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCB7IGNvdW50cnkgPSAndXMnLCBjYXRlZ29yeSA9ICdnZW5lcmFsJyB9ID0gcmVxLnF1ZXJ5XHJcbiAgICAgIGNvbnN0IGFwaUtleSA9IHByb2Nlc3MuZW52Lk5FV1NfQVBJX0tFWVxyXG4gICAgICBcclxuICAgICAgaWYgKCFhcGlLZXkpIHtcclxuICAgICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDEpLmpzb24oeyBcclxuICAgICAgICAgIGVycm9yOiAnTmV3c0FQSSBrZXkgbm90IGNvbmZpZ3VyZWQnLFxyXG4gICAgICAgICAgbWVzc2FnZTogJ1BsZWFzZSBhZGQgTkVXU19BUElfS0VZIHRvIHlvdXIgLmVudiBmaWxlLiBHZXQgYSBmcmVlIGtleSBmcm9tIGh0dHBzOi8vbmV3c2FwaS5vcmcnLFxyXG4gICAgICAgICAgYXJ0aWNsZXM6IFtdXHJcbiAgICAgICAgfSlcclxuICAgICAgfVxyXG5cclxuICAgICAgLy8gRmV0Y2ggbmV3cyBmcm9tIE5ld3NBUElcclxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaChcclxuICAgICAgICBgaHR0cHM6Ly9uZXdzYXBpLm9yZy92Mi90b3AtaGVhZGxpbmVzP2NvdW50cnk9JHtjb3VudHJ5fSZjYXRlZ29yeT0ke2NhdGVnb3J5fSZwYWdlU2l6ZT0yMCZhcGlLZXk9JHthcGlLZXl9YFxyXG4gICAgICApXHJcbiAgICAgIFxyXG4gICAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XHJcbiAgICAgICAgY29uc3QgZXJyb3JEYXRhID0gYXdhaXQgcmVzcG9uc2UuanNvbigpLmNhdGNoKCgpID0+ICh7fSkpXHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGVycm9yRGF0YS5tZXNzYWdlIHx8ICdOZXdzQVBJIHJlcXVlc3QgZmFpbGVkJylcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKVxyXG4gICAgICBcclxuICAgICAgLy8gRmlsdGVyIG91dCBhcnRpY2xlcyB3aXRoIHJlbW92ZWQgY29udGVudFxyXG4gICAgICBjb25zdCBhcnRpY2xlcyA9IChkYXRhLmFydGljbGVzIHx8IFtdKS5maWx0ZXIoYXJ0aWNsZSA9PiBcclxuICAgICAgICBhcnRpY2xlLnRpdGxlICYmIFxyXG4gICAgICAgIGFydGljbGUudGl0bGUgIT09ICdbUmVtb3ZlZF0nICYmIFxyXG4gICAgICAgIGFydGljbGUudXJsXHJcbiAgICAgIClcclxuICAgICAgXHJcbiAgICAgIHJlcy5qc29uKHsgYXJ0aWNsZXMgfSlcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGZldGNoaW5nIG5ld3M6JywgZXJyb3IpXHJcbiAgICAgIHJlcy5zdGF0dXMoNTAwKS5qc29uKHsgXHJcbiAgICAgICAgZXJyb3I6ICdGYWlsZWQgdG8gZmV0Y2ggbmV3cycsXHJcbiAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcclxuICAgICAgICBhcnRpY2xlczogW11cclxuICAgICAgfSlcclxuICAgIH1cclxuICB9KVxyXG5cclxuICAvLyA9PT09PSBXZWIgU2VhcmNoIEFQSSBFbmRwb2ludCA9PT09PVxyXG5cclxuICAvLyBQZXJmb3JtIHdlYiBzZWFyY2ggdXNpbmcgVGF2aWx5IEFJIFNlYXJjaCBBUElcclxuICBhcHAucG9zdCgnL2FwaS9zZWFyY2gnLCBhc3luYyAocmVxLCByZXMpID0+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHsgcXVlcnkgfSA9IHJlcS5ib2R5XHJcbiAgICAgIFxyXG4gICAgICBpZiAoIXF1ZXJ5KSB7XHJcbiAgICAgICAgcmV0dXJuIHJlcy5zdGF0dXMoNDAwKS5qc29uKHsgXHJcbiAgICAgICAgICBlcnJvcjogJ1F1ZXJ5IGlzIHJlcXVpcmVkJyxcclxuICAgICAgICAgIG1lc3NhZ2U6ICdQbGVhc2UgcHJvdmlkZSBhIHNlYXJjaCBxdWVyeSdcclxuICAgICAgICB9KVxyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBHZXQgVGF2aWx5IEFQSSBrZXkgZnJvbSByZXF1ZXN0IGhlYWRlcnNcclxuICAgICAgY29uc3QgdGF2aWx5QXBpS2V5ID0gcmVxLmhlYWRlcnNbJ3gtdGF2aWx5LWFwaS1rZXknXVxyXG4gICAgICBcclxuICAgICAgaWYgKCF0YXZpbHlBcGlLZXkpIHtcclxuICAgICAgICByZXR1cm4gcmVzLnN0YXR1cyg0MDEpLmpzb24oeyBcclxuICAgICAgICAgIGVycm9yOiAnVGF2aWx5IEFQSSBrZXkgbm90IGNvbmZpZ3VyZWQnLFxyXG4gICAgICAgICAgbWVzc2FnZTogJ1BsZWFzZSBhZGQgeW91ciBUYXZpbHkgQVBJIGtleSBpbiBTZXR0aW5ncyA+IFNlY3JldHMgdG8gZW5hYmxlIHdlYiBzZWFyY2gnLFxyXG4gICAgICAgICAgcmVzdWx0czogW11cclxuICAgICAgICB9KVxyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBVc2UgVGF2aWx5IEFJIFNlYXJjaCBBUElcclxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBmZXRjaCgnaHR0cHM6Ly9hcGkudGF2aWx5LmNvbS9zZWFyY2gnLCB7XHJcbiAgICAgICAgbWV0aG9kOiAnUE9TVCcsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGFwaV9rZXk6IHRhdmlseUFwaUtleSxcclxuICAgICAgICAgIHF1ZXJ5OiBxdWVyeSxcclxuICAgICAgICAgIHNlYXJjaF9kZXB0aDogJ2Jhc2ljJywgLy8gJ2Jhc2ljJyBvciAnYWR2YW5jZWQnXHJcbiAgICAgICAgICBpbmNsdWRlX2Fuc3dlcjogZmFsc2UsXHJcbiAgICAgICAgICBpbmNsdWRlX2ltYWdlczogZmFsc2UsXHJcbiAgICAgICAgICBpbmNsdWRlX3Jhd19jb250ZW50OiBmYWxzZSxcclxuICAgICAgICAgIG1heF9yZXN1bHRzOiA1LFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9KVxyXG4gICAgICBcclxuICAgICAgaWYgKCFyZXNwb25zZS5vaykge1xyXG4gICAgICAgIGNvbnN0IGVycm9yRGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKS5jYXRjaCgoKSA9PiAoe30pKVxyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihlcnJvckRhdGEuZGV0YWlsIHx8IGVycm9yRGF0YS5tZXNzYWdlIHx8ICdUYXZpbHkgQVBJIHJlcXVlc3QgZmFpbGVkJylcclxuICAgICAgfVxyXG5cclxuICAgICAgY29uc3QgZGF0YSA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKVxyXG4gICAgICBcclxuICAgICAgLy8gRm9ybWF0IHJlc3VsdHNcclxuICAgICAgY29uc3QgcmVzdWx0cyA9IFtdXHJcbiAgICAgIFxyXG4gICAgICAvLyBQcm9jZXNzIFRhdmlseSByZXN1bHRzXHJcbiAgICAgIGlmIChkYXRhLnJlc3VsdHMgJiYgQXJyYXkuaXNBcnJheShkYXRhLnJlc3VsdHMpKSB7XHJcbiAgICAgICAgZGF0YS5yZXN1bHRzLmZvckVhY2gocmVzdWx0ID0+IHtcclxuICAgICAgICAgIHJlc3VsdHMucHVzaCh7XHJcbiAgICAgICAgICAgIHRpdGxlOiByZXN1bHQudGl0bGUgfHwgJ05vIHRpdGxlJyxcclxuICAgICAgICAgICAgc25pcHBldDogcmVzdWx0LmNvbnRlbnQgfHwgcmVzdWx0LnNuaXBwZXQgfHwgJycsXHJcbiAgICAgICAgICAgIHVybDogcmVzdWx0LnVybCB8fCAnJyxcclxuICAgICAgICAgICAgc2NvcmU6IHJlc3VsdC5zY29yZSB8fCAwLFxyXG4gICAgICAgICAgfSlcclxuICAgICAgICB9KVxyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICAvLyBJZiBubyByZXN1bHRzLCByZXR1cm4gZW1wdHkgYXJyYXkgd2l0aCBoZWxwZnVsIG1lc3NhZ2VcclxuICAgICAgaWYgKHJlc3VsdHMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgcmV0dXJuIHJlcy5qc29uKHsgXHJcbiAgICAgICAgICByZXN1bHRzOiBbXSxcclxuICAgICAgICAgIG1lc3NhZ2U6ICdObyBzZWFyY2ggcmVzdWx0cyBmb3VuZCBmb3IgdGhpcyBxdWVyeSdcclxuICAgICAgICB9KVxyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICByZXMuanNvbih7IHJlc3VsdHMgfSlcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHBlcmZvcm1pbmcgc2VhcmNoOicsIGVycm9yKVxyXG4gICAgICByZXMuc3RhdHVzKDUwMCkuanNvbih7IFxyXG4gICAgICAgIGVycm9yOiAnU2VhcmNoIGZhaWxlZCcsXHJcbiAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcclxuICAgICAgICByZXN1bHRzOiBbXSAvLyBSZXR1cm4gZW1wdHkgcmVzdWx0cyBvbiBlcnJvclxyXG4gICAgICB9KVxyXG4gICAgfVxyXG4gIH0pXHJcblxyXG4gIC8vIEZldGNoIGFsbCBkZXBsb3lzIGZyb20gYWxsIHNpdGVzXHJcbiAgYXBwLmdldCgnL2FwaS9uZXRsaWZ5L2RlcGxveXMnLCBhc3luYyAocmVxLCByZXMpID0+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGFjY2Vzc1Rva2VuID0gcmVxLmhlYWRlcnNbJ3gtbmV0bGlmeS1hY2Nlc3MtdG9rZW4nXVxyXG4gICAgICBcclxuICAgICAgaWYgKCFhY2Nlc3NUb2tlbikge1xyXG4gICAgICAgIHJldHVybiByZXMuc3RhdHVzKDQwMSkuanNvbih7IFxyXG4gICAgICAgICAgZXJyb3I6ICdOb3QgY29uZmlndXJlZCcsXHJcbiAgICAgICAgICBtZXNzYWdlOiAnUGxlYXNlIGFkZCB5b3VyIE5ldGxpZnkgYWNjZXNzIHRva2VuIGluIFNldHRpbmdzID4gU2VjcmV0cydcclxuICAgICAgICB9KVxyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBGZXRjaCBhbGwgc2l0ZXNcclxuICAgICAgY29uc3Qgc2l0ZXNSZXNwb25zZSA9IGF3YWl0IGZldGNoKCdodHRwczovL2FwaS5uZXRsaWZ5LmNvbS9hcGkvdjEvc2l0ZXMnLCB7XHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0F1dGhvcml6YXRpb24nOiBgQmVhcmVyICR7YWNjZXNzVG9rZW59YCxcclxuICAgICAgICB9LFxyXG4gICAgICB9KVxyXG5cclxuICAgICAgaWYgKCFzaXRlc1Jlc3BvbnNlLm9rKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gZmV0Y2ggc2l0ZXM6ICR7c2l0ZXNSZXNwb25zZS5zdGF0dXNUZXh0fWApXHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnN0IHNpdGVzID0gYXdhaXQgc2l0ZXNSZXNwb25zZS5qc29uKClcclxuICAgICAgXHJcbiAgICAgIC8vIEZldGNoIGxhdGVzdCBkZXBsb3lzIGZvciBlYWNoIHNpdGVcclxuICAgICAgY29uc3QgZGVwbG95UHJvbWlzZXMgPSBzaXRlcy5tYXAoYXN5bmMgKHNpdGUpID0+IHtcclxuICAgICAgICB0cnkge1xyXG4gICAgICAgICAgY29uc3QgZGVwbG95c1Jlc3BvbnNlID0gYXdhaXQgZmV0Y2goXHJcbiAgICAgICAgICAgIGBodHRwczovL2FwaS5uZXRsaWZ5LmNvbS9hcGkvdjEvc2l0ZXMvJHtzaXRlLmlkfS9kZXBsb3lzP3Blcl9wYWdlPTFgLFxyXG4gICAgICAgICAgICB7XHJcbiAgICAgICAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgICAgICAgJ0F1dGhvcml6YXRpb24nOiBgQmVhcmVyICR7YWNjZXNzVG9rZW59YCxcclxuICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICApXHJcblxyXG4gICAgICAgICAgaWYgKCFkZXBsb3lzUmVzcG9uc2Uub2spIHtcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRmFpbGVkIHRvIGZldGNoIGRlcGxveXMgZm9yIHNpdGUgJHtzaXRlLm5hbWV9YClcclxuICAgICAgICAgICAgcmV0dXJuIG51bGxcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBjb25zdCBkZXBsb3lzID0gYXdhaXQgZGVwbG95c1Jlc3BvbnNlLmpzb24oKVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICBpZiAoZGVwbG95cy5sZW5ndGggPT09IDApIHtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGxcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICBjb25zdCBkZXBsb3kgPSBkZXBsb3lzWzBdXHJcbiAgICAgICAgICBcclxuICAgICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIGlkOiBkZXBsb3kuaWQsXHJcbiAgICAgICAgICAgIHNpdGVJZDogc2l0ZS5pZCxcclxuICAgICAgICAgICAgc2l0ZU5hbWU6IHNpdGUubmFtZSxcclxuICAgICAgICAgICAgc3RhdGU6IGRlcGxveS5zdGF0ZSxcclxuICAgICAgICAgICAgY29udGV4dDogZGVwbG95LmNvbnRleHQsXHJcbiAgICAgICAgICAgIGJyYW5jaDogZGVwbG95LmJyYW5jaCxcclxuICAgICAgICAgICAgY29tbWl0UmVmOiBkZXBsb3kuY29tbWl0X3JlZixcclxuICAgICAgICAgICAgY29tbWl0VXJsOiBkZXBsb3kuY29tbWl0X3VybCxcclxuICAgICAgICAgICAgY3JlYXRlZEF0OiBkZXBsb3kuY3JlYXRlZF9hdCxcclxuICAgICAgICAgICAgcHVibGlzaGVkQXQ6IGRlcGxveS5wdWJsaXNoZWRfYXQsXHJcbiAgICAgICAgICAgIGRlcGxveVVybDogZGVwbG95LmRlcGxveV9zc2xfdXJsIHx8IGRlcGxveS5kZXBsb3lfdXJsLFxyXG4gICAgICAgICAgICBzaXRlVXJsOiBzaXRlLnVybCxcclxuICAgICAgICAgICAgZXJyb3JNZXNzYWdlOiBkZXBsb3kuZXJyb3JfbWVzc2FnZSxcclxuICAgICAgICAgICAgYnVpbGRUaW1lOiBkZXBsb3kuZGVwbG95X3RpbWUsXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGZldGNoaW5nIGRlcGxveXMgZm9yIHNpdGUgJHtzaXRlLm5hbWV9OmAsIGVycm9yKVxyXG4gICAgICAgICAgcmV0dXJuIG51bGxcclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcblxyXG4gICAgICBjb25zdCBhbGxEZXBsb3lzID0gYXdhaXQgUHJvbWlzZS5hbGwoZGVwbG95UHJvbWlzZXMpXHJcbiAgICAgIGNvbnN0IHZhbGlkRGVwbG95cyA9IGFsbERlcGxveXMuZmlsdGVyKGRlcGxveSA9PiBkZXBsb3kgIT09IG51bGwpXHJcbiAgICAgIFxyXG4gICAgICAvLyBTb3J0IGJ5IGNyZWF0aW9uIGRhdGUgKG1vc3QgcmVjZW50IGZpcnN0KVxyXG4gICAgICB2YWxpZERlcGxveXMuc29ydCgoYSwgYikgPT4gbmV3IERhdGUoYi5jcmVhdGVkQXQpIC0gbmV3IERhdGUoYS5jcmVhdGVkQXQpKVxyXG4gICAgICBcclxuICAgICAgcmVzLmpzb24oeyBkZXBsb3lzOiB2YWxpZERlcGxveXMgfSlcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGZldGNoaW5nIE5ldGxpZnkgZGVwbG95czonLCBlcnJvcilcclxuICAgICAgcmVzLnN0YXR1cyg1MDApLmpzb24oeyBcclxuICAgICAgICBlcnJvcjogJ0ZhaWxlZCB0byBmZXRjaCBkZXBsb3lzJyxcclxuICAgICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlIFxyXG4gICAgICB9KVxyXG4gICAgfVxyXG4gIH0pXHJcblxyXG4gIC8vID09PT09IEJEMjQgTGl2ZSBSU1MgRmVlZCBBUEkgRW5kcG9pbnRzID09PT09XHJcblxyXG4gIC8vIENhY2hlIGZvciBCRDI0IExpdmUgbmV3cyAodG8gYXZvaWQgZXhjZXNzaXZlIHJlcXVlc3RzKVxyXG4gIGxldCBiZDI0TGl2ZUNhY2hlID0ge1xyXG4gICAgYXJ0aWNsZXM6IFtdLFxyXG4gICAgbGFzdEZldGNoZWQ6IG51bGwsXHJcbiAgICBjYWNoZUV4cGlyeTogMzAgKiA2MCAqIDEwMDAgLy8gMzAgbWludXRlcyBpbiBtaWxsaXNlY29uZHNcclxuICB9XHJcblxyXG4gIC8vIEluaXRpYWxpemUgUlNTIHBhcnNlclxyXG4gIGNvbnN0IHJzc1BhcnNlciA9IG5ldyBQYXJzZXIoKVxyXG5cclxuICAvLyBDaGVjayBpZiBCRDI0IExpdmUgUlNTIGZlZWQgaXMgb3BlcmF0aW9uYWxcclxuICBhcHAuZ2V0KCcvYXBpL2JkMjRsaXZlL3N0YXR1cycsIChyZXEsIHJlcykgPT4ge1xyXG4gICAgcmVzLmpzb24oeyBvcGVyYXRpb25hbDogdHJ1ZSB9KVxyXG4gIH0pXHJcblxyXG4gIC8vIEZldGNoIGxhdGVzdCBuZXdzIGZyb20gQkQyNCBMaXZlIFJTUyBmZWVkXHJcbiAgYXBwLmdldCgnL2FwaS9iZDI0bGl2ZS9uZXdzJywgYXN5bmMgKHJlcSwgcmVzKSA9PiB7XHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBDaGVjayBpZiBjYWNoZSBpcyBzdGlsbCB2YWxpZFxyXG4gICAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpXHJcbiAgICAgIGlmIChiZDI0TGl2ZUNhY2hlLmxhc3RGZXRjaGVkICYmIFxyXG4gICAgICAgICAgKG5vdyAtIGJkMjRMaXZlQ2FjaGUubGFzdEZldGNoZWQpIDwgYmQyNExpdmVDYWNoZS5jYWNoZUV4cGlyeSAmJlxyXG4gICAgICAgICAgYmQyNExpdmVDYWNoZS5hcnRpY2xlcy5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coJ1x1MjcwNSBSZXR1cm5pbmcgY2FjaGVkIEJEMjQgTGl2ZSBuZXdzJylcclxuICAgICAgICByZXR1cm4gcmVzLmpzb24oeyBcclxuICAgICAgICAgIGFydGljbGVzOiBiZDI0TGl2ZUNhY2hlLmFydGljbGVzLFxyXG4gICAgICAgICAgY2FjaGVkOiB0cnVlLFxyXG4gICAgICAgICAgbGFzdEZldGNoZWQ6IG5ldyBEYXRlKGJkMjRMaXZlQ2FjaGUubGFzdEZldGNoZWQpLnRvSVNPU3RyaW5nKClcclxuICAgICAgICB9KVxyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zb2xlLmxvZygnXHVEODNEXHVERDA0IEZldGNoaW5nIGZyZXNoIEJEMjQgTGl2ZSBuZXdzIGZyb20gUlNTIGZlZWQuLi4nKVxyXG4gICAgICBcclxuICAgICAgLy8gUGFyc2UgUlNTIGZlZWRcclxuICAgICAgY29uc3QgZmVlZCA9IGF3YWl0IHJzc1BhcnNlci5wYXJzZVVSTCgnaHR0cHM6Ly93d3cuYmQyNGxpdmUuY29tL2JhbmdsYS9mZWVkJylcclxuICAgICAgXHJcbiAgICAgIGNvbnNvbGUubG9nKGBcdUQ4M0RcdURDRjAgUlNTIEZlZWQ6ICR7ZmVlZC50aXRsZX1gKVxyXG4gICAgICBjb25zb2xlLmxvZyhgXHVEODNEXHVEQ0NBIFRvdGFsIGl0ZW1zIGluIGZlZWQ6ICR7ZmVlZC5pdGVtcy5sZW5ndGh9YClcclxuICAgICAgXHJcbiAgICAgIC8vIENvbnZlcnQgUlNTIGl0ZW1zIHRvIGFydGljbGUgZm9ybWF0XHJcbiAgICAgIGNvbnN0IGFydGljbGVzID0gZmVlZC5pdGVtcy5zbGljZSgwLCAyMCkubWFwKChpdGVtLCBpbmRleCkgPT4ge1xyXG4gICAgICAgIC8vIEV4dHJhY3QgaW1hZ2UgZnJvbSBtZWRpYTpjb250ZW50IG9yIGVuY2xvc3VyZVxyXG4gICAgICAgIGxldCBpbWFnZSA9IG51bGxcclxuICAgICAgICBpZiAoaXRlbVsnbWVkaWE6Y29udGVudCddICYmIGl0ZW1bJ21lZGlhOmNvbnRlbnQnXVsnJCddICYmIGl0ZW1bJ21lZGlhOmNvbnRlbnQnXVsnJCddLnVybCkge1xyXG4gICAgICAgICAgaW1hZ2UgPSBpdGVtWydtZWRpYTpjb250ZW50J11bJyQnXS51cmxcclxuICAgICAgICB9IGVsc2UgaWYgKGl0ZW0uZW5jbG9zdXJlICYmIGl0ZW0uZW5jbG9zdXJlLnVybCkge1xyXG4gICAgICAgICAgaW1hZ2UgPSBpdGVtLmVuY2xvc3VyZS51cmxcclxuICAgICAgICB9XHJcbiAgICAgICAgXHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHRpdGxlOiBpdGVtLnRpdGxlIHx8ICdObyBUaXRsZScsXHJcbiAgICAgICAgICBkZXNjcmlwdGlvbjogaXRlbS5jb250ZW50U25pcHBldCB8fCBpdGVtLmNvbnRlbnQgfHwgaXRlbS5kZXNjcmlwdGlvbiB8fCAnJyxcclxuICAgICAgICAgIHVybDogaXRlbS5saW5rIHx8IGl0ZW0uZ3VpZCB8fCAnJyxcclxuICAgICAgICAgIGltYWdlOiBpbWFnZSxcclxuICAgICAgICAgIHB1Ymxpc2hlZEF0OiBpdGVtLnB1YkRhdGUgfHwgaXRlbS5pc29EYXRlIHx8IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICAgIHNvdXJjZTogZmVlZC50aXRsZSB8fCAnQkQyNCBMaXZlJ1xyXG4gICAgICAgIH1cclxuICAgICAgfSlcclxuXHJcbiAgICAgIGNvbnNvbGUubG9nKGBcXG5cdUQ4M0RcdURDQ0EgPT09PT09PT09PSBSU1MgUEFSU0lORyBTVU1NQVJZID09PT09PT09PT1gKVxyXG4gICAgICBjb25zb2xlLmxvZyhgVG90YWwgYXJ0aWNsZXMgcGFyc2VkOiAke2FydGljbGVzLmxlbmd0aH1gKVxyXG4gICAgICBcclxuICAgICAgaWYgKGFydGljbGVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICBjb25zb2xlLmxvZyhgXHVEODNEXHVEQ0M1IFNhbXBsZSBhcnRpY2xlczpgKVxyXG4gICAgICAgIGFydGljbGVzLnNsaWNlKDAsIDMpLmZvckVhY2goKGFydGljbGUsIGlkeCkgPT4ge1xyXG4gICAgICAgICAgY29uc29sZS5sb2coYCAgJHtpZHggKyAxfS4gJHthcnRpY2xlLnRpdGxlLnN1YnN0cmluZygwLCA2MCl9Li4uYClcclxuICAgICAgICAgIGNvbnNvbGUubG9nKGAgICAgIFB1Ymxpc2hlZDogJHthcnRpY2xlLnB1Ymxpc2hlZEF0fWApXHJcbiAgICAgICAgfSlcclxuICAgICAgICBjb25zb2xlLmxvZyhgPT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PVxcbmApXHJcbiAgICAgIH1cclxuXHJcbiAgICAgIC8vIFVwZGF0ZSBjYWNoZVxyXG4gICAgICBiZDI0TGl2ZUNhY2hlID0ge1xyXG4gICAgICAgIGFydGljbGVzOiBhcnRpY2xlcyxcclxuICAgICAgICBsYXN0RmV0Y2hlZDogbm93LFxyXG4gICAgICAgIGNhY2hlRXhwaXJ5OiAzMCAqIDYwICogMTAwMFxyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICByZXMuanNvbih7IFxyXG4gICAgICAgIGFydGljbGVzOiBiZDI0TGl2ZUNhY2hlLmFydGljbGVzLFxyXG4gICAgICAgIGNhY2hlZDogZmFsc2UsXHJcbiAgICAgICAgbGFzdEZldGNoZWQ6IG5ldyBEYXRlKG5vdykudG9JU09TdHJpbmcoKVxyXG4gICAgICB9KVxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignXHUyNzRDIEVycm9yIGZldGNoaW5nIEJEMjQgTGl2ZSBSU1M6JywgZXJyb3IpXHJcbiAgICAgIFxyXG4gICAgICAvLyBJZiB3ZSBoYXZlIGNhY2hlZCBkYXRhLCByZXR1cm4gaXQgZXZlbiBpZiBleHBpcmVkXHJcbiAgICAgIGlmIChiZDI0TGl2ZUNhY2hlLmFydGljbGVzLmxlbmd0aCA+IDApIHtcclxuICAgICAgICBjb25zb2xlLmxvZygnXHUyNkEwXHVGRTBGICBSZXR1cm5pbmcgc3RhbGUgY2FjaGUgZHVlIHRvIGVycm9yJylcclxuICAgICAgICByZXR1cm4gcmVzLmpzb24oeyBcclxuICAgICAgICAgIGFydGljbGVzOiBiZDI0TGl2ZUNhY2hlLmFydGljbGVzLFxyXG4gICAgICAgICAgY2FjaGVkOiB0cnVlLFxyXG4gICAgICAgICAgc3RhbGU6IHRydWUsXHJcbiAgICAgICAgICBsYXN0RmV0Y2hlZDogYmQyNExpdmVDYWNoZS5sYXN0RmV0Y2hlZCA/IG5ldyBEYXRlKGJkMjRMaXZlQ2FjaGUubGFzdEZldGNoZWQpLnRvSVNPU3RyaW5nKCkgOiBudWxsXHJcbiAgICAgICAgfSlcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgcmVzLnN0YXR1cyg1MDApLmpzb24oeyBcclxuICAgICAgICBlcnJvcjogJ0ZhaWxlZCB0byBmZXRjaCBCRDI0IExpdmUgbmV3cycsXHJcbiAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcclxuICAgICAgICBhcnRpY2xlczogW11cclxuICAgICAgfSlcclxuICAgIH1cclxuICB9KVxyXG5cclxuICByZXR1cm4gYXBwXHJcbn1cclxuXHJcbi8vIGh0dHBzOi8vdml0ZWpzLmRldi9jb25maWcvXHJcbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XHJcbiAgcGx1Z2luczogW1xyXG4gICAgcmVhY3QoKSxcclxuICAgIHtcclxuICAgICAgbmFtZTogJ2FwaS1zZXJ2ZXInLFxyXG4gICAgICBjb25maWd1cmVTZXJ2ZXIoc2VydmVyKSB7XHJcbiAgICAgICAgY29uc3QgYXBpQXBwID0gY3JlYXRlQXBpU2VydmVyKClcclxuICAgICAgICBzZXJ2ZXIubWlkZGxld2FyZXMudXNlKGFwaUFwcClcclxuICAgICAgICBjb25zb2xlLmxvZygnXFxuXHUyNzA1IEFQSSBzZXJ2ZXIgaW50ZWdyYXRlZCB3aXRoIFZpdGUgZGV2IHNlcnZlcicpXHJcbiAgICAgICAgY29uc29sZS5sb2coJ1x1RDgzRFx1RENFNyBHbWFpbCBhdXRoZW50aWNhdGlvbiBhdmFpbGFibGUgYXQ6IGh0dHA6Ly9sb2NhbGhvc3Q6NTAwMC9hcGkvYXV0aC91cmxcXG4nKVxyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgXSxcclxuICByZXNvbHZlOiB7XHJcbiAgICBhbGlhczoge1xyXG4gICAgICAnQCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYycpLFxyXG4gICAgfSxcclxuICB9LFxyXG4gIHNlcnZlcjoge1xyXG4gICAgcG9ydDogNTAwMCxcclxuICB9LFxyXG59KVxyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXFPLFNBQVMsb0JBQW9CO0FBQ2xRLE9BQU8sV0FBVztBQUNsQixPQUFPLFVBQVU7QUFDakIsT0FBTyxhQUFhO0FBQ3BCLE9BQU8sVUFBVTtBQUNqQixTQUFTLGNBQWM7QUFDdkIsT0FBTyxZQUFZO0FBRW5CLFNBQVMscUJBQXFCO0FBQzlCLE9BQU8sWUFBWTtBQVR3SCxJQUFNLDJDQUEyQztBQVc1TCxJQUFNLGFBQWEsY0FBYyx3Q0FBZTtBQUNoRCxJQUFNLFlBQVksS0FBSyxRQUFRLFVBQVU7QUFFekMsT0FBTyxPQUFPO0FBR2QsU0FBUyxrQkFBa0I7QUFDekIsU0FBTyxJQUFJLE9BQU8sS0FBSztBQUFBLElB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
