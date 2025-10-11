import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { RefreshCw, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  loadLayoutConfig,
  getDropzoneNumber,
  getDropzonePosition,
  getLayoutDebugInfo,
  COLUMNS,
  MAX_ROWS_PER_COLUMN
} from '@/services/layoutService';

export function CanvasVisualization() {
  const [layoutConfig, setLayoutConfig] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [copied, setCopied] = useState(false);

  const loadConfig = () => {
    const config = loadLayoutConfig();
    setLayoutConfig(config);
    if (config) {
      const info = getLayoutDebugInfo(config);
      setDebugInfo(info);
    }
  };

  const handleCopyConfig = () => {
    if (layoutConfig) {
      navigator.clipboard.writeText(JSON.stringify(layoutConfig, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  if (!layoutConfig) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No layout configuration found. Start arranging widgets on the canvas to see the layout data.
        </p>
      </div>
    );
  }

  // Create a 2D grid representation
  const grid = Array(COLUMNS).fill(null).map(() => Array(MAX_ROWS_PER_COLUMN).fill(null));
  
  // Fill grid with widget information
  Object.entries(layoutConfig.widgets || {}).forEach(([widgetId, data]) => {
    const { colIndex, rowIndex } = getDropzonePosition(data.startDropzone);
    for (let i = 0; i < data.rowSpan; i++) {
      const currentRow = rowIndex + i;
      if (currentRow < MAX_ROWS_PER_COLUMN) {
        grid[colIndex][currentRow] = {
          widgetId,
          isStart: i === 0,
          rowSpan: data.rowSpan,
          dropzone: getDropzoneNumber(colIndex, currentRow)
        };
      }
    }
  });

  // Get widget display name (remove hyphens and capitalize)
  const getWidgetDisplayName = (widgetId) => {
    return widgetId
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  // Get color for widget (consistent colors for same widget)
  const getWidgetColor = (widgetId) => {
    const colors = [
      'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-900 dark:text-blue-100',
      'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700 text-green-900 dark:text-green-100',
      'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700 text-purple-900 dark:text-purple-100',
      'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700 text-orange-900 dark:text-orange-100',
      'bg-pink-100 dark:bg-pink-900/30 border-pink-300 dark:border-pink-700 text-pink-900 dark:text-pink-100',
      'bg-cyan-100 dark:bg-cyan-900/30 border-cyan-300 dark:border-cyan-700 text-cyan-900 dark:text-cyan-100',
    ];
    
    // Simple hash function to get consistent color
    let hash = 0;
    for (let i = 0; i < widgetId.length; i++) {
      hash = widgetId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Layout Visualization</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Visual representation of your widget layout configuration
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={loadConfig}
          className="flex items-center gap-2"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      {debugInfo && (
        <div className="grid grid-cols-3 gap-4">
          <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Total Dropzones</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{debugInfo.totalDropzones}</p>
          </div>
          <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Occupied</p>
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{debugInfo.occupiedDropzones}</p>
          </div>
          <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700">
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Empty</p>
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{debugInfo.emptyDropzones}</p>
          </div>
        </div>
      )}

      {/* Grid Visualization */}
      <div className="border-2 border-gray-300 dark:border-gray-700 rounded-lg p-4 bg-white dark:bg-gray-900">
        <div className="grid grid-cols-5 gap-3">
          {grid.map((column, colIndex) => (
            <div key={colIndex} className="space-y-3">
              {/* Column header */}
              <div className="text-center">
                <Badge variant="outline" className="text-xs">
                  Col {colIndex + 1}
                </Badge>
              </div>
              
              {/* Column cells */}
              {column.map((cell, rowIndex) => {
                const dropzoneNum = getDropzoneNumber(colIndex, rowIndex);
                
                if (!cell) {
                  // Empty dropzone
                  return (
                    <div
                      key={rowIndex}
                      className="h-16 border-2 border-dashed border-gray-300 dark:border-gray-700 rounded-lg flex flex-col items-center justify-center text-gray-400 dark:text-gray-600"
                    >
                      <span className="text-xs font-mono">#{dropzoneNum}</span>
                      <span className="text-[10px]">Empty</span>
                    </div>
                  );
                }
                
                if (!cell.isStart) {
                  // Part of a multi-row widget (not the start)
                  return (
                    <div
                      key={rowIndex}
                      className={`h-16 border-2 rounded-lg flex flex-col items-center justify-center ${getWidgetColor(cell.widgetId)}`}
                    >
                      <span className="text-xs font-mono">#{dropzoneNum}</span>
                      <span className="text-[10px]">↑ Continued</span>
                    </div>
                  );
                }
                
                // Start of a widget
                return (
                  <div
                    key={rowIndex}
                    className={`h-16 border-2 rounded-lg flex flex-col items-center justify-center ${getWidgetColor(cell.widgetId)}`}
                  >
                    <span className="text-xs font-mono mb-0.5">#{dropzoneNum}</span>
                    <span className="text-[10px] font-semibold text-center px-1 line-clamp-1">
                      {getWidgetDisplayName(cell.widgetId)}
                    </span>
                    <span className="text-[10px]">
                      {cell.rowSpan} row{cell.rowSpan > 1 ? 's' : ''}
                    </span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Widget Details */}
      {debugInfo && debugInfo.widgets.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Widget Details</h4>
          <div className="space-y-2">
            {debugInfo.widgets.map((widget) => (
              <div
                key={widget.id}
                className={`p-3 rounded-lg border-2 ${getWidgetColor(widget.id)}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">{getWidgetDisplayName(widget.id)}</span>
                  <Badge variant="outline" className="text-xs">
                    {widget.rowSpan} row{widget.rowSpan > 1 ? 's' : ''}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Start Dropzone:</span>
                    <span className="ml-1 font-mono">#{widget.startDropzone}</span>
                  </div>
                  <div>
                    <span className="text-gray-600 dark:text-gray-400">Occupies:</span>
                    <span className="ml-1 font-mono">{widget.dropzones.join(', ')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Raw Config (for debugging) */}
      <details className="border-2 border-gray-300 dark:border-gray-700 rounded-lg p-4">
        <summary className="cursor-pointer text-sm font-semibold text-gray-900 dark:text-gray-100 hover:text-gray-600 dark:hover:text-gray-400 flex items-center justify-between">
          <span>Raw Configuration Data (for debugging)</span>
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              handleCopyConfig();
            }}
            className="flex items-center gap-2 ml-4"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy
              </>
            )}
          </Button>
        </summary>
        <pre className="mt-3 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs overflow-x-auto">
          {JSON.stringify(layoutConfig, null, 2)}
        </pre>
      </details>
    </div>
  );
}
