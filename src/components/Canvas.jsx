import React, { useState, useEffect } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DraggableWidget } from './DraggableWidget';
import { DropZone } from './DropZone';

export function Canvas({ widgets }) {
  // Initialize layout: 5 columns, each can have up to 4 rows
  const COLUMNS = 5;
  const MAX_ROWS_PER_COLUMN = 4;
  
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
            const allIdsValid = parsed.every(col =>
              col.every(w => currentWidgetIds.has(w.id))
            );
            if (allIdsValid) {
              return parsed;
            }
            // Widget IDs changed, clear layout
            console.log('Widget IDs changed, resetting layout');
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
  
  // Debug: Log layout on mount
  useEffect(() => {
    console.log('Canvas layout:', layout);
    console.log('Widgets:', widgets);
  }, []);
  
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

  // Handle widget drop
  const handleDrop = (widgetId, targetCol, targetRow) => {
    setLayout(prevLayout => {
      const newLayout = prevLayout.map(col => col.map(w => ({...w})));
      const widgetRowSpan = rowSpans[widgetId];
      
      // Find and remove widget from current position
      let removedWidget = null;
      for (let c = 0; c < COLUMNS; c++) {
        const widgetIndex = newLayout[c].findIndex(w => w.id === widgetId);
        if (widgetIndex !== -1) {
          removedWidget = newLayout[c][widgetIndex];
          newLayout[c].splice(widgetIndex, 1);
          break;
        }
      }
      
      // Check if widget can fit at target position
      if (!canFitWidget(newLayout[targetCol], targetRow, widgetRowSpan)) {
        // Can't fit, restore widget to original position
        if (removedWidget) {
          const originalCol = prevLayout.findIndex(col => col.some(w => w.id === widgetId));
          if (originalCol !== -1) {
            newLayout[originalCol].push(removedWidget);
          }
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
      
      return newLayout;
    });
  };

  // Handle widget resize
  const handleResize = (widgetId, newRowSpan) => {
    // Clamp between 1 and 4
    const clampedSpan = Math.max(1, Math.min(4, newRowSpan));
    
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
          // Check if new size fits
          if (canFitWidget(newLayout[c], widget.startRow, clampedSpan, widgetId)) {
            widget.rowSpan = clampedSpan;
          }
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

  // Render a column with widgets and drop zones
  const renderColumn = (column, colIndex) => {
    const occupied = getOccupiedRows(column);
    const rows = [];
    
    // Create drop zones for each row position
    for (let rowIndex = 0; rowIndex < MAX_ROWS_PER_COLUMN; rowIndex++) {
      // Check if this row is the start of a widget
      const widget = column.find(w => w && w.startRow === rowIndex);
      
      if (widget) {
        // Render widget with its rowSpan - flexible height based on content
        rows.push(
          <DropZone
            key={`${colIndex}-${rowIndex}`}
            rowIndex={rowIndex}
            colIndex={colIndex}
            onDrop={handleDrop}
          >
            <div className="min-h-[200px] h-auto">
              <DraggableWidget
                widgetId={widget.id}
                widget={getWidgetById(widget.id)}
                rowSpan={widget.rowSpan}
                onResize={handleResize}
              />
            </div>
          </DropZone>
        );
        
        // Skip the rows that this widget occupies
        rowIndex += widget.rowSpan - 1;
      } else if (!occupied.has(rowIndex)) {
        // Render empty drop zone
        rows.push(
          <DropZone
            key={`${colIndex}-${rowIndex}`}
            rowIndex={rowIndex}
            colIndex={colIndex}
            onDrop={handleDrop}
          >
            <div className="min-h-[200px] h-auto border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg flex items-center justify-center text-gray-400 dark:text-gray-600 text-sm py-20">
              Drop widget here
            </div>
          </DropZone>
        );
      }
    }
    
    return rows;
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="w-full max-w-[1800px] mx-auto">
        {/* 5 columns layout */}
        <div className="grid grid-cols-5 gap-4">
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
