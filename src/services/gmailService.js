// Gmail API service for fetching unread emails
// This will run in the browser, so we'll use a backend proxy approach

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

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
    const response = await fetch(`${API_BASE_URL}/api/auth/status`);
    
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
    const response = await fetch(`${API_BASE_URL}/api/gmail/unread`);
    
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
      headers: {
        'Content-Type': 'application/json',
      },
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
