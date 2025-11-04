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

export function DraggableWidget({ widgetId, widget, rowSpan = 1, onResize, currentLayout }) {
  const [{ isDragging }, drag, dragPreview] = useDrag(() => ({
    type: WIDGET_TYPE,
    item: () => {
      return { widgetId };
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [currentLayout, widgetId]);

  if (!widget) return null;

  const WidgetComponent = widget.component;
  
  // Smart resize: analyzes available space and expands/reduces accordingly
  const handleResizeClick = () => {
    onResize(widgetId);
  };

  return (
    <div
      ref={dragPreview}
      className={`relative h-full transition-all duration-300 ease-in-out ${
        isDragging ? 'opacity-50 scale-95' : 'opacity-100 scale-100'
      }`}
    >
      {/* Smart Resize Icon in Bottom Right Corner */}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={handleResizeClick}
              className="absolute bottom-2 right-2 z-10 p-1.5 rounded-lg bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-800 shadow-md transition-all hover:scale-110 border border-gray-200 dark:border-gray-700"
            >
              <RiExpandUpDownFill className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Smart resize (current: {rowSpan} row{rowSpan > 1 ? 's' : ''})</p>
            <p className="text-xs text-gray-500">Cycles intelligently based on available space</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      
      {/* Widget Content - Pass rowSpan and drag ref to widget component */}
      <WidgetComponent rowSpan={rowSpan} dragRef={drag} />
    </div>
  );
}
