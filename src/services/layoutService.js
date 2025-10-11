/**
 * Layout Configuration Service
 * Manages widget layout with dropzone tracking and validation
 * 
 * Grid Structure:
 * - 5 columns × 4 rows = 20 dropzones
 * - Dropzones numbered 1-20 (not shown in UI)
 * - Column 0: dropzones 1-4, Column 1: dropzones 5-8, etc.
 */

const COLUMNS = 5;
const MAX_ROWS_PER_COLUMN = 4;
const STORAGE_KEY = 'widgetLayoutConfig';

/**
 * Convert column and row indices to dropzone number
 * @param {number} colIndex - Column index (0-4)
 * @param {number} rowIndex - Row index (0-3)
 * @returns {number} Dropzone number (1-20)
 */
export function getDropzoneNumber(colIndex, rowIndex) {
  return colIndex * MAX_ROWS_PER_COLUMN + rowIndex + 1;
}

/**
 * Convert dropzone number to column and row indices
 * @param {number} dropzoneNum - Dropzone number (1-20)
 * @returns {{colIndex: number, rowIndex: number}}
 */
export function getDropzonePosition(dropzoneNum) {
  const zeroIndexed = dropzoneNum - 1;
  return {
    colIndex: Math.floor(zeroIndexed / MAX_ROWS_PER_COLUMN),
    rowIndex: zeroIndexed % MAX_ROWS_PER_COLUMN
  };
}

/**
 * Get all dropzone numbers occupied by a widget
 * @param {number} startDropzone - Starting dropzone number
 * @param {number} rowSpan - Number of rows the widget spans
 * @returns {number[]} Array of dropzone numbers
 */
export function getOccupiedDropzones(startDropzone, rowSpan) {
  const { colIndex, rowIndex } = getDropzonePosition(startDropzone);
  const dropzones = [];
  
  for (let i = 0; i < rowSpan; i++) {
    const currentRow = rowIndex + i;
    if (currentRow < MAX_ROWS_PER_COLUMN) {
      dropzones.push(getDropzoneNumber(colIndex, currentRow));
    }
  }
  
  return dropzones;
}

/**
 * Create layout configuration from widget layout
 * @param {Array<Array<{id: string, rowSpan: number, startRow: number}>>} layout
 * @returns {Object} Configuration object with widget mappings
 */
export function createLayoutConfig(layout) {
  const config = {
    version: 2, // Version for future migrations
    timestamp: Date.now(),
    widgets: {}, // widgetId -> { dropzones: [numbers], rowSpan: number }
    dropzones: {}, // dropzoneNum -> widgetId
    occupiedDropzones: new Set() // Set of occupied dropzone numbers
  };
  
  layout.forEach((column, colIndex) => {
    column.forEach(widget => {
      const startDropzone = getDropzoneNumber(colIndex, widget.startRow);
      const occupiedDropzones = getOccupiedDropzones(startDropzone, widget.rowSpan);
      
      // Track widget -> dropzones mapping
      config.widgets[widget.id] = {
        dropzones: occupiedDropzones,
        rowSpan: widget.rowSpan,
        startDropzone: startDropzone
      };
      
      // Track dropzone -> widget mapping
      occupiedDropzones.forEach(dzNum => {
        config.dropzones[dzNum] = widget.id;
        config.occupiedDropzones.add(dzNum);
      });
    });
  });
  
  // Convert Set to Array for JSON serialization
  config.occupiedDropzones = Array.from(config.occupiedDropzones);
  
  return config;
}

/**
 * Check if a widget can fit at a specific dropzone
 * @param {number} targetDropzone - Target dropzone number
 * @param {number} rowSpan - Widget's row span
 * @param {Set<number>} occupiedDropzones - Set of currently occupied dropzones
 * @param {string} excludeWidgetId - Widget ID to exclude from collision check
 * @param {Object} currentConfig - Current layout configuration
 * @returns {{canFit: boolean, reason: string, requiredDropzones: number[]}}
 */
export function canWidgetFit(targetDropzone, rowSpan, occupiedDropzones, excludeWidgetId = null, currentConfig = null) {
  const { colIndex, rowIndex } = getDropzonePosition(targetDropzone);
  
  // Check if widget would exceed column bounds
  if (rowIndex + rowSpan > MAX_ROWS_PER_COLUMN) {
    return {
      canFit: false,
      reason: `Widget requires ${rowSpan} rows but only ${MAX_ROWS_PER_COLUMN - rowIndex} available`,
      requiredDropzones: []
    };
  }
  
  // Get dropzones this widget would occupy
  const requiredDropzones = getOccupiedDropzones(targetDropzone, rowSpan);
  
  // Create a set of occupied dropzones excluding the widget being moved
  let effectiveOccupied = new Set(occupiedDropzones);
  if (excludeWidgetId && currentConfig && currentConfig.widgets[excludeWidgetId]) {
    const excludeDropzones = currentConfig.widgets[excludeWidgetId].dropzones;
    excludeDropzones.forEach(dz => effectiveOccupied.delete(dz));
  }
  
  // Check if any required dropzone is occupied
  const conflicts = requiredDropzones.filter(dz => effectiveOccupied.has(dz));
  
  if (conflicts.length > 0) {
    return {
      canFit: false,
      reason: `Dropzones ${conflicts.join(', ')} are already occupied`,
      requiredDropzones
    };
  }
  
  return {
    canFit: true,
    reason: 'Widget fits',
    requiredDropzones
  };
}

/**
 * Get available (empty) dropzones below a specific dropzone in the same column
 * @param {number} startDropzone - Starting dropzone number
 * @param {Set<number>} occupiedDropzones - Set of occupied dropzones
 * @returns {number[]} Array of available dropzone numbers below
 */
export function getAvailableDropzonesBelow(startDropzone, occupiedDropzones) {
  const { colIndex, rowIndex } = getDropzonePosition(startDropzone);
  const available = [];
  
  // Check all rows below in the same column
  for (let row = rowIndex + 1; row < MAX_ROWS_PER_COLUMN; row++) {
    const dzNum = getDropzoneNumber(colIndex, row);
    if (!occupiedDropzones.has(dzNum)) {
      available.push(dzNum);
    }
  }
  
  return available;
}

/**
 * Save layout configuration to localStorage
 * @param {Object} config - Layout configuration
 */
export function saveLayoutConfig(config) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    console.log('💾 Layout configuration saved:', {
      widgets: Object.keys(config.widgets).length,
      occupiedDropzones: config.occupiedDropzones.length
    });
  } catch (error) {
    console.error('Failed to save layout configuration:', error);
  }
}

/**
 * Load layout configuration from localStorage
 * @returns {Object|null} Layout configuration or null if not found
 */
export function loadLayoutConfig() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return null;
    
    const config = JSON.parse(saved);
    
    // Validate config structure
    if (!config.version || !config.widgets || !config.dropzones) {
      console.warn('Invalid layout configuration, clearing...');
      localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    
    // Convert occupiedDropzones to Set
    // Handle edge cases: could be array, object, or undefined
    if (Array.isArray(config.occupiedDropzones)) {
      config.occupiedDropzones = new Set(config.occupiedDropzones);
    } else {
      // Rebuild from widgets if corrupted or missing
      console.warn('⚠️ Rebuilding occupiedDropzones from widget data...');
      config.occupiedDropzones = new Set();
      Object.values(config.widgets).forEach(widgetData => {
        if (widgetData.dropzones && Array.isArray(widgetData.dropzones)) {
          widgetData.dropzones.forEach(dz => config.occupiedDropzones.add(dz));
        }
      });
    }
    
    console.log('📂 Layout configuration loaded:', {
      version: config.version,
      widgets: Object.keys(config.widgets).length,
      occupiedDropzones: config.occupiedDropzones.size
    });
    
    return config;
  } catch (error) {
    console.error('Failed to load layout configuration:', error);
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

/**
 * Clear layout configuration from localStorage
 */
export function clearLayoutConfig() {
  localStorage.removeItem(STORAGE_KEY);
  console.log('🗑️ Layout configuration cleared');
}

/**
 * Get debug information about the layout
 * @param {Object} config - Layout configuration
 * @returns {Object} Debug information
 */
export function getLayoutDebugInfo(config) {
  const info = {
    totalDropzones: COLUMNS * MAX_ROWS_PER_COLUMN,
    occupiedDropzones: config.occupiedDropzones.size || 0,
    emptyDropzones: (COLUMNS * MAX_ROWS_PER_COLUMN) - (config.occupiedDropzones.size || 0),
    widgets: []
  };
  
  Object.entries(config.widgets || {}).forEach(([widgetId, data]) => {
    info.widgets.push({
      id: widgetId,
      startDropzone: data.startDropzone,
      dropzones: data.dropzones,
      rowSpan: data.rowSpan
    });
  });
  
  return info;
}

export { COLUMNS, MAX_ROWS_PER_COLUMN };
