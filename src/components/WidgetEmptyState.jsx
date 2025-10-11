import React from 'react';

/**
 * Reusable empty state component for widgets
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.icon - Icon component to display
 * @param {string} props.message - Primary message
 * @param {string} props.submessage - Optional secondary message
 * @param {React.ReactNode} props.action - Optional action button/element
 */
export function WidgetEmptyState({ 
  icon: Icon, 
  message, 
  submessage,
  action 
}) {
  return (
    <div className="flex flex-col items-center justify-center flex-1 text-center p-2">
      {Icon && <Icon className="h-8 w-8 text-muted-foreground mb-2" />}
      <p className="text-sm text-muted-foreground">{message}</p>
      {submessage && <p className="text-xs text-muted-foreground mt-1">{submessage}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
