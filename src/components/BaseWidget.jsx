import React from 'react';

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
 * @param {React.Component} props.icon - Icon component to display in header
 * @param {string} props.title - Widget title
 * @param {string} props.description - Widget description (optional)
 * @param {React.ReactNode} props.badge - Badge element to display in header (optional)
 * @param {React.ReactNode} props.headerActions - Action buttons for header (optional)
 * @param {number} props.rowSpan - Number of rows (1-4) this widget occupies
 * @param {React.ReactNode} props.children - Widget content
 * @param {string} props.className - Additional CSS classes
 */
export function BaseWidget({ 
  icon: Icon, 
  title, 
  description, 
  badge,
  headerActions,
  rowSpan = 1,
  children,
  className = ''
}) {
  // Calculate fixed height based on rowSpan
  const heightMap = {
    1: 'h-[200px]',
    2: 'h-[400px]',
    3: 'h-[600px]',
    4: 'h-[800px]'
  };
  
  const heightClass = heightMap[rowSpan] || heightMap[1];
  
  return (
    <div className={`w-full flex flex-col bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800 rounded-xl shadow-sm ${heightClass} ${className}`}>
      {/* Header */}
      <div className="px-6 pt-4 pb-3 flex-shrink-0 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-5 w-5 text-gray-700 dark:text-gray-300" />}
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            {badge}
            {headerActions}
          </div>
        </div>
        {description && (
          <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
        )}
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
