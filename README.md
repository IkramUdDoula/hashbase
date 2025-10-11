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

You need to run both the backend server and the frontend development server:

**Terminal 1 - Backend Server:**
```bash
npm run server
```

**Terminal 2 - Frontend Development Server:**
```bash
npm run dev
```

### 3. Access the Application

Open your browser and navigate to the URL shown by Vite (typically `http://localhost:5173`)

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
   - Add authorized redirect URI: `http://localhost:3001/oauth2callback`
   - Copy the **Client ID** and **Client Secret**
5. Copy `.env.example` to `.env` and add your credentials:
   ```env
   GMAIL_CLIENT_ID=your_client_id_here
   GMAIL_CLIENT_SECRET=your_client_secret_here
   GMAIL_REDIRECT_URI=http://localhost:3001/oauth2callback
   ```
6. Restart the backend server
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
├── server.js                      # Express backend for APIs
├── .env                           # Environment variables (not in git)
├── .env.example                   # Example environment variables
├── package.json                   # Dependencies and scripts
├── vite.config.js                 # Vite configuration
├── tailwind.config.js             # Tailwind CSS configuration
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

- **Gmail credentials** are stored in `.env` file on the server (never committed to git)
- **Netlify credentials** are stored in your browser's localStorage and never leave your device
- Gmail OAuth tokens are stored locally in `token.json` on the server
- OAuth tokens are refreshed automatically by the Google API client
- All API calls are proxied through the backend server to keep credentials secure
- The `.env` file should never be committed to version control

## Troubleshooting

### Gmail Widget Issues

**"Not authenticated" error**
- Ensure you've added Gmail credentials to your `.env` file
- Restart the backend server after adding credentials
- Make sure you've completed the Gmail authentication process by clicking the login button
- Check that `token.json` exists in the project root
- Try re-authenticating by deleting `token.json` and clicking the login button
- Ensure the Gmail API is enabled in Google Cloud Console

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

**Backend server not connecting**
- Ensure the backend server is running on port 3001
- Check that `VITE_API_URL` in `.env` matches your backend URL
- Verify no other application is using port 3001

**Widgets not updating**
- Check your internet connection
- Verify the backend server is running
- Check browser console for network errors

## License

This project is for personal use only.
