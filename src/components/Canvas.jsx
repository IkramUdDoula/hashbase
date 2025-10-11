import React, { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DraggableWidget } from './DraggableWidget';
import { DropZone } from './DropZone';
import {
  createLayoutConfig,
  saveLayoutConfig,
  loadLayoutConfig,
  canWidgetFit,
  getDropzoneNumber,
  getDropzonePosition,
  getLayoutDebugInfo,
  COLUMNS,
  MAX_ROWS_PER_COLUMN
} from '@/services/layoutService';

export function Canvas({ widgets }) {
  // Layout configuration state - tracks widget-to-dropzone mappings
  const [layoutConfig, setLayoutConfig] = useState(null);
  
  // Load saved layout from localStorage or create default layout
  const getInitialLayout = () => {
    const saved = localStorage.getItem('widgetLayout');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Validate that the saved layout has the correct structure
        if (Array.isArray(parsed) && parsed.length === COLUMNS) {
          // Check if it's the new format (array of arrays with widget objects)
          const isNewFormat = parsed.every(col => 
            Array.isArray(col) && col.every(w => w && w.id && w.rowSpan !== undefined && w.startRow !== undefined)
          );
          if (isNewFormat) {
            // Validate that all widget IDs in saved layout exist in current widgets
            const currentWidgetIds = new Set(widgets.map(w => w.id));
            const savedWidgetIds = new Set();
            parsed.forEach(col => col.forEach(w => savedWidgetIds.add(w.id)));
            
            // Check if all saved widgets still exist
            const allSavedIdsValid = Array.from(savedWidgetIds).every(id => currentWidgetIds.has(id));
            
            // Check if there are NEW widgets not in the saved layout
            const hasNewWidgets = Array.from(currentWidgetIds).some(id => !savedWidgetIds.has(id));
            
            console.log('🔍 Layout validation:', {
              currentWidgets: Array.from(currentWidgetIds),
              savedWidgets: Array.from(savedWidgetIds),
              allSavedIdsValid,
              hasNewWidgets
            });
            
            if (allSavedIdsValid && !hasNewWidgets) {
              console.log('✅ Using saved layout');
              return parsed;
            }
            // Widget IDs changed or new widgets added, clear layout
            console.log('🔄 Widget configuration changed, resetting layout');
            localStorage.removeItem('widgetLayout');
            localStorage.removeItem('widgetRowSpans');
          }
        }
        // Invalid format, clear it
        localStorage.removeItem('widgetLayout');
      } catch (e) {
        localStorage.removeItem('widgetLayout');
      }
    }
    
    // Default layout: place widgets in first column
    const layout = Array(COLUMNS).fill(null).map(() => []);
    let currentCol = 0;
    let currentRowInCol = 0;
    
    widgets.forEach((widget) => {
      const rowSpan = widget.rowSpan || 1;
      
      // Check if widget fits in current column
      if (currentRowInCol + rowSpan > MAX_ROWS_PER_COLUMN) {
        // Move to next column
        currentCol++;
        currentRowInCol = 0;
      }
      
      if (currentCol < COLUMNS) {
        layout[currentCol].push({
          id: widget.id,
          rowSpan: rowSpan,
          startRow: currentRowInCol
        });
        currentRowInCol += rowSpan;
      }
    });
    
    return layout;
  };

  const [layout, setLayout] = useState(getInitialLayout);
  
  // Initialize layout configuration on mount
  useEffect(() => {
    const loadedConfig = loadLayoutConfig();
    if (loadedConfig) {
      // Validate and fix if needed
      if (!loadedConfig.occupiedDropzones || !(loadedConfig.occupiedDropzones instanceof Set)) {
        loadedConfig.occupiedDropzones = new Set();
        Object.values(loadedConfig.widgets || {}).forEach(widgetData => {
          if (widgetData.dropzones && Array.isArray(widgetData.dropzones)) {
            widgetData.dropzones.forEach(dz => loadedConfig.occupiedDropzones.add(dz));
          }
        });
        saveLayoutConfig(loadedConfig);
      }
      setLayoutConfig(loadedConfig);
    }
  }, []);
  
  // Update layout configuration whenever layout changes
  useEffect(() => {
    const config = createLayoutConfig(layout);
    setLayoutConfig(config);
    saveLayoutConfig(config);
  }, [layout]);
  
  // Widget row spans - tracks how many rows each widget occupies
  const getInitialRowSpans = () => {
    const saved = localStorage.getItem('widgetRowSpans');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Validate that saved rowSpans match current widget IDs
        const currentWidgetIds = new Set(widgets.map(w => w.id));
        const savedIds = Object.keys(parsed);
        const allIdsValid = savedIds.every(id => currentWidgetIds.has(id));
        
        if (allIdsValid && savedIds.length === widgets.length) {
          return parsed;
        }
        // IDs don't match, clear and rebuild
        localStorage.removeItem('widgetRowSpans');
      } catch (e) {
        localStorage.removeItem('widgetRowSpans');
      }
    }
    const spans = {};
    widgets.forEach(widget => {
      spans[widget.id] = widget.rowSpan || 1;
    });
    return spans;
  };
  
  const [rowSpans, setRowSpans] = useState(getInitialRowSpans);

  // Save layout and rowSpans to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('widgetLayout', JSON.stringify(layout));
    localStorage.setItem('widgetRowSpans', JSON.stringify(rowSpans));
  }, [layout, rowSpans]);

  // Calculate which rows are occupied in a column
  const getOccupiedRows = (column) => {
    const occupied = new Set();
    column.forEach(widget => {
      if (widget && widget.rowSpan && widget.startRow !== undefined) {
        for (let i = 0; i < widget.rowSpan; i++) {
          occupied.add(widget.startRow + i);
        }
      }
    });
    return occupied;
  };

  // Check if a widget can fit at a specific position
  const canFitWidget = (column, startRow, rowSpan, excludeWidgetId = null) => {
    if (startRow + rowSpan > MAX_ROWS_PER_COLUMN) return false;
    
    const occupied = getOccupiedRows(column.filter(w => w && w.id !== excludeWidgetId));
    for (let i = 0; i < rowSpan; i++) {
      if (occupied.has(startRow + i)) return false;
    }
    return true;
  };

  // Handle widget drop with enhanced validation
  const handleDrop = (widgetId, targetCol, targetRow) => {
    setLayout(prevLayout => {
      const newLayout = prevLayout.map(col => col.map(w => ({...w})));
      const widgetRowSpan = rowSpans[widgetId];
      const targetDropzone = getDropzoneNumber(targetCol, targetRow);
      
      // Find and remove widget from current position
      let removedWidget = null;
      let originalCol = -1;
      for (let c = 0; c < COLUMNS; c++) {
        const widgetIndex = newLayout[c].findIndex(w => w.id === widgetId);
        if (widgetIndex !== -1) {
          removedWidget = newLayout[c][widgetIndex];
          originalCol = c;
          newLayout[c].splice(widgetIndex, 1);
          break;
        }
      }
      
      // Create temporary config to check fit
      const tempConfig = createLayoutConfig(newLayout);
      const occupiedDropzones = new Set(tempConfig.occupiedDropzones);
      
      // Validate if widget can fit
      const fitCheck = canWidgetFit(
        targetDropzone,
        widgetRowSpan,
        occupiedDropzones,
        widgetId,
        layoutConfig
      );
      
      if (!fitCheck.canFit) {
        // Can't fit, restore widget to original position
        if (removedWidget && originalCol !== -1) {
          newLayout[originalCol].push(removedWidget);
        }
        return newLayout;
      }
      
      // Place widget in target position
      newLayout[targetCol].push({
        id: widgetId,
        rowSpan: widgetRowSpan,
        startRow: targetRow
      });
      
      // Sort widgets in column by startRow
      newLayout[targetCol].sort((a, b) => a.startRow - b.startRow);
      
      // Refresh page after successful drop to ensure synchronization
      setTimeout(() => {
        window.location.reload();
      }, 100);
      
      return newLayout;
    });
  };

  // Handle widget resize with enhanced validation
  const handleResize = (widgetId, newRowSpan) => {
    const clampedSpan = Math.max(1, Math.min(4, newRowSpan));
    
    // Check if resize is possible before updating
    let canResize = false;
    
    // Find widget's current position
    for (let c = 0; c < COLUMNS; c++) {
      const widget = layout[c].find(w => w.id === widgetId);
      if (widget) {
        const targetDropzone = getDropzoneNumber(c, widget.startRow);
        
        // Create temporary config without this widget
        const tempLayout = layout.map(col => col.filter(w => w.id !== widgetId));
        const tempConfig = createLayoutConfig(tempLayout);
        const occupiedDropzones = new Set(tempConfig.occupiedDropzones);
        
        // Check if resized widget fits
        const fitCheck = canWidgetFit(
          targetDropzone,
          clampedSpan,
          occupiedDropzones,
          widgetId,
          layoutConfig
        );
        
        canResize = fitCheck.canFit;
        break;
      }
    }
    
    if (!canResize) {
      return;
    }
    
    setRowSpans(prev => ({
      ...prev,
      [widgetId]: clampedSpan
    }));
    
    // Update layout to reflect new size
    setLayout(prevLayout => {
      const newLayout = prevLayout.map(col => col.map(w => ({...w})));
      
      // Find widget and update its rowSpan
      for (let c = 0; c < COLUMNS; c++) {
        const widget = newLayout[c].find(w => w.id === widgetId);
        if (widget) {
          widget.rowSpan = clampedSpan;
          break;
        }
      }
      
      return newLayout;
    });
  };

  // Get widget component by id
  const getWidgetById = (id) => {
    return widgets.find(w => w.id === id);
  };

  // Validate if a widget can be dropped at a specific position
  const validateDropPosition = (widgetId, targetCol, targetRow) => {
    const widgetRowSpan = rowSpans[widgetId];
    const targetDropzone = getDropzoneNumber(targetCol, targetRow);
    
    const tempLayout = layout.map(col => col.filter(w => w.id !== widgetId));
    const tempConfig = createLayoutConfig(tempLayout);
    const occupiedDropzones = new Set(tempConfig.occupiedDropzones);
    
    const fitCheck = canWidgetFit(
      targetDropzone,
      widgetRowSpan,
      occupiedDropzones,
      widgetId,
      tempConfig
    );
    
    return fitCheck.canFit;
  };

  // Render a column with widgets and drop zones
  const renderColumn = (column, colIndex) => {
    const occupied = getOccupiedRows(column);
    const rows = [];
    
    // Create drop zones for each row position
    let rowIndex = 0;
    while (rowIndex < MAX_ROWS_PER_COLUMN) {
      // Check if this row is the start of a widget
      const widget = column.find(w => w && w.startRow === rowIndex);
      
      if (widget) {
        // Render widget with its rowSpan
        rows.push(
          <DropZone
            key={`${colIndex}-${rowIndex}`}
            rowIndex={rowIndex}
            colIndex={colIndex}
            onDrop={handleDrop}
            validateDrop={validateDropPosition}
          >
            <DraggableWidget
              widgetId={widget.id}
              widget={getWidgetById(widget.id)}
              rowSpan={widget.rowSpan}
              onResize={handleResize}
            />
          </DropZone>
        );
        
        // Skip the rows that this widget occupies
        rowIndex += widget.rowSpan;
      } else if (!occupied.has(rowIndex)) {
        // Render empty drop zone - fixed height to match single row
        rows.push(
          <DropZone
            key={`${colIndex}-${rowIndex}`}
            rowIndex={rowIndex}
            colIndex={colIndex}
            onDrop={handleDrop}
            validateDrop={validateDropPosition}
          >
            <div className="h-[12rem] border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg flex items-center justify-center text-gray-400 dark:text-gray-600 text-sm">
              Drop widget here
            </div>
          </DropZone>
        );
        rowIndex++;
      } else {
        // Row is occupied but not the start of a widget, skip it
        rowIndex++;
      }
    }
    
    return rows;
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="w-full h-full">
        {/* 5 columns layout */}
        <div className="grid grid-cols-5 gap-4 h-full">
          {layout.map((column, colIndex) => (
            <div 
              key={colIndex} 
              className="flex flex-col gap-4"
            >
              {renderColumn(column, colIndex)}
            </div>
          ))}
        </div>
      </div>
    </DndProvider>
  );
}
