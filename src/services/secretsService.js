// Secrets management service for storing API credentials in localStorage
// This allows users to provide their own secrets without using .env files

const SECRETS_KEY = 'hashbase_secrets';

/**
 * Get all secrets from localStorage
 * @returns {Object} Object containing all secrets
 */
export function getSecrets() {
  try {
    const stored = localStorage.getItem(SECRETS_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading secrets from localStorage:', error);
  }
  return {};
}

/**
 * Get a specific secret by key
 * @param {string} key - The secret key
 * @returns {string|null} The secret value or null if not found
 */
export function getSecret(key) {
  const secrets = getSecrets();
  return secrets[key] || null;
}

/**
 * Set a specific secret
 * @param {string} key - The secret key
 * @param {string} value - The secret value
 */
export function setSecret(key, value) {
  const secrets = getSecrets();
  secrets[key] = value;
  try {
    localStorage.setItem(SECRETS_KEY, JSON.stringify(secrets));
  } catch (error) {
    console.error('Error saving secret to localStorage:', error);
    throw error;
  }
}

/**
 * Set multiple secrets at once
 * @param {Object} newSecrets - Object containing key-value pairs of secrets
 */
export function setSecrets(newSecrets) {
  const secrets = getSecrets();
  const updated = { ...secrets, ...newSecrets };
  try {
    localStorage.setItem(SECRETS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving secrets to localStorage:', error);
    throw error;
  }
}

/**
 * Delete a specific secret
 * @param {string} key - The secret key to delete
 */
export function deleteSecret(key) {
  const secrets = getSecrets();
  delete secrets[key];
  try {
    localStorage.setItem(SECRETS_KEY, JSON.stringify(secrets));
  } catch (error) {
    console.error('Error deleting secret from localStorage:', error);
    throw error;
  }
}

/**
 * Clear all secrets
 */
export function clearSecrets() {
  try {
    localStorage.removeItem(SECRETS_KEY);
  } catch (error) {
    console.error('Error clearing secrets from localStorage:', error);
    throw error;
  }
}

/**
 * Check if a secret exists and is not empty
 * @param {string} key - The secret key
 * @returns {boolean} True if secret exists and is not empty
 */
export function hasSecret(key) {
  const value = getSecret(key);
  return value !== null && value !== undefined && value.trim() !== '';
}

// Secret key constants for easy reference
export const SECRET_KEYS = {
  NETLIFY_ACCESS_TOKEN: 'NETLIFY_ACCESS_TOKEN',
  OPENAI_API_KEY: 'OPENAI_API_KEY',
  CLAUDE_API_KEY: 'CLAUDE_API_KEY',
  TAVILY_API_KEY: 'TAVILY_API_KEY',
  GITHUB_TOKEN: 'GITHUB_TOKEN',
  POSTHOG_ACCESS_TOKEN: 'POSTHOG_ACCESS_TOKEN',
};
