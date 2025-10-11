import React from 'react';
import { useDrag } from 'react-dnd';
import { GripVertical, Maximize2, Minimize2 } from 'lucide-react';

const WIDGET_TYPE = 'WIDGET';

export function DraggableWidget({ widgetId, widget, rowSpan = 1, onResize }) {
  const [{ isDragging }, drag, dragPreview] = useDrag(() => ({
    type: WIDGET_TYPE,
    item: { widgetId },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }));

  if (!widget) return null;

  const WidgetComponent = widget.component;

  return (
    <div
      ref={dragPreview}
      className={`relative transition-opacity h-full ${
        isDragging ? 'opacity-50' : 'opacity-100'
      }`}
    >
      {/* Drag Handle */}
      <div
        ref={drag}
        className="absolute top-2 left-2 z-10 cursor-move p-1 rounded bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 shadow-sm transition-colors"
        title="Drag to rearrange"
      >
        <GripVertical className="w-5 h-5 text-gray-600 dark:text-gray-400" />
      </div>
      
      {/* Size Controls */}
      <div className="absolute top-2 right-2 z-10 flex gap-1">
        <button
          onClick={() => onResize(widgetId, rowSpan - 1)}
          disabled={rowSpan <= 1}
          className="p-1 rounded bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 shadow-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Decrease height"
        >
          <Minimize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
        <div className="px-2 py-1 rounded bg-white/80 dark:bg-gray-800/80 shadow-sm text-xs font-medium text-gray-700 dark:text-gray-300">
          {rowSpan}
        </div>
        <button
          onClick={() => onResize(widgetId, rowSpan + 1)}
          disabled={rowSpan >= 4}
          className="p-1 rounded bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 shadow-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          title="Increase height"
        >
          <Maximize2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
        </button>
      </div>
      
      {/* Widget Content - Pass rowSpan to widget component */}
      <div className="h-full overflow-hidden pointer-events-auto">
        <WidgetComponent rowSpan={rowSpan} />
      </div>
    </div>
  );
}
