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
    localStorage.setItem(GMAIL_TOKEN_KEY, token);
    console.log('✅ Gmail token saved to localStorage (will be encrypted in config exports)');
    return true;
  } catch (error) {
    console.error('Error saving Gmail token:', error);
    return false;
  }
}

// Clear Gmail token from localStorage
export function clearGmailToken() {
  try {
    localStorage.removeItem(GMAIL_TOKEN_KEY);
    console.log('🗑️ Gmail token cleared from localStorage');
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
function handleTokenRefresh(response) {
  try {
    const refreshedToken = response.headers.get('x-gmail-token-refreshed');
    if (refreshedToken) {
      console.log('🔄 Gmail: Token was refreshed by server, updating localStorage');
      localStorage.setItem(GMAIL_TOKEN_KEY, refreshedToken);
      console.log('✅ Gmail: New token saved to localStorage');
    }
  } catch (error) {
    console.error('Error handling token refresh:', error);
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
    const response = await fetch(`${API_BASE_URL}/api/gmail/email/${messageId}`, {
      headers: getHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch email details: ${response.statusText}`);
    }
    
    // Check for token refresh
    handleTokenRefresh(response);
    
    const data = await response.json();
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
