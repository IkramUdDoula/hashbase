# Hashbase - Gmail Unread Email Viewer

A beautiful React single-page application that displays your unread Gmail emails in a centered box on a canvas-like interface. Built with React, Vite, Tailwind CSS, and shadcn/ui.

## Features

- 📧 Display unread emails from Gmail
- 🎨 Beautiful, modern UI with Tailwind CSS and shadcn/ui
- 🔄 Auto-refresh every 60 seconds
- 📱 Responsive design
- 🎯 Centered box layout (20% width, 50% height)
- ⚡ Fast development with Vite

## Prerequisites

- Node.js (v20.x or higher)
- npm or yarn
- Gmail API credentials from Google Cloud Console

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Set Up Gmail API Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Gmail API:
   - Go to "APIs & Services" > "Library"
   - Search for "Gmail API"
   - Click "Enable"
4. Create OAuth 2.0 credentials:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - Choose "Web application"
   - Add authorized redirect URI: `http://localhost:3001/oauth2callback`
   - Copy the Client ID and Client Secret

### 3. Configure Environment Variables

Your `.env` file should already exist. Update it with your Gmail API credentials:

```env
GMAIL_CLIENT_ID=your_client_id_here
GMAIL_CLIENT_SECRET=your_client_secret_here
GMAIL_REDIRECT_URI=http://localhost:3001/oauth2callback
PORT=3001
VITE_API_URL=http://localhost:3001
```

### 4. Run the Application

You need to run both the backend server and the frontend development server:

**Terminal 1 - Backend Server:**
```bash
npm run server
```

**Terminal 2 - Frontend Development Server:**
```bash
npm run dev
```

### 5. Authenticate with Gmail

1. The backend server will display an authentication URL in the console
2. Visit `http://localhost:3001/api/auth/url` to get the authorization URL
3. Click the URL and authorize the application with your Gmail account
4. After authorization, you'll be redirected back and your credentials will be saved locally in `token.json`

### 6. Access the Application

Open your browser and navigate to the URL shown by Vite (typically `http://localhost:5173`)

## Usage

- The app will automatically fetch and display your unread emails
- Emails are refreshed every 60 seconds
- Click the refresh button to manually refresh the email list
- The box shows:
  - Sender name
  - Email subject
  - Email snippet
  - Time received

## Project Structure

```
hashbase/
├── src/
│   ├── components/
│   │   ├── ui/           # shadcn/ui components
│   │   └── EmailBox.jsx  # Main email display component
│   ├── services/
│   │   └── gmailService.js  # Gmail API service
│   ├── lib/
│   │   └── utils.js      # Utility functions
│   ├── App.jsx           # Main app component
│   ├── main.jsx          # Entry point
│   └── index.css         # Global styles with Tailwind
├── server.js             # Express backend for Gmail API
├── .env                  # Environment variables (not in git)
├── package.json          # Dependencies and scripts
├── vite.config.js        # Vite configuration
├── tailwind.config.js    # Tailwind CSS configuration
└── README.md             # This file
```

## Technologies Used

- **React** - UI library
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Beautiful UI components
- **Express** - Backend server
- **Google APIs** - Gmail integration
- **Lucide React** - Icon library

## Security Notes

- Gmail credentials are stored locally in `token.json`
- The `.env` file contains sensitive information and should never be committed to version control
- OAuth tokens are refreshed automatically by the Google API client

## Troubleshooting

### "Not authenticated" error
- Make sure you've completed the Gmail authentication process
- Check that `token.json` exists in the project root
- Try re-authenticating by deleting `token.json` and following step 5 again

### Backend server not connecting
- Ensure the backend server is running on port 3001
- Check that `VITE_API_URL` in `.env` matches your backend URL
- Verify no other application is using port 3001

### No emails showing
- Check the browser console for errors
- Verify your Gmail account has unread emails
- Ensure the Gmail API is enabled in Google Cloud Console

## License

This project is for personal use only.
