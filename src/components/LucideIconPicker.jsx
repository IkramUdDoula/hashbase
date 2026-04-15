import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { iconComponents, iconNames } from '@/lib/lucideIcons';

/**
 * LucideIconPicker Component
 * Allows users to search and select Lucide icons
 */
export function LucideIconPicker({ selectedIcon, onSelect }) {
  const [searchQuery, setSearchQuery] = useState('');

  // Popular icons to show by default
  const popularIcons = [
    'Home', 'Mail', 'Calendar', 'Settings', 'User', 'Search',
    'Heart', 'Star', 'Bell', 'MessageSquare', 'Phone', 'Video',
    'Camera', 'Image', 'Music', 'Film', 'Book', 'FileText',
    'Folder', 'Download', 'Upload', 'Share2', 'Link2', 'ExternalLink',
    'Github', 'Twitter', 'Facebook', 'Linkedin', 'Instagram', 'Youtube',
    'Globe', 'MapPin', 'Navigation', 'Compass', 'Briefcase', 'ShoppingCart',
    'Code', 'Terminal', 'Database', 'Server', 'GitBranch', 'GitCommit',
    'Zap', 'Activity', 'Award', 'Target', 'Flag', 'Bookmark'
  ];

  // Filter icons based on search
  const filteredIcons = useMemo(() => {
    if (!searchQuery.trim()) {
      return popularIcons;
    }
    const query = searchQuery.toLowerCase();
    
    // Search through all icons
    const matches = iconNames.filter(name => {
      const iconName = name.toLowerCase();
      return iconName.includes(query);
    });
    
    // Return up to 96 results for better browsing
    return matches.slice(0, 96);
  }, [searchQuery]);

  const handleIconClick = (iconName) => {
    onSelect(iconName);
  };

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          type="text"
          placeholder="Search icons..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600"
        />
      </div>

      {/* Icon Grid */}
      <div className="max-h-64 overflow-y-auto border border-gray-300 dark:border-gray-700 rounded-lg p-2 custom-scrollbar">
        {filteredIcons.length === 0 ? (
          <div className="text-center py-8 text-gray-600 dark:text-gray-400">
            <p className="text-sm">No icons found</p>
          </div>
        ) : (
          <div className="grid grid-cols-8 gap-1">
            {filteredIcons.map((iconName) => {
              const IconComponent = iconComponents[iconName];
              const isSelected = selectedIcon === iconName;
              
              if (!IconComponent) return null;
              
              return (
                <button
                  key={iconName}
                  onClick={() => handleIconClick(iconName)}
                  className={`p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex items-center justify-center ${
                    isSelected 
                      ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 ring-2 ring-gray-900 dark:ring-gray-100' 
                      : 'text-gray-700 dark:text-gray-300'
                  }`}
                  title={iconName}
                >
                  <IconComponent className="w-5 h-5" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Icon Info */}
      {selectedIcon && (
        <div className="text-xs text-gray-600 dark:text-gray-400 text-center">
          Selected: <span className="font-medium text-gray-900 dark:text-gray-100">{selectedIcon}</span>
        </div>
      )}

      {!searchQuery ? (
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Showing {popularIcons.length} popular icons. Search to see all {iconNames.length} icons.
        </p>
      ) : (
        <p className="text-xs text-gray-600 dark:text-gray-400">
          Found {filteredIcons.length} icon{filteredIcons.length !== 1 ? 's' : ''} matching "{searchQuery}"
        </p>
      )}
    </div>
  );
}
