// Netlify API service for fetching deploys
// This will run in the browser, so we'll use a backend proxy approach

import { getSecret, SECRET_KEYS, hasSecret } from './secretsService';

const API_BASE_URL = import.meta.env.VITE_API_URL;

if (!API_BASE_URL) {
  throw new Error('VITE_API_URL environment variable is not set');
}

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

/**
 * Fetch all Netlify sites
 * @returns {Promise<Array>} Array of site objects
 */
export async function fetchNetlifySites() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/netlify/sites`, {
      headers: getNetlifyHeaders()
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sites: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.sites || [];
  } catch (error) {
    console.error('Error fetching Netlify sites:', error);
    throw error;
  }
}

/**
 * Fetch deploys from selected sites or all sites
 * @param {Array<string>} siteIds - Array of site IDs to filter by (empty = all sites)
 * @returns {Promise<Array>} Array of deploy objects
 */
export async function fetchNetlifyDeploys(siteIds = []) {
  try {
    const url = siteIds.length > 0 
      ? `${API_BASE_URL}/api/netlify/deploys?siteIds=${siteIds.join(',')}`
      : `${API_BASE_URL}/api/netlify/deploys`;
    
    const response = await fetch(url, {
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

/**
 * Get stored site selection preferences
 * @returns {Object} Object with selectedSites array and selectAll boolean
 */
export function getSiteSelectionPreferences() {
  try {
    const stored = localStorage.getItem('netlify_site_selection');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading site selection preferences:', error);
  }
  return { selectedSites: [], selectAll: true };
}

/**
 * Save site selection preferences
 * @param {Array<string>} selectedSites - Array of selected site IDs
 * @param {boolean} selectAll - Whether to select all sites
 */
export function saveSiteSelectionPreferences(selectedSites, selectAll) {
  try {
    localStorage.setItem('netlify_site_selection', JSON.stringify({
      selectedSites,
      selectAll
    }));
  } catch (error) {
    console.error('Error saving site selection preferences:', error);
    throw error;
  }
}
