import React from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { DropZone } from '../components/DropZone';

export function NewCanvas() {
  const COLUMNS = 5;
  const ROWS = 4;

  // Simple drop handler (no-op for now, just for demonstration)
  const handleDrop = (widgetId, colIndex, rowIndex) => {
    console.log(`Dropped widget ${widgetId} at column ${colIndex}, row ${rowIndex}`);
  };

  // Simple validation (always allow drops for now)
  const validateDrop = (widgetId, colIndex, rowIndex) => {
    return true;
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="w-screen h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:bg-[#000000] dark:from-black dark:via-black dark:to-black p-4 transition-colors duration-200">
        {/* Grid Container with unified spacing */}
        <div className="w-full h-full grid grid-cols-5 grid-rows-4 gap-4 auto-rows-fr">
          {Array.from({ length: ROWS }).map((_, rowIndex) => (
            Array.from({ length: COLUMNS }).map((_, colIndex) => (
              <DropZone
                key={`${colIndex}-${rowIndex}`}
                rowIndex={rowIndex}
                colIndex={colIndex}
                onDrop={handleDrop}
                validateDrop={validateDrop}
              >
                <div className="w-full h-full border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg flex items-center justify-center text-gray-400 dark:text-gray-600 text-sm hover:border-blue-400 dark:hover:border-blue-600 transition-colors duration-200">
                  <div className="text-center">
                    <div className="font-semibold mb-1">
                      Zone {colIndex * ROWS + rowIndex + 1}
                    </div>
                    <div className="text-xs opacity-70">
                      Col {colIndex + 1}, Row {rowIndex + 1}
                    </div>
                  </div>
                </div>
              </DropZone>
            ))
          ))}
        </div>
      </div>
    </DndProvider>
  );
}
