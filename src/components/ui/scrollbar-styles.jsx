import React from 'react';

/**
 * Custom scrollbar styles component
 * Provides consistent scrollbar styling across the application
 */
export function ScrollbarStyles() {
  return (
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
  );
}
