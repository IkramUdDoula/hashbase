import React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * BaseWidget Component
 * A simple widget container with fixed height based on rowSpan (1-4 rows)
 * Includes custom minimalistic scrollbar styling
 * 
 * Height mapping:
 * - 1 row = 200px
 * - 2 rows = 400px
 * - 3 rows = 600px
 * - 4 rows = 800px
 * 
 * @param {Object} props
 * @param {React.Component} props.logo - Logo icon component (used as drag handle)
 * @param {string} props.appName - Application name (e.g., "Gmail")
 * @param {string} props.widgetName - Widget name (e.g., "Unread")
 * @param {string} props.tooltip - Tooltip text (optional)
 * @param {React.ReactNode} props.badge - Badge element to display in header (optional)
 * @param {React.ReactNode} props.headerActions - Action buttons for header (optional)
 * @param {number} props.rowSpan - Number of rows (1-4) this widget occupies
 * @param {React.ReactNode} props.children - Widget content
 * @param {string} props.className - Additional CSS classes
 * @param {React.Ref} props.dragRef - Ref for drag handle
 */
export function BaseWidget({ 
  logo: Logo, 
  appName,
  widgetName, 
  tooltip, 
  badge,
  headerActions,
  rowSpan = 1,
  children,
  className = '',
  dragRef
}) {
  // Calculate fixed height based on rowSpan
  const heightMap = {
    1: 'h-[200px]',
    2: 'h-[400px]',
    3: 'h-[600px]',
    4: 'h-[800px]'
  };
  
  const heightClass = heightMap[rowSpan] || heightMap[1];
  
  const headerContent = (
    <div className="flex items-center gap-2">
      {Logo && (
        <div 
          ref={dragRef}
          className="cursor-move p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Drag to rearrange"
        >
          <Logo className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </div>
      )}
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 hidden md:inline">{appName}</span>
      <p className="hidden lg:inline">-</p>
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 hidden lg:inline">{widgetName}</span>
    </div>
  );
  
  return (
    <div className={`w-full flex flex-col bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800 rounded-xl shadow-sm ${heightClass} ${className}`}>
      {/* Header */}
      <div className="px-6 pt-4 pb-3 flex-shrink-0 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          {tooltip ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  {headerContent}
                </TooltipTrigger>
                <TooltipContent>
                  <p>{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            headerContent
          )}
          <div className="flex items-center gap-2">
            {headerActions}
          </div>
        </div>
      </div>
      
      {/* Content with custom scrollbar */}
      <div className="flex-1 overflow-hidden flex flex-col px-6 py-4">
        <style>{`
          .custom-scrollbar::-webkit-scrollbar {
            width: 6px;
          }
          .custom-scrollbar::-webkit-scrollbar-track {
            background: transparent;
            margin: 4px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #d1d5db;
            border-radius: 3px;
          }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #9ca3af;
          }
          .dark .custom-scrollbar::-webkit-scrollbar-thumb {
            background: #4b5563;
          }
          .dark .custom-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #6b7280;
          }
        `}</style>
        {children}
      </div>
    </div>
  );
}
