// Netlify API service for fetching deploys
// This will run in the browser, so we'll use a backend proxy approach

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function checkNetlifyStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/netlify/status`);
    
    if (!response.ok) {
      throw new Error(`Failed to check Netlify status: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.configured;
  } catch (error) {
    console.error('Error checking Netlify status:', error);
    return false;
  }
}

export async function fetchNetlifyDeploys() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/netlify/deploys`);
    
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
