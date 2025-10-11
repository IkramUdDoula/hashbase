import React from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { ScrollbarStyles } from '@/components/ui/scrollbar-styles';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * BaseWidget Component
 * A simple widget container with dynamic height based on rowSpan (1-4 rows)
{{ ... }}
 * 
 * Height mapping (responsive):
 * - 1 row = h-[12rem] (192px base)
 * - 2 rows = h-[25rem] (400px base)
 * - 3 rows = h-[38rem] (608px base)
 * - 4 rows = h-[51rem] (816px base)
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
  // Calculate dynamic height based on rowSpan
  const heightMap = {
    1: 'h-[12rem]',
    2: 'h-[25rem]',
    3: 'h-[38rem]',
    4: 'h-[51rem]'
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
        <ScrollbarStyles />
        {children}
      </div>
    </div>
  );
}
