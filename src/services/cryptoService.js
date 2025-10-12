/**
 * Crypto Service
 * 
 * Fetches cryptocurrency prices and data from CoinGecko API
 * CoinGecko offers a free tier with no API key required (50 calls/minute)
 * For higher rate limits, you can optionally provide an API key
 */

// Popular cryptocurrencies with their CoinGecko IDs
export const AVAILABLE_CRYPTOS = [
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum' },
  { id: 'binancecoin', symbol: 'BNB', name: 'BNB' },
  { id: 'ripple', symbol: 'XRP', name: 'XRP' },
  { id: 'cardano', symbol: 'ADA', name: 'Cardano' },
  { id: 'solana', symbol: 'SOL', name: 'Solana' },
  { id: 'polkadot', symbol: 'DOT', name: 'Polkadot' },
  { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin' },
  { id: 'matic-network', symbol: 'MATIC', name: 'Polygon' },
  { id: 'litecoin', symbol: 'LTC', name: 'Litecoin' },
  { id: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche' },
  { id: 'chainlink', symbol: 'LINK', name: 'Chainlink' },
  { id: 'uniswap', symbol: 'UNI', name: 'Uniswap' },
  { id: 'stellar', symbol: 'XLM', name: 'Stellar' },
  { id: 'cosmos', symbol: 'ATOM', name: 'Cosmos' },
];

// Supported currencies
export const SUPPORTED_CURRENCIES = [
  { code: 'usd', symbol: '$', name: 'US Dollar' },
  { code: 'bdt', symbol: '৳', name: 'Bangladeshi Taka' },
  { code: 'eur', symbol: '€', name: 'Euro' },
  { code: 'gbp', symbol: '£', name: 'British Pound' },
  { code: 'jpy', symbol: '¥', name: 'Japanese Yen' },
  { code: 'inr', symbol: '₹', name: 'Indian Rupee' },
];

// Use backend proxy to avoid CORS issues
const API_BASE = '/api/crypto';

// Cache for exchange rates (refresh every 1 hour)
let exchangeRatesCache = {
  rates: null,
  lastFetched: null,
  cacheExpiry: 60 * 60 * 1000 // 1 hour in milliseconds
};

/**
 * Fetch exchange rates from USD to other currencies
 * Uses exchangerate-api.com (free tier: 1500 requests/month)
 * @returns {Promise<Object>} Exchange rates with USD as base
 */
async function fetchExchangeRates() {
  // Check cache first
  const now = Date.now();
  if (exchangeRatesCache.rates && 
      exchangeRatesCache.lastFetched &&
      (now - exchangeRatesCache.lastFetched) < exchangeRatesCache.cacheExpiry) {
    return exchangeRatesCache.rates;
  }

  try {
    // Using exchangerate-api.com free tier (no API key required)
    const response = await fetch('https://open.er-api.com/v6/latest/USD');
    
    if (!response.ok) {
      throw new Error('Failed to fetch exchange rates');
    }

    const data = await response.json();
    
    // Cache the rates
    exchangeRatesCache = {
      rates: data.rates,
      lastFetched: now,
      cacheExpiry: 60 * 60 * 1000
    };

    return data.rates;
  } catch (error) {
    console.error('Error fetching exchange rates:', error);
    // Return fallback rates if API fails
    return {
      USD: 1,
      BDT: 110,
      EUR: 0.92,
      GBP: 0.79,
      JPY: 149,
      INR: 83
    };
  }
}

/**
 * Convert USD price to target currency
 * @param {number} usdPrice - Price in USD
 * @param {string} targetCurrency - Target currency code
 * @param {Object} exchangeRates - Exchange rates object
 * @returns {number} Converted price
 */
function convertCurrency(usdPrice, targetCurrency, exchangeRates) {
  const rate = exchangeRates[targetCurrency.toUpperCase()] || 1;
  return usdPrice * rate;
}

/**
 * Fetch cryptocurrency prices (always in USD, then convert locally)
 * @param {string[]} cryptoIds - Array of CoinGecko crypto IDs
 * @param {string} currency - Currency code (usd, bdt, etc.)
 * @returns {Promise<Object>} Price data for each crypto
 */
export async function fetchCryptoPrices(cryptoIds, currency = 'usd') {
  if (!cryptoIds || cryptoIds.length === 0) {
    return {};
  }

  try {
    const ids = cryptoIds.join(',');
    // Always fetch in USD
    const url = `${API_BASE}/prices?ids=${ids}&currency=usd`;
    
    const response = await fetch(url);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Failed to fetch crypto prices: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Get exchange rates if currency is not USD
    let exchangeRates = { USD: 1 };
    if (currency.toLowerCase() !== 'usd') {
      exchangeRates = await fetchExchangeRates();
    }
    
    // Transform data to include crypto metadata and convert prices
    const enrichedData = {};
    cryptoIds.forEach(id => {
      const crypto = AVAILABLE_CRYPTOS.find(c => c.id === id);
      if (data[id] && crypto) {
        const usdData = data[id];
        
        // Convert all USD values to target currency
        const convertedData = {
          symbol: crypto.symbol,
          name: crypto.name,
          id: crypto.id,
        };

        // Convert price
        if (usdData.usd !== undefined) {
          convertedData[currency.toLowerCase()] = currency.toLowerCase() === 'usd' 
            ? usdData.usd 
            : convertCurrency(usdData.usd, currency, exchangeRates);
        }

        // Convert 24h change (percentage stays the same)
        if (usdData.usd_24h_change !== undefined) {
          convertedData[`${currency.toLowerCase()}_24h_change`] = usdData.usd_24h_change;
        }

        // Convert market cap
        if (usdData.usd_market_cap !== undefined) {
          convertedData[`${currency.toLowerCase()}_market_cap`] = currency.toLowerCase() === 'usd'
            ? usdData.usd_market_cap
            : convertCurrency(usdData.usd_market_cap, currency, exchangeRates);
        }

        // Convert 24h volume
        if (usdData.usd_24h_vol !== undefined) {
          convertedData[`${currency.toLowerCase()}_24h_vol`] = currency.toLowerCase() === 'usd'
            ? usdData.usd_24h_vol
            : convertCurrency(usdData.usd_24h_vol, currency, exchangeRates);
        }

        enrichedData[id] = convertedData;
      }
    });

    return enrichedData;
  } catch (error) {
    console.error('Error fetching crypto prices:', error);
    throw error;
  }
}

/**
 * Get detailed crypto data including price, market cap, volume, etc.
 * Note: This function is not currently used but kept for future enhancements
 * @param {string} cryptoId - CoinGecko crypto ID
 * @param {string} currency - Currency code
 * @returns {Promise<Object>} Detailed crypto data
 */
export async function fetchCryptoDetails(cryptoId, currency = 'usd') {
  // This would require an additional backend endpoint
  // For now, we use the simpler price endpoint which provides enough data
  throw new Error('Detailed crypto data not implemented. Use fetchCryptoPrices instead.');
}

/**
 * Calculate portfolio value based on crypto prices
 * @param {Object} prices - Crypto prices from fetchCryptoPrices
 * @param {number} portfolioAmount - User's portfolio amount
 * @param {string} currency - Currency code
 * @returns {Object} Portfolio calculations
 */
export function calculatePortfolioValue(prices, portfolioAmount, currency = 'usd') {
  if (!prices || Object.keys(prices).length === 0 || !portfolioAmount) {
    return {
      currentValue: portfolioAmount || 0,
      totalChange: 0,
      totalChangePercent: 0,
    };
  }

  // Calculate average 24h change across all selected cryptos
  const cryptoIds = Object.keys(prices);
  const currencyLower = currency.toLowerCase();
  const totalChangePercent = cryptoIds.reduce((sum, id) => {
    const change = prices[id][`${currencyLower}_24h_change`] || 0;
    return sum + change;
  }, 0) / cryptoIds.length;

  // Calculate current value based on 24h change
  const changeMultiplier = 1 + (totalChangePercent / 100);
  const previousValue = portfolioAmount / changeMultiplier;
  const totalChange = portfolioAmount - previousValue;

  return {
    currentValue: portfolioAmount,
    totalChange,
    totalChangePercent,
  };
}

/**
 * Format currency value with appropriate symbol
 * @param {number} value - Value to format
 * @param {string} currencyCode - Currency code
 * @returns {string} Formatted currency string
 */
export function formatCurrency(value, currencyCode = 'usd') {
  const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode.toLowerCase());
  const symbol = currency?.symbol || '$';
  
  // Handle invalid values
  if (value === undefined || value === null || isNaN(value)) {
    return `${symbol}0.00`;
  }
  
  // Format with appropriate decimals
  const formatted = Math.abs(value).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  return `${symbol}${formatted}`;
}

/**
 * Format large numbers (market cap, volume) with K, M, B suffixes
 * @param {number} value - Value to format
 * @param {string} currencyCode - Currency code
 * @returns {string} Formatted string
 */
export function formatLargeNumber(value, currencyCode = 'usd') {
  const currency = SUPPORTED_CURRENCIES.find(c => c.code === currencyCode.toLowerCase());
  const symbol = currency?.symbol || '$';
  
  // Handle invalid values
  if (value === undefined || value === null || isNaN(value)) {
    return `${symbol}0.00`;
  }
  
  if (value >= 1e9) {
    return `${symbol}${(value / 1e9).toFixed(2)}B`;
  } else if (value >= 1e6) {
    return `${symbol}${(value / 1e6).toFixed(2)}M`;
  } else if (value >= 1e3) {
    return `${symbol}${(value / 1e3).toFixed(2)}K`;
  }
  return `${symbol}${value.toFixed(2)}`;
}

/**
 * Check if CoinGecko API is accessible
 * @returns {Promise<boolean>}
 */
export async function checkCryptoApiStatus() {
  try {
    const response = await fetch(`${API_BASE}/status`);
    if (!response.ok) {
      return false;
    }
    const data = await response.json();
    return data.operational || false;
  } catch (error) {
    console.error('CoinGecko API check failed:', error);
    return false;
  }
}
