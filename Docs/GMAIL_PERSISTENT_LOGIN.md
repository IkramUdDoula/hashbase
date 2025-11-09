# Gmail Persistent Login with Automatic Token Refresh

## Overview

The Gmail widget now supports **persistent login** with automatic token refresh. Users only need to authenticate once, and the system will automatically refresh expired access tokens using the refresh token provided by Google OAuth.

## How It Works

### 1. **Initial Authentication**
- User clicks "Authenticate with Gmail" button
- OAuth flow requests `access_type: 'offline'` which provides:
  - **Access Token**: Valid for 1 hour, used for API requests
  - **Refresh Token**: Long-lived token used to get new access tokens
- Tokens are stored in `localStorage` under the key `gmail_tokens`
- Tokens are also encrypted and included in config exports for cross-device persistence

### 2. **Automatic Token Refresh**
When an access token expires (or is about to expire within 5 minutes):

**Backend (vite.config.js)**:
- `loadCredentialsFromHeader()` checks token expiry before each API call
- If expired, automatically calls `oauth2Client.refreshAccessToken()`
- Returns new credentials to the frontend via response header `x-gmail-token-refreshed`

**Frontend (gmailService.js)**:
- `handleTokenRefresh()` checks every API response for the refresh header
- Automatically updates `localStorage` with new tokens
- No user interaction required

### 3. **Token Storage**
Tokens are stored in multiple places for persistence:

1. **localStorage** (`gmail_tokens`):
   - Primary storage for active session
   - Automatically updated when tokens refresh
   
2. **Config Exports** (encrypted):
   - Tokens included in exported config files
   - Encrypted with AES-256 using `VITE_CONFIG_ENCRYPTION_KEY`
   - Allows cross-device/session persistence

## Implementation Details

### Backend Changes (vite.config.js)

#### Modified `loadCredentialsFromHeader()`:
```javascript
async function loadCredentialsFromHeader(req) {
  // Load credentials from header
  const credentials = JSON.parse(req.headers['x-gmail-token'])
  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials(credentials)
  
  // Check if token expired or expiring soon (within 5 minutes)
  if (expiryDate && (now >= expiryDate - fiveMinutes)) {
    // Refresh the token automatically
    const { credentials: newCredentials } = await oauth2Client.refreshAccessToken()
    return { oauth2Client, newCredentials }
  }
  
  return { oauth2Client, newCredentials: null }
}
```

#### Updated API Endpoints:
All Gmail API endpoints now:
1. Use `await loadCredentialsFromHeader(req)` (async)
2. Return refreshed tokens via response header if refreshed
3. Handle token refresh failures gracefully

Endpoints updated:
- `GET /api/auth/status`
- `GET /api/gmail/unread`
- `GET /api/gmail/email/:messageId`
- `POST /api/gmail/mark-read`
- `GET /api/gmail/attachment/:messageId/:attachmentId`

### Frontend Changes (gmailService.js)

#### New `handleTokenRefresh()` Function:
```javascript
function handleTokenRefresh(response) {
  const refreshedToken = response.headers.get('x-gmail-token-refreshed');
  if (refreshedToken) {
    localStorage.setItem(GMAIL_TOKEN_KEY, refreshedToken);
    console.log('✅ Gmail: New token saved to localStorage');
  }
}
```

#### Updated API Functions:
All API functions now call `handleTokenRefresh(response)` after successful requests:
- `checkAuthStatus()`
- `fetchUnreadEmails()`
- `fetchEmailDetails()`
- `markAsRead()`
- `downloadAttachment()`

## User Experience

### Before (Without Persistent Login):
- ❌ User had to re-authenticate every hour when access token expired
- ❌ Widget would show "Not authenticated" error
- ❌ Required manual re-login frequently

### After (With Persistent Login):
- ✅ User authenticates **once**
- ✅ Tokens automatically refresh in the background
- ✅ Seamless experience - no interruptions
- ✅ Works across browser sessions (via localStorage)
- ✅ Works across devices (via encrypted config exports)

## Token Lifecycle

```
User Authenticates
       ↓
Receive Access Token (1hr) + Refresh Token (long-lived)
       ↓
Store in localStorage
       ↓
[After ~55 minutes]
       ↓
Backend detects token expiring soon
       ↓
Backend calls Google OAuth to refresh
       ↓
New Access Token received
       ↓
Sent to frontend via response header
       ↓
Frontend updates localStorage
       ↓
[Cycle repeats automatically]
```

## Security Considerations

1. **Refresh Token Security**:
   - Stored in localStorage (client-side)
   - Encrypted in config exports
   - Never exposed in logs or console (except debug mode)

2. **Token Expiry Handling**:
   - Tokens checked before expiry (5-minute buffer)
   - Failed refresh attempts force re-authentication
   - Graceful error handling prevents app crashes

3. **HTTPS Required**:
   - OAuth requires HTTPS in production
   - Tokens transmitted securely

## Configuration

### Environment Variables (.env):
```bash
# Gmail OAuth Credentials
GMAIL_CLIENT_ID=your_client_id_here
GMAIL_CLIENT_SECRET=your_client_secret_here
GMAIL_REDIRECT_URI=http://localhost:5000/oauth2callback

# Config Encryption (for token persistence)
VITE_CONFIG_ENCRYPTION_KEY=your_64_character_hex_key_here
```

### Google Cloud Console Setup:
1. Enable Gmail API
2. Create OAuth 2.0 credentials
3. Add authorized redirect URI: `http://localhost:5000/oauth2callback`
4. Ensure scopes include:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/gmail.modify`

## Troubleshooting

### "No refresh token is set" Error:
**Symptoms**: Console shows repeated errors:
```
🔄 Gmail: Access token expired or expiring soon, refreshing...
❌ Gmail: Failed to refresh token: No refresh token is set.
```

**Root Cause**: Google OAuth doesn't return a refresh token if the user has already granted access previously.

**Solution**:
1. **Revoke existing access** at: https://myaccount.google.com/permissions
2. Find "Hashbase" or your app name in the list
3. Click "Remove Access"
4. **Re-authenticate** in the Gmail widget
5. You should now receive a refresh token

**Why this happens**: 
- Google only provides a refresh token on the **first** authorization
- Subsequent authentications reuse the existing grant without returning a new refresh token
- Adding `prompt: 'consent'` forces the consent screen, which should return a refresh token

**Prevention**: The code now includes `prompt: 'consent'` to force Google to return refresh tokens on every authentication.

### Token Refresh Fails:
**Symptoms**: User gets logged out unexpectedly

**Possible Causes**:
1. Refresh token revoked by user in Google Account settings
2. OAuth credentials changed/invalid
3. Network issues during refresh
4. No refresh token was stored (see above)

**Solution**: 
1. Check if refresh token exists in localStorage
2. If missing, revoke access and re-authenticate
3. If present, check OAuth credentials in `.env`

### Tokens Not Persisting:
**Symptoms**: User has to login every session

**Possible Causes**:
1. localStorage blocked by browser
2. Incognito/private browsing mode
3. Browser clearing localStorage

**Solution**: Check browser settings, use normal browsing mode

### Console Logs:
Enable debug logging to see token refresh in action:
```
🔄 Gmail: Access token expired or expiring soon, refreshing...
✅ Gmail: Token refreshed successfully
🔄 Gmail: Token was refreshed by server, updating localStorage
✅ Gmail: New token saved to localStorage
```

## Testing

### Manual Testing:
1. Authenticate with Gmail
2. Wait 55+ minutes (or manually expire token in localStorage)
3. Trigger any Gmail API call (fetch emails, open email, etc.)
4. Check console for refresh logs
5. Verify no re-authentication required

### Simulating Token Expiry:
```javascript
// In browser console
const tokens = JSON.parse(localStorage.getItem('gmail_tokens'));
tokens.expiry_date = Date.now() - 1000; // Set to past
localStorage.setItem('gmail_tokens', JSON.stringify(tokens));
// Now trigger any Gmail action - should auto-refresh
```

## Future Enhancements

Potential improvements:
1. **Proactive Refresh**: Refresh tokens before they expire (background job)
2. **Token Health Check**: Periodic validation of refresh token validity
3. **Multi-Account Support**: Handle multiple Gmail accounts
4. **Offline Mode**: Cache emails for offline access
5. **Token Revocation UI**: Allow users to manually revoke tokens

## Related Files

- **Backend**: `vite.config.js` - OAuth and token refresh logic
- **Frontend Service**: `src/services/gmailService.js` - API calls and token handling
- **Widget**: `src/components/widgets/Gmail/UnreadEmailWidgetV2.jsx` - UI component
- **Explorer**: `src/components/widgets/Gmail/GmailExplorer.jsx` - Email viewer
- **Config**: `.env.example` - Environment variable template

## References

- [Google OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Gmail API Reference](https://developers.google.com/gmail/api/reference/rest)
- [OAuth 2.0 Refresh Tokens](https://oauth.net/2/refresh-tokens/)
