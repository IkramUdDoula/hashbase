// Netlify API service for fetching deploys
// This will run in the browser, so we'll use a backend proxy approach

import { getSecret, SECRET_KEYS, hasSecret } from './secretsService';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Helper to get Netlify credentials headers
function getNetlifyHeaders() {
  const headers = {
    'Content-Type': 'application/json',
  };
  
  // Add access token from localStorage if available
  const accessToken = getSecret(SECRET_KEYS.NETLIFY_ACCESS_TOKEN);
  
  if (accessToken) {
    headers['X-Netlify-Access-Token'] = accessToken;
  }
  
  return headers;
}

export async function checkNetlifyStatus() {
  try {
    // Only check localStorage - no fallback to server .env
    return hasSecret(SECRET_KEYS.NETLIFY_ACCESS_TOKEN);
  } catch (error) {
    console.error('Error checking Netlify status:', error);
    return false;
  }
}

export async function fetchNetlifyDeploys() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/netlify/deploys`, {
      headers: getNetlifyHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch deploys: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.deploys || [];
  } catch (error) {
    console.error('Error fetching Netlify deploys:', error);
    throw error;
  }
}

export function getNetlifyDeployUrl(deployId, siteId) {
  return `https://app.netlify.com/sites/${siteId}/deploys/${deployId}`;
}

export function getNetlifySiteUrl(siteId) {
  return `https://app.netlify.com/sites/${siteId}`;
}
