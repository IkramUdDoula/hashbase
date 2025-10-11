const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Fetch latest news from BD24 Live RSS feed
 * @returns {Promise<Array>} Array of news articles
 */
export async function fetchBD24LiveNews() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/bd24live/news`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || 'Failed to fetch BD24 Live news');
    }
    
    const data = await response.json();
    return data.articles || [];
  } catch (error) {
    console.error('Error fetching BD24 Live news:', error);
    throw error;
  }
}

/**
 * Check if BD24 Live RSS feed is working
 * @returns {Promise<boolean>} True if feed is operational
 */
export async function checkBD24LiveStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/bd24live/status`);
    const data = await response.json();
    return data.operational || false;
  } catch (error) {
    console.error('Error checking BD24 Live status:', error);
    return false;
  }
}
