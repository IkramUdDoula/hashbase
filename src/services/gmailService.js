// Gmail API service for fetching unread emails
// Tokens are stored in localStorage and sent via headers

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
    
    const data = await response.json();
    return data.emails || [];
  } catch (error) {
    console.error('Error fetching unread emails:', error);
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
    
    return await response.json();
  } catch (error) {
    console.error('Error marking email as read:', error);
    throw error;
  }
}

export function getGmailUrl(messageId) {
  return `https://mail.google.com/mail/u/0/#inbox/${messageId}`;
}
