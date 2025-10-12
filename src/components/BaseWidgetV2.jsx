import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { RefreshCw, Settings, Loader2, RotateCcw } from 'lucide-react';
import { ScrollbarStyles } from '@/components/ui/scrollbar-styles';
import { WidgetSearch } from '@/components/WidgetSearch';
import { WidgetEmptyState } from '@/components/WidgetEmptyState';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

/**
 * BaseWidgetV2 Component - Standardized Widget Container
 * 
 * A comprehensive widget container with standardized zones and states:
 * 
 * ZONES:
 * - Header Zone: Logo, App Name, Widget Name, Badge
 * - Action Buttons: Settings (with modal), Refresh, Expand/Collapse
 * - Content Zone: Loading, Error, Empty, and Positive states
 * 
 * STATES:
 * - Loading: Shows loading spinner
 * - Error: Shows error icon, message, and configurable action button
 * - Empty: Shows empty state icon and message
 * - Positive: Shows search bar and content (cards/list)
 * 
 * HEIGHT MAPPING (responsive):
 * - 1 row = h-[12rem] (192px)
 * - 2 rows = h-[25rem] (400px)
 * - 3 rows = h-[38rem] (608px)
 * - 4 rows = h-[51rem] (816px)
 * 
 * @param {Object} props
 * 
 * HEADER ZONE:
 * @param {React.Component} props.logo - Logo icon component (drag handle)
 * @param {string} props.appName - Application name (e.g., "Gmail")
 * @param {string} props.widgetName - Widget name (e.g., "Unread")
 * @param {string} props.tooltip - Tooltip text for header (optional)
 * @param {React.ReactNode} props.badge - Badge element to display (optional)
 * 
 * ACTION BUTTONS:
 * @param {boolean} props.showSettings - Show settings button (default: false)
 * @param {function} props.onSettingsClick - Settings button click handler
 * @param {boolean} props.showRefresh - Show refresh button (default: true)
 * @param {function} props.onRefresh - Refresh button click handler
 * @param {boolean} props.refreshing - Refresh loading state (default: false)
 * @param {React.ReactNode} props.customActions - Additional custom action buttons
 * 
 * CONTENT STATES:
 * @param {string} props.state - Current state: 'loading' | 'error' | 'empty' | 'positive'
 * 
 * LOADING STATE:
 * @param {string} props.loadingMessage - Custom loading message (optional)
 * 
 * ERROR STATE:
 * @param {React.Component} props.errorIcon - Error icon component (optional)
 * @param {string} props.errorMessage - Error message to display
 * @param {string} props.errorActionLabel - Error action button label (e.g., "Try Again", "Authenticate")
 * @param {function} props.onErrorAction - Error action button click handler
 * @param {boolean} props.errorActionLoading - Error action button loading state
 * @param {string} props.errorSecondaryActionLabel - Secondary error action button label (optional)
 * @param {function} props.onErrorSecondaryAction - Secondary error action button click handler (optional)
 * @param {boolean} props.errorSecondaryActionLoading - Secondary error action button loading state (optional)
 * 
 * EMPTY STATE:
 * @param {React.Component} props.emptyIcon - Empty state icon component
 * @param {string} props.emptyMessage - Primary empty message
 * @param {string} props.emptySubmessage - Secondary empty message (optional)
 * 
 * POSITIVE STATE (Content):
 * @param {boolean} props.searchEnabled - Show search bar (default: false)
 * @param {string} props.searchValue - Search input value
 * @param {function} props.onSearchChange - Search value change handler
 * @param {string} props.searchPlaceholder - Search placeholder text
 * @param {React.ReactNode} props.children - Widget content (cards/list)
 * 
 * LAYOUT:
 * @param {number} props.rowSpan - Number of rows (1-4) this widget occupies
 * @param {string} props.className - Additional CSS classes
 * @param {React.Ref} props.dragRef - Ref for drag handle
 */
export function BaseWidgetV2({ 
  // Header Zone
  logo: Logo, 
  appName,
  widgetName, 
  tooltip, 
  badge,
  
  // Action Buttons
  showSettings = false,
  onSettingsClick,
  showRefresh = true,
  onRefresh,
  refreshing = false,
  customActions,
  
  // Content State
  state = 'positive', // 'loading' | 'error' | 'empty' | 'positive'
  
  // Loading State
  loadingMessage,
  
  // Error State
  errorIcon: ErrorIcon,
  errorMessage,
  errorActionLabel = 'Try Again',
  onErrorAction,
  errorActionLoading = false,
  errorSecondaryActionLabel,
  onErrorSecondaryAction,
  errorSecondaryActionLoading = false,
  
  // Empty State
  emptyIcon: EmptyIcon,
  emptyMessage,
  emptySubmessage,
  
  // Positive State (Content)
  searchEnabled = false,
  searchValue = '',
  onSearchChange,
  searchPlaceholder = 'Search...',
  children,
  
  // Layout
  rowSpan = 1,
  className = '',
  dragRef
}) {
  // State for header visibility
  const [isHeaderVisible, setIsHeaderVisible] = useState(false);
  
  // Calculate dynamic height based on rowSpan
  const heightMap = {
    1: 'h-[12rem]',
    2: 'h-[25rem]',
    3: 'h-[38rem]',
    4: 'h-[51rem]'
  };
  
  const heightClass = heightMap[rowSpan] || heightMap[1];
  
  // Handle mouse movement to detect cursor near top
  const handleMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mouseY = e.clientY - rect.top;
    // Show header if cursor is within 40px of the top
    setIsHeaderVisible(mouseY < 40);
  };
  
  const handleMouseLeave = () => {
    setIsHeaderVisible(false);
  };
  
  // Header content with logo, app name, and widget name
  const headerContent = (
    <div className="flex items-center gap-2">
      {Logo && (
        <div 
          ref={dragRef}
          className="cursor-move p-0.5 rounded hover:bg-white/50 dark:hover:bg-white/10 transition-colors"
        >
          <Logo className="h-4 w-4 text-gray-700 dark:text-gray-300" />
        </div>
      )}
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 hidden md:inline">{appName}</span>
      <p className="hidden lg:inline">-</p>
      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 hidden lg:inline">{widgetName}</span>
      {badge && <div className="ml-1">{badge}</div>}
    </div>
  );
  
  // Render action buttons
  const renderActions = () => (
    <div className="flex items-center gap-1">
      {customActions}
      
      {showSettings && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onSettingsClick}
          title="Settings"
        >
          <Settings className="h-4 w-4" />
        </Button>
      )}
      
      {showRefresh && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onRefresh}
          disabled={refreshing}
          title="Refresh"
        >
          <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
        </Button>
      )}
    </div>
  );
  
  // Render content based on state
  const renderContent = () => {
    switch (state) {
      case 'loading':
        return (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-2" />
            {loadingMessage && (
              <p className="text-sm text-muted-foreground">{loadingMessage}</p>
            )}
          </div>
        );
      
      case 'error':
        const ErrorIconComponent = ErrorIcon || Logo;
        return (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            {ErrorIconComponent && (
              <ErrorIconComponent className="h-12 w-12 text-muted-foreground mb-2" />
            )}
            <p className="text-sm text-muted-foreground mb-3">{errorMessage}</p>
            <div className="flex flex-col gap-2">
              {onErrorAction && (
                <button
                  onClick={onErrorAction}
                  disabled={errorActionLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                >
                  {errorActionLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {errorActionLabel}
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4" />
                      {errorActionLabel}
                    </>
                  )}
                </button>
              )}
              {onErrorSecondaryAction && (
                <button
                  onClick={onErrorSecondaryAction}
                  disabled={errorSecondaryActionLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                >
                  {errorSecondaryActionLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {errorSecondaryActionLabel}
                    </>
                  ) : (
                    <>
                      <RotateCcw className="h-4 w-4" />
                      {errorSecondaryActionLabel}
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        );
      
      case 'empty':
        return (
          <WidgetEmptyState
            icon={EmptyIcon || Logo}
            message={emptyMessage}
            submessage={emptySubmessage}
          />
        );
      
      case 'positive':
      default:
        return (
          <>
            {searchEnabled && (
              <WidgetSearch
                value={searchValue}
                onChange={onSearchChange}
                placeholder={searchPlaceholder}
              />
            )}
            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
              {children}
            </div>
          </>
        );
    }
  };
  
  return (
    <div 
      className={`w-full flex flex-col bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800 rounded-xl shadow-sm ${heightClass} ${className} relative overflow-hidden`}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {/* Floating Header Zone - Only visible on hover near top */}
      <div 
        className={`absolute top-0 left-0 right-0 z-10 px-3 pt-2 pb-1.5 bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-b border-gray-100 dark:border-gray-800 transition-all duration-300 ease-in-out ${
          isHeaderVisible 
            ? 'translate-y-0 opacity-100' 
            : '-translate-y-full opacity-0'
        }`}
      >
        <div className="flex items-center justify-between">
          {tooltip ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>{headerContent}</div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{tooltip}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            headerContent
          )}
          {renderActions()}
        </div>
      </div>
      
      {/* Content Zone with custom scrollbar - Full height */}
      <div className="flex-1 overflow-hidden flex flex-col px-3 py-2">
        <ScrollbarStyles />
        {renderContent()}
      </div>
    </div>
  );
}
