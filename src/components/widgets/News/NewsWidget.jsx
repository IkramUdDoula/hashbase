import React, { useState, useEffect, useMemo } from 'react';
import { BaseWidget } from '../../BaseWidget';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Newspaper, RefreshCw, Loader2, ExternalLink, Settings } from 'lucide-react';
import { fetchNews, checkNewsApiStatus, NEWS_COUNTRIES, NEWS_CATEGORIES } from '@/services/newsService';
import { formatRelativeDate } from '@/lib/dateUtils';
import { WidgetSearch } from '@/components/WidgetSearch';
import { WidgetEmptyState } from '@/components/WidgetEmptyState';
import { NewsSettingsDialog } from './NewsSettingsDialog';

export function NewsWidget({ rowSpan = 2, dragRef }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  
  // Settings stored in localStorage
  const [country, setCountry] = useState(() => {
    return localStorage.getItem('news_country') || 'us';
  });
  const [category, setCategory] = useState(() => {
    return localStorage.getItem('news_category') || 'general';
  });

  const loadNews = async () => {
    try {
      setError(null);
      
      // Check if NewsAPI is configured
      const configured = await checkNewsApiStatus();
      setIsConfigured(configured);
      
      if (!configured) {
        setError('NewsAPI key not configured');
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      const newsArticles = await fetchNews(country, category);
      setArticles(newsArticles);
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

  const handleSettingsSave = (newCountry, newCategory) => {
    setCountry(newCountry);
    setCategory(newCategory);
    localStorage.setItem('news_country', newCountry);
    localStorage.setItem('news_category', newCategory);
    setSettingsOpen(false);
    setRefreshing(true);
    // Reload news with new settings
    setTimeout(() => loadNews(), 100);
  };

  const handleOpenArticle = (url) => {
    window.open(url, '_blank');
  };

  useEffect(() => {
    loadNews();
    const interval = setInterval(loadNews, 300000); // Refresh every 5 minutes
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadNews();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [country, category]);

  // Filter articles based on search query
  const filteredArticles = useMemo(() => {
    if (!searchQuery.trim()) return articles;
    
    const query = searchQuery.toLowerCase();
    return articles.filter(article => {
      return article.title.toLowerCase().includes(query) ||
             article.description?.toLowerCase().includes(query) ||
             article.source?.name.toLowerCase().includes(query);
    });
  }, [articles, searchQuery]);

  const badge = filteredArticles.length > 0 ? <Badge variant="secondary">{filteredArticles.length}</Badge> : null;
  
  const headerActions = (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setSettingsOpen(true)}
        title="Settings"
      >
        <Settings className="h-4 w-4" />
      </Button>
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

  // Get current country and category names for display
  const countryName = NEWS_COUNTRIES.find(c => c.code === country)?.name || country.toUpperCase();
  const categoryName = NEWS_CATEGORIES.find(c => c.value === category)?.label || category;

  return (
    <>
      <BaseWidget
        logo={Newspaper}
        appName="News"
        widgetName={`${countryName} - ${categoryName}`}
        tooltip="Latest news headlines"
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
            {/* <p className="text-sm text-destructive mb-2">
              {isConfigured ? 'Failed to load news' : 'NewsAPI not configured'}
            </p> */}
            <p className="text-xs text-muted-foreground mb-3">{error}</p>
            {!isConfigured && (
              <p className="text-xs text-muted-foreground mb-2">
                Get a free API key from <a href="https://newsapi.org" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">newsapi.org</a> and add it to your .env file
              </p>
            )}
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              Try Again
            </Button>
          </div>
        ) : articles.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-2">
            <Newspaper className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No news articles found</p>
            <p className="text-xs text-muted-foreground mt-1">Try different settings</p>
          </div>
        ) : (
          <>
            <WidgetSearch
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search news..."
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
                    className="p-2 rounded-lg bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200 dark:border-orange-800 hover:shadow-md transition-shadow cursor-pointer group"
                    onClick={() => handleOpenArticle(article.url)}
                  >
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <p className="font-semibold text-orange-900 dark:text-orange-100 text-sm line-clamp-2 flex-1">
                        {article.title}
                      </p>
                      <ExternalLink className="h-4 w-4 text-orange-600 dark:text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                    </div>
                    
                    {article.description && (
                      <p className="text-xs text-orange-700 dark:text-orange-300 line-clamp-2 mb-1.5">
                        {article.description}
                      </p>
                    )}
                    
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-orange-600 dark:text-orange-400 font-medium truncate">
                        {article.source?.name || 'Unknown Source'}
                      </span>
                      <span className="text-orange-700 dark:text-orange-300 whitespace-nowrap">
                        {formatRelativeDate(article.publishedAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </BaseWidget>

      <NewsSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        currentCountry={country}
        currentCategory={category}
        onSave={handleSettingsSave}
      />
    </>
  );
}
