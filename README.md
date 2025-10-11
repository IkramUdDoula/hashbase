# Hashbase - Customizable Dashboard Widget Platform

A modern, highly customizable React dashboard application featuring drag-and-drop widgets for Gmail, Netlify, GitHub, AI Chat, News, and more. Built with React 18, Vite, Tailwind CSS, shadcn/ui, and react-dnd for a beautiful and interactive user experience.

## Features

### Widget Features
- 📧 **Gmail Widget** - Display unread emails from Gmail with OAuth2 authentication
- 🚀 **Netlify Widget** - Monitor latest deploys from all your Netlify projects
- 🤖 **AI Chat Widget** - Chat with OpenAI (GPT-4, GPT-3.5) or Claude AI (Sonnet, Opus, Haiku) with streaming responses
- 💻 **GitHub Widget** - View recent commits from any GitHub repository
- 📰 **News Widget** - Latest news headlines with country (20+ countries) and topic filtering
- 🌐 **BD24 Live Widget** - Bangladesh news from BD24 Live via RSS feed with 30-minute caching

### Core Features
- 🎯 **Advanced Drag & Drop Layout** - Powered by react-dnd with intelligent position validation
- 📐 **Smart Widget Resizing** - Resize widgets from 1-4 rows with automatic space detection and fit validation
- 💾 **Persistent Layout System** - Custom layouts saved to localStorage and survive page refreshes
- 🎛️ **Widget Management** - Enable/disable widgets from settings panel with search functionality
- ⚙️ **In-App Configuration** - Configure API secrets directly in the app (stored in localStorage)
- 🔑 **Advanced Secrets Management** - Add custom secrets, search, alphabetically sorted display
- 🔍 **Web Search Integration** - Real-time web search for AI responses using Tavily AI API
- 🎨 **Beautiful Modern UI** - Built with Tailwind CSS and shadcn/ui components
- 🌓 **Dark Mode Support** - Full dark mode with smooth transitions
- 🔄 **Auto-Refresh** - Widgets auto-refresh at configurable intervals (30s - 5min)
- 📱 **Responsive Design** - Optimized for desktop with screen size guard
- ⚡ **Fast Development** - Vite dev server with integrated API backend
- 🔐 **Secure Credentials** - API credentials stored in browser localStorage, never sent externally

## Prerequisites

- Node.js (v20.x or higher)
- npm or yarn
- Gmail API credentials from Google Cloud Console (for Gmail widget)
- Netlify Personal Access Token (for Netlify widget)
- OpenAI API Key (for AI Chat widget with GPT models)
- Claude API Key (for AI Chat widget with Claude models)
- Tavily API Key (for web search in AI Chat - optional, free tier available)
- GitHub Personal Access Token (for GitHub widget - optional)
- NewsAPI Key (for News widget - optional, free tier available)

## Quick Start

### 1. Clone and Install

```bash
git clone <repository-url>
cd hashbase
npm install
```

### 2. Configure Environment Variables

Copy the example environment file and add your Gmail API credentials:

```bash
cp .env.example .env
```

Edit `.env` and add your Gmail API credentials (see Gmail Widget configuration below for details).

### 3. Run the Application

Start the integrated Vite dev server (includes both frontend and backend):

```bash
npm run dev
```

This will start:
- Frontend at `http://localhost:5000`
- Backend API server integrated into Vite
- Hot module replacement (HMR) for instant updates

### 4. Access the Dashboard

Open your browser and navigate to `http://localhost:5000`

### 5. Configure Widgets

Most widgets can be configured directly in the app via **Settings (⚙️) > Configuration > Secrets**. Only Gmail requires `.env` file configuration.

## Widget Configuration

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

The Secrets tab now includes:
- **Search functionality** - Quickly find specific API keys
- **Alphabetical sorting** - All secrets are displayed in alphabetical order
- **Custom secrets** - Add your own custom API keys using the "+" button
- **Delete custom secrets** - Remove custom secrets with the trash icon

#### **Clear All Data**

In Settings > Secrets tab, there's a "Clear All Data" button in the Danger Zone that will:
- Remove all API tokens (Gmail, Netlify)
- Clear all widget preferences
- Reset widget layouts
- Clear all localStorage data

Use this if you want to start fresh or are experiencing authentication issues.

## Usage

### Widget Layout System

The dashboard features a powerful drag-and-drop layout system:

- **Drag & Drop** - Click and drag any widget to move it to a new position
- **Resize Widgets** - Click the resize icon (⇕) in the bottom-right corner to cycle through sizes (1-4 rows)
- **Visual Feedback** - Blue ring indicates valid drop zones, red ring indicates invalid positions
- **Smart Validation** - System prevents overlapping widgets and validates fit before allowing drops
- **Auto-Save** - Layout automatically saves to localStorage and persists across sessions
- **5×4 Grid** - 5 columns with up to 4 rows each (20 total positions)

For detailed technical documentation, see [LAYOUT_SYSTEM.md](./LAYOUT_SYSTEM.md)

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
- Author avatars displayed when available
- Auto-refreshes every 5 minutes
- Click on any commit to view it on GitHub
- Configure repository via the settings icon in the widget
- Supports any public or private repository (with proper token permissions)

### News Widget
- Displays latest news headlines from around the world
- **Country Selection** - Choose from 20+ countries (US, UK, Canada, India, etc.)
- **Topic Filtering** - Filter by General, Business, Technology, Entertainment, Sports, Science, or Health
- **Search** - Search through headlines by title, description, or source
- **Settings Dialog** - Easy configuration via settings button
- Auto-refreshes every 5 minutes
- Click on any article to read the full story
- Settings persist in localStorage

## Project Structure

```
hashbase/
├── src/
│   ├── components/
│   │   ├── ui/                         # shadcn/ui components (button, dialog, tooltip, etc.)
│   │   ├── widgets/
│   │   │   ├── AI/                     # AI Chat widget (AIChatWidget.jsx + components)
│   │   │   ├── BD24Live/               # BD24 Live news widget
│   │   │   ├── GitHub/                 # GitHub commits widget
│   │   │   ├── Gmail/                  # Gmail unread emails widget
│   │   │   ├── Netlify/                # Netlify deploys widget
│   │   │   ├── News/                   # News headlines widget
│   │   │   └── README.md               # Widget development guide
│   │   ├── BaseWidget.jsx              # Base widget container with dynamic sizing
│   │   ├── Canvas.jsx                  # Drag-and-drop canvas with layout management
│   │   ├── DraggableWidget.jsx         # Draggable widget wrapper with resize
│   │   ├── DropZone.jsx                # Drop zone component for drag-and-drop
│   │   ├── ScreenSizeGuard.jsx         # Minimum screen size enforcement
│   │   └── SettingsButton.jsx          # Settings panel (Apps, Secrets, Theme)
│   ├── services/
│   │   ├── aiService.js                # OpenAI & Claude API integration
│   │   ├── bd24LiveService.js          # BD24 Live RSS feed service
│   │   ├── githubService.js            # GitHub API service
│   │   ├── gmailService.js             # Gmail API service
│   │   ├── layoutService.js            # Layout management & validation logic
│   │   ├── netlifyService.js           # Netlify API service
│   │   ├── newsService.js              # NewsAPI service
│   │   ├── secretsService.js           # Secrets management (localStorage)
│   │   └── widgetRegistry.js           # Widget enable/disable preferences
│   ├── contexts/
│   │   └── ThemeContext.jsx            # Dark mode context provider
│   ├── lib/
│   │   ├── dateUtils.js                # Date formatting utilities
│   │   └── utils.js                    # General utility functions
│   ├── App.jsx                         # Main app component with widget registry
│   ├── main.jsx                        # React entry point
│   └── index.css                       # Global styles with Tailwind directives
├── vite.config.js                      # Vite config with integrated Express API server
├── server.js                           # Standalone Express server (deprecated, use Vite)
├── .env                                # Environment variables (not in git)
├── .env.example                        # Example environment variables template
├── package.json                        # Dependencies and npm scripts
├── tailwind.config.js                  # Tailwind CSS configuration
├── postcss.config.js                   # PostCSS configuration
├── jsconfig.json                       # JavaScript path aliases (@/ → src/)
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
- **Express 4.18** - Node.js web framework for API routes
- **Google APIs (googleapis)** - Gmail API integration with OAuth2
- **Netlify API** - Deploy monitoring and site management
- **OpenAI API** - GPT-4 and GPT-3.5 integration
- **Anthropic API** - Claude AI integration
- **Tavily AI** - Web search API for AI responses
- **NewsAPI** - News headlines from 20+ countries
- **RSS Parser** - BD24 Live RSS feed parsing
- **Axios** - HTTP client for API requests
- **Cheerio** - HTML parsing for web scraping (legacy Daily Star scraper)

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
- **Persistent State** - Layout configuration saved to localStorage with automatic validation

### Component Architecture
- **BaseWidget** - Reusable container with dynamic height, drag handle, and header actions
- **Canvas** - Main layout manager with drag-and-drop logic and state management
- **DraggableWidget** - Wrapper that adds drag functionality and resize controls
- **DropZone** - Drop target with visual feedback (blue ring for valid, red for invalid)
- **Widget Registry** - Centralized widget management with enable/disable preferences

### API Integration
- **Vite Plugin Architecture** - Express API server integrated directly into Vite dev server
- **Proxy Pattern** - All external API calls proxied through backend to protect API keys
- **Header-based Auth** - Credentials passed via custom headers (x-gmail-token, x-netlify-access-token, etc.)
- **localStorage Strategy** - User credentials stored client-side, never sent to external servers
- **Caching Layer** - RSS feeds cached for 30 minutes to reduce external requests

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

```bash
npm run dev      # Start Vite dev server with integrated API (port 5000)
npm run build    # Build for production
npm run preview  # Preview production build
npm run server   # [DEPRECATED] Run standalone Express server
```

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

### Project Architecture Highlights

- **Integrated Dev Server** - Vite plugin architecture combines frontend and backend in one process
- **Path Aliases** - Use `@/` to import from `src/` directory (configured in `jsconfig.json`)
- **Component Composition** - BaseWidget provides consistent UI, individual widgets focus on data
- **Service Layer** - All API calls abstracted into service modules for reusability
- **State Management** - React hooks + localStorage for persistence (no Redux needed)
- **Styling** - Tailwind utility classes + shadcn/ui components for consistency

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
