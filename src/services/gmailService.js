// Gmail API service for fetching unread emails
// Tokens are stored in localStorage and sent via headers
// Tokens are also persisted in config exports for cross-device/session persistence
// Automatic token refresh: Backend refreshes expired tokens and returns new ones via headers

const API_BASE_URL = import.meta.env.VITE_API_URL;

if (!API_BASE_URL) {
  throw new Error('VITE_API_URL environment variable is not set');
}
const GMAIL_TOKEN_KEY = 'gmail_tokens';

// Get Gmail token from localStorage
function getGmailToken() {
  try {
    const token = localStorage.getItem(GMAIL_TOKEN_KEY);
    if (token) {
      // Validate it's proper JSON
      try {
        const parsed = JSON.parse(token);
        // Log the expiry for debugging
        if (parsed.expiry_date) {
          const expiry = new Date(parsed.expiry_date);
          const now = new Date();
          const isExpired = now >= expiry;
          const timeUntilExpiry = expiry - now;
          const minutesUntilExpiry = Math.floor(timeUntilExpiry / 1000 / 60);
          
          console.log(`📋 Gmail: Reading token from localStorage`);
          console.log(`   Expiry: ${expiry.toISOString()}`);
          console.log(`   Now: ${now.toISOString()}`);
          console.log(`   Time until expiry: ${minutesUntilExpiry} minutes`);
          console.log(`   Status: ${isExpired ? '❌ EXPIRED' : '✅ Valid'}`);
          
          // If expired, clear it immediately
          if (isExpired) {
            console.log('🗑️ Gmail: Clearing expired token from localStorage');
            console.trace('   Token expired, clearing from:');
            localStorage.removeItem(GMAIL_TOKEN_KEY);
            return null;
          }
        }
      } catch (e) {
        console.error('⚠️ Gmail: Token in localStorage is not valid JSON, clearing it');
        console.trace('   Invalid JSON, clearing from:');
        localStorage.removeItem(GMAIL_TOKEN_KEY);
        return null;
      }
    }
    return token;
  } catch (error) {
    console.error('Error getting Gmail token:', error);
    return null;
  }
}

// Save Gmail token to localStorage
// This is automatically included in config exports and encrypted
export function saveGmailToken(token) {
  try {
    // Validate it's proper JSON before saving
    if (typeof token === 'string') {
      try {
        const parsed = JSON.parse(token);
        if (parsed.expiry_date) {
          console.log(`💾 Gmail: Saving token to localStorage - Expiry: ${new Date(parsed.expiry_date).toISOString()}`);
        }
      } catch (e) {
        console.error('⚠️ Gmail: Attempted to save invalid JSON token');
        return false;
      }
    }
    
    localStorage.setItem(GMAIL_TOKEN_KEY, token);
    console.log('✅ Gmail token saved to localStorage (will be encrypted in config exports)');
    return true;
  } catch (error) {
    console.error('Error saving Gmail token:', error);
    return false;
  }
}

// Clear Gmail token from localStorage
export async function clearGmailToken() {
  try {
    console.log('🗑️ Gmail: Clearing tokens from localStorage and server');
    console.trace('   Clear token called from:'); // This will show the call stack
    
    // Clear from localStorage
    localStorage.removeItem(GMAIL_TOKEN_KEY);
    
    // Clear from server-side storage
    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        console.log('✅ Gmail: Server-side tokens cleared');
      } else {
        console.warn('⚠️ Gmail: Failed to clear server-side tokens');
      }
    } catch (serverError) {
      console.warn('⚠️ Gmail: Could not reach server to clear tokens:', serverError.message);
    }
    
    return true;
  } catch (error) {
    console.error('Error clearing Gmail token:', error);
    return false;
  }
}

// Create headers with Gmail token
function getHeaders() {
  const token = getGmailToken();
  const headers = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['x-gmail-token'] = token;
  }
  return headers;
}

// Check response for refreshed token and update localStorage
// Returns true if token was refreshed, false otherwise
function handleTokenRefresh(response) {
  try {
    const refreshedToken = response.headers.get('x-gmail-token-refreshed');
    if (refreshedToken) {
      console.log('🔄 Gmail: Token was refreshed by server, updating localStorage');
      
      // Validate the refreshed token before saving
      try {
        const parsed = JSON.parse(refreshedToken);
        console.log(`   Refreshed token - has refresh_token: ${!!parsed.refresh_token ? '✅' : '❌'}`);
        
        if (parsed.expiry_date) {
          const expiry = new Date(parsed.expiry_date);
          const now = new Date();
          
          // Check if the "refreshed" token is actually expired
          if (now >= expiry) {
            console.error('❌ Gmail: Server sent an EXPIRED token in refresh header!');
            console.error(`   Expiry: ${expiry.toISOString()}, Now: ${now.toISOString()}`);
            console.error('   Ignoring this token and clearing localStorage');
            localStorage.removeItem(GMAIL_TOKEN_KEY);
            return false;
          }
          
          console.log(`💾 Gmail: Saving refreshed token - Expiry: ${expiry.toISOString()}`);
        }
        
        // CRITICAL: Check if refresh token is present
        if (!parsed.refresh_token) {
          console.error('❌ Gmail: Refreshed token is missing refresh_token field!');
          console.error('   This token will expire in 1 hour and cannot be refreshed');
          // Don't save it - keep the old one if it has a refresh token
          const currentToken = getGmailToken();
          if (currentToken) {
            try {
              const currentParsed = JSON.parse(currentToken);
              if (currentParsed.refresh_token) {
                console.log('   Preserving current token because it has a refresh_token');
                // Update only the access token and expiry, keep the refresh token
                parsed.refresh_token = currentParsed.refresh_token;
                console.log('   ✅ Merged refresh_token from current token');
                // Re-stringify with the merged refresh_token
                const mergedToken = JSON.stringify(parsed);
                localStorage.setItem(GMAIL_TOKEN_KEY, mergedToken);
                console.log('✅ Gmail: Merged token saved to localStorage');
                return true;
              }
            } catch (e) {
              console.error('   Failed to merge refresh_token:', e);
            }
          }
          console.error('   ❌ No valid current token to merge from, not saving');
          return false;
        }
      } catch (e) {
        console.error('⚠️ Gmail: Refreshed token is not valid JSON, ignoring it');
        return false;
      }
      
      const currentToken = getGmailToken();
      // Only update and log if the token actually changed
      if (currentToken !== refreshedToken) {
        localStorage.setItem(GMAIL_TOKEN_KEY, refreshedToken);
        console.log('✅ Gmail: New token saved to localStorage');
        return true; // Token was refreshed
      }
    }
    return false; // No refresh
  } catch (error) {
    console.error('Error handling token refresh:', error);
    return false;
  }
}

export async function getAuthUrl() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/auth/url`);
    
    if (!response.ok) {
      throw new Error(`Failed to get auth URL: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('Error getting auth URL:', error);
    throw error;
  }
}

export async function checkAuthStatus() {
  try {
    const token = getGmailToken();
    if (!token) {
      return false;
    }
    
    const response = await fetch(`${API_BASE_URL}/api/auth/status`, {
      headers: getHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Failed to check auth status: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    // Handle token refresh if server refreshed it
    if (data.refreshed && data.tokens) {
      console.log('🔄 Gmail: Token was refreshed during auth check');
      saveGmailToken(JSON.stringify(data.tokens));
    }
    
    // If re-authentication is required, clear the token
    if (data.requiresReauth) {
      console.log('⚠️ Gmail: Re-authentication required, clearing token');
      clearGmailToken();
      return false;
    }
    
    return data.authenticated;
  } catch (error) {
    console.error('Error checking auth status:', error);
    return false;
  }
}

export async function fetchUnreadEmails() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/gmail/unread`, {
      headers: getHeaders()
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // If re-authentication is required, clear the token and throw specific error
      if (errorData.requiresReauth) {
        console.log('⚠️ Gmail: Re-authentication required, clearing token');
        clearGmailToken();
        throw new Error('Gmail authentication expired. Please sign in again.');
      }
      
      throw new Error(`Failed to fetch emails: ${response.statusText}`);
    }
    
    // Check for token refresh
    handleTokenRefresh(response);
    
    const data = await response.json();
    return data.emails || [];
  } catch (error) {
    console.error('Error fetching unread emails:', error);
    throw error;
  }
}

export async function fetchEmailDetails(messageId) {
  try {
    console.log(`📧 Gmail: Fetching email details for message ${messageId}`);
    const token = getGmailToken();
    if (!token) {
      console.error('❌ Gmail: No token available for fetching email details');
      throw new Error('Gmail authentication required. Please sign in.');
    }
    
    const response = await fetch(`${API_BASE_URL}/api/gmail/email/${messageId}`, {
      headers: getHeaders()
    });
    
    console.log(`📧 Gmail: Email details response status: ${response.status}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Gmail: Email details fetch failed:', errorData);
      
      // If re-authentication is required, clear the token and throw specific error
      if (errorData.requiresReauth) {
        console.log('⚠️ Gmail: Re-authentication required, clearing token');
        clearGmailToken();
        throw new Error('Gmail authentication expired. Please sign in again.');
      }
      
      throw new Error(errorData.message || `Failed to fetch email details: ${response.statusText}`);
    }
    
    // Check for token refresh
    handleTokenRefresh(response);
    
    const data = await response.json();
    console.log('✅ Gmail: Email details fetched successfully');
    return data.email;
  } catch (error) {
    console.error('Error fetching email details:', error);
    throw error;
  }
}

export async function markAsRead(messageId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/gmail/mark-read`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ messageId }),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // If re-authentication is required, clear the token and throw specific error
      if (errorData.requiresReauth) {
        console.log('⚠️ Gmail: Re-authentication required, clearing token');
        clearGmailToken();
        throw new Error('Gmail authentication expired. Please sign in again.');
      }
      
      throw new Error(`Failed to mark email as read: ${response.statusText}`);
    }
    
    // Check for token refresh
    handleTokenRefresh(response);
    
    return await response.json();
  } catch (error) {
    console.error('Error marking email as read:', error);
    throw error;
  }
}

export async function downloadAttachment(messageId, attachmentId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/gmail/attachment/${messageId}/${attachmentId}`, {
      headers: getHeaders()
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      // If re-authentication is required, clear the token and throw specific error
      if (errorData.requiresReauth) {
        console.log('⚠️ Gmail: Re-authentication required, clearing token');
        clearGmailToken();
        throw new Error('Gmail authentication expired. Please sign in again.');
      }
      
      throw new Error(`Failed to download attachment: ${response.statusText}`);
    }
    
    // Check for token refresh
    handleTokenRefresh(response);
    
    return response.blob();
  } catch (error) {
    console.error('Error downloading attachment:', error);
    throw error;
  }
}

export function getGmailUrl(messageId) {
  return `https://mail.google.com/mail/u/0/#inbox/${messageId}`;
}
