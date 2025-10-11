import React, { useState, useEffect } from 'react';
import { Widget } from '../Widget';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, RefreshCw } from 'lucide-react';

/**
 * Template for creating new widgets
 * Copy this file and customize for your integration (GitHub, Netlify, etc.)
 */
export function WidgetTemplate() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    try {
      setError(null);
      // TODO: Fetch your data here
      // const result = await fetchYourData();
      // setData(result);
      
      setLoading(false);
      setRefreshing(false);
    } catch (err) {
      setError(err.message);
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresh every 60 seconds
    const interval = setInterval(loadData, 60000);
    
    // Refresh when user returns to the tab
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadData();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  const badge = data.length > 0 ? <Badge variant="secondary">{data.length}</Badge> : null;

  const headerActions = (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleRefresh}
      disabled={refreshing}
    >
      <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
    </Button>
  );

  return (
    <Widget
      icon={null} // TODO: Add your icon component
      title="Widget Title" // TODO: Customize
      description="Widget description" // TODO: Customize
      badge={badge}
      headerActions={headerActions}
    >
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center text-center p-4">
          <p className="text-sm text-destructive mb-2">Failed to load data</p>
          <p className="text-xs text-muted-foreground mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            Try Again
          </Button>
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center p-4">
          <p className="text-sm text-muted-foreground">No data available</p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* TODO: Render your data here */}
          {data.map((item) => (
            <div key={item.id} className="p-3 rounded-lg border bg-card">
              {/* Your item content */}
            </div>
          ))}
        </div>
      )}
    </Widget>
  );
}
