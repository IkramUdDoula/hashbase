/**
 * Storage Service
 * Manages data persistence with support for both browser localStorage and local file system
 * Uses File System Access API for folder-based storage
 */

import { getDashboardKeys, shouldEncryptKey } from '@/lib/dashboardKeys';

const STORAGE_SETTINGS_KEY = 'hashbase_storage_settings';
const STORAGE_FILE_NAME = 'hashbase-data.json';
const HISTORY_FOLDER_NAME = 'history';

/**
 * Get storage settings from localStorage
 * @returns {Object} Storage settings
 */
export function getStorageSettings() {
  try {
    const saved = localStorage.getItem(STORAGE_SETTINGS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.error('Error reading storage settings:', error);
  }
  return {
    mode: 'browser', // 'browser' or 'folder'
    folderHandle: null,
    lastSync: null,
    autoSync: true, // Auto-sync enabled by default
    syncInterval: 30, // Sync interval in minutes (default: 30 minutes)
    saveHistory: true, // Save versioned history
    encryptData: true, // Encrypt data files
    maxHistoryVersions: 50 // Maximum number of history versions to keep (default: 50)
  };
}

/**
 * Save storage settings to localStorage
 * @param {Object} settings - Storage settings
 */
export function saveStorageSettings(settings) {
  try {
    // Don't save the folder handle directly (it's not serializable)
    const { folderHandle, ...serializableSettings } = settings;
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(serializableSettings));
  } catch (error) {
    console.error('Error saving storage settings:', error);
    throw error;
  }
}

/**
 * Check if File System Access API is supported
 * @returns {boolean}
 */
export function isFileSystemAccessSupported() {
  return 'showDirectoryPicker' in window;
}

/**
 * Request folder access from user
 * @returns {Promise<FileSystemDirectoryHandle>}
 */
export async function requestFolderAccess() {
  if (!isFileSystemAccessSupported()) {
    throw new Error('File System Access API is not supported in this browser');
  }

  try {
    const dirHandle = await window.showDirectoryPicker({
      mode: 'readwrite',
      startIn: 'documents'
    });
    return dirHandle;
  } catch (error) {
    if (error.name === 'AbortError') {
      throw new Error('Folder selection was cancelled');
    }
    throw error;
  }
}

// getDashboardKeys() is now imported from @/lib/dashboardKeys.js
// This ensures consistency across configService and storageService

/**
 * Get all localStorage data that should be synced (matching configService structure)
 * @param {boolean} encryptSecrets - Whether to encrypt secrets separately
 * @returns {Promise<Object>} All dashboard data
 */
export async function getAllDashboardData(encryptSecrets = false) {
  const hasEncryptionKey = getEncryptionKey() !== null;
  
  const config = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    encrypted: encryptSecrets && hasEncryptionKey,
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
        // Only encrypt hashbase_secrets (API keys)
        // OAuth tokens (gmail_tokens) are excluded from backups for security
        if (shouldEncryptKey(key)) {
          secretsData[key] = parsed;
        } else {
          regularData[key] = parsed;
        }
      } catch (e) {
        regularData[key] = value;
      }
    }
  });

  // Encrypt the secrets if encryption is requested and key is configured
  if (encryptSecrets && hasEncryptionKey && Object.keys(secretsData).length > 0) {
    try {
      const secretsJson = JSON.stringify(secretsData);
      const encryptedSecrets = await encryptFileData(secretsJson);
      config.data.encrypted_secrets = encryptedSecrets;
      console.log('🔐 Secrets encrypted');
    } catch (error) {
      console.error('❌ Failed to encrypt secrets:', error);
      // Fall back to unencrypted if encryption fails
      Object.assign(config.data, secretsData);
      config.encrypted = false;
    }
  } else {
    // No encryption or no key configured, include secrets unencrypted
    Object.assign(config.data, secretsData);
  }
  
  // Add regular data (not encrypted)
  Object.assign(config.data, regularData);

  return config;
}

/**
 * Get encryption key from environment variable (matching configService)
 * @returns {Uint8Array|null} Encryption key or null if not configured
 */
function getEncryptionKey() {
  const keyHex = import.meta.env.VITE_CONFIG_ENCRYPTION_KEY;
  
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
 * Encrypt data using AES-GCM (matching configService approach)
 * @param {string} data - Data to encrypt
 * @returns {Promise<{encrypted: string, iv: string}>}
 */
async function encryptFileData(data) {
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
 * Decrypt data using AES-GCM (matching configService approach)
 * @param {string} encryptedData - Base64 encoded encrypted data
 * @param {string} ivBase64 - Base64 encoded IV
 * @returns {Promise<string>}
 */
async function decryptFileData(encryptedData, ivBase64) {
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
 * Write data to file in the selected folder
 * @param {FileSystemDirectoryHandle} dirHandle - Directory handle
 * @param {Object} data - Data to write (already in config format)
 * @returns {Promise<void>}
 */
export async function writeDataToFile(dirHandle, data) {
  try {
    // Get or create the file
    const fileHandle = await dirHandle.getFileHandle(STORAGE_FILE_NAME, { create: true });
    
    // Create a writable stream
    const writable = await fileHandle.createWritable();
    
    // Write the data (data is already in the correct format from getAllDashboardData)
    await writable.write(JSON.stringify(data, null, 2));
    
    // Close the file
    await writable.close();
    
    console.log('✅ Data written to file successfully');
  } catch (error) {
    console.error('❌ Error writing data to file:', error);
    throw error;
  }
}

/**
 * Save versioned history file
 * @param {FileSystemDirectoryHandle} dirHandle - Directory handle
 * @param {Object} data - Data to save (already in config format)
 * @returns {Promise<string>} Filename of saved history
 */
export async function saveHistoryFile(dirHandle, data) {
  try {
    // Create history folder if it doesn't exist
    const historyDir = await dirHandle.getDirectoryHandle(HISTORY_FOLDER_NAME, { create: true });
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `hashbase-${timestamp}.json`;
    
    // Create the history file (data is already in the correct format)
    const fileHandle = await historyDir.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(data, null, 2));
    await writable.close();
    
    console.log(`📜 History saved: ${filename}`);
    return filename;
  } catch (error) {
    console.error('❌ Error saving history file:', error);
    throw error;
  }
}

/**
 * Read data from file in the selected folder (matching configService structure)
 * @param {FileSystemDirectoryHandle} dirHandle - Directory handle
 * @returns {Promise<Object>} Data from file
 */
export async function readDataFromFile(dirHandle) {
  try {
    // Get the file handle
    const fileHandle = await dirHandle.getFileHandle(STORAGE_FILE_NAME);
    
    // Get the file
    const file = await fileHandle.getFile();
    
    // Read the contents
    const text = await file.text();
    
    // Parse the config
    const config = JSON.parse(text);
    
    // Check if secrets are encrypted separately (matching configService)
    if (config.encrypted && config.data.encrypted_secrets) {
      console.log('🔐 Decrypting secrets...');
      const { encrypted, iv } = config.data.encrypted_secrets;
      const decryptedJson = await decryptFileData(encrypted, iv);
      const secretsData = JSON.parse(decryptedJson);
      
      // Replace encrypted_secrets with decrypted data
      delete config.data.encrypted_secrets;
      Object.assign(config.data, secretsData);
      console.log('✅ Secrets decrypted successfully');
    }
    
    console.log('✅ Data read from file successfully');
    return config;
  } catch (error) {
    if (error.name === 'NotFoundError') {
      console.log('ℹ️ Data file not found, will create on first sync');
      return null;
    }
    console.error('❌ Error reading data from file:', error);
    throw error;
  }
}

/**
 * List all history files
 * @param {FileSystemDirectoryHandle} dirHandle - Directory handle
 * @returns {Promise<Array>} List of history files with metadata
 */
export async function listHistoryFiles(dirHandle) {
  try {
    const historyDir = await dirHandle.getDirectoryHandle(HISTORY_FOLDER_NAME);
    const files = [];
    
    for await (const entry of historyDir.values()) {
      if (entry.kind === 'file' && entry.name.endsWith('.json')) {
        const fileHandle = await historyDir.getFileHandle(entry.name);
        const file = await fileHandle.getFile();
        
        files.push({
          name: entry.name,
          size: file.size,
          lastModified: new Date(file.lastModified),
          handle: fileHandle
        });
      }
    }
    
    // Sort by last modified (newest first)
    files.sort((a, b) => b.lastModified - a.lastModified);
    
    return files;
  } catch (error) {
    if (error.name === 'NotFoundError') {
      return [];
    }
    console.error('❌ Error listing history files:', error);
    throw error;
  }
}

/**
 * Read a specific history file (matching configService structure)
 * @param {FileSystemFileHandle} fileHandle - File handle
 * @returns {Promise<Object>} Data from history file
 */
export async function readHistoryFile(fileHandle) {
  try {
    const file = await fileHandle.getFile();
    const text = await file.text();
    const config = JSON.parse(text);
    
    // Check if secrets are encrypted separately (matching configService)
    if (config.encrypted && config.data.encrypted_secrets) {
      const { encrypted, iv } = config.data.encrypted_secrets;
      const decryptedJson = await decryptFileData(encrypted, iv);
      const secretsData = JSON.parse(decryptedJson);
      
      // Replace encrypted_secrets with decrypted data
      delete config.data.encrypted_secrets;
      Object.assign(config.data, secretsData);
    }
    
    return config;
  } catch (error) {
    console.error('❌ Error reading history file:', error);
    throw error;
  }
}

/**
 * Import data from file to localStorage
 * @param {Object} data - Data to import
 * @returns {Object} Import result
 */
export function importDataToLocalStorage(data) {
  const result = {
    success: false,
    imported: 0,
    errors: []
  };

  if (!data || !data.data) {
    result.errors.push('Invalid data format');
    return result;
  }

  Object.entries(data.data).forEach(([key, value]) => {
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
  return result;
}

/**
 * Sync data from localStorage to file (matching configService structure)
 * @param {FileSystemDirectoryHandle} dirHandle - Directory handle
 * @param {boolean} saveHistory - Whether to save a history version
 * @returns {Promise<Object>} Sync result
 */
export async function syncToFile(dirHandle, saveHistory = true) {
  try {
    const settings = getStorageSettings();
    const encryptSecrets = settings.encryptData !== false;
    
    // Get data in configService format
    const data = await getAllDashboardData(encryptSecrets);
    
    // Save history file if enabled
    if (saveHistory && settings.saveHistory !== false) {
      try {
        await saveHistoryFile(dirHandle, data);
      } catch (historyError) {
        console.warn('⚠️ Failed to save history, continuing with main sync:', historyError);
      }
    }
    
    // Write main data file
    await writeDataToFile(dirHandle, data);
    
    settings.lastSync = new Date().toISOString();
    settings.syncDirection = 'to-file';
    saveStorageSettings(settings);
    
    return {
      success: true,
      message: 'Data synced to file successfully',
      itemCount: Object.keys(data.data).length,
      encrypted: data.encrypted
    };
  } catch (error) {
    return {
      success: false,
      message: `Sync to file failed: ${error.message}`,
      error: error.message
    };
  }
}

/**
 * Sync data from file to localStorage
 * @param {FileSystemDirectoryHandle} dirHandle - Directory handle
 * @returns {Promise<Object>} Sync result
 */
export async function syncFromFile(dirHandle) {
  try {
    const data = await readDataFromFile(dirHandle);
    
    if (!data) {
      return {
        success: false,
        message: 'No data file found in the selected folder'
      };
    }
    
    const importResult = importDataToLocalStorage(data);
    
    const settings = getStorageSettings();
    settings.lastSync = new Date().toISOString();
    settings.syncDirection = 'from-file';
    saveStorageSettings(settings);
    
    return {
      success: importResult.success,
      message: importResult.success 
        ? `Successfully synced ${importResult.imported} items from file`
        : 'Failed to sync from file',
      imported: importResult.imported,
      errors: importResult.errors
    };
  } catch (error) {
    return {
      success: false,
      message: `Sync from file failed: ${error.message}`,
      error: error.message
    };
  }
}

/**
 * Verify folder access (check if we still have permission)
 * @param {FileSystemDirectoryHandle} dirHandle - Directory handle
 * @returns {Promise<boolean>}
 */
export async function verifyFolderAccess(dirHandle) {
  try {
    const permission = await dirHandle.queryPermission({ mode: 'readwrite' });
    if (permission === 'granted') {
      return true;
    }
    
    // Try to request permission again
    const newPermission = await dirHandle.requestPermission({ mode: 'readwrite' });
    return newPermission === 'granted';
  } catch (error) {
    console.error('Error verifying folder access:', error);
    return false;
  }
}

/**
 * Get folder name from directory handle
 * @param {FileSystemDirectoryHandle} dirHandle - Directory handle
 * @returns {string}
 */
export function getFolderName(dirHandle) {
  return dirHandle ? dirHandle.name : 'No folder selected';
}

/**
 * Store folder handle in IndexedDB (since it can't be serialized to localStorage)
 * @param {FileSystemDirectoryHandle} dirHandle - Directory handle
 * @returns {Promise<void>}
 */
export async function storeFolderHandle(dirHandle) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('hashbase_storage', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction(['handles'], 'readwrite');
      const store = transaction.objectStore('handles');
      
      store.put(dirHandle, 'folderHandle');
      
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      
      transaction.onerror = () => reject(transaction.error);
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('handles')) {
        db.createObjectStore('handles');
      }
    };
  });
}

/**
 * Retrieve folder handle from IndexedDB
 * @returns {Promise<FileSystemDirectoryHandle|null>}
 */
export async function retrieveFolderHandle() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('hashbase_storage', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      
      if (!db.objectStoreNames.contains('handles')) {
        db.close();
        resolve(null);
        return;
      }
      
      const transaction = db.transaction(['handles'], 'readonly');
      const store = transaction.objectStore('handles');
      const getRequest = store.get('folderHandle');
      
      getRequest.onsuccess = () => {
        db.close();
        resolve(getRequest.result || null);
      };
      
      getRequest.onerror = () => {
        db.close();
        reject(getRequest.error);
      };
    };
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('handles')) {
        db.createObjectStore('handles');
      }
    };
  });
}

/**
 * Clear stored folder handle from IndexedDB
 * @returns {Promise<void>}
 */
export async function clearFolderHandle() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('hashbase_storage', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onsuccess = () => {
      const db = request.result;
      
      if (!db.objectStoreNames.contains('handles')) {
        db.close();
        resolve();
        return;
      }
      
      const transaction = db.transaction(['handles'], 'readwrite');
      const store = transaction.objectStore('handles');
      
      store.delete('folderHandle');
      
      transaction.oncomplete = () => {
        db.close();
        resolve();
      };
      
      transaction.onerror = () => reject(transaction.error);
    };
  });
}

/**
 * Auto-sync manager - handles periodic syncing to file
 */
let autoSyncInterval = null;

/**
 * Start auto-sync with the given folder handle
 * @param {FileSystemDirectoryHandle} dirHandle - Directory handle
 * @param {number} intervalMinutes - Sync interval in minutes
 * @param {Function} onSync - Callback function called after each sync
 */
export function startAutoSync(dirHandle, intervalMinutes = 5, onSync = null) {
  // Clear any existing interval
  stopAutoSync();
  
  console.log(`🔄 Starting auto-sync every ${intervalMinutes} minutes`);
  
  // Sync immediately on start
  syncToFile(dirHandle).then(result => {
    console.log('📤 Initial auto-sync:', result.message);
    if (onSync) onSync(result);
  }).catch(err => {
    console.error('❌ Initial auto-sync failed:', err);
  });
  
  // Set up periodic sync
  autoSyncInterval = setInterval(async () => {
    try {
      // Verify we still have access
      const hasAccess = await verifyFolderAccess(dirHandle);
      if (!hasAccess) {
        console.warn('⚠️ Lost folder access, stopping auto-sync');
        stopAutoSync();
        return;
      }
      
      const result = await syncToFile(dirHandle);
      console.log('📤 Auto-sync:', result.message);
      if (onSync) onSync(result);
    } catch (error) {
      console.error('❌ Auto-sync failed:', error);
    }
  }, intervalMinutes * 60 * 1000); // Convert minutes to milliseconds
}

/**
 * Stop auto-sync
 */
export function stopAutoSync() {
  if (autoSyncInterval) {
    clearInterval(autoSyncInterval);
    autoSyncInterval = null;
    console.log('⏹️ Auto-sync stopped');
  }
}

/**
 * Check if auto-sync is currently running
 * @returns {boolean}
 */
export function isAutoSyncRunning() {
  return autoSyncInterval !== null;
}
