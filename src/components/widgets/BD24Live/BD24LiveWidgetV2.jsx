import React, { useState, useEffect } from 'react';
import { BaseWidgetV2 } from '../../BaseWidgetV2';
import { Badge } from '@/components/ui/badge';
import { Newspaper, ExternalLink, AlertCircle, Clock } from 'lucide-react';
import { fetchBD24LiveNews, checkBD24LiveStatus } from '@/services/bd24LiveService';
import { formatRelativeDate } from '@/lib/dateUtils';
import { Button } from '@/components/ui/button';

/**
 * BD24LiveWidgetV2 - BD24 Live news widget using BaseWidgetV2
 * 
 * Features:
 * - Displays latest news from BD24 Live (Bangladesh)
 * - RSS feed integration
 * - Search functionality
 * - Auto-refresh every 30 minutes
 * - Last fetched timestamp display
 */
export function BD24LiveWidgetV2({ rowSpan = 2, dragRef }) {
  // Widget state management
  const [articles, setArticles] = useState([]);
  const [currentState, setCurrentState] = useState('loading');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isOperational, setIsOperational] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorActionLoading, setErrorActionLoading] = useState(false);
  const [lastFetched, setLastFetched] = useState(null);

  // Load news articles
  const loadNews = async () => {
    try {
      setErrorMessage('');
      
      // Check if RSS feed is operational
      const operational = await checkBD24LiveStatus();
      setIsOperational(operational);
      
      if (!operational) {
        setErrorMessage('BD24 Live RSS feed is not operational. Please try again later.');
        setCurrentState('error');
        setRefreshing(false);
        return;
      }
      
      const response = await fetchBD24LiveNews();
      console.log('📰 BD24 Live Widget - Received articles:', response.length);
      
      if (response.length === 0) {
        setArticles([]);
        setCurrentState('empty');
      } else {
        setArticles(response);
        setCurrentState('positive');
        setLastFetched(new Date());
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load news. Please try again.');
      setCurrentState('error');
    } finally {
      setRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadNews();
  }, []);

  // Auto-refresh every 30 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentState === 'positive') {
        setRefreshing(true);
        loadNews();
      }
    }, 30 * 60 * 1000);

    const handleVisibilityChange = () => {
      if (!document.hidden && currentState === 'positive') {
        // Check if it's been more than 30 minutes since last fetch
        if (lastFetched && (Date.now() - lastFetched.getTime()) > 30 * 60 * 1000) {
          setRefreshing(true);
          loadNews();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentState, lastFetched]);

  // Handlers
  const handleRefresh = () => {
    setRefreshing(true);
    setCurrentState('loading');
    loadNews();
  };

  const handleErrorAction = async () => {
    setErrorActionLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setErrorActionLoading(false);
    setCurrentState('loading');
    loadNews();
  };

  const handleArticleClick = (article) => {
    window.open(article.url, '_blank');
  };

  // Filter articles based on search
  const filteredArticles = articles.filter(article => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      article.title.toLowerCase().includes(query) ||
      article.description?.toLowerCase().includes(query)
    );
  });

  // No badge or custom actions needed

  return (
    <BaseWidgetV2
      // Header Zone
      logo={Newspaper}
      appName="BD24 Live"
      widgetName="Latest News"
      tooltip="Latest news from BD24 Live (Bangladesh)"
      
      // Action Buttons
      showRefresh={true}
      onRefresh={handleRefresh}
      refreshing={refreshing}
      
      // Content State
      state={currentState}
      // Loading State
      loadingMessage="Loading news from BD24 Live..."
      
      // Error State
      errorIcon={AlertCircle}
      errorMessage={errorMessage}
      errorActionLabel="Try Again"
      onErrorAction={handleErrorAction}
      errorActionLoading={errorActionLoading}
      
      // Empty State
      emptyIcon={Newspaper}
      emptyMessage="No news articles found"
      emptySubmessage="Try refreshing to check for new articles."
      
      // Positive State (Content)
      searchEnabled={true}
      searchValue={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search BD24 Live news..."
      
      // Layout
      rowSpan={rowSpan}
      dragRef={dragRef}
    >
      {/* Content Cards */}
      {filteredArticles.length === 0 && searchQuery ? (
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
          <Newspaper className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No articles match your search</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredArticles.map((article, index) => (
            <div
              key={`${article.url}-${index}`}
              className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border border-blue-200 dark:border-blue-700 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all cursor-pointer group"
              onClick={() => handleArticleClick(article)}
            >
              {/* Title */}
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="font-semibold text-sm text-blue-900 dark:text-blue-100 line-clamp-2 flex-1">
                  {article.title}
                </p>
                <ExternalLink className="h-4 w-4 text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
              </div>
              
              {/* Source and time */}
              <div className="flex items-center justify-between gap-2 text-xs">
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
    </BaseWidgetV2>
  );
}
