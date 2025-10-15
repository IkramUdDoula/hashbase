import React from 'react';
import { useDrop } from 'react-dnd';
import { getDropzoneNumber } from '@/services/layoutService';

const WIDGET_TYPE = 'WIDGET';

export function DropZone({ rowIndex, colIndex, onDrop, children, showDebug = false, validateDrop }) {
  const dropzoneNumber = getDropzoneNumber(colIndex, rowIndex);
  
  const [{ isOver, canDrop, draggedItem }, drop] = useDrop(() => ({
    accept: WIDGET_TYPE,
    drop: (item) => {
      onDrop(item.widgetId, colIndex, rowIndex);
    },
    canDrop: (item) => {
      // Use custom validation if provided
      if (validateDrop) {
        return validateDrop(item.widgetId, colIndex, rowIndex);
      }
      return true;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
      draggedItem: monitor.getItem(),
    }),
  }));

  const isActive = isOver && canDrop;
  const isInvalid = isOver && !canDrop;

  return (
    <div
      ref={drop}
      className={`relative h-full transition-all duration-200 ${
        isActive
          ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-black'
          : ''
      } ${
        isInvalid
          ? 'ring-2 ring-red-500 ring-offset-2 dark:ring-offset-black'
          : ''
      } ${canDrop && !isActive ? 'ring-1 ring-gray-300 dark:ring-gray-700' : ''}`}
      data-dropzone={dropzoneNumber}
    >
      {children}
      
      {/* Debug: Show dropzone number (hidden by default) */}
      {showDebug && (
        <div className="absolute top-1 left-1 text-xs font-mono text-gray-400 dark:text-gray-600 bg-white/50 dark:bg-black/50 px-1 rounded pointer-events-none z-50">
          #{dropzoneNumber}
        </div>
      )}
      
      {/* Valid drop indicator overlay */}
      {isActive && (
        <div className="absolute inset-0 bg-blue-500/10 dark:bg-blue-400/10 rounded-lg pointer-events-none flex items-center justify-center">
          <div className="text-blue-600 dark:text-blue-400 font-medium bg-white/90 dark:bg-gray-900/90 px-4 py-2 rounded-lg shadow-lg">
            Drop here
          </div>
        </div>
      )}
      
      {/* Invalid drop indicator overlay */}
      {isInvalid && (
        <div className="absolute inset-0 bg-red-500/10 dark:bg-red-400/10 rounded-lg pointer-events-none flex items-center justify-center">
          <div className="text-red-600 dark:text-red-400 font-medium bg-white/90 dark:bg-gray-900/90 px-4 py-2 rounded-lg shadow-lg">
            Cannot drop here
          </div>
        </div>
      )}
    </div>
  );
}
