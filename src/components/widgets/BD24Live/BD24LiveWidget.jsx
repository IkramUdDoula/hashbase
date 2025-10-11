import React, { useState, useEffect, useMemo } from 'react';
import { BaseWidget } from '../../BaseWidget';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Newspaper, RefreshCw, Loader2, ExternalLink, Clock } from 'lucide-react';
import { fetchBD24LiveNews, checkBD24LiveStatus } from '@/services/bd24LiveService';
import { formatRelativeDate } from '@/lib/dateUtils';
import { WidgetSearch } from '@/components/WidgetSearch';
import { WidgetEmptyState } from '@/components/WidgetEmptyState';

export function BD24LiveWidget({ rowSpan = 2, dragRef }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOperational, setIsOperational] = useState(false);
  const [lastFetched, setLastFetched] = useState(null);
  const [isCached, setIsCached] = useState(false);

  const loadNews = async () => {
    try {
      setError(null);
      
      // Check if RSS feed is operational
      const operational = await checkBD24LiveStatus();
      setIsOperational(operational);
      
      if (!operational) {
        setError('BD24 Live RSS feed is not operational');
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      const response = await fetchBD24LiveNews();
      console.log('📰 BD24 Live Widget - Received articles:', response.length);
      if (response.length > 0) {
        console.log('📅 Sample article dates:');
        response.slice(0, 3).forEach((article, idx) => {
          console.log(`  ${idx + 1}. ${article.title.substring(0, 50)}...`);
          console.log(`     Published: ${article.publishedAt}`);
          console.log(`     Time ago: ${formatRelativeDate(article.publishedAt)}`);
        });
      }
      setArticles(response);
      setLastFetched(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadNews();
  };

  const handleOpenArticle = (url) => {
    window.open(url, '_blank');
  };

  useEffect(() => {
    loadNews();
    // Refresh every 30 minutes
    const interval = setInterval(loadNews, 30 * 60 * 1000);
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // Check if it's been more than 30 minutes since last fetch
        if (lastFetched && (Date.now() - lastFetched.getTime()) > 30 * 60 * 1000) {
          loadNews();
        }
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Filter articles based on search query
  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return articles;
    
    const query = searchQuery.toLowerCase();
    return articles.filter(article => {
      return article.title.toLowerCase().includes(query) ||
             article.description?.toLowerCase().includes(query);
    });
  }, [articles, searchQuery]);

  const badge = filteredArticles.length > 0 ? <Badge variant="secondary">{filteredArticles.length}</Badge> : null;
  
  const headerActions = (
    <>
      {lastFetched && (
        <div className="text-xs text-muted-foreground flex items-center gap-1" title={`Last updated: ${lastFetched.toLocaleString()}`}>
          <Clock className="h-3 w-3" />
          <span className="hidden md:inline">{formatRelativeDate(lastFetched.toISOString())}</span>
        </div>
      )}
      <Button
        variant="ghost"
        size="icon"
        onClick={handleRefresh}
        disabled={refreshing}
        title="Refresh"
      >
        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
      </Button>
    </>
  );

  return (
    <BaseWidget
      logo={Newspaper}
      appName="BD24 Live"
      widgetName="Latest News"
      tooltip="Latest news from BD24 Live (Bangladesh)"
      badge={badge}
      headerActions={headerActions}
      rowSpan={rowSpan}
      dragRef={dragRef}
    >
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-full text-center p-2">
          <Newspaper className="h-12 w-12 text-muted-foreground mb-2" />
          {/* <p className="text-sm text-destructive mb-2">Failed to load news</p> */}
          <p className="text-xs text-muted-foreground mb-3">{error}</p>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            Try Again
          </Button>
        </div>
      ) : articles.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center p-2">
          <Newspaper className="h-12 w-12 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No news articles found</p>
          <p className="text-xs text-muted-foreground mt-1">Try refreshing</p>
        </div>
      ) : (
        <>
          <WidgetSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search BD24 Live news..."
          />

          {filteredArticles.length === 0 ? (
            <WidgetEmptyState
              icon={Newspaper}
              message="No articles match your search"
            />
          ) : (
            <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
              {filteredArticles.map((article, index) => (
                <div
                  key={`${article.url}-${index}`}
                  className="p-2 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-800 hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => handleOpenArticle(article.url)}
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <p className="font-semibold text-blue-900 dark:text-blue-100 text-sm line-clamp-2 flex-1">
                      {article.title}
                    </p>
                    <ExternalLink className="h-4 w-4 text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                  </div>
                  
                  <div className="flex items-center justify-between gap-2 text-xs mt-1">
                    <span className="text-blue-600 dark:text-blue-400 font-medium truncate">
                      {article.source || 'BD24 Live'}
                    </span>
                    {article.publishedAt && (
                      <span className="text-blue-700 dark:text-blue-300 whitespace-nowrap">
                        {formatRelativeDate(article.publishedAt)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </BaseWidget>
  );
}
