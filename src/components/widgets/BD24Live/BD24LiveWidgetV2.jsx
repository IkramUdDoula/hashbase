import React, { useState, useEffect } from 'react';
import { BaseWidgetV2 } from '../../BaseWidgetV2';
import { Badge } from '@/components/ui/badge';
import { Newspaper, ExternalLink, AlertCircle, Clock } from 'lucide-react';
import { fetchBD24LiveNews, checkBD24LiveStatus } from '@/services/bd24LiveService';
import { formatRelativeDate } from '@/lib/dateUtils';
import { Button } from '@/components/ui/button';
import { BD24LiveExplorer } from './BD24LiveExplorer';

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
  
  // Explorer state
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState(null);

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
      
      if (response.length === 0) {
        setArticles([]);
        setCurrentState('empty');
      } else {
        // Add unique IDs to articles (using URL as ID)
        const articlesWithIds = response.map((article, index) => ({
          ...article,
          id: article.url || `article-${index}`
        }));
        setArticles(articlesWithIds);
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
    // Open explorer instead of external link
    setSelectedArticleId(article.id);
    setExplorerOpen(true);
  };

  const handleExplorerArticleChange = (newArticleId) => {
    setSelectedArticleId(newArticleId);
  };

  const handleExplorerClose = () => {
    setExplorerOpen(false);
    setSelectedArticleId(null);
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
    <>
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
              className="p-3 rounded-lg bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/40 dark:to-slate-900/40 border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer group"
              onClick={() => handleArticleClick(article)}
            >
              <div className="flex gap-3">
                {/* Thumbnail Image */}
                {article.image && (
                  <div className="flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border border-gray-300 dark:border-gray-600">
                    <img 
                      src={article.image} 
                      alt={article.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Title */}
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-100 line-clamp-2 flex-1">
                      {article.title}
                    </p>
                    <ExternalLink className="h-4 w-4 text-gray-600 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                  </div>
                  
                  {/* Source and time */}
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-gray-700 dark:text-gray-300 font-medium truncate">
                      {article.source || 'BD24 Live'}
                    </span>
                    {article.publishedAt && (
                      <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">
                        {formatRelativeDate(article.publishedAt)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </BaseWidgetV2>

    {/* Explorer */}
    <BD24LiveExplorer
      open={explorerOpen}
      onOpenChange={handleExplorerClose}
      articleId={selectedArticleId}
      articleList={articles}
      onArticleChange={handleExplorerArticleChange}
    />
  </>
  );
}
