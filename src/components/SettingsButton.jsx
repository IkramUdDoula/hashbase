import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Settings, Sun, Moon, AppWindow, ChevronLeft } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { SettingsModal } from './SettingsModal';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose } from '@/components/ui/sheet';

export function SettingsButton({ availableWidgets = [] }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const openConfigModal = () => {
    setIsModalOpen(true);
    setIsDrawerOpen(false);
  };

  return (
    <>
      {/* Edge trigger button - small square on the right edge */}
      <button
        onClick={() => setIsDrawerOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-2 rounded-l-lg shadow-lg hover:shadow-xl border-2 border-r-0 border-gray-200 dark:border-gray-800 transition-all duration-200 group hover:pr-3"
        aria-label="Open settings"
      >
        <Settings className="h-4 w-4 group-hover:rotate-90 transition-transform duration-300" />
      </button>

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
      />
    </>
  );
}
