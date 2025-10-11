import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Base Widget Component
 * Reusable container for different app widgets (Gmail, GitHub, Netlify, etc.)
 */
export function Widget({ 
  icon: Icon, 
  title, 
  description, 
  badge,
  headerActions,
  children,
  className = ''
}) {
  return (
    <Card className={`w-full flex flex-col border-2 rounded-xl ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-5 w-5" />}
            <CardTitle className="text-xl">{title}</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {badge}
            {headerActions}
          </div>
        </div>
        {description && (
          <CardDescription>{description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="pb-4">
        {children}
      </CardContent>
    </Card>
  );
}
