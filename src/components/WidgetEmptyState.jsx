import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Reusable empty state component for widgets
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.icon - Icon component to display
 * @param {string} props.message - Primary message
 * @param {string} props.submessage - Optional secondary message
 * @param {React.ReactNode} props.action - Optional action button/element (legacy)
 * @param {string} props.actionLabel - Action button label
 * @param {function} props.onAction - Action button click handler
 * @param {boolean} props.actionLoading - Action button loading state
 */
export function WidgetEmptyState({ 
  icon: Icon, 
  message, 
  submessage,
  action,
  actionLabel,
  onAction,
  actionLoading = false
}) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 text-center p-2">
      {Icon && <Icon className="h-8 w-8 text-muted-foreground mb-2" />}
      <p className="text-sm text-muted-foreground">{message}</p>
      {submessage && <p className="text-xs text-muted-foreground mt-1">{submessage}</p>}
      {action && <div className="mt-2">{action}</div>}
      {!action && onAction && actionLabel && (
        <button
          onClick={onAction}
          disabled={actionLoading}
          className="mt-3 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
        >
          {actionLoading && <Loader2 className="h-4 w-4 animate-spin" />}
          {actionLabel}
        </button>
      )}
    </div>
  );
}
