/**
 * Dashboard Keys Utility
 * 
 * Single source of truth for all localStorage keys that should be
 * backed up, synced, and exported across the application.
 * 
 * This ensures consistency between:
 * - Config downloads (configService.js)
 * - Folder sync (storageService.js)
 * - Any other backup/restore mechanisms
 */

/**
 * Get all localStorage keys related to the dashboard
 * 
 * IMPORTANT: Only hashbase_secrets should be encrypted.
 * Gmail tokens and PostHog tokens are intentionally EXCLUDED for security.
 * 
 * @returns {string[]} Array of localStorage keys to backup/sync
 */
export function getDashboardKeys() {
  const baseKeys = [
    // Core configuration
    'hashbase_secrets',                       // API keys (ENCRYPTED)
    'hashbase_widget_preferences',            // Widget enable/disable
    'hashbase_widget_canvas_assignments',     // Widget-to-canvas assignments
    'hashbase-theme',                         // Light/dark mode
    'hashbase_storage_settings',              // Storage settings (auto-sync, encryption, interval)
    
    // Canvas management
    'hashbase_canvases',                      // Array of canvas objects
    'hashbase_active_canvas',                 // Active canvas ID
    
    // Legacy layout keys (backward compatibility)
    'widgetLayout',                           // Old single-canvas layout
    'widgetRowSpans',                         // Old single-canvas row spans
    'widgetLayoutConfig',                     // Old layout config
    
    // AI Chat widget
    'hashbase_ai_conversations',              // All conversations
    'hashbase_ai_current_conversation',       // Current conversation
    'hashbase_ai_chat_settings',              // Provider/model
    'hashbase_ai_llm_settings',               // Temperature, max tokens
    
    // News widget
    'news_country',                           // Country code
    'news_category',                          // News category
    
    // GitHub widget
    'github_widget_owner',                    // Repo owner
    'github_widget_repo',                     // Repo name
    
    // Checklist widget
    'checklistItems',                         // Items array
    'checklistSettings',                      // Settings
    
    // Timer widget
    'timerMode',                              // Mode (stopwatch/countdown)
    'stopwatchTime',                          // Elapsed time
    'stopwatchLaps',                          // Lap times array
    'countdownInitial',                       // Initial duration
    
    // PostHog widget settings (non-sensitive configuration only)
    'posthog_errors_settings',                // PostHog Errors widget config
    'posthog_surveys_settings',               // PostHog Surveys widget config
    
    // Haalkhata widget
    'haalkhata_widget_settings',              // Haalkhata widget config
  ];
  
  // Add per-canvas layout keys dynamically
  const canvasKeys = [];
  try {
    const canvasesJson = localStorage.getItem('hashbase_canvases');
    if (canvasesJson) {
      const canvases = JSON.parse(canvasesJson);
      canvases.forEach(canvas => {
        canvasKeys.push(`widgetLayout_${canvas.id}`);
        canvasKeys.push(`widgetRowSpans_${canvas.id}`);
      });
    }
  } catch (e) {
    console.warn('Error reading canvas keys:', e);
  }
  
  return [...baseKeys, ...canvasKeys];
}

/**
 * Keys that should be encrypted in exports/backups
 * 
 * SECURITY NOTE: Only API secrets should be encrypted.
 * OAuth tokens (gmail_tokens) are intentionally excluded from backups
 * for security reasons - users should re-authenticate.
 * 
 * @returns {string[]} Array of keys that contain sensitive data
 */
export function getSecretKeys() {
  return [
    'hashbase_secrets',  // API keys only
  ];
}

/**
 * Keys that are intentionally excluded from backups/sync
 * 
 * These keys contain:
 * - OAuth tokens (security - require re-authentication)
 * - Local encryption keys (device-specific)
 * 
 * NOTE: hashbase_storage_settings is now INCLUDED in backups so settings
 * like auto-sync, encryption preference, and sync interval are restored.
 * 
 * @returns {string[]} Array of excluded keys
 */
export function getExcludedKeys() {
  return [
    'hashbase_storage_encryption_key',        // Local encryption key (device-specific)
    'gmail_tokens',                           // Gmail OAuth tokens (EXCLUDED - security)
    // PostHog tokens are stored in hashbase_secrets, not separately
  ];
}

/**
 * Check if a key should be encrypted
 * @param {string} key - localStorage key
 * @returns {boolean}
 */
export function shouldEncryptKey(key) {
  return getSecretKeys().includes(key);
}

/**
 * Check if a key should be excluded from backups
 * @param {string} key - localStorage key
 * @returns {boolean}
 */
export function shouldExcludeKey(key) {
  return getExcludedKeys().includes(key);
}

/**
 * Get a summary of what will be backed up
 * @returns {Object} Summary object
 */
export function getBackupSummary() {
  const allKeys = getDashboardKeys();
  const secretKeys = getSecretKeys();
  const excludedKeys = getExcludedKeys();
  
  return {
    totalKeys: allKeys.length,
    secretKeys: secretKeys.length,
    excludedKeys: excludedKeys.length,
    regularKeys: allKeys.length - secretKeys.length,
    keys: {
      all: allKeys,
      secrets: secretKeys,
      excluded: excludedKeys,
      regular: allKeys.filter(k => !secretKeys.includes(k))
    }
  };
}
