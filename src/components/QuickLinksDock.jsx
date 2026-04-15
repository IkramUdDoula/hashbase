import React, { useState, useEffect } from 'react';
import { getQuickLinks } from '@/services/quickLinksService';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ExternalLink, Link2, Plus } from 'lucide-react';
import { iconComponents } from '@/lib/lucideIcons';
import { Button } from '@/components/ui/button';

/**
 * QuickLinksDock Component
 * macOS dock-style quick access bar at the bottom of the screen
 * Shows website favicons with hover tooltips
 * Full-width container matching widget styling
 */
export function QuickLinksDock() {
  const [links, setLinks] = useState([]);

  // Load links on mount and listen for changes
  useEffect(() => {
    const loadLinks = () => {
      setLinks(getQuickLinks());
    };

    loadLinks();

    // Listen for storage changes (when links are updated in settings)
    const handleStorageChange = (e) => {
      if (e.key === 'hashbase_quicklinks') {
        loadLinks();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Custom event for same-window updates
    const handleQuickLinksUpdate = () => {
      loadLinks();
    };
    window.addEventListener('quicklinks-updated', handleQuickLinksUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('quicklinks-updated', handleQuickLinksUpdate);
    };
  }, []);

  const handleOpenSettings = () => {
    // Dispatch event to open settings modal with quick links tab
    window.dispatchEvent(new CustomEvent('open-settings', { detail: { tab: 'quicklinks' } }));
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50">
      {/* Full-width container matching widget styling */}
      <div className="w-full bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-800 rounded-xl shadow-sm transition-all duration-200">
        {links.length === 0 ? (
          // Empty State
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-800">
                <Link2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">No quick links yet</p>
                <p className="text-xs text-gray-600 dark:text-gray-400">Add your favorite URLs for quick access</p>
              </div>
            </div>
            <Button
              onClick={handleOpenSettings}
              size="sm"
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Link
            </Button>
          </div>
        ) : (
          // Links Display
          <div className="px-4 py-2">
            <div className="flex items-center justify-center gap-2 overflow-x-auto scrollbar-hide">
              <TooltipProvider delayDuration={200}>
                {links.map((link) => (
                  <Tooltip key={link.id}>
                    <TooltipTrigger asChild>
                      <a
                        href={link.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative flex items-center justify-center w-12 h-12 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 hover:scale-110 active:scale-95 flex-shrink-0"
                      >
                        {(() => {
                          const IconComponent = iconComponents[link.lucideIcon || 'Link2'];
                          return IconComponent ? (
                            <IconComponent className="w-7 h-7 text-gray-700 dark:text-gray-300" />
                          ) : (
                            <ExternalLink className="w-7 h-7 text-gray-500 dark:text-gray-400" />
                          );
                        })()}
                        {/* Subtle glow effect on hover */}
                        <div className="absolute inset-0 rounded-xl bg-gray-900/0 dark:bg-gray-100/0 group-hover:bg-gray-900/5 dark:group-hover:bg-gray-100/5 transition-colors duration-200" />
                      </a>
                    </TooltipTrigger>
                    <TooltipContent 
                      side="top" 
                      className="max-w-xs"
                      sideOffset={8}
                    >
                      <div className="flex flex-col gap-1">
                        <div className="font-semibold text-sm">{link.title}</div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <ExternalLink className="w-3 h-3" />
                          <span className="truncate max-w-[200px]">{link.url}</span>
                        </div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                ))}
              </TooltipProvider>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
