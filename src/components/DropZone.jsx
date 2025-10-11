import React from 'react';
import { useDrop } from 'react-dnd';

const WIDGET_TYPE = 'WIDGET';

export function DropZone({ rowIndex, colIndex, onDrop, children }) {
  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: WIDGET_TYPE,
    drop: (item) => {
      onDrop(item.widgetId, colIndex, rowIndex);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  const isActive = isOver && canDrop;

  return (
    <div
      ref={drop}
      className={`relative transition-all duration-200 ${
        isActive
          ? 'ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-black'
          : ''
      } ${canDrop && !isActive ? 'ring-1 ring-gray-300 dark:ring-gray-700' : ''}`}
    >
      {children}
      
      {/* Drop indicator overlay */}
      {isActive && (
        <div className="absolute inset-0 bg-blue-500/10 dark:bg-blue-400/10 rounded-lg pointer-events-none flex items-center justify-center">
          <div className="text-blue-600 dark:text-blue-400 font-medium bg-white/90 dark:bg-gray-900/90 px-4 py-2 rounded-lg shadow-lg">
            Drop here
          </div>
        </div>
      )}
    </div>
  );
}
