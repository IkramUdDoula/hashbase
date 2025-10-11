import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Settings, Sun, Moon } from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';

export function SettingsButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const menuRef = useRef(null);
  const buttonRef = useRef(null);

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
  };

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        menuRef.current && 
        buttonRef.current &&
        !menuRef.current.contains(event.target) && 
        !buttonRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Settings Menu - appears on click */}
      <div 
        ref={menuRef}
        className={`absolute bottom-16 right-0 bg-card border-2 rounded-xl shadow-lg transition-all duration-200 ${
          isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <div className="p-2 min-w-[180px]">
          {/* Theme Toggle Option */}
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-accent transition-colors text-left"
          >
            {theme === 'light' ? (
              <>
                <Moon className="h-4 w-4" />
                <span className="text-sm font-medium">Dark Mode</span>
              </>
            ) : (
              <>
                <Sun className="h-4 w-4" />
                <span className="text-sm font-medium">Light Mode</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Floating Settings Button */}
      <Button
        ref={buttonRef}
        size="icon"
        onClick={toggleMenu}
        className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-110"
      >
        <Settings className={`h-6 w-6 transition-transform duration-300 ${isOpen ? 'rotate-90' : ''}`} />
      </Button>
    </div>
  );
}
