# Hashbase - Dashboard Widget Platform

A beautiful React single-page application that displays widgets for various services including Gmail and Netlify. Built with React, Vite, Tailwind CSS, and shadcn/ui.

## Features

- 📧 **Gmail Widget** - Display unread emails from Gmail
- 🚀 **Netlify Widget** - Monitor latest deploys from all your projects
- 🤖 **AI Chat Widget** - Chat with OpenAI (GPT-4) or Claude AI assistants with web search
- 💻 **GitHub Widget** - View recent commits from your GitHub repositories
- 📰 **News Widget** - Latest news headlines with country and topic filtering
- 🔍 **Web Search Integration** - Enable real-time web search for AI responses using Tavily AI
- ⚙️ **In-App Configuration** - Configure API secrets directly in the app (no .env file needed!)
- 🎛️ **Widget Management** - Enable/disable widgets from the settings panel with search
- 🔑 **Advanced Secrets Management** - Add custom secrets, search, and alphabetically sorted display
- 🎯 **Drag & Drop Layout** - Customize widget positions with intelligent validation and persistence
- 📐 **Dynamic Widget Sizing** - Resize widgets from 1-4 rows with automatic fit validation
- 💾 **Layout Persistence** - Your custom layout survives page refreshes and server restarts
- 🎨 Beautiful, modern UI with Tailwind CSS and shadcn/ui
- 🔄 Auto-refresh every 60 seconds
- 📱 Responsive design
- 🌓 Dark mode support
- ⚡ Fast development with Vite
- 🔐 Secure local storage for API credentials

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

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Run the Application

Simply run the development server:

```bash
npm run dev
```

This will start both the frontend and backend API server together.

### 3. Access the Application

Open your browser and navigate to `http://localhost:5000`

### 4. Configure Your Widgets

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
│   │   ├── ui/                    # shadcn/ui components
│   │   ├── widgets/
│   │   │   ├── GmailWidget.jsx   # Gmail widget component
│   │   │   └── NetlifyWidget.jsx # Netlify widget component
│   │   ├── Widget.jsx             # Base widget component
│   │   └── SettingsButton.jsx     # Settings/theme toggle
│   ├── services/
│   │   ├── gmailService.js        # Gmail API service
│   │   └── netlifyService.js      # Netlify API service
│   ├── contexts/
│   │   └── ThemeContext.jsx       # Dark mode context
│   ├── lib/
│   │   └── utils.js               # Utility functions
│   ├── App.jsx                    # Main app component
│   ├── main.jsx                   # Entry point
│   └── index.css                  # Global styles with Tailwind
├── vite.config.js                 # Vite configuration with integrated API server
├── .env                           # Environment variables (not in git)
├── .env.example                   # Example environment variables
├── package.json                   # Dependencies and scripts
├── tailwind.config.js             # Tailwind CSS configuration
├── server.js                      # Legacy standalone server (deprecated)
└── README.md                      # This file
```

## Technologies Used

- **React** - UI library
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Beautiful UI components
- **Express** - Backend server
- **Google APIs** - Gmail integration
- **Netlify API** - Deploy monitoring
- **Lucide React** - Icon library

## Security Notes

- **Gmail API credentials** (Client ID/Secret) are stored in `.env` file on the server (never committed to git)
- **Gmail OAuth tokens** are stored in your browser's localStorage and sent via secure headers
- **Netlify credentials** are stored in your browser's localStorage
- All credentials stored in localStorage never leave your device
- OAuth tokens are refreshed automatically by the Google API client
- All API calls are proxied through the backend server to keep API credentials secure
- The `.env` file should never be committed to version control

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

## License

This project is for personal use only.
