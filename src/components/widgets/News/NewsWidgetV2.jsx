import React, { useState, useEffect } from 'react';
import { BaseWidgetV2 } from '../../BaseWidgetV2';
import { Badge } from '@/components/ui/badge';
import { Newspaper, ExternalLink, AlertCircle } from 'lucide-react';
import { fetchNews, checkNewsApiStatus, NEWS_COUNTRIES, NEWS_CATEGORIES } from '@/services/newsService';
import { formatRelativeDate } from '@/lib/dateUtils';
import { NewsSettingsDialog } from './NewsSettingsDialog';

/**
 * NewsWidgetV2 - News headlines widget using BaseWidgetV2
 * 
 * Features:
 * - Displays latest news headlines from NewsAPI
 * - Country and category filtering via settings
 * - Search functionality
 * - Auto-refresh every 5 minutes
 */
export function NewsWidgetV2({ rowSpan = 2, dragRef }) {
  // Widget state management
  const [articles, setArticles] = useState([]);
  const [currentState, setCurrentState] = useState('loading');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorActionLoading, setErrorActionLoading] = useState(false);
  
  // Settings stored in localStorage
  const [country, setCountry] = useState(() => {
    return localStorage.getItem('news_country') || 'us';
  });
  const [category, setCategory] = useState(() => {
    return localStorage.getItem('news_category') || 'general';
  });

  // Load news articles
  const loadNews = async () => {
    try {
      setErrorMessage('');
      
      // Check if NewsAPI is configured
      const configured = await checkNewsApiStatus();
      setIsConfigured(configured);
      
      if (!configured) {
        setErrorMessage('NewsAPI key not configured. Add it in Settings → Secrets.');
        setCurrentState('error');
        setRefreshing(false);
        return;
      }
      
      const newsArticles = await fetchNews(country, category);
      
      if (newsArticles.length === 0) {
        setArticles([]);
        setCurrentState('empty');
      } else {
        setArticles(newsArticles);
        setCurrentState('positive');
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
  }, [country, category]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentState === 'positive') {
        setRefreshing(true);
        loadNews();
      }
    }, 300000);

    const handleVisibilityChange = () => {
      if (!document.hidden && currentState === 'positive') {
        setRefreshing(true);
        loadNews();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentState, country, category]);

  // Handlers
  const handleRefresh = () => {
    setRefreshing(true);
    setCurrentState('loading');
    loadNews();
  };

  const handleSettingsOpen = () => {
    setSettingsOpen(true);
  };

  const handleSettingsSave = (newCountry, newCategory) => {
    setCountry(newCountry);
    setCategory(newCategory);
    localStorage.setItem('news_country', newCountry);
    localStorage.setItem('news_category', newCategory);
    setSettingsOpen(false);
    setRefreshing(true);
    setCurrentState('loading');
    setTimeout(() => loadNews(), 100);
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
      article.description?.toLowerCase().includes(query) ||
      article.source?.name.toLowerCase().includes(query)
    );
  });

  // No badge needed for news widget

  // Get current country and category names for display
  const countryName = NEWS_COUNTRIES.find(c => c.code === country)?.name || country.toUpperCase();
  const categoryName = NEWS_CATEGORIES.find(c => c.value === category)?.label || category;

  return (
    <>
      <BaseWidgetV2
        // Header Zone
        logo={Newspaper}
        appName="News"
        widgetName={`${countryName} - ${categoryName}`}
        tooltip="Latest news headlines from around the world"
        
        // Action Buttons
        showSettings={true}
        onSettingsClick={handleSettingsOpen}
        showRefresh={true}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        
        // Content State
        state={currentState}
        
        // Loading State
        loadingMessage="Loading news headlines..."
        
        // Error State
        errorIcon={AlertCircle}
        errorMessage={errorMessage}
        errorActionLabel="Try Again"
        onErrorAction={handleErrorAction}
        errorActionLoading={errorActionLoading}
        
        // Empty State
        emptyIcon={Newspaper}
        emptyMessage="No news articles found"
        emptySubmessage="Try adjusting your country or category settings."
        
        // Positive State (Content)
        searchEnabled={true}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search news..."
        
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
                className="p-3 rounded-lg bg-gradient-to-br from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 border border-orange-200 dark:border-orange-700 hover:shadow-md hover:border-orange-300 dark:hover:border-orange-600 transition-all cursor-pointer group"
                onClick={() => handleArticleClick(article)}
              >
                {/* Title */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <p className="font-semibold text-sm text-orange-900 dark:text-orange-100 line-clamp-2 flex-1">
                    {article.title}
                  </p>
                  <ExternalLink className="h-4 w-4 text-orange-600 dark:text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5" />
                </div>
                
                {/* Description */}
                {article.description && (
                  <p className="text-xs text-orange-700 dark:text-orange-300 line-clamp-2 mb-2">
                    {article.description}
                  </p>
                )}
                
                {/* Source and time */}
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
      </BaseWidgetV2>

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
