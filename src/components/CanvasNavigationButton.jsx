import React from 'react';
import { Plus, ChevronUp, ChevronDown } from 'lucide-react';
import { useCanvas } from '@/contexts/CanvasContext';

/**
 * CanvasNavigationButton - Floating button on the left side
 * 
 * Shows Plus icon when there's only one canvas (to create new canvas)
 * Shows Chevron icons when there are multiple canvases (for navigation)
 */
export function CanvasNavigationButton() {
  const { 
    hasMultipleCanvases, 
    createCanvas, 
    navigateNext, 
    navigatePrevious,
    activeCanvas,
    canvases
  } = useCanvas();

  const handleClick = () => {
    if (!hasMultipleCanvases) {
      // Create new canvas
      createCanvas();
    }
  };

  const handleNavigateUp = () => {
    navigatePrevious();
  };

  const handleNavigateDown = () => {
    navigateNext();
  };

  // Get current canvas index for display
  const currentIndex = canvases.findIndex(c => c.id === activeCanvas.id);
  const canvasNumber = currentIndex + 1;

  return (
    <div className="fixed left-0 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-1">
      {hasMultipleCanvases ? (
        // Navigation mode: Show chevrons
        <>
          {/* Navigate to previous canvas */}
          <button
            onClick={handleNavigateUp}
            className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-2 rounded-r-lg shadow-lg hover:shadow-xl border-2 border-l-0 border-gray-200 dark:border-gray-800 transition-all duration-200 group hover:pl-3"
            aria-label="Previous canvas"
            title="Previous canvas"
          >
            <ChevronUp className="h-4 w-4 group-hover:-translate-y-0.5 transition-transform duration-200" />
          </button>

          {/* Canvas indicator */}
          <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1 rounded-r-lg shadow-lg border-2 border-l-0 border-gray-200 dark:border-gray-800 text-xs font-medium">
            {canvasNumber}/{canvases.length}
          </div>

          {/* Navigate to next canvas */}
          <button
            onClick={handleNavigateDown}
            className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-2 rounded-r-lg shadow-lg hover:shadow-xl border-2 border-l-0 border-gray-200 dark:border-gray-800 transition-all duration-200 group hover:pl-3"
            aria-label="Next canvas"
            title="Next canvas"
          >
            <ChevronDown className="h-4 w-4 group-hover:translate-y-0.5 transition-transform duration-200" />
          </button>
        </>
      ) : (
        // Create mode: Show plus icon
        <button
          onClick={handleClick}
          className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-2 rounded-r-lg shadow-lg hover:shadow-xl border-2 border-l-0 border-gray-200 dark:border-gray-800 transition-all duration-200 group hover:pl-3"
          aria-label="Create new canvas"
          title="Create new canvas"
        >
          <Plus className="h-4 w-4 group-hover:rotate-90 transition-transform duration-300" />
        </button>
      )}
    </div>
  );
}
