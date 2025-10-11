// News API service for fetching latest news
// Uses NewsAPI.org for news data

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Fetch top headlines based on country and category
 * @param {string} country - Country code (e.g., 'us', 'gb', 'in')
 * @param {string} category - Category (e.g., 'general', 'business', 'technology', 'sports', 'entertainment', 'health', 'science')
 * @returns {Promise<Array>} Array of news articles
 */
export async function fetchNews(country = 'us', category = 'general') {
  try {
    const response = await fetch(`${API_BASE_URL}/api/news?country=${country}&category=${category}`);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to fetch news: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.articles || [];
  } catch (error) {
    console.error('Error fetching news:', error);
    throw error;
  }
}

/**
 * Check if NewsAPI is configured
 * @returns {Promise<boolean>} True if configured
 */
export async function checkNewsApiStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/news/status`);
    
    if (!response.ok) {
      return false;
    }
    
    const data = await response.json();
    return data.configured || false;
  } catch (error) {
    console.error('Error checking NewsAPI status:', error);
    return false;
  }
}

// Available countries for news
export const NEWS_COUNTRIES = [
  { code: 'bd', name: 'Bangladesh' },
  { code: 'us', name: 'United States' },
  { code: 'gb', name: 'United Kingdom' },
  { code: 'ca', name: 'Canada' },
  { code: 'au', name: 'Australia' },
  { code: 'in', name: 'India' },
  { code: 'de', name: 'Germany' },
  { code: 'fr', name: 'France' },
  { code: 'jp', name: 'Japan' },
  { code: 'cn', name: 'China' },
  { code: 'br', name: 'Brazil' },
  { code: 'mx', name: 'Mexico' },
  { code: 'it', name: 'Italy' },
  { code: 'es', name: 'Spain' },
  { code: 'ru', name: 'Russia' },
  { code: 'kr', name: 'South Korea' },
  { code: 'nl', name: 'Netherlands' },
  { code: 'se', name: 'Sweden' },
  { code: 'no', name: 'Norway' },
  { code: 'ch', name: 'Switzerland' },
  { code: 'sg', name: 'Singapore' },
];

// Available categories for news
export const NEWS_CATEGORIES = [
  { value: 'general', label: 'General' },
  { value: 'business', label: 'Business' },
  { value: 'technology', label: 'Technology' },
  { value: 'entertainment', label: 'Entertainment' },
  { value: 'sports', label: 'Sports' },
  { value: 'science', label: 'Science' },
  { value: 'health', label: 'Health' },
];
