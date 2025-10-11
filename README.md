# Hashbase - Dashboard Widget Platform

A beautiful React single-page application that displays widgets for various services including Gmail and Netlify. Built with React, Vite, Tailwind CSS, and shadcn/ui.

## Features

- 📧 **Gmail Widget** - Display unread emails from Gmail
- 🚀 **Netlify Widget** - Monitor latest deploys from all your projects
- ⚙️ **In-App Configuration** - Configure API secrets directly in the app (no .env file needed!)
- 🎛️ **Widget Management** - Enable/disable widgets from the settings panel
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

#### **Apps Tab** - Enable/Disable Widgets

Click the **Settings** button (⚙️) > **Configuration** > **Apps** tab to toggle widgets on or off. Changes take effect after refreshing the page.

#### **Clear All Data**

In Settings > Secrets tab, there's a "Clear All Data" button in the Danger Zone that will:
- Remove all API tokens (Gmail, Netlify)
- Clear all widget preferences
- Reset widget layouts
- Clear all localStorage data

Use this if you want to start fresh or are experiencing authentication issues.

## Usage

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
