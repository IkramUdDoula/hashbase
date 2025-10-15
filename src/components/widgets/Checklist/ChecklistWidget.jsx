import React, { useState, useEffect } from 'react';
import { BaseWidgetV2 } from '../../BaseWidgetV2';
import { Badge } from '@/components/ui/badge';
import { 
  CheckSquare, 
  Plus,
  Trash2,
  X
} from 'lucide-react';
import { WidgetModal, WidgetModalFooter } from '@/components/ui/widget-modal';

/**
 * ChecklistWidget - A simple checklist widget with automatic reordering
 * 
 * Features:
 * - Add new checklist items
 * - Check/uncheck items
 * - Checked items automatically move to the bottom
 * - Delete items
 * - Persistent storage in localStorage
 */
export function ChecklistWidget({ rowSpan = 2, dragRef }) {
  // Widget state management
  const [items, setItems] = useState([]);
  const [newItemText, setNewItemText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState({
    showCompleted: true,
    autoSort: true,
  });
  
  // Temporary settings for modal
  const [tempSettings, setTempSettings] = useState(settings);
  
  // Load items from localStorage on mount
  useEffect(() => {
    const savedItems = localStorage.getItem('checklistItems');
    if (savedItems) {
      try {
        const parsed = JSON.parse(savedItems);
        setItems(parsed);
        console.log('📂 Loaded checklist items:', parsed.length);
      } catch (e) {
        console.error('Failed to load checklist items:', e);
      }
    }
    
    const savedSettings = localStorage.getItem('checklistSettings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
        setTempSettings(parsed);
        console.log('📂 Loaded checklist settings');
      } catch (e) {
        console.error('Failed to load checklist settings:', e);
      }
    }
    
    // Mark as initialized after loading
    setIsInitialized(true);
  }, []);
  
  // Save items to localStorage whenever they change (but not on initial mount)
  useEffect(() => {
    if (!isInitialized) return; // Skip save on initial mount
    
    try {
      localStorage.setItem('checklistItems', JSON.stringify(items));
      console.log('✅ Saved checklist items:', items.length);
    } catch (error) {
      console.error('❌ Failed to save checklist items:', error);
    }
  }, [items, isInitialized]);
  
  // Save settings to localStorage whenever they change (but not on initial mount)
  useEffect(() => {
    if (!isInitialized) return; // Skip save on initial mount
    
    try {
      localStorage.setItem('checklistSettings', JSON.stringify(settings));
      console.log('✅ Saved checklist settings');
    } catch (error) {
      console.error('❌ Failed to save checklist settings:', error);
    }
  }, [settings, isInitialized]);
  
  // Sort items: unchecked first, then checked
  const getSortedItems = (itemsList) => {
    if (!settings.autoSort) return itemsList;
    
    return [...itemsList].sort((a, b) => {
      if (a.checked === b.checked) {
        return b.id - a.id; // Most recent first within each group
      }
      return a.checked ? 1 : -1; // Unchecked items first
    });
  };
  
  // Add new item
  const handleAddItem = () => {
    if (!newItemText.trim()) return;
    
    const newItem = {
      id: Date.now(),
      text: newItemText.trim(),
      checked: false,
      createdAt: new Date().toISOString(),
    };
    
    setItems([...items, newItem]);
    setNewItemText('');
  };
  
  // Toggle item checked state
  const handleToggleItem = (itemId) => {
    setItems(items.map(item => 
      item.id === itemId 
        ? { ...item, checked: !item.checked }
        : item
    ));
  };
  
  // Delete item
  const handleDeleteItem = (itemId) => {
    setItems(items.filter(item => item.id !== itemId));
  };
  
  // Handle Enter key in input
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleAddItem();
    } else if (e.key === 'Escape') {
      setNewItemText('');
    }
  };
  
  // Settings handlers
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
  
  const handleRefresh = () => {
    // Refresh just re-sorts the items
    setItems([...items]);
  };
  
  // Filter items based on search and settings
  const getFilteredItems = () => {
    let filtered = items;
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.text.toLowerCase().includes(query)
      );
    }
    
    // Filter by completion status
    if (!settings.showCompleted) {
      filtered = filtered.filter(item => !item.checked);
    }
    
    return getSortedItems(filtered);
  };
  
  const filteredItems = getFilteredItems();
  const uncheckedCount = items.filter(item => !item.checked).length;
  
  // Badge showing unchecked item count
  const badge = uncheckedCount > 0 ? (
    <Badge variant="secondary">{uncheckedCount}</Badge>
  ) : null;
  
  // Always show positive state so input box is visible
  const getWidgetState = () => {
    return 'positive';
  };
  
  return (
    <>
      <BaseWidgetV2
        // Header Zone
        logo={CheckSquare}
        appName="Checklist"
        widgetName="Tasks"
        tooltip="Manage your checklist items"
        badge={badge}
        
        // Action Buttons
        showSettings={true}
        onSettingsClick={handleSettingsOpen}
        showRefresh={true}
        onRefresh={handleRefresh}
        refreshing={false}
        
        // Content State
        state={getWidgetState()}
        
        // Empty State
        emptyIcon={CheckSquare}
        emptyMessage="No checklist items"
        emptySubmessage="Use the input box above to add your first task"
        
        // Positive State (Content)
        searchEnabled={items.length > 5}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search checklist..."
        
        // Layout
        rowSpan={rowSpan}
        dragRef={dragRef}
      >
        {/* Content */}
        <div className="flex flex-col h-full min-h-0">
          {/* Checklist Items - Scrollable area */}
          <div className="flex-1 overflow-y-auto space-y-2 mb-2 min-h-0">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <CheckSquare className="h-12 w-12 text-gray-300 dark:text-gray-700 mb-3" />
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">No tasks yet</p>
                <p className="text-xs text-gray-500 dark:text-gray-500">Start adding tasks using the input below</p>
              </div>
            ) : filteredItems.length === 0 && searchQuery ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <CheckSquare className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No items match your search</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className={`group flex items-start gap-2 p-2.5 rounded-lg border transition-all ${
                      item.checked
                        ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700'
                    }`}
                  >
                    {/* Checkbox - positioned to align with first line */}
                    <button
                      onClick={() => handleToggleItem(item.id)}
                      className={`flex-shrink-0 w-5 h-5 mt-[2px] rounded border-2 transition-all ${
                        item.checked
                          ? 'bg-green-600 border-green-600 dark:bg-green-500 dark:border-green-500'
                          : 'border-gray-300 dark:border-gray-600 hover:border-green-500 dark:hover:border-green-400'
                      }`}
                      title={item.checked ? 'Uncheck' : 'Check'}
                    >
                      {item.checked && (
                        <svg className="w-full h-full text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    
                    {/* Item Text */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm break-words leading-5 ${
                        item.checked
                          ? 'text-gray-500 dark:text-gray-500 line-through'
                          : 'text-gray-900 dark:text-gray-100'
                      }`}>
                        {item.text}
                      </p>
                    </div>
                    
                    {/* Delete Button */}
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all"
                      title="Delete item"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Quick Add Input - Fixed at bottom */}
          <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <Plus className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <input
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Add (Press Enter)"
              className="flex-1 min-w-0 px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
          </div>
        </div>
      </BaseWidgetV2>
      
      {/* Settings Modal */}
      <WidgetModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        title="Checklist Settings"
        description="Configure your checklist preferences."
        icon={CheckSquare}
        footer={
          <WidgetModalFooter
            onCancel={handleSettingsCancel}
            onSave={handleSettingsSave}
          />
        }
      >
        <div className="space-y-4">
          {/* Show Completed Items - Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Show Completed Items
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Display checked items in the list
            </p>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={tempSettings.showCompleted}
                onChange={(e) => setTempSettings({ ...tempSettings, showCompleted: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900 dark:peer-checked:bg-gray-100 peer-checked:after:bg-white dark:peer-checked:after:bg-gray-900"></div>
              <span className="ml-3 text-sm text-gray-900 dark:text-gray-100">
                {tempSettings.showCompleted ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>
          
          {/* Auto Sort - Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Auto Sort
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Automatically move checked items to the bottom
            </p>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={tempSettings.autoSort}
                onChange={(e) => setTempSettings({ ...tempSettings, autoSort: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900 dark:peer-checked:bg-gray-100 peer-checked:after:bg-white dark:peer-checked:after:bg-gray-900"></div>
              <span className="ml-3 text-sm text-gray-900 dark:text-gray-100">
                {tempSettings.autoSort ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>
          
          {/* Clear All Completed */}
          <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={() => {
                if (confirm('Are you sure you want to delete all completed items?')) {
                  setItems(items.filter(item => !item.checked));
                  setSettingsOpen(false);
                }
              }}
              disabled={items.filter(item => item.checked).length === 0}
              className="w-full px-4 py-2 text-sm font-medium text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear All Completed
            </button>
          </div>
        </div>
      </WidgetModal>
    </>
  );
}
