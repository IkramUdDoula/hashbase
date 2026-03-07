# Gmail Token Persistence Fix

## Problem
Previously, Gmail tokens were only stored in browser localStorage, which meant:
- Tokens were lost when clearing browser cache
- No server-side persistence across restarts
- Users had to re-authenticate frequently

## Solution
Implemented dual-layer token storage:

### 1. Client-Side (Browser localStorage)
- Tokens stored in `localStorage` with key `gmail_tokens`
- Used for immediate access by the frontend
- Persists across page refreshes

### 2. Server-Side (File Storage)
- Tokens stored in `.gmail-tokens.json` file
- Persists across server restarts
- Automatically loaded when client doesn't provide tokens
- Excluded from git via `.gitignore`

## How It Works

### Authentication Flow
1. User clicks "Authenticate with Gmail"
2. Redirected to Google OAuth consent screen
3. After approval, redirected to `/oauth2callback`
4. Server receives tokens from Google
5. Tokens saved to BOTH:
   - Browser localStorage (via inline script)
   - Server file storage (`.gmail-tokens.json`)
6. User redirected back to app

### Token Refresh Flow
1. Client sends request with token in `x-gmail-token` header
2. Server checks if token is expiring (within 5 minutes)
3. If expiring, server refreshes using refresh token
4. New tokens saved to file storage
5. New tokens returned to client to update localStorage

### Fallback Flow
1. Client sends request WITHOUT token header
2. Server loads tokens from `.gmail-tokens.json`
3. Server uses file-stored tokens for the request
4. This allows the app to work even if localStorage is cleared

## Important: Getting a Refresh Token

Google only returns a refresh token on the FIRST authorization. If you've authorized before, you'll see:
```
⚠️ WARNING: No refresh token received from Google!
```

### To Fix This:
1. Go to https://myaccount.google.com/permissions
2. Find your app in the list
3. Click "Remove access"
4. Return to your app and authenticate again
5. You should now see: `Refresh token: Present ✅`

Without a refresh token, access tokens expire in 1 hour and you'll need to re-authenticate.

## Files Modified

### `vite.config.js`
- Added `loadTokensFromFile()` - Load tokens from file
- Added `saveTokensToFile()` - Save tokens to file
- Added `clearTokensFromFile()` - Clear tokens from file
- Modified `loadCredentialsFromHeader()` - Fall back to file storage
- Modified OAuth callback - Save tokens to file
- Added `/api/auth/logout` endpoint - Clear server-side tokens

### `src/services/gmailService.js`
- Modified `clearGmailToken()` - Now also clears server-side tokens

### `.gitignore`
- Added `.gmail-tokens.json` to prevent committing sensitive tokens

## Security Notes

1. **Never commit `.gmail-tokens.json`** - It contains sensitive OAuth tokens
2. **File permissions** - The token file is only readable by the server process
3. **Encryption** - Consider encrypting the token file for production use
4. **Token rotation** - Tokens are automatically refreshed before expiration

## Testing

1. Authenticate with Gmail
2. Verify you see: `💾 Gmail: Tokens saved to file storage`
3. Restart the server
4. Verify you see: `📂 Gmail: Loaded tokens from file storage`
5. Gmail widget should work without re-authentication

## Troubleshooting

### "No refresh token received"
- Revoke access at https://myaccount.google.com/permissions
- Re-authenticate to get a fresh refresh token

### "Token expired" after server restart
- Check if `.gmail-tokens.json` exists
- Check if the file contains a `refresh_token` field
- If missing, you need to re-authenticate with a refresh token

### Tokens not persisting
- Check file permissions on `.gmail-tokens.json`
- Check server logs for file write errors
- Ensure the server has write access to the project directory
