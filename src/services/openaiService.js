// OpenAI API service for fetching usage statistics and billing information
import { getSecret, SECRET_KEYS } from './secretsService';

const OPENAI_API_BASE = 'https://api.openai.com/v1';

/**
 * Check if OpenAI is configured (regular API key for AI Chat)
 * @returns {boolean}
 */
export function isOpenAIConfigured() {
  const token = getSecret(SECRET_KEYS.OPENAI_API_KEY);
  return !!token;
}

/**
 * Check if OpenAI Admin key is configured (for usage/cost tracking)
 * @returns {boolean}
 */
export function isOpenAIAdminConfigured() {
  const token = getSecret(SECRET_KEYS.OPENAI_ADMIN_KEY);
  return !!token;
}

/**
 * Get OpenAI settings from localStorage
 * @returns {Object} Settings object
 */
export function getOpenAISettings() {
  try {
    const saved = localStorage.getItem('openai_widget_settings');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Failed to load OpenAI settings:', e);
  }
  
  return {
    autoRefresh: true,
    refreshInterval: 30, // minutes
    dataTimeline: 30, // days
  };
}

/**
 * Save OpenAI settings to localStorage
 * @param {Object} settings - Settings object
 */
export function saveOpenAISettings(settings) {
  try {
    localStorage.setItem('openai_widget_settings', JSON.stringify(settings));
  } catch (e) {
    console.error('Failed to save OpenAI settings:', e);
  }
}

/**
 * Fetch current usage statistics from OpenAI
 * Note: Requires an Admin API key (not a regular API key)
 * Get Admin keys from: https://platform.openai.com/settings/organization/admin-keys
 * @param {number} daysAgo - Number of days to fetch (default: 30)
 * @returns {Promise<Object>} Usage data
 */
export async function fetchUsageStats(daysAgo = 30) {
  const token = getSecret(SECRET_KEYS.OPENAI_ADMIN_KEY);
  
  if (!token) {
    throw new Error('OpenAI Admin API key not configured. Please add OPENAI_ADMIN_KEY in Settings → Secrets.');
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    // Calculate start time based on days ago
    const startTime = Math.floor(Date.now() / 1000) - (daysAgo * 24 * 60 * 60);
    
    // Fetch usage data for completions
    // Note: limit=31 is the maximum for bucket_width=1d (daily buckets)
    const response = await fetch(
      `${OPENAI_API_BASE}/organization/usage/completions?start_time=${startTime}&bucket_width=1d&limit=31`,
      { headers }
    );

    if (!response.ok) {
      // Try to get error details from response
      let errorDetail = '';
      try {
        const errorData = await response.json();
        errorDetail = errorData.error?.message || JSON.stringify(errorData);
      } catch (e) {
        errorDetail = await response.text();
      }
      
      if (response.status === 401) {
        throw new Error('Invalid OpenAI API key. Please check your credentials.');
      }
      if (response.status === 403) {
        throw new Error('Admin API key required. Regular API keys cannot access usage data. Get an Admin key from platform.openai.com/settings/organization/admin-keys');
      }
      if (response.status === 400) {
        throw new Error(`Bad request: ${errorDetail}`);
      }
      throw new Error(`OpenAI API error (${response.status}): ${errorDetail}`);
    }

    const data = await response.json();
    
    // Debug: Log the raw response
    console.log('OpenAI Usage API Response:', data);
    const bucketWithData = data.data?.find(b => b.results?.length > 0);
    console.log('First bucket with data:', bucketWithData);
    console.log('Sample result (full):', JSON.stringify(bucketWithData?.results?.[0], null, 2));
    
    return processUsageData(data);
  } catch (error) {
    if (error.message.includes('fetch')) {
      throw new Error('Network error. Please check your connection.');
    }
    throw error;
  }
}

/**
 * Fetch costs data from OpenAI
 * Note: Requires an Admin API key
 * @param {number} daysAgo - Number of days to fetch (default: 30)
 * @returns {Promise<Object>} Costs data
 */
export async function fetchCostsData(daysAgo = 30) {
  const token = getSecret(SECRET_KEYS.OPENAI_ADMIN_KEY);
  
  if (!token) {
    return null;
  }

  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    // Calculate start time based on days ago
    const startTime = Math.floor(Date.now() / 1000) - (daysAgo * 24 * 60 * 60);
    
    // Note: limit=31 is the maximum for bucket_width=1d (daily buckets)
    const response = await fetch(
      `${OPENAI_API_BASE}/organization/costs?start_time=${startTime}&bucket_width=1d&limit=31`,
      { headers }
    );

    if (!response.ok) {
      console.warn('Could not fetch costs data:', response.status);
      return null;
    }

    const data = await response.json();
    
    // Debug: Log the raw response
    console.log('OpenAI Costs API Response:', data);
    
    return processCostsData(data);
  } catch (error) {
    console.warn('Could not fetch costs data:', error);
    return null;
  }
}

/**
 * Fetch all OpenAI data (usage and costs)
 * @param {number} daysAgo - Number of days to fetch (default: 30)
 * @returns {Promise<Object>} Combined data
 */
export async function fetchAllOpenAIData(daysAgo = 30) {
  try {
    const [usage, costs] = await Promise.all([
      fetchUsageStats(daysAgo),
      fetchCostsData(daysAgo)
    ]);

    return {
      usage,
      costs,
      lastUpdated: new Date().toISOString()
    };
  } catch (error) {
    throw error;
  }
}

/**
 * Process raw usage data into a more usable format
 * New API format uses buckets with aggregated results
 * @param {Object} rawData - Raw API response
 * @returns {Object} Processed usage data
 */
function processUsageData(rawData) {
  if (!rawData || !rawData.data) {
    return {
      totalTokens: 0,
      dailyUsage: [],
      modelBreakdown: {},
      summary: {
        requests: 0,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0
      }
    };
  }

  const dailyUsage = [];
  const modelBreakdown = {};
  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let totalRequests = 0;

  // Process buckets (daily data)
  rawData.data.forEach(bucket => {
    const startTime = bucket.start_time * 1000; // Convert to milliseconds
    const date = new Date(startTime).toISOString().split('T')[0];
    
    let dayPromptTokens = 0;
    let dayCompletionTokens = 0;
    let dayRequests = 0;

    // Aggregate results within the bucket
    bucket.results.forEach(result => {
      const promptTokens = result.input_tokens || 0;
      const completionTokens = result.output_tokens || 0;
      const requests = result.num_model_requests || 0;
      const model = result.model || 'All Models';

      dayPromptTokens += promptTokens;
      dayCompletionTokens += completionTokens;
      dayRequests += requests;

      // Model breakdown
      if (!modelBreakdown[model]) {
        modelBreakdown[model] = {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
          requests: 0
        };
      }
      modelBreakdown[model].promptTokens += promptTokens;
      modelBreakdown[model].completionTokens += completionTokens;
      modelBreakdown[model].totalTokens += promptTokens + completionTokens;
      modelBreakdown[model].requests += requests;
    });

    const dayTotalTokens = dayPromptTokens + dayCompletionTokens;
    
    dailyUsage.push({
      date,
      promptTokens: dayPromptTokens,
      completionTokens: dayCompletionTokens,
      totalTokens: dayTotalTokens,
      requests: dayRequests
    });

    totalPromptTokens += dayPromptTokens;
    totalCompletionTokens += dayCompletionTokens;
    totalRequests += dayRequests;
  });

  const totalTokens = totalPromptTokens + totalCompletionTokens;

  return {
    totalTokens,
    dailyUsage: dailyUsage.sort((a, b) => new Date(b.date) - new Date(a.date)),
    modelBreakdown,
    summary: {
      requests: totalRequests,
      promptTokens: totalPromptTokens,
      completionTokens: totalCompletionTokens,
      totalTokens
    }
  };
}

/**
 * Process raw costs data into a more usable format
 * @param {Object} rawData - Raw API response
 * @returns {Object} Processed costs data
 */
function processCostsData(rawData) {
  if (!rawData || !rawData.data) {
    return {
      totalCost: 0,
      dailyCosts: []
    };
  }

  const dailyCosts = [];
  let totalCost = 0;

  rawData.data.forEach(bucket => {
    const startTime = bucket.start_time * 1000;
    const date = new Date(startTime).toISOString().split('T')[0];
    
    let dayCost = 0;
    bucket.results.forEach(result => {
      dayCost += result.amount?.value || 0;
    });

    dailyCosts.push({
      date,
      cost: dayCost
    });

    totalCost += dayCost;
  });

  return {
    totalCost: parseFloat(totalCost.toFixed(2)),
    dailyCosts: dailyCosts.sort((a, b) => new Date(b.date) - new Date(a.date))
  };
}

/**
 * Format currency
 * @param {number} amount - Amount in dollars
 * @returns {string} Formatted currency string
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

/**
 * Format large numbers (tokens)
 * @param {number} num - Number to format
 * @returns {string} Formatted number string
 */
export function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(2) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(2) + 'K';
  }
  return num.toString();
}
