# Quick Fix: "No refresh token is set" Error

## 🔴 Problem
You're seeing this error repeatedly in the console:
```
🔄 Gmail: Access token expired or expiring soon, refreshing...
❌ Gmail: Failed to refresh token: No refresh token is set.
```

## ✅ Solution (2 Steps)

### Step 1: Revoke Existing Access
1. Go to: **https://myaccount.google.com/permissions**
2. Find your app (e.g., "Hashbase" or the OAuth app name)
3. Click **"Remove Access"** or **"Revoke"**

### Step 2: Re-authenticate
1. Restart your dev server (to load the updated code with `prompt: 'consent'`)
   ```bash
   npm run dev
   ```
2. In the Gmail widget, click **"Authenticate with Gmail"**
3. You'll see the Google consent screen again
4. Grant permissions
5. Check the server console - you should see:
   ```
   ✅ Gmail OAuth: Tokens received
      - Access token: Present
      - Refresh token: Present ✅
      - Expiry date: [timestamp]
   ```

## 🔍 Verify It's Fixed

### Check localStorage:
Open browser console and run:
```javascript
const tokens = JSON.parse(localStorage.getItem('gmail_tokens'));
console.log('Refresh token present:', !!tokens.refresh_token);
console.log('Access token present:', !!tokens.access_token);
console.log('Expiry date:', new Date(tokens.expiry_date).toLocaleString());
```

You should see:
```
Refresh token present: true  ✅
Access token present: true   ✅
Expiry date: [some future date]
```

### Test Token Refresh:
1. Manually expire the token:
   ```javascript
   const tokens = JSON.parse(localStorage.getItem('gmail_tokens'));
   tokens.expiry_date = Date.now() - 1000; // Set to past
   localStorage.setItem('gmail_tokens', JSON.stringify(tokens));
   ```

2. Trigger any Gmail action (fetch emails, open email, etc.)

3. Check console - you should see:
   ```
   🔄 Gmail: Access token expired or expiring soon, refreshing...
   ✅ Gmail: Token refreshed successfully
   🔄 Gmail: Token was refreshed by server, updating localStorage
   ✅ Gmail: New token saved to localStorage
   ```

## 📋 What Changed in the Code

### Before:
```javascript
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: [...]
})
```

### After:
```javascript
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent', // ← This forces Google to return refresh token
  scope: [...]
})
```

## 🎯 Why This Happens

**Google's OAuth Behavior:**
- **First authentication**: Returns both access token AND refresh token
- **Subsequent authentications**: Only returns access token (reuses existing grant)
- **With `prompt: 'consent'`**: Forces consent screen, returns refresh token every time

**The Fix:**
Adding `prompt: 'consent'` ensures you always get a refresh token, even on re-authentication.

## 🚨 If Still Not Working

### Check Your OAuth Configuration:

1. **Verify `.env` file has correct credentials:**
   ```env
   GMAIL_CLIENT_ID=your_client_id_here
   GMAIL_CLIENT_SECRET=your_client_secret_here
   GMAIL_REDIRECT_URI=http://localhost:5000/oauth2callback
   ```

2. **Verify Google Cloud Console settings:**
   - Gmail API is enabled
   - OAuth 2.0 Client ID is created
   - Redirect URI matches exactly: `http://localhost:5000/oauth2callback`
   - Application type is "Web application"

3. **Check server logs during authentication:**
   - Should show "Refresh token: Present ✅"
   - If shows "Refresh token: Missing ❌", repeat Step 1 (revoke access)

## 📞 Still Having Issues?

If the problem persists after following all steps:

1. **Clear all browser data:**
   - Clear localStorage
   - Clear cookies
   - Clear cache

2. **Restart everything:**
   ```bash
   # Stop dev server (Ctrl+C)
   # Clear node modules cache
   rm -rf node_modules/.vite
   # Restart
   npm run dev
   ```

3. **Check Google Account:**
   - Make sure you're using the correct Google account
   - Check if 2FA is interfering
   - Try with a different Google account to isolate the issue

## ✅ Success Indicators

You'll know it's working when:
- ✅ No more "No refresh token is set" errors
- ✅ Server logs show "Refresh token: Present ✅"
- ✅ localStorage contains `refresh_token` field
- ✅ Token auto-refreshes after expiry
- ✅ You stay logged in across sessions

---

**Last Updated:** 2025-11-09  
**Related:** [GMAIL_PERSISTENT_LOGIN.md](./GMAIL_PERSISTENT_LOGIN.md)
