/**
 * Configuration Export/Import Service
 * Handles exporting and importing the entire dashboard configuration
 * including secrets, widget preferences, canvas layout, and other settings
 * 
 * Security: API secrets are encrypted using AES-256-GCM with a key from .env
 */

import { getSecrets } from './secretsService';
import { getWidgetPreferences } from './widgetRegistry';

const CONFIG_VERSION = '1.0.0';

/**
 * Get encryption key from environment variable
 * @returns {Uint8Array|null} Encryption key or null if not configured
 */
function getEncryptionKey() {
  const keyHex = import.meta.env.VITE_CONFIG_ENCRYPTION_KEY;
  
  console.log('🔍 Checking encryption key:', {
    isDefined: !!keyHex,
    isPlaceholder: keyHex === 'your_32_byte_hex_key_here',
    length: keyHex ? keyHex.length : 0
  });
  
  if (!keyHex || keyHex === 'your_32_byte_hex_key_here') {
    console.warn('⚠️ VITE_CONFIG_ENCRYPTION_KEY not configured. Secrets will not be encrypted.');
    console.warn('   Run: node generate-encryption-key.js');
    console.warn('   Then add the key to your .env file and restart the dev server.');
    return null;
  }
  
  // Convert hex string to Uint8Array
  const keyBytes = new Uint8Array(keyHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
  
  if (keyBytes.length !== 32) {
    console.error('❌ VITE_CONFIG_ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
    console.error(`   Current length: ${keyBytes.length} bytes (${keyHex.length} hex characters)`);
    return null;
  }
  
  console.log('✅ Encryption key loaded successfully');
  return keyBytes;
}

/**
 * Encrypt data using AES-GCM with the configured encryption key
 * @param {string} data - Data to encrypt
 * @returns {Promise<{encrypted: string, iv: string}>}
 */
async function encryptData(data) {
  const keyBytes = getEncryptionKey();
  if (!keyBytes) {
    throw new Error('Encryption key not configured');
  }
  
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  
  // Import the encryption key
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );
  
  // Generate a random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt the data
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    dataBuffer
  );
  
  // Convert to base64 for storage
  return {
    encrypted: btoa(String.fromCharCode(...new Uint8Array(encryptedBuffer))),
    iv: btoa(String.fromCharCode(...iv))
  };
}

/**
 * Decrypt data using AES-GCM with the configured encryption key
 * @param {string} encryptedData - Base64 encoded encrypted data
 * @param {string} ivBase64 - Base64 encoded IV
 * @returns {Promise<string>}
 */
async function decryptData(encryptedData, ivBase64) {
  const keyBytes = getEncryptionKey();
  if (!keyBytes) {
    throw new Error('Encryption key not configured');
  }
  
  const decoder = new TextDecoder();
  
  // Convert from base64
  const encrypted = Uint8Array.from(atob(encryptedData), c => c.charCodeAt(0));
  const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
  
  // Import the encryption key
  const key = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );
  
  // Decrypt the data
  const decryptedBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    encrypted
  );
  
  return decoder.decode(decryptedBuffer);
}

/**
 * Get all localStorage keys related to the dashboard
 * @returns {string[]} Array of localStorage keys
 */
function getDashboardKeys() {
  return [
    'hashbase_secrets',
    'hashbase_widget_preferences',
    'widgetLayout',
    'widgetRowSpans',
    'widgetLayoutConfig',
    'hashbase-theme',  // Theme preference (light/dark mode)
    // Note: gmail_tokens excluded - managed by .env file OAuth flow
    // AI Chat widget related keys
    'ai_chat_conversations',
    'ai_chat_current_conversation',
    'ai_chat_settings',
    // News widget settings
    'news_widget_country',
    'news_widget_topic',
    // GitHub widget settings
    'github_widget_owner',
    'github_widget_repo',
    // Checklist widget data
    'checklistItems',
    'checklistSettings',
    // Timer widget data
    'timerMode',
    'stopwatchTime',
    'stopwatchLaps',
    'countdownInitial',
  ];
}

/**
 * Export the entire dashboard configuration with automatic encryption
 * @returns {Promise<Object>} Configuration object with all settings
 */
export async function exportConfig() {
  const hasEncryptionKey = getEncryptionKey() !== null;
  
  const config = {
    version: CONFIG_VERSION,
    exportDate: new Date().toISOString(),
    encrypted: hasEncryptionKey,
    data: {}
  };

  // Collect all relevant localStorage data
  const keys = getDashboardKeys();
  const secretsData = {};
  const regularData = {};
  
  keys.forEach(key => {
    const value = localStorage.getItem(key);
    if (value !== null) {
      try {
        const parsed = JSON.parse(value);
        // Separate secrets from other data
        if (key === 'hashbase_secrets') {
          secretsData[key] = parsed;
        } else {
          regularData[key] = parsed;
        }
      } catch (e) {
        regularData[key] = value;
      }
    }
  });

  // Encrypt the secrets if encryption key is configured
  if (hasEncryptionKey && Object.keys(secretsData).length > 0) {
    try {
      const secretsJson = JSON.stringify(secretsData);
      const encryptedSecrets = await encryptData(secretsJson);
      config.data.encrypted_secrets = encryptedSecrets;
      console.log('🔐 Secrets encrypted with .env key');
    } catch (error) {
      console.error('❌ Failed to encrypt secrets:', error);
      // Fall back to unencrypted if encryption fails
      Object.assign(config.data, secretsData);
      config.encrypted = false;
    }
  } else {
    // No encryption key configured, include secrets unencrypted
    Object.assign(config.data, secretsData);
    if (!hasEncryptionKey) {
      console.warn('⚠️ Exporting secrets unencrypted. Configure VITE_CONFIG_ENCRYPTION_KEY in .env for security.');
    }
  }
  
  // Add regular data (not encrypted)
  Object.assign(config.data, regularData);

  console.log('📦 Config exported:', {
    version: config.version,
    keys: Object.keys(config.data).length,
    encrypted: config.encrypted,
    exportDate: config.exportDate
  });

  return config;
}

/**
 * Import dashboard configuration from a config object with automatic decryption
 * @param {Object} config - Configuration object to import
 * @returns {Promise<{success: boolean, message: string, imported: number, errors: string[]}>}
 */
export async function importConfig(config) {
  const result = {
    success: false,
    message: '',
    imported: 0,
    errors: []
  };

  // Validate config structure
  if (!config || typeof config !== 'object') {
    result.message = 'Invalid configuration format';
    return result;
  }

  if (!config.version || !config.data) {
    result.message = 'Configuration missing required fields (version, data)';
    return result;
  }

  // Check if config is encrypted but no encryption key configured
  if (config.encrypted && !getEncryptionKey()) {
    result.message = 'Configuration is encrypted but VITE_CONFIG_ENCRYPTION_KEY not configured in .env';
    return result;
  }

  // Version compatibility check (for future use)
  if (config.version !== CONFIG_VERSION) {
    console.warn(`⚠️ Config version mismatch: ${config.version} vs ${CONFIG_VERSION}`);
    // For now, we'll still try to import, but log a warning
  }

  // Decrypt secrets if encrypted
  if (config.encrypted && config.data.encrypted_secrets) {
    try {
      const { encrypted, iv } = config.data.encrypted_secrets;
      const decryptedJson = await decryptData(encrypted, iv);
      const secretsData = JSON.parse(decryptedJson);
      
      // Import decrypted secrets
      Object.entries(secretsData).forEach(([key, value]) => {
        try {
          const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
          localStorage.setItem(key, stringValue);
          result.imported++;
          console.log(`✅ Imported (decrypted): ${key}`);
        } catch (error) {
          const errorMsg = `Failed to import ${key}: ${error.message}`;
          result.errors.push(errorMsg);
          console.error(`❌ ${errorMsg}`);
        }
      });
      console.log('🔓 Secrets decrypted and imported');
    } catch (error) {
      result.message = 'Failed to decrypt secrets. Encryption key mismatch?';
      result.errors.push(error.message);
      console.error('❌ Decryption failed:', error);
      return result;
    }
  }

  // Import regular (non-encrypted) data
  Object.entries(config.data).forEach(([key, value]) => {
    // Skip the encrypted_secrets key as it's already processed
    if (key === 'encrypted_secrets') return;
    
    try {
      const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, stringValue);
      result.imported++;
      console.log(`✅ Imported: ${key}`);
    } catch (error) {
      const errorMsg = `Failed to import ${key}: ${error.message}`;
      result.errors.push(errorMsg);
      console.error(`❌ ${errorMsg}`);
    }
  });

  result.success = result.imported > 0;
  result.message = result.success
    ? `Successfully imported ${result.imported} settings`
    : 'Failed to import configuration';

  if (result.errors.length > 0) {
    result.message += ` (${result.errors.length} errors)`;
  }

  console.log('📥 Config import result:', result);

  return result;
}

/**
 * Download configuration as a JSON file with automatic encryption
 * @param {string} filename - Optional filename (default: hashbase-config-YYYY-MM-DD.json)
 * @returns {Promise<void>}
 */
export async function downloadConfig(filename = null) {
  const config = await exportConfig();
  
  // Generate filename if not provided
  if (!filename) {
    const date = new Date().toISOString().split('T')[0];
    filename = `hashbase-config-${date}.json`;
  }

  // Create blob and download
  const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  console.log(`💾 Config downloaded as: ${filename} (encrypted: ${config.encrypted})`);
}

/**
 * Upload and import configuration from a file with automatic decryption
 * @returns {Promise<{success: boolean, message: string, imported: number, errors: string[], encrypted: boolean}>}
 */
export function uploadConfig() {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) {
        reject(new Error('No file selected'));
        return;
      }

      try {
        const text = await file.text();
        const config = JSON.parse(text);
        const result = await importConfig(config);
        result.encrypted = config.encrypted || false;
        resolve(result);
      } catch (error) {
        reject(new Error(`Failed to read config file: ${error.message}`));
      }
    };

    input.oncancel = () => {
      reject(new Error('File selection cancelled'));
    };

    input.click();
  });
}

/**
 * Get a summary of the current configuration
 * @returns {Object} Summary of current config
 */
export function getConfigSummary() {
  const secrets = getSecrets();
  const widgetPrefs = getWidgetPreferences();
  const layout = localStorage.getItem('widgetLayout');
  const aiConversations = localStorage.getItem('ai_chat_conversations');

  return {
    secretsCount: Object.keys(secrets).filter(k => secrets[k]).length,
    widgetPrefsCount: Object.keys(widgetPrefs).length,
    hasLayout: !!layout,
    aiConversationsCount: aiConversations ? JSON.parse(aiConversations).length : 0
  };
}
