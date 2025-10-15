# Hashbase - Customizable Dashboard Widget Platform

A modern, highly customizable React dashboard application featuring drag-and-drop widgets for Gmail, Netlify, GitHub, AI Chat, News, and more. Built with React 18, Vite, Tailwind CSS, shadcn/ui, and react-dnd for a beautiful and interactive user experience.

![Dashboard Preview](https://img.shields.io/badge/React-18.3-blue) ![Vite](https://img.shields.io/badge/Vite-5.2-646CFF) ![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC)

## Features

### Widget Features (All using BaseWidgetV2)
- 📧 **Gmail Widget V2** - Display unread emails with OAuth2 authentication, dual error actions, auto-refresh, integrated search
- 🚀 **Netlify Widget V2** - Monitor deploys with status badges, color-coded cards, build time tracking, error messages
- 🤖 **AI Chat Widget** - Chat with OpenAI (GPT-4, GPT-3.5) or Claude AI (Sonnet, Opus, Haiku) with streaming responses and web search
- 💻 **GitHub Commits Widget** - View commits from repositories with configurable settings, status indicators, auto-refresh (1-30 min)
- 📰 **News Widget V2** - Latest headlines with country/category filtering (20+ countries), settings modal, integrated search
- 🌐 **BD24 Live Widget V2** - Bangladesh news via RSS with timestamp display, 30-minute auto-refresh, caching
- 🧪 **Demo Widget** - Comprehensive showcase of all BaseWidgetV2 features, states, and UI components

### Core Features
- 🎯 **Advanced Drag & Drop Layout** - Powered by react-dnd with intelligent position validation and collision detection
- 📐 **Smart Widget Resizing** - Resize widgets from 1-4 rows with automatic space detection and fit validation
- 💾 **Persistent Layout System** - Custom layouts saved to localStorage with automatic validation and preservation
- 🎛️ **Widget Management** - Enable/disable widgets from settings panel with search functionality and auto-placement
- ⚙️ **In-App Configuration** - Configure API secrets directly in the app (stored in localStorage)
- 🔑 **Advanced Secrets Management** - Add custom secrets, search functionality, alphabetically sorted display
- 📥 **Config Export/Import** - Download and upload entire dashboard configuration with automatic AES-256-GCM encryption
- 🔍 **Web Search Integration** - Real-time web search for AI responses using Tavily AI API
- 🎨 **Beautiful Modern UI** - Built with Tailwind CSS and shadcn/ui components with gradient backgrounds
- 🌓 **Dark Mode Support** - Full dark mode with smooth transitions and optimized contrast
- 🔄 **Auto-Refresh** - Widgets auto-refresh at configurable intervals (1-30 min depending on widget)
- 📱 **Responsive Design** - Optimized for desktop with screen size guard (minimum 1280px width)
- ⚡ **Fast Development** - Vite dev server with integrated Express API backend
- 🔐 **Secure Credentials** - API credentials stored in browser localStorage, never sent externally
- 🎭 **Standardized Widget System** - BaseWidgetV2 architecture with consistent states, search, and settings modals

## Prerequisites

- **Node.js** (v20.x or higher recommended)
- **npm** or yarn
- **Gmail API credentials** from Google Cloud Console (for Gmail widget)
- **Netlify Personal Access Token** (for Netlify widget - configure in-app)
- **OpenAI API Key** (for AI Chat widget with GPT models - configure in-app)
- **Claude API Key** (for AI Chat widget with Claude models - configure in-app)
- **Tavily API Key** (for web search in AI Chat - optional, free tier: 1000 searches/month)
- **GitHub Personal Access Token** (for GitHub widget - optional, configure in-app)
- **NewsAPI Key** (for News widget - optional, free tier: 100 requests/day)

## Quick Start

You can run Hashbase either **locally with Node.js** or **using Docker**. Choose the method that works best for you.

### Option 1: Run with Docker (Recommended for Easy Setup)

**Prerequisites:**
- Docker Desktop (Windows/Mac) or Docker Engine (Linux)
- Docker Compose

**Steps:**
```bash
# 1. Clone the repository
git clone <repository-url>
cd hashbase

# 2. Copy and configure environment variables
cp .env.example .env
# Edit .env and add your API credentials (see Configuration section)

# 3. Generate encryption key
node generate-encryption-key.js

# 4. Start with Docker Compose
docker-compose up -d

# 5. Access the dashboard
# Open http://localhost:5000 in your browser
```

**View logs:**
```bash
docker-compose logs -f
```

**Stop the application:**
```bash
docker-compose down
```

📖 **For detailed Docker setup, troubleshooting, and production deployment, see [DOCKER_SETUP.md](./DOCKER_SETUP.md)**

---

### Option 2: Run Locally with Node.js

**Prerequisites:**
- Node.js v20.x or higher
- npm or yarn

#### 1. Clone and Install

```bash
git clone <repository-url>
cd hashbase
npm install
```

#### 2. Configure Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

**Required Configuration:**

1. **Gmail API Credentials** (for Gmail widget)
   - See Gmail Widget configuration section below for detailed setup
   - Add `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, and `GMAIL_REDIRECT_URI` to `.env`

2. **Config Encryption Key** (for secure config export/import)
   
   Generate a 64-character encryption key:
   ```bash
   node generate-encryption-key.js
   ```
   
   This will output:
   ```
   VITE_CONFIG_ENCRYPTION_KEY=cfcd868eeeecfe941addf4ca73214bbb25eaec2a635c292ba2223aeee297b7e0
   ```
   
   Copy the entire line and paste it into your `.env` file.
   
   **⚠️ IMPORTANT:** 
   - The key must be exactly **64 hexadecimal characters** (32 bytes)
   - Uses **AES-256-GCM** encryption (industry standard authenticated encryption)
   - Keep this key secure and backed up
   - Without this key, you cannot decrypt exported configs
   - Use the same key on all devices where you want to import configs
   - **Restart the dev server** after adding the key

3. **News API Key** (optional, for News widget)
   - Get a free key from [newsapi.org/register](https://newsapi.org/register)
   - Add `NEWS_API_KEY` to `.env`

#### 3. Run the Application

Start the integrated Vite dev server (includes both frontend and backend):

```bash
npm run dev
```

This will start:
- Frontend at `http://localhost:5000`
- Backend API server integrated into Vite
- Hot module replacement (HMR) for instant updates

#### 4. Access the Dashboard

Open your browser and navigate to `http://localhost:5000`

**Available Routes:**
- `/` - Main dashboard with widgets

---

## Widget Configuration

Most widgets can be configured directly in the app via **Settings (⚙️) > Configuration > Secrets**. Only Gmail requires `.env` file configuration.

#### **Gmail Widget** - Configure via .env file

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Gmail API:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API" and click "Enable"
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URI: `http://localhost:5000/oauth2callback`
   - Copy the **Client ID** and **Client Secret**
5. Copy `.env.example` to `.env` and add your credentials:
   ```env
   GMAIL_CLIENT_ID=your_client_id_here
   GMAIL_CLIENT_SECRET=your_client_secret_here
   GMAIL_REDIRECT_URI=http://localhost:5000/oauth2callback
   ```
6. Restart the dev server (`npm run dev`)
7. Click the login button in the Gmail widget to authenticate

#### **Netlify Widget** - Configure via Settings

1. Go to [Netlify Personal Access Tokens](https://app.netlify.com/user/applications#personal-access-tokens)
2. Click "New access token"
3. Give it a descriptive name (e.g., "Hashbase Dashboard")
4. Copy the generated token
5. In the app, click the **Settings** button (⚙️) > **Configuration** > **Secrets** tab
6. Paste the token into "Netlify Access Token"
7. Click **Save Secrets**

**Note:** Netlify credentials are stored securely in your browser's local storage and never sent to any external server.

#### **AI Chat Widget** - Configure via Settings

1. **For OpenAI (GPT-4, GPT-3.5):**
   - Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
   - Click "Create new secret key"
   - Give it a name (e.g., "Hashbase Dashboard")
   - Copy the generated key
   - In the app, click **Settings** (⚙️) > **Configuration** > **Secrets** tab
   - Paste the key into "OpenAI API Key"
   - Click **Save Secrets**

2. **For Claude (Anthropic):**
   - Go to [Anthropic Console](https://console.anthropic.com/settings/keys)
   - Click "Create Key"
   - Give it a name (e.g., "Hashbase Dashboard")
   - Copy the generated key
   - In the app, click **Settings** (⚙️) > **Configuration** > **Secrets** tab
   - Paste the key into "Claude API Key (Anthropic)"
   - Click **Save Secrets**

**Note:** You can configure one or both AI providers. The widget will show all available providers based on your configured API keys.

3. **For Web Search (Optional):**
   - Go to [Tavily AI](https://tavily.com)
   - Sign up for a free account (1000 searches/month)
   - Copy your API key from the dashboard
   - In the app, click **Settings** (⚙️) > **Configuration** > **Secrets** tab
   - Paste the key into "Tavily API Key (Web Search)"
   - Click **Save Secrets**
   - Toggle the search button in the AI Chat widget to enable web search

**Note:** Web search is optional. Without a Tavily API key, the AI will respond using only its training data.

#### **GitHub Widget** - Configure via Settings

1. Go to [GitHub Personal Access Tokens](https://github.com/settings/tokens)
2. Click "Generate new token" > "Generate new token (classic)"
3. Give it a descriptive name (e.g., "Hashbase Dashboard")
4. Select the `repo` scope (required to read commit data)
5. Click "Generate token" and copy the generated token
6. In the app, click **Settings** (⚙️) > **Configuration** > **Secrets** tab
7. Paste the token into "GitHub Personal Access Token"
8. Click **Save Secrets**
9. In the GitHub widget, click the settings icon to configure your repository:
   - Enter the repository owner (e.g., "facebook")
   - Enter the repository name (e.g., "react")
   - Click **Save**

**Note:** GitHub credentials are stored securely in your browser's local storage and never sent to any external server.

#### **News Widget** - Configure via .env file

1. Go to [NewsAPI.org](https://newsapi.org/register)
2. Sign up for a free account (100 requests/day)
3. Copy your API key from the dashboard
4. Add the key to your `.env` file:
   ```env
   NEWS_API_KEY=your_api_key_here
   ```
5. Restart the dev server (`npm run dev`)
6. Click the settings icon (⚙️) in the News widget to configure:
   - Select your preferred country (20+ countries available)
   - Select your preferred topic (General, Business, Technology, etc.)
   - Click **Save Changes**

**Note:** Settings are saved in your browser's localStorage and persist across sessions. The widget auto-refreshes every 5 minutes.

#### **Apps Tab** - Enable/Disable Widgets

Click the **Settings** button (⚙️) > **Configuration** > **Apps** tab to toggle widgets on or off. Use the search bar to quickly find specific widgets. Changes take effect after refreshing the page.

#### **Secrets Tab** - Advanced Management

The Secrets tab includes:
- **Search functionality** - Quickly find specific API keys
- **Alphabetical sorting** - All secrets are displayed in alphabetical order

#### **Configuration Backup & Restore**

In Settings > Secrets tab, you can backup and restore your entire dashboard configuration:

**Download Config:**
- Click "Download Config" in Settings > Secrets tab to export all settings
- **Automatic Encryption:** API secrets are automatically encrypted using `VITE_CONFIG_ENCRYPTION_KEY` from `.env`
  - Uses AES-256-GCM encryption (industry standard)
  - Encryption happens automatically - no user prompts
  - Secrets are unreadable in the exported JSON file
- **What's Included:**
  - ✅ API secrets (Netlify, OpenAI, Claude, Tavily, GitHub) - **encrypted**
  - ✅ Widget layout and canvas configuration
  - ✅ Widget preferences (enabled/disabled state)
  - ✅ Theme preference (light/dark mode)
  - ✅ AI chat conversations and settings
  - ✅ News widget settings
  - ✅ GitHub widget repository configuration
  - ❌ Gmail OAuth tokens (excluded - managed by .env file)
- File is named `hashbase-config-YYYY-MM-DD.json`
- Safe to store in cloud storage, email, or USB drives

**Upload Config:**
- Click "Upload Config" to import settings from a previously exported JSON file
- Automatically decrypts secrets using the same encryption key from `.env`
- **Important:** The same `VITE_CONFIG_ENCRYPTION_KEY` must be in your `.env` file
- Page automatically refreshes after successful import
- Perfect for:
  - Migrating to a new device
  - Switching between browsers
  - Quick dashboard setup
  - Backing up your configuration

**Cross-Device Setup:**
1. On Device A: Download config (secrets encrypted)
2. Copy your `.env` file (with `VITE_CONFIG_ENCRYPTION_KEY`) to Device B
3. On Device B: Upload config (secrets automatically decrypted)
4. Done! All settings restored

**Security & Encryption:**
- **Algorithm:** AES-256-GCM (authenticated encryption)
- **Key Storage:** Encryption key stored in `.env` file (gitignored, never committed)
- **What's Encrypted:** Only API secrets are encrypted
- **What's Not Encrypted:** Layout, preferences, and widget settings (for compatibility)
- **Key Requirement:** 64 hexadecimal characters (32 bytes)
- **Decryption:** Requires the exact same encryption key
- **No Password Recovery:** If you lose the encryption key, encrypted secrets cannot be recovered

**Troubleshooting:**
- **Secrets not encrypted?** Check console for warnings, ensure key is 64 characters, restart dev server
- **Import fails?** Ensure the same encryption key is in `.env` on the import device
- **"Encryption key mismatch" error?** The config was encrypted with a different key

#### **Clear All Data**

In Settings > Secrets tab, there's a "Clear All Data" button in the Danger Zone that will:
- Remove all API tokens (Gmail OAuth, Netlify, OpenAI, Claude, etc.)
- Clear all widget preferences
- Reset widget layouts
- Clear all localStorage data

Use this if you want to start fresh or are experiencing authentication issues. **Note:** You'll need to re-authenticate with Gmail after clearing data.

## Usage

### Widget Layout System

The dashboard features a powerful drag-and-drop layout system with intelligent space management:

- **Drag & Drop** - Click and drag any widget to move it to a new position
- **Resize Widgets** - Click the resize icon (⇕) in the bottom-right corner to cycle through sizes (1-4 rows)
- **Visual Feedback** - Blue ring indicates valid drop zones, red ring indicates invalid positions
- **Smart Validation** - System prevents overlapping widgets and validates fit before allowing drops
- **Layout Preservation** - Disabling/enabling widgets preserves existing layout positions
- **Auto-Placement** - New widgets automatically find the first available empty space
- **Space Warnings** - Notifies when widgets can't be placed due to insufficient space
- **Auto-Save** - Layout automatically saves to localStorage and persists across sessions
- **5×4 Grid** - 5 columns with up to 4 rows each (20 total positions)

For detailed technical documentation, see [LAYOUT_PRESERVATION_CHANGES.md](./LAYOUT_PRESERVATION_CHANGES.md)

### Gmail Widget
- Displays your unread emails
- Auto-refreshes every 60 seconds
- Click the refresh button to manually refresh
- Click on emails to open them in Gmail
- Shows sender, subject, and time received

### Netlify Widget
- Displays latest deploys from all your Netlify projects
- Shows deploy status (ready, building, error)
- Displays build time, branch, and context
- Auto-refreshes every 60 seconds
- Click "Deploy" to view deploy details in Netlify
- Click "Site" to visit the live site
- Color-coded badges for different deploy states

### AI Chat Widget
- Chat with AI assistants (OpenAI GPT-4 or Claude)
- **Modern UI** - Redesigned interface inspired by Claude and ChatGPT
- **Web Search Integration** - Enable real-time web search powered by Tavily AI for up-to-date information
- **Streaming responses** - See AI responses in real-time
- **Multi-conversation support** - Manage multiple chat conversations with history
- **Conversation history** - View and load previous conversations sorted by date
- **Advanced LLM settings** - Configure temperature, max tokens, top-p, frequency/presence penalties
- **Multi-provider support** - Switch between OpenAI and Claude
- **Model selection** - Choose from GPT-4 Turbo, GPT-3.5, Claude 3.5 Sonnet, Claude 3 Opus/Haiku
- **Message management** - Copy, delete individual messages
- **Token tracking** - Approximate token usage display
- Click the menu icon to access:
  - **New Chat** - Start a fresh conversation
  - **History** - Browse and load previous conversations
  - **Settings** - Configure LLM parameters (temperature, tokens, etc.)
- Press Enter to send, Shift+Enter for new line
- Toggle web search on/off to enhance responses with real-time information

### GitHub Widget
- Displays recent commits from your configured GitHub repository
- Shows commit messages, authors, timestamps, and commit SHAs
- Clean, modern card design without avatars for focused content
- **Configurable auto-refresh** - Choose from 1, 5, 10, 15, or 30 minutes
- **Commit status indicators** - Toggle to show/hide status badges
- **Repository name display** - Toggle to show/hide repo name in cards
- Click on any commit to view it on GitHub
- Configure all settings via the settings modal in the widget
- Supports any public or private repository (with proper token permissions)

### News Widget
- Displays latest news headlines from around the world powered by NewsAPI
- **Country Selection** - Choose from 20+ countries (US, UK, Canada, India, Australia, etc.)
- **Topic Filtering** - Filter by General, Business, Technology, Entertainment, Sports, Science, or Health
- **Integrated Search** - Search through headlines by title, description, or source
- **Settings Modal** - Easy configuration via settings button with modern UI
- Auto-refreshes every 5 minutes
- Click on any article to read the full story on the source website
- Settings persist in localStorage
- Gradient card design with hover effects

## Project Structure

```
hashbase/
├── src/
│   ├── components/
│   │   ├── ui/                         # shadcn/ui components (button, dialog, tooltip, etc.)
│   │   ├── widgets/
│   │   │   ├── AI/                     # AI Chat widget (AIChatWidget.jsx + components)
│   │   │   ├── BD24Live/               # BD24 Live news widget (V2)
│   │   │   ├── Demo/                   # Demo widget showcasing BaseWidgetV2
│   │   │   ├── GitHub/                 # GitHub commits widget (V2)
│   │   │   ├── Gmail/                  # Gmail unread emails widget (V2)
│   │   │   ├── Netlify/                # Netlify deploys widget (V2)
│   │   │   ├── News/                   # News headlines widget (V2)
│   │   │   └── README.md               # Widget development guide
│   │   ├── BaseWidgetV2.jsx            # Standardized widget container with states
│   │   ├── Canvas.jsx                  # Drag-and-drop canvas with layout management
│   │   ├── DraggableWidget.jsx         # Draggable widget wrapper with resize
│   │   ├── DropZone.jsx                # Drop zone component for drag-and-drop
│   │   ├── ScreenSizeGuard.jsx         # Minimum screen size enforcement
│   │   ├── SettingsButton.jsx          # Settings panel (Apps, Secrets, Theme)
│   │   ├── WidgetEmptyState.jsx        # Empty state component
│   │   └── WidgetSearch.jsx            # Search component for widgets
│   ├── services/
│   │   ├── aiService.js                # OpenAI & Claude API integration
│   │   ├── bd24LiveService.js          # BD24 Live RSS feed service
│   │   ├── configService.js            # Config export/import with AES-256-GCM encryption
│   │   ├── githubService.js            # GitHub API service
│   │   ├── gmailService.js             # Gmail API service
│   │   ├── layoutService.js            # Layout management, validation & space finding
│   │   ├── netlifyService.js           # Netlify API service
│   │   ├── newsService.js              # NewsAPI service
│   │   ├── secretsService.js           # Secrets management (localStorage)
│   │   └── widgetRegistry.js           # Widget enable/disable preferences
│   ├── contexts/
│   │   └── ThemeContext.jsx            # Dark mode context provider
│   ├── lib/
│   │   ├── dateUtils.js                # Date formatting utilities
│   │   └── utils.js                    # General utility functions (cn, etc.)
│   ├── App.jsx                         # Main app component with widget registry
│   ├── main.jsx                        # React entry point
│   └── index.css                       # Global styles with Tailwind directives
├── vite.config.js                      # Vite config with integrated Express API server
├── generate-encryption-key.js          # Utility to generate AES-256 encryption keys
├── Dockerfile                          # Docker image configuration
├── docker-compose.yml                  # Docker Compose orchestration
├── .dockerignore                       # Docker build exclusions
├── .env                                # Environment variables (gitignored)
├── .env.example                        # Example environment variables template
├── package.json                        # Dependencies and npm scripts
├── tailwind.config.js                  # Tailwind CSS configuration
├── postcss.config.js                   # PostCSS configuration
├── jsconfig.json                       # JavaScript path aliases (@/ → src/)
├── DOCKER_SETUP.md                     # Docker setup and deployment guide
├── UPGRADE_SUMMARY.md                  # BaseWidgetV2 migration summary
├── WIDGET_UPGRADE_GUIDE.md             # Guide for upgrading to BaseWidgetV2
├── LAYOUT_PRESERVATION_CHANGES.md      # Layout preservation system documentation
└── README.md                           # This file
```

## Technologies Used

### Frontend
- **React 18.3** - Modern UI library with hooks
- **Vite 5.2** - Lightning-fast build tool and dev server
- **Tailwind CSS 3.4** - Utility-first CSS framework
- **shadcn/ui** - High-quality accessible UI components built on Radix UI
- **react-dnd 16.0** - Drag and drop for React with HTML5 backend
- **Lucide React** - Beautiful icon library
- **React Icons** - Additional icon sets (SiGmail, SiNetlify, SiGithub)

### Backend & APIs
- **Express 4.18** - Node.js web framework for API routes (integrated into Vite)
- **Google APIs (googleapis)** - Gmail API integration with OAuth2 and auto-refresh
- **Netlify API** - Deploy monitoring and site management
- **OpenAI API** - GPT-4 and GPT-3.5 integration with streaming
- **Anthropic API** - Claude AI integration (Sonnet, Opus, Haiku)
- **Tavily AI** - Web search API for AI responses (5 results per query)
- **NewsAPI** - News headlines from 20+ countries and 7 categories
- **RSS Parser** - BD24 Live RSS feed parsing with 30-minute caching
- **Axios** - HTTP client for API requests
- **Cheerio** - HTML parsing for web scraping

### Development Tools
- **dotenv** - Environment variable management
- **cors** - Cross-origin resource sharing
- **PostCSS** - CSS processing with Autoprefixer

## Architecture & Design

### Layout System
- **5-Column Grid** - Dashboard uses a 5-column layout with up to 4 rows per column (20 total positions)
- **Dynamic Widget Sizing** - Each widget can occupy 1-4 rows (heights: 12rem, 25rem, 38rem, 51rem)
- **Smart Resize Algorithm** - Automatically detects available space and cycles through valid sizes
- **Collision Detection** - Prevents widgets from overlapping using dropzone validation
- **Layout Preservation** - Disabling widgets preserves other widget positions
- **Intelligent Placement** - New widgets automatically placed in first available empty space
- **Space Finding Algorithm** - Searches all columns for consecutive empty rows
- **Auto-disable on No Space** - Widgets that can't be placed are auto-disabled with user notification
- **Persistent State** - Layout configuration saved to localStorage with automatic validation

### Component Architecture
- **BaseWidgetV2** - Standardized widget container with built-in states (loading, error, empty, positive)
- **BaseWidget** - Legacy widget container (kept for backward compatibility)
- **Canvas** - Main layout manager with drag-and-drop logic, state management, and layout preservation
- **DraggableWidget** - Wrapper that adds drag functionality and resize controls
- **DropZone** - Drop target with visual feedback (blue ring for valid, red for invalid)
- **Widget Registry** - Centralized widget management with enable/disable preferences and auto-placement
- **WidgetSearch** - Reusable search component for filtering widget content
- **WidgetEmptyState** - Reusable empty state component with icon and messages

### API Integration
- **Vite Plugin Architecture** - Express API server integrated directly into Vite dev server
- **Proxy Pattern** - All external API calls proxied through backend to protect API keys
- **Header-based Auth** - Credentials passed via custom headers (x-gmail-token, x-netlify-access-token, x-tavily-api-key, etc.)
- **localStorage Strategy** - User credentials stored client-side, never sent to external servers
- **Caching Layer** - RSS feeds cached for 30 minutes to reduce external requests and improve performance
- **Error Handling** - Graceful fallbacks with stale cache data when API requests fail

## Security Notes

- **Gmail API credentials** (Client ID/Secret) stored in `.env` file on server (gitignored)
- **Gmail OAuth tokens** stored in browser localStorage and sent via `x-gmail-token` header
- **All other API keys** (Netlify, OpenAI, Claude, Tavily, GitHub) stored in browser localStorage
- **No external transmission** - Credentials in localStorage never leave your device
- **OAuth auto-refresh** - Gmail tokens refreshed automatically by Google API client
- **Proxy protection** - All API calls proxied through backend to keep server-side keys secure
- **Environment variables** - `.env` file excluded from version control via `.gitignore`
- **Clear data option** - Settings panel includes "Clear All Data" to remove all stored credentials

## Troubleshooting

### Gmail Widget Issues

**"Not authenticated" error**
- Ensure you've added Gmail credentials to your `.env` file
- Restart the dev server after adding credentials (`npm run dev`)
- Make sure you've completed the Gmail authentication process by clicking the login button
- Check your browser's localStorage for `gmail_tokens` key
- Try re-authenticating by clearing localStorage (Settings > Secrets > Clear All Data) and clicking the login button
- Ensure the Gmail API is enabled in Google Cloud Console
- Verify the redirect URI in Google Cloud Console matches `http://localhost:5000/oauth2callback`

**No emails showing**
- Check the browser console for errors
- Verify your Gmail account has unread emails
- Verify your credentials are correct in the `.env` file

### Netlify Widget Issues

**"Not configured" error**
- Open Settings > Secrets and add your Netlify Access Token
- Verify the token is valid and has not expired
- Check that you have Netlify sites in your account

**No deploys showing**
- Verify you have sites with deploys in your Netlify account
- Check the browser console for errors
- Try refreshing manually with the refresh button

### AI Chat Widget Issues

**"No AI provider configured" error**
- Open Settings > Secrets and add your OpenAI or Claude API key
- Verify the API key is valid and has not expired
- Make sure you've saved the secrets after entering them

**API request errors**
- Check that your API key is correct and active
- Verify you have sufficient credits/quota in your OpenAI or Anthropic account
- Check the browser console for detailed error messages
- For OpenAI: Ensure your API key has access to the selected model (GPT-4 requires separate access)
- For Claude: Ensure you're using a valid Anthropic API key (starts with `sk-ant-`)

**Web search not working**
- Ensure you've added a Tavily API key in Settings > Secrets
- Verify the API key is valid and you haven't exceeded your monthly quota
- Check that the search toggle is enabled (globe icon should be highlighted)
- The search will gracefully fail if there are issues, and the AI will respond without search results

**Streaming not working**
- This is a browser/network issue - the widget uses Server-Sent Events (SSE)
- Try refreshing the page
- Check your browser console for CORS or network errors

**Chat history lost**
- Chat history is stored in browser localStorage
- Clearing browser data or using incognito mode will reset history
- Use the "Clear All Data" feature in Settings only if you want to reset everything

### GitHub Widget Issues

**"GitHub not configured" error**
- Open Settings > Secrets and add your GitHub Personal Access Token
- Verify the token has the `repo` scope enabled
- Configure the repository in the widget settings (click the settings icon)

**"Repository not found" error**
- Verify the owner and repository name are correct
- Ensure your token has access to the repository (for private repos)
- Check that the repository exists on GitHub

**"Invalid GitHub token" error**
- Verify your token is valid and hasn't expired
- Ensure the token has the `repo` scope
- Try generating a new token from GitHub settings

### News Widget Issues

**"NewsAPI not configured" error**
- Ensure you've added NEWS_API_KEY to your `.env` file
- Restart the dev server after adding the key
- Get a free API key from [newsapi.org/register](https://newsapi.org/register)

**No articles showing**
- Try different country/topic combinations
- Some countries may have limited news in certain categories
- Check NewsAPI dashboard for rate limit status (100 requests/day on free tier)
- Click the refresh button to manually update

**Articles are outdated**
- Click the refresh button (🔄) to manually update
- Check your internet connection
- Verify NewsAPI service status

### General Issues

**API server not connecting**
- Ensure the dev server is running (`npm run dev`)
- Verify no other application is using port 5000
- Check the terminal for any startup errors

**Widgets not updating**
- Check your internet connection
- Verify the dev server is running
- Check browser console for network errors

## Development

### Available Scripts

**Node.js:**
```bash
npm run dev      # Start Vite dev server with integrated API (port 5000)
npm run build    # Build for production
npm run preview  # Preview production build
```

**Docker:**
```bash
docker-compose up -d          # Start containers in detached mode
docker-compose down           # Stop and remove containers
docker-compose logs -f        # View logs in real-time
docker-compose restart        # Restart containers
docker-compose up -d --build  # Rebuild and start
```

📖 **See [DOCKER_SETUP.md](./DOCKER_SETUP.md) for complete Docker documentation**

### Adding a New Widget

1. **Create widget component** in `src/components/widgets/YourWidget/`
2. **Create service** (if needed) in `src/services/yourService.js`
3. **Register widget** in `src/App.jsx`:
   ```javascript
   const allWidgets = [
     // ... existing widgets
     { 
       id: 'your-widget-id', 
       component: YourWidget, 
       rowSpan: 2,  // Default size (1-4)
       name: 'Your Widget Name',
       description: 'Widget description',
       icon: YourIcon
     },
   ];
   ```
4. **Add API endpoints** (if needed) in `vite.config.js` API server section
5. **Test drag-and-drop** and resize functionality

See `src/components/widgets/README.md` for detailed widget development guide.

### BaseWidgetV2 - Standardized Widget Container

All widgets use **BaseWidgetV2**, a comprehensive widget container with:

**Built-in State Management:**
- `loading` - Loading spinner with optional custom message
- `error` - Error state with icon, message, and dual action buttons (primary + secondary)
- `empty` - Empty state with icon, primary message, and optional submessage
- `positive` - Content state with optional integrated search

**Features:**
- **Settings Modal Support** - Standardized modal UI with WidgetModal component
- **Integrated Search** - Built-in search bar with customizable placeholder
- **Refresh Button** - With loading state animation
- **Customizable Header** - Logo (drag handle), app name, widget name, and badges
- **Secondary Error Actions** - Support for dual error buttons (e.g., "Try Again" + "Authenticate")
- **Responsive Height System** - Dynamic heights based on rowSpan (1-4 rows)
- **Modern UI** - Dark blue toggle buttons with white borders, light white hover effects
- **Custom Actions** - Support for additional custom action buttons in header

**Documentation:**
- `WIDGET_UPGRADE_GUIDE.md` - Complete migration guide from BaseWidget to BaseWidgetV2
- `UPGRADE_SUMMARY.md` - Summary of all widget upgrades and improvements
- `DemoWidget.jsx` - Comprehensive feature showcase with all states and components

### Project Architecture Highlights

- **Integrated Dev Server** - Vite plugin architecture combines frontend and backend in one process
- **Path Aliases** - Use `@/` to import from `src/` directory (configured in `jsconfig.json`)
- **Component Composition** - BaseWidgetV2 provides consistent UI, individual widgets focus on data fetching and logic
- **Service Layer** - All API calls abstracted into service modules for reusability and maintainability
- **State Management** - React hooks + localStorage for persistence (no Redux/Zustand needed)
- **Styling** - Tailwind utility classes + shadcn/ui components for consistency and accessibility
- **Standardized Widgets** - All widgets follow BaseWidgetV2 patterns for consistent UX
- **Layout Preservation** - Intelligent layout system preserves widget positions when toggling widgets
- **Encryption** - AES-256-GCM encryption for config export/import with secure key management

### Building for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` folder. Note that the current setup is optimized for development. For production deployment, you'll need to:

1. Set up a proper backend server (Express) separately
2. Configure environment variables for production
3. Set up HTTPS for OAuth callbacks
4. Configure CORS for your production domain

### Code Style

- **Components** - PascalCase (e.g., `BaseWidget.jsx`)
- **Services** - camelCase (e.g., `gmailService.js`)
- **Utilities** - camelCase (e.g., `dateUtils.js`)
- **Constants** - UPPER_SNAKE_CASE (e.g., `MAX_ROWS_PER_COLUMN`)
- **React Hooks** - Follow React naming conventions (e.g., `useState`, `useEffect`)

## Contributing

This is a personal project, but suggestions and feedback are welcome. Please open an issue to discuss potential changes.

## License

This project is for personal use only.
