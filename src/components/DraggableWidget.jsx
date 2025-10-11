import React from 'react';
import { useDrag } from 'react-dnd';
import { RiExpandUpDownFill } from 'react-icons/ri';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

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
  
  // Cycle through sizes: 1 -> 2 -> 3 -> 4 -> 1 -> ...
  const handleResizeClick = () => {
    const nextSize = rowSpan >= 4 ? 1 : rowSpan + 1;
    onResize(widgetId, nextSize);
  };

  return (
    <div
      ref={dragPreview}
      className={`relative transition-opacity ${
        isDragging ? 'opacity-50' : 'opacity-100'
      }`}
    >
      {/* Dynamic Resize Icon in Bottom Right Corner */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleResizeClick}
              className="absolute bottom-2 right-2 z-10 p-1.5 rounded-lg bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 shadow-md transition-all hover:scale-110 border border-gray-200 dark:border-gray-700"
              title="Click to cycle widget height"
            >
              <RiExpandUpDownFill className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Click to cycle height (current: {rowSpan} row{rowSpan > 1 ? 's' : ''})</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {/* Widget Content - Pass rowSpan and drag ref to widget component */}
      <WidgetComponent rowSpan={rowSpan} dragRef={drag} />
    </div>
  );
}
