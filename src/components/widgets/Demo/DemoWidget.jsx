import React, { useState, useEffect } from 'react';
import { BaseWidgetV2 } from '../../BaseWidgetV2';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  TestTube, 
  Sparkles, 
  AlertCircle,
  CheckCircle,
  ExternalLink,
  Star,
  Clock,
  User
} from 'lucide-react';
import { formatRelativeDate } from '@/lib/dateUtils';
import { WidgetModal, WidgetModalFooter } from '@/components/ui/widget-modal';

/**
 * DemoWidget - Comprehensive demonstration of BaseWidgetV2 capabilities
 * 
 * This widget showcases ALL features of the standardized BaseWidgetV2:
 * - Header Zone: Logo, App Name, Widget Name, Badge
 * - Action Buttons: Settings (with modal), Refresh, Collapse/Expand
 * - All Content States: Loading, Error, Empty, Positive
 * - Settings Modal: With various input types
 * - Search functionality
 * - Card-based content display
 */
export function DemoWidget({ rowSpan = 3, dragRef }) {
  // Widget state management
  const [currentState, setCurrentState] = useState('loading'); // 'loading' | 'error' | 'empty' | 'positive'
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [errorActionLoading, setErrorActionLoading] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState({
    itemCount: 10,
    showTimestamps: true,
    sortOrder: 'newest',
    theme: 'default',
    autoRefresh: false,
  });
  
  // Temporary settings for modal
  const [tempSettings, setTempSettings] = useState(settings);
  
  // Simulate data loading
  const loadData = async (showError = false, showEmpty = false) => {
    setCurrentState('loading');
    
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    if (showError) {
      setCurrentState('error');
      setRefreshing(false);
      return;
    }
    
    if (showEmpty) {
      setItems([]);
      setCurrentState('empty');
      setRefreshing(false);
      return;
    }
    
    // Generate sample data with different card variants
    const sampleItems = Array.from({ length: settings.itemCount }, (_, i) => ({
      id: i + 1,
      title: `Sample Item ${i + 1}`,
      description: `This is a description for item ${i + 1}. It demonstrates card content in the positive state.`,
      author: `User ${Math.floor(Math.random() * 10) + 1}`,
      timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: ['success', 'pending', 'warning', 'error', 'info'][Math.floor(Math.random() * 5)],
      rating: Math.floor(Math.random() * 5) + 1,
      variant: ['success', 'error', 'warning', 'info', 'neutral'][i % 5], // Cycle through variants
    }));
    
    // Sort items
    const sortedItems = [...sampleItems].sort((a, b) => {
      if (settings.sortOrder === 'newest') {
        return new Date(b.timestamp) - new Date(a.timestamp);
      } else {
        return new Date(a.timestamp) - new Date(b.timestamp);
      }
    });
    
    setItems(sortedItems);
    setCurrentState('positive');
    setRefreshing(false);
  };
  
  // Initial load
  useEffect(() => {
    loadData();
  }, [settings.itemCount, settings.sortOrder]);
  
  // Auto-refresh if enabled
  useEffect(() => {
    if (settings.autoRefresh) {
      const interval = setInterval(() => {
        handleRefresh();
      }, 30000); // 30 seconds
      
      return () => clearInterval(interval);
    }
  }, [settings.autoRefresh]);
  
  // Handlers
  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };
  
  const handleSettingsOpen = () => {
    setTempSettings(settings);
    setSettingsOpen(true);
  };
  
  const handleSettingsSave = () => {
    setSettings(tempSettings);
    setSettingsOpen(false);
  };
  
  const handleSettingsCancel = () => {
    setTempSettings(settings);
    setSettingsOpen(false);
  };
  
  const handleErrorAction = async () => {
    setErrorActionLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setErrorActionLoading(false);
    loadData();
  };
  
  const handleItemClick = (item) => {
    console.log('Item clicked:', item);
  };
  
  // Filter items based on search
  const filteredItems = items.filter(item => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(query) ||
      item.description.toLowerCase().includes(query) ||
      item.author.toLowerCase().includes(query)
    );
  });
  
  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600 dark:text-green-400" />;
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />;
      case 'info':
        return <Clock className="h-4 w-4 text-blue-600 dark:text-blue-400" />;
      case 'pending':
        return <Clock className="h-4 w-4 text-gray-600 dark:text-gray-400" />;
      default:
        return null;
    }
  };
  
  // Get card styling based on variant
  const getCardStyles = (variant) => {
    switch (variant) {
      case 'success':
        return 'bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800';
      case 'error':
        return 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-200 dark:border-red-800';
      case 'warning':
        return 'bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border-yellow-200 dark:border-yellow-800';
      case 'info':
        return 'bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800';
      case 'neutral':
      default:
        return 'bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/40 dark:to-slate-900/40 border-gray-200 dark:border-gray-700';
    }
  };
  
  // Get text color based on variant
  const getTextColor = (variant) => {
    switch (variant) {
      case 'success':
        return 'text-green-900 dark:text-green-100';
      case 'error':
        return 'text-red-900 dark:text-red-100';
      case 'warning':
        return 'text-yellow-900 dark:text-yellow-100';
      case 'info':
        return 'text-blue-900 dark:text-blue-100';
      case 'neutral':
      default:
        return 'text-gray-900 dark:text-gray-100';
    }
  };
  
  // Get secondary text color based on variant
  const getSecondaryTextColor = (variant) => {
    switch (variant) {
      case 'success':
        return 'text-green-700 dark:text-green-300';
      case 'error':
        return 'text-red-700 dark:text-red-300';
      case 'warning':
        return 'text-yellow-700 dark:text-yellow-300';
      case 'info':
        return 'text-blue-700 dark:text-blue-300';
      case 'neutral':
      default:
        return 'text-gray-700 dark:text-gray-300';
    }
  };
  
  // Get icon color based on variant
  const getIconColor = (variant) => {
    switch (variant) {
      case 'success':
        return 'text-green-600 dark:text-green-400';
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'warning':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'info':
        return 'text-blue-600 dark:text-blue-400';
      case 'neutral':
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };
  
  // Badge showing item count
  const badge = filteredItems.length > 0 ? (
    <Badge variant="secondary">{filteredItems.length}</Badge>
  ) : null;
  
  // Custom action buttons (demo state switchers)
  const customActions = (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => loadData(true, false)}
        title="Simulate Error"
        className="text-xs h-7 px-2"
      >
        Error
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => loadData(false, true)}
        title="Simulate Empty"
        className="text-xs h-7 px-2"
      >
        Empty
      </Button>
    </>
  );
  
  return (
    <>
      <BaseWidgetV2
        // Header Zone
        logo={TestTube}
        appName="Demo"
        widgetName="Widget Showcase"
        tooltip="Comprehensive demonstration of BaseWidgetV2 features"
        badge={badge}
        
        // Action Buttons
        showSettings={true}
        onSettingsClick={handleSettingsOpen}
        showRefresh={true}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        customActions={customActions}
        
        // Content State
        state={currentState}
        
        // Loading State
        loadingMessage="Loading demo data..."
        
        // Error State
        errorIcon={AlertCircle}
        errorMessage="Failed to load demo data. This is a simulated error state."
        errorActionLabel="Retry Loading"
        onErrorAction={handleErrorAction}
        errorActionLoading={errorActionLoading}
        
        // Empty State
        emptyIcon={TestTube}
        emptyMessage="No items to display"
        emptySubmessage="This is the empty state. Try adjusting your settings."
        
        // Positive State (Content)
        searchEnabled={true}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search demo items..."
        
        // Layout
        rowSpan={rowSpan}
        dragRef={dragRef}
      >
        {/* Content Cards */}
        {filteredItems.length === 0 && searchQuery ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <TestTube className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No items match your search</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-lg border hover:shadow-md transition-shadow cursor-pointer group ${getCardStyles(item.variant)}`}
                onClick={() => handleItemClick(item)}
              >
                {/* Header with title and status */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getStatusIcon(item.status)}
                    <p className={`font-semibold text-sm line-clamp-1 ${getTextColor(item.variant)}`}>
                      {item.title}
                    </p>
                  </div>
                  <ExternalLink className={`h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ${getIconColor(item.variant)}`} />
                </div>
                
                {/* Description */}
                <p className={`text-xs line-clamp-2 mb-2 ${getSecondaryTextColor(item.variant)}`}>
                  {item.description}
                </p>
                
                {/* Footer with metadata */}
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <User className={`h-3 w-3 ${getIconColor(item.variant)}`} />
                      <span className={getIconColor(item.variant)}>{item.author}</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: item.rating }).map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                  </div>
                  {settings.showTimestamps && (
                    <span className={`whitespace-nowrap ${getSecondaryTextColor(item.variant)}`}>
                      {formatRelativeDate(item.timestamp)}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </BaseWidgetV2>
      
      {/* Settings Modal */}
      <WidgetModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        title="Demo Widget Settings"
        description="Configure the demo widget to see different features and states."
        icon={TestTube}
        footer={
          <WidgetModalFooter
            onCancel={handleSettingsCancel}
            onSave={handleSettingsSave}
          />
        }
      >
        <div className="space-y-4">
          {/* Item Count - Input Box */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Item Count
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Number of items to display in the widget
            </p>
            <input
              type="number"
              min="0"
              max="50"
              value={tempSettings.itemCount}
              onChange={(e) => setTempSettings({ ...tempSettings, itemCount: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          
          {/* Sort Order - Dropdown */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Sort Order
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              How to sort the items by timestamp
            </p>
            <div className="relative">
              <select
                value={tempSettings.sortOrder}
                onChange={(e) => setTempSettings({ ...tempSettings, sortOrder: e.target.value })}
                className="w-full px-3 py-2 pr-8 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600 appearance-none cursor-pointer"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500 dark:text-gray-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Theme - Radio Buttons */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Theme
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Visual theme for the widget cards
            </p>
            <div className="space-y-2">
              {['default', 'minimal', 'vibrant'].map((theme) => (
                <label key={theme} className="flex items-center gap-2 cursor-pointer group">
                  <div className="relative flex items-center">
                    <input
                      type="radio"
                      name="theme"
                      value={theme}
                      checked={tempSettings.theme === theme}
                      onChange={(e) => setTempSettings({ ...tempSettings, theme: e.target.value })}
                      className="sr-only"
                    />
                    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors ${
                      tempSettings.theme === theme
                        ? 'border-gray-600 dark:border-gray-400 bg-gray-600 dark:bg-gray-400'
                        : 'border-gray-300 dark:border-gray-600 group-hover:border-gray-400 dark:group-hover:border-gray-500'
                    }`}>
                      {tempSettings.theme === theme && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                  <span className="text-sm text-gray-900 dark:text-gray-100 capitalize">{theme}</span>
                </label>
              ))}
            </div>
          </div>
          
          {/* Show Timestamps - Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Show Timestamps
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Display relative timestamps on each item
            </p>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={tempSettings.showTimestamps}
                onChange={(e) => setTempSettings({ ...tempSettings, showTimestamps: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 dark:peer-focus:ring-gray-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-2 after:border-gray-300 dark:after:border-gray-700 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-900 dark:peer-checked:bg-blue-900 peer-checked:border-2 peer-checked:border-white dark:peer-checked:border-white peer-checked:after:border-white"></div>
              <span className="ml-3 text-sm text-gray-900 dark:text-gray-100">
                {tempSettings.showTimestamps ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>
          
          {/* Auto Refresh - Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Auto Refresh
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Automatically refresh data every 30 seconds
            </p>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={tempSettings.autoRefresh}
                onChange={(e) => setTempSettings({ ...tempSettings, autoRefresh: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 dark:peer-focus:ring-gray-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-2 after:border-gray-300 dark:after:border-gray-700 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-900 dark:peer-checked:bg-blue-900 peer-checked:border-2 peer-checked:border-white dark:peer-checked:border-white peer-checked:after:border-white"></div>
              <span className="ml-3 text-sm text-gray-900 dark:text-gray-100">
                {tempSettings.autoRefresh ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>
          
          {/* Action Button Example */}
          <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={() => {
                setTempSettings({
                  itemCount: 10,
                  showTimestamps: true,
                  sortOrder: 'newest',
                  theme: 'default',
                  autoRefresh: false,
                });
              }}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      </WidgetModal>
    </>
  );
}
