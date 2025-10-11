import React, { useState, useEffect } from 'react';
import { Monitor } from 'lucide-react';

const MIN_WIDTH = 1274;

export function ScreenSizeGuard({ children }) {
  const [isScreenTooSmall, setIsScreenTooSmall] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      setIsScreenTooSmall(window.innerWidth < MIN_WIDTH);
    };

    // Check on mount
    checkScreenSize();

    // Add resize listener
    window.addEventListener('resize', checkScreenSize);

    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  if (isScreenTooSmall) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white dark:bg-black p-6">
        <div className="max-w-md w-full bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border-2 border-gray-200 dark:border-gray-800 overflow-hidden">
          {/* Header with Icon */}
          <div className="bg-gray-50 dark:bg-gray-800/50 px-8 py-8 border-b border-gray-200 dark:border-gray-800">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-20 h-20 rounded-3xl bg-gray-900 dark:bg-gray-100 flex items-center justify-center shadow-lg">
                <Monitor className="h-10 w-10 text-white dark:text-gray-900" strokeWidth={2} />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                  Screen Too Small
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Dashboard requires a larger display
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-8 py-8">
            <div className="space-y-6">
              <div className="text-center">
                <p className="text-base text-gray-700 dark:text-gray-300 mb-4">
                  This dashboard is optimized for larger screens to provide the best experience.
                </p>
                <div className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Current width:
                  </span>
                  <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {window.innerWidth}px
                  </span>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700">
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 text-center">
                  Minimum Required Width
                </p>
                <p className="text-3xl font-bold text-center text-gray-900 dark:text-gray-100">
                  {MIN_WIDTH}px
                </p>
              </div>

              <div className="text-center">
                <p className="text-xs text-gray-500 dark:text-gray-500">
                  Please resize your browser window or use a device with a larger screen.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return children;
}
