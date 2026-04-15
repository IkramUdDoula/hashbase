import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Settings, Sun, Moon, AppWindow, ChevronLeft, ChevronUp, ChevronDown } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useCanvas } from '@/contexts/CanvasContext';
import { SettingsModal } from './SettingsModal';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';

export function SettingsButton({ availableWidgets = [] }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [initialTab, setInitialTab] = useState('apps');
  const { theme, setTheme } = useTheme();
  const { canvases, activeCanvasId, setActiveCanvasId } = useCanvas();
  
  const currentIndex = canvases.findIndex(c => c.id === activeCanvasId);
  const canvasNumber = currentIndex + 1;
  const hasMultipleCanvases = canvases.length > 1;
  
  // Listen for custom event to open settings with specific tab
  React.useEffect(() => {
    const handleOpenSettings = (e) => {
      if (e.detail?.tab) {
        setInitialTab(e.detail.tab);
      }
      setIsModalOpen(true);
      setIsDrawerOpen(false);
    };

    window.addEventListener('open-settings', handleOpenSettings);
    return () => window.removeEventListener('open-settings', handleOpenSettings);
  }, []);
  
  const handleNavigateUp = () => {
    const newIndex = currentIndex > 0 ? currentIndex - 1 : canvases.length - 1;
    setActiveCanvasId(canvases[newIndex].id);
  };

  const handleNavigateDown = () => {
    const newIndex = currentIndex < canvases.length - 1 ? currentIndex + 1 : 0;
    setActiveCanvasId(canvases[newIndex].id);
  };

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const openConfigModal = () => {
    setInitialTab('apps');
    setIsModalOpen(true);
    setIsDrawerOpen(false);
  };

  return (
    <>
      {/* Settings and Canvas Navigator Container */}
      <div className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col gap-1">
        {/* Canvas Navigator - Up Chevron */}
        {hasMultipleCanvases && (
          <button
            onClick={handleNavigateUp}
            className="group bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-2 rounded-l-lg shadow-lg border-2 border-r-0 border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600 transition-all duration-200"
            aria-label="Previous canvas"
            title="Previous canvas"
          >
            <ChevronUp className="h-4 w-4 group-hover:-translate-y-0.5 transition-transform duration-200" />
          </button>
        )}

        {/* Canvas Indicator */}
        {hasMultipleCanvases && (
          <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-2 py-1 rounded-l-lg shadow-lg border-2 border-r-0 border-gray-200 dark:border-gray-800 text-xs font-medium text-center">
            {canvasNumber}/{canvases.length}
          </div>
        )}

        {/* Canvas Navigator - Down Chevron */}
        {hasMultipleCanvases && (
          <button
            onClick={handleNavigateDown}
            className="group bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-2 rounded-l-lg shadow-lg border-2 border-r-0 border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600 transition-all duration-200"
            aria-label="Next canvas"
            title="Next canvas"
          >
            <ChevronDown className="h-4 w-4 group-hover:translate-y-0.5 transition-transform duration-200" />
          </button>
        )}

        {/* Settings Button */}
        <button
          onClick={() => setIsDrawerOpen(true)}
          className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-2 rounded-l-lg shadow-lg hover:shadow-xl border-2 border-r-0 border-gray-200 dark:border-gray-800 transition-all duration-200 group hover:pr-3"
          aria-label="Open settings"
        >
          <Settings className="h-4 w-4 group-hover:rotate-90 transition-transform duration-300" />
        </button>
      </div>

      {/* Settings Drawer */}
      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent side="right" className="w-80 flex flex-col">
          <SheetHeader className="px-6 py-4 border-b border-gray-200 dark:border-gray-800">
            <SheetClose onClick={() => setIsDrawerOpen(false)} />
            <SheetTitle className="text-left flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Settings
            </SheetTitle>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
            {/* Configuration Option */}
            <button
              onClick={openConfigModal}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left border-2 border-gray-200 dark:border-gray-700"
            >
              <AppWindow className="h-5 w-5 text-gray-700 dark:text-gray-300" />
              <div>
                <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Configuration</div>
                <div className="text-xs text-gray-600 dark:text-gray-400">Manage apps & secrets</div>
              </div>
            </button>
            
            {/* Theme Toggle Option */}
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-left border-2 border-gray-200 dark:border-gray-700"
            >
              {theme === 'light' ? (
                <>
                  <Moon className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Dark Mode</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Switch to dark theme</div>
                  </div>
                </>
              ) : (
                <>
                  <Sun className="h-5 w-5 text-gray-700 dark:text-gray-300" />
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Light Mode</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400">Switch to light theme</div>
                  </div>
                </>
              )}
            </button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Settings Modal */}
      <SettingsModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        availableWidgets={availableWidgets}
        initialTab={initialTab}
      />
    </>
  );
}
