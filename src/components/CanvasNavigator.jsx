import React from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useCanvas } from '@/contexts/CanvasContext';

/**
 * Canvas Navigator Component
 * Displays under the settings icon with chevron buttons for navigation
 */
export function CanvasNavigator() {
  const { canvases, activeCanvasId, setActiveCanvasId } = useCanvas();

  // Don't show if only one canvas
  if (canvases.length <= 1) {
    return null;
  }

  const currentIndex = canvases.findIndex(c => c.id === activeCanvasId);
  const canvasNumber = currentIndex + 1;

  const handleNavigateUp = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : canvases.length - 1;
    setActiveCanvasId(canvases[newIndex].id);
  };

  const handleNavigateDown = () => {
    const newIndex = currentIndex < canvases.length - 1 ? currentIndex + 1 : 0;
    setActiveCanvasId(canvases[newIndex].id);
  };

  return (
    <div className="fixed right-4 bottom-20 z-40 flex flex-col gap-1">
      {/* Up Chevron */}
      <button
        onClick={handleNavigateUp}
        className="group bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-2 rounded-l-lg shadow-lg border-2 border-r-0 border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600 transition-all duration-200"
        aria-label="Previous canvas"
        title="Previous canvas"
      >
        <ChevronUp className="h-4 w-4 group-hover:-translate-y-0.5 transition-transform duration-200" />
      </button>

      {/* Canvas Indicator */}
      <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1 rounded-l-lg shadow-lg border-2 border-r-0 border-gray-200 dark:border-gray-800 text-xs font-medium text-center">
        {canvasNumber}/{canvases.length}
      </div>

      {/* Down Chevron */}
      <button
        onClick={handleNavigateDown}
        className="group bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-2 rounded-l-lg shadow-lg border-2 border-r-0 border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600 transition-all duration-200"
        aria-label="Next canvas"
        title="Next canvas"
      >
        <ChevronDown className="h-4 w-4 group-hover:translate-y-0.5 transition-transform duration-200" />
      </button>
    </div>
  );
}
