// Widget registry service for managing available apps and their enabled/disabled state

const WIDGET_PREFERENCES_KEY = 'hashbase_widget_preferences';

/**
 * Get widget preferences from localStorage
 * @returns {Object} Object with widget IDs as keys and boolean enabled state as values
 */
export function getWidgetPreferences() {
  try {
    const stored = localStorage.getItem(WIDGET_PREFERENCES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading widget preferences from localStorage:', error);
  }
  return {};
}

/**
 * Check if a widget is enabled
 * @param {string} widgetId - The widget ID
 * @returns {boolean} True if enabled (default true if not set)
 */
export function isWidgetEnabled(widgetId) {
  const preferences = getWidgetPreferences();
  const enabled = preferences[widgetId] !== false;
  console.log(`🔍 isWidgetEnabled("${widgetId}"):`, {
    storedValue: preferences[widgetId],
    result: enabled
  });
  // Default to true if not explicitly set
  return enabled;
}

/**
 * Set widget enabled state
 * @param {string} widgetId - The widget ID
 * @param {boolean} enabled - Whether the widget should be enabled
 */
export function setWidgetEnabled(widgetId, enabled) {
  const preferences = getWidgetPreferences();
  preferences[widgetId] = enabled;
  try {
    localStorage.setItem(WIDGET_PREFERENCES_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('Error saving widget preferences to localStorage:', error);
    throw error;
  }
}

/**
 * Set multiple widget preferences at once
 * @param {Object} newPreferences - Object with widget IDs as keys and boolean values
 */
export function setWidgetPreferences(newPreferences) {
  try {
    localStorage.setItem(WIDGET_PREFERENCES_KEY, JSON.stringify(newPreferences));
  } catch (error) {
    console.error('Error saving widget preferences to localStorage:', error);
    throw error;
  }
}

/**
 * Reset all widget preferences (enable all widgets)
 */
export function resetWidgetPreferences() {
  try {
    localStorage.removeItem(WIDGET_PREFERENCES_KEY);
  } catch (error) {
    console.error('Error resetting widget preferences:', error);
    throw error;
  }
}

/**
 * Ensure all provided widget IDs are enabled by default if not already set
 * This is useful when new widgets are added to prevent them from being hidden
 * @param {Array<string>} widgetIds - Array of widget IDs to check
 */
export function ensureWidgetsEnabled(widgetIds) {
  const preferences = getWidgetPreferences();
  console.log('🔧 ensureWidgetsEnabled - Current preferences:', preferences);
  let updated = false;
  
  widgetIds.forEach(widgetId => {
    // Only set to true if not already explicitly set (undefined)
    if (preferences[widgetId] === undefined) {
      console.log(`  ✅ Setting ${widgetId} to enabled (was undefined)`);
      preferences[widgetId] = true;
      updated = true;
    } else {
      console.log(`  ⏭️  Skipping ${widgetId} (already set to ${preferences[widgetId]})`);
    }
  });
  
  if (updated) {
    console.log('💾 Saving updated preferences:', preferences);
    try {
      localStorage.setItem(WIDGET_PREFERENCES_KEY, JSON.stringify(preferences));
    } catch (error) {
      console.error('Error ensuring widgets enabled:', error);
    }
  } else {
    console.log('⏭️  No updates needed');
  }
}
