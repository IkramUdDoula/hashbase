# Gmail OAuth Token Management - Fixed

## Problem
Gmail OAuth tokens were expiring monthly with `invalid_grant` errors, requiring users to re-authenticate frequently.

## Root Causes

1. **Forced Consent Screen**: Using `prompt: 'consent'` forced Google to show the consent screen every time, which can cause token issues
2. **Missing Refresh Token Preservation**: When Google refreshes tokens, it doesn't always return a new refresh token - we need to preserve the existing one
3. **No Graceful Error Handling**: When refresh failed, the app didn't properly notify the user or clear invalid tokens

## Solutions Implemented

### 1. Changed OAuth Prompt Strategy
**Before:**
```javascript
prompt: 'consent' // Force consent screen to get refresh token
```

**After:**
```javascript
prompt: 'select_account' // Allow account selection without forcing re-consent
```

This prevents unnecessary token invalidation while still allowing users to choose accounts.

### 2. Preserve Refresh Tokens
**Added logic to preserve refresh tokens:**
```javascript
// Preserve the refresh token if not returned (Google doesn't always return it)
if (!newCredentials.refresh_token && credentials.refresh_token) {
  newCredentials.refresh_token = credentials.refresh_token
}
```

### 3. Graceful Error Handling
**Backend now returns structured error info:**
```javascript
if (result.error === 'REFRESH_FAILED') {
  return res.status(401).json({ 
    error: 'Token refresh failed',
    message: result.message,
    requiresReauth: true
  })
}
```

**Frontend automatically clears invalid tokens:**
```javascript
// If re-authentication is required, clear the token
if (data.requiresReauth) {
  console.log('⚠️ Gmail: Re-authentication required, clearing token');
  clearGmailToken();
  return false;
}
```

## How It Works Now

1. **Normal Operation**: Access tokens are automatically refreshed every ~55 minutes
2. **Token Refresh**: Refresh tokens are preserved across refreshes
3. **Refresh Failure**: If refresh fails (invalid_grant), the system:
   - Logs the error clearly
   - Returns `requiresReauth: true` flag
   - Frontend automatically clears the invalid token
   - User sees "Authenticate with Gmail" button
   - User clicks once to re-authenticate

## When Re-authentication Is Still Needed

Refresh tokens can still expire in these cases:
- **6 months of inactivity**: Google expires unused refresh tokens
- **User revokes access**: Via Google account settings
- **Token limit exceeded**: Google limits 50 refresh tokens per user per OAuth client
- **Password change**: Some security events invalidate tokens

## User Experience Improvements

- No more monthly re-authentication for active users
- Clear error messages when re-auth is needed
- One-click re-authentication process
- Automatic token cleanup when invalid

## Testing

To test the fix:
1. Use the app normally - tokens should refresh automatically
2. To simulate token expiry, manually corrupt the token in localStorage
3. The app should detect the invalid token and prompt for re-authentication
4. After re-authenticating, the app should work normally again

## Monitoring

Watch for these log messages:
- `✅ Gmail: Token refreshed successfully` - Normal operation
- `❌ Gmail: Failed to refresh token: invalid_grant` - Token needs renewal
- `⚠️ Gmail: Re-authentication required, clearing token` - Auto-cleanup triggered
