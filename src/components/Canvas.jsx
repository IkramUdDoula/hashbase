import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DraggableWidget } from './DraggableWidget';
import { DropZone } from './DropZone';
import { setWidgetEnabled, getWidgetCanvasAssignments } from '@/services/widgetRegistry';
import { useCanvas } from '@/contexts/CanvasContext';
import {
  createLayoutConfig,
  saveLayoutConfig,
  loadLayoutConfig,
  canWidgetFit,
  getDropzoneNumber,
  getDropzonePosition,
  getLayoutDebugInfo,
  getAvailableSpaceBelow,
  getSmartNextRowSpan,
  findEmptySpace,
  removeWidgetFromLayout,
  addWidgetToLayout,
  COLUMNS,
  MAX_ROWS_PER_COLUMN
} from '@/services/layoutService';

export function Canvas({ widgets }) {
  const { activeCanvasId, canvases } = useCanvas();
  
  // Filter widgets based on canvas assignments (memoized)
  const availableWidgets = useMemo(() => {
    const canvasAssignments = getWidgetCanvasAssignments();
    
    return widgets.filter(widget => {
      const assignedCanvas = canvasAssignments[widget.id];
      
      // If widget is assigned to a specific canvas, only show it on that canvas
      if (assignedCanvas) {
        return assignedCanvas === activeCanvasId;
      }
      
      // If widget is not assigned to any canvas:
      // - For canvas-1: show unassigned widgets (backward compatibility)
      // - For other canvases: don't show unassigned widgets (user must explicitly assign)
      return activeCanvasId === 'canvas-1';
    });
  }, [widgets, activeCanvasId]);
  
  // Layout configuration state - tracks widget-to-dropzone mappings
  const [layoutConfig, setLayoutConfig] = useState(null);
  
  // Load saved layout from localStorage or create default layout
  const getInitialLayout = () => {
    const saved = localStorage.getItem(`widgetLayout_${activeCanvasId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Validate that the saved layout has the correct structure
        if (Array.isArray(parsed) && parsed.length === COLUMNS) {
          // Check if layout is empty (all columns are empty arrays)
          const isEmpty = parsed.every(col => Array.isArray(col) && col.length === 0);
          
          // If layout is empty but we have widgets assigned to this canvas, auto-place them
          if (isEmpty && availableWidgets.length > 0) {
            // Don't use saved empty layout, fall through to auto-placement
          } else {
            // Check if it's the new format (array of arrays with widget objects)
            const isNewFormat = parsed.every(col => 
              Array.isArray(col) && col.every(w => w && w.id && w.rowSpan !== undefined && w.startRow !== undefined)
            );
            if (isNewFormat) {
              // Validate that all widget IDs in saved layout exist in available widgets
              const currentWidgetIds = new Set(availableWidgets.map(w => w.id));
              const savedWidgetIds = new Set();
              parsed.forEach(col => col.forEach(w => savedWidgetIds.add(w.id)));
              
              // Check if there are NEW widgets not in the saved layout (newly enabled)
              const newWidgetIds = Array.from(currentWidgetIds).filter(id => !savedWidgetIds.has(id));
              const hasNewWidgets = newWidgetIds.length > 0;
            
            // Check if there are widgets in saved layout that are now disabled or placed elsewhere
            const disabledWidgetIds = Array.from(savedWidgetIds).filter(id => !currentWidgetIds.has(id));
            const hasDisabledWidgets = disabledWidgetIds.length > 0;
            
            // Process layout changes (enable/disable widgets)
            // We should preserve layout unless there's a structural issue
            let layout = parsed;
            
            // Remove disabled widgets or widgets placed in other canvases from layout
            if (hasDisabledWidgets) {
              disabledWidgetIds.forEach(widgetId => {
                layout = removeWidgetFromLayout(layout, widgetId);
              });
            }
            
            // Add new widgets to layout if there's space
            // NOTE: Only auto-add widgets if there's already a saved layout
            // For fresh users, we rely on the default layout logic below
            if (hasNewWidgets && savedWidgetIds.size > 0) {
              const newWidgets = availableWidgets.filter(w => newWidgetIds.includes(w.id));
              
              const failedWidgets = [];
              
              newWidgets.forEach(widget => {
                const rowSpan = widget.rowSpan || 1;
                const emptySpace = findEmptySpace(layout, rowSpan);
                
                if (emptySpace) {
                  layout = addWidgetToLayout(layout, widget.id, rowSpan, emptySpace.colIndex, emptySpace.startRow);
                } else {
                  failedWidgets.push({
                    widgetId: widget.id,
                    widgetName: widget.name || widget.id,
                    rowSpan
                  });
                }
              });
              
              // If any widgets couldn't be placed, store them and disable them
              if (failedWidgets.length > 0) {
                // Store the first failed widget for display
                localStorage.setItem('hashbase_widget_no_space', JSON.stringify(failedWidgets[0]));
                
                // Auto-disable widgets that couldn't be placed
                failedWidgets.forEach(fw => {
                  setWidgetEnabled(fw.widgetId, false);
                });
              }
            }
            
              return layout;
            }
          }
        }
        // Invalid format, clear it
        localStorage.removeItem(`widgetLayout_${activeCanvasId}`);
      } catch (e) {
        localStorage.removeItem(`widgetLayout_${activeCanvasId}`);
      }
    }
    
    // Default layout: Auto-place widgets assigned to this canvas
    const layout = Array(COLUMNS).fill(null).map(() => []);
    
    // Auto-place widgets for this canvas
    if (availableWidgets.length > 0) {
      let currentColumn = 0;
      let currentRow = 0;
      
      availableWidgets.forEach((widget) => {
        const rowSpan = widget.rowSpan || 1;
        
        // Check if widget fits in current column at current row
        let placed = false;
        
        // Try to place in current column
        if (currentRow + rowSpan <= MAX_ROWS_PER_COLUMN) {
          layout[currentColumn].push({
            id: widget.id,
            rowSpan: rowSpan,
            startRow: currentRow
          });
          currentRow += rowSpan;
          placed = true;
        } else {
          // Move to next column
          currentColumn++;
          currentRow = 0;
          
          // Try placing in next column
          if (currentColumn < COLUMNS && currentRow + rowSpan <= MAX_ROWS_PER_COLUMN) {
            layout[currentColumn].push({
              id: widget.id,
              rowSpan: rowSpan,
              startRow: currentRow
            });
            currentRow += rowSpan;
            placed = true;
          }
        }
        
        // If still not placed, try to find any available space
        if (!placed) {
          for (let col = 0; col < COLUMNS; col++) {
            const emptySpace = findEmptySpace(layout, rowSpan);
            if (emptySpace) {
              layout[emptySpace.colIndex].push({
                id: widget.id,
                rowSpan: rowSpan,
                startRow: emptySpace.startRow
              });
              placed = true;
              break;
            }
          }
        }
      });
      
      // Sort widgets in each column by startRow
      layout.forEach(column => {
        column.sort((a, b) => a.startRow - b.startRow);
      });
    }
    
    return layout;
  };

  const [layout, setLayout] = useState(getInitialLayout);
  
  // Reload layout when active canvas changes
  useEffect(() => {
    const newLayout = getInitialLayout();
    const newRowSpans = getInitialRowSpans();
    setLayout(newLayout);
    setRowSpans(newRowSpans);
  }, [activeCanvasId]);
  
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
    const saved = localStorage.getItem(`widgetRowSpans_${activeCanvasId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Validate that saved rowSpans match current available widget IDs
        const currentWidgetIds = new Set(availableWidgets.map(w => w.id));
        const savedIds = Object.keys(parsed);
        
        // Filter to only include widgets that are available
        const filteredSpans = {};
        savedIds.forEach(id => {
          if (currentWidgetIds.has(id)) {
            filteredSpans[id] = parsed[id];
          }
        });
        
        // Add any new widgets
        availableWidgets.forEach(widget => {
          if (!filteredSpans[widget.id]) {
            filteredSpans[widget.id] = widget.rowSpan || 1;
          }
        });
        
        return filteredSpans;
      } catch (e) {
        localStorage.removeItem(`widgetRowSpans_${activeCanvasId}`);
      }
    }
    const spans = {};
    availableWidgets.forEach(widget => {
      spans[widget.id] = widget.rowSpan || 1;
    });
    return spans;
  };
  
  const [rowSpans, setRowSpans] = useState(getInitialRowSpans);
  
  // Track resize direction for each widget (expand or reduce)
  const [resizeDirections, setResizeDirections] = useState(() => {
    const directions = {};
    availableWidgets.forEach(widget => {
      directions[widget.id] = 'expand'; // Default to expanding
    });
    return directions;
  });

  // Save layout and rowSpans to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(`widgetLayout_${activeCanvasId}`, JSON.stringify(layout));
    localStorage.setItem(`widgetRowSpans_${activeCanvasId}`, JSON.stringify(rowSpans));
  }, [layout, rowSpans, activeCanvasId]);

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

  // Handle widget resize with smart space-aware logic and direction tracking
  const handleResize = (widgetId) => {
    // Find widget's current position and analyze available space
    for (let c = 0; c < COLUMNS; c++) {
      const widget = layout[c].find(w => w.id === widgetId);
      if (widget) {
        const currentRowSpan = widget.rowSpan;
        const currentDirection = resizeDirections[widgetId] || 'expand';
        const targetDropzone = getDropzoneNumber(c, widget.startRow);
        
        // Create temporary config without this widget to check available space
        const tempLayout = layout.map(col => col.filter(w => w.id !== widgetId));
        const tempConfig = createLayoutConfig(tempLayout);
        const occupiedDropzones = new Set(tempConfig.occupiedDropzones);
        
        // Calculate available space below the widget
        const availableSpace = getAvailableSpaceBelow(
          targetDropzone,
          currentRowSpan,
          occupiedDropzones
        );
        
        // Determine smart next size and direction based on available space and current direction
        const { nextRowSpan, nextDirection } = getSmartNextRowSpan(
          currentRowSpan, 
          availableSpace, 
          currentDirection,
          4
        );
        
        // If the size is the same as current, no change needed
        if (nextRowSpan === currentRowSpan) {
          return;
        }
        
        // Validate that the new size fits
        const fitCheck = canWidgetFit(
          targetDropzone,
          nextRowSpan,
          occupiedDropzones,
          widgetId,
          layoutConfig
        );
        
        if (!fitCheck.canFit) {
          return;
        }
        
        // Update resize direction
        setResizeDirections(prev => ({
          ...prev,
          [widgetId]: nextDirection
        }));
        
        // Update row spans
        setRowSpans(prev => ({
          ...prev,
          [widgetId]: nextRowSpan
        }));
        
        // Update layout to reflect new size
        setLayout(prevLayout => {
          const newLayout = prevLayout.map(col => col.map(w => ({...w})));
          
          // Find widget and update its rowSpan
          for (let c = 0; c < COLUMNS; c++) {
            const widget = newLayout[c].find(w => w.id === widgetId);
            if (widget) {
              widget.rowSpan = nextRowSpan;
              break;
            }
          }
          
          return newLayout;
        });
        
        break;
      }
    }
  };

  // Get widget component by id
  const getWidgetById = (id) => {
    return availableWidgets.find(w => w.id === id);
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

  // Build a map of which grid cells are occupied and by what
  const buildGridCellMap = () => {
    const cellMap = {}; // key: "col-row", value: { type: 'widget-start' | 'widget-occupied' | 'empty', widget?: object }
    
    // Initialize all cells as empty
    for (let col = 0; col < COLUMNS; col++) {
      for (let row = 0; row < MAX_ROWS_PER_COLUMN; row++) {
        cellMap[`${col}-${row}`] = { type: 'empty' };
      }
    }
    
    // Mark cells occupied by widgets
    layout.forEach((column, colIndex) => {
      column.forEach(widget => {
        const startRow = widget.startRow;
        const rowSpan = widget.rowSpan;
        
        // Mark the starting cell
        cellMap[`${colIndex}-${startRow}`] = {
          type: 'widget-start',
          widget: widget
        };
        
        // Mark the occupied cells (cells spanned by the widget but not the start)
        for (let i = 1; i < rowSpan; i++) {
          const occupiedRow = startRow + i;
          if (occupiedRow < MAX_ROWS_PER_COLUMN) {
            cellMap[`${colIndex}-${occupiedRow}`] = {
              type: 'widget-occupied',
              widget: widget
            };
          }
        }
      });
    });
    
    return cellMap;
  };

  // Render all grid cells (iterating row by row for CSS Grid)
  const renderGridCells = () => {
    const cellMap = buildGridCellMap();
    const cells = [];
    
    // Iterate row by row (CSS Grid fills row by row)
    for (let row = 0; row < MAX_ROWS_PER_COLUMN; row++) {
      for (let col = 0; col < COLUMNS; col++) {
        const cellKey = `${col}-${row}`;
        const cell = cellMap[cellKey];
        
        if (cell.type === 'widget-start') {
          // Render widget with grid-row span
          const widget = cell.widget;
          cells.push(
            <div
              key={cellKey}
              className="h-full overflow-hidden"
              style={{ gridRow: `span ${widget.rowSpan}` }}
            >
              <DropZone
                rowIndex={row}
                colIndex={col}
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
            </div>
          );
        } else if (cell.type === 'empty') {
          // Render empty drop zone
          cells.push(
            <div key={cellKey} className="h-full overflow-hidden">
              <DropZone
                rowIndex={row}
                colIndex={col}
                onDrop={handleDrop}
                validateDrop={validateDropPosition}
              >
                <div className="w-full h-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg flex items-center justify-center text-gray-400 dark:text-gray-600 text-sm">
                  Drop widget here
                </div>
              </DropZone>
            </div>
          );
        }
        // If cell.type === 'widget-occupied', skip rendering (already part of a widget span)
      }
    }
    
    return cells;
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="w-full h-full">
        {/* Unified grid layout with equal spacing */}
        <div 
          className="w-full h-full grid grid-cols-5 gap-4"
          style={{ 
            gridTemplateRows: 'repeat(4, minmax(0, 1fr))'
          }}
        >
          {renderGridCells()}
        </div>
      </div>
    </DndProvider>
  );
}
