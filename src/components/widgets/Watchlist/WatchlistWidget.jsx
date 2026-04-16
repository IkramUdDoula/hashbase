import React, { useState, useEffect, useRef } from 'react';
import { BaseWidgetV2 } from '../../BaseWidgetV2';
import { Badge } from '@/components/ui/badge';
import { 
  Film,
  Plus,
  Tv,
  Star,
  Play,
  CheckCircle2,
  Pause,
  XCircle,
  Bookmark,
  Search,
  Calendar,
  Loader2
} from 'lucide-react';
import { WidgetModal, WidgetModalFooter } from '@/components/ui/widget-modal';
import { WatchlistExplorer } from './WatchlistExplorer';
import { searchMedia, getTVDetails, getSeasonDetails, getPosterUrl } from '@/services/tmdbService';

/**
 * WatchlistWidget - Track movies and TV shows
 * 
 * Features:
 * - Add movies and TV shows
 * - Track watch status and progress
 * - Episode-level tracking for TV shows
 * - Rating system (1-5 stars)
 * - Notes for each entry
 * - Auto-sorting by status
 */
export function WatchlistWidget({ rowSpan = 2, dragRef }) {
  // Widget state management
  const [items, setItems] = useState([]);
  const [searchInput, setSearchInput] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [activeTab, setActiveTab] = useState(''); // Will be set from settings
  const searchTimeoutRef = useRef(null);
  
  // Explorer state
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  
  // Settings state
  const [settings, setSettings] = useState({
    showCompleted: true,
    autoSort: true,
    defaultView: 'all', // 'all', 'movies', 'tv'
    defaultTab: 'movies', // 'movies', 'tv'
    sortBy: 'status' // 'status', 'dateAdded', 'title', 'rating'
  });
  
  // Temporary settings for modal
  const [tempSettings, setTempSettings] = useState(settings);
  
  // Load items from localStorage on mount
  useEffect(() => {
    const savedItems = localStorage.getItem('watchlist_items');
    if (savedItems) {
      try {
        const parsed = JSON.parse(savedItems);
        setItems(parsed);
      } catch (e) {
        console.error('Failed to load watchlist items:', e);
      }
    }
    
    const savedSettings = localStorage.getItem('watchlist_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
        setTempSettings(parsed);
        // Set active tab from saved settings
        setActiveTab(parsed.defaultTab || 'movies');
      } catch (e) {
        console.error('Failed to load watchlist settings:', e);
        setActiveTab('movies');
      }
    } else {
      setActiveTab('movies');
    }
    
    setIsInitialized(true);
  }, []);
  
  // Save items to localStorage (skip initial mount)
  useEffect(() => {
    if (!isInitialized) return;
    
    try {
      localStorage.setItem('watchlist_items', JSON.stringify(items));
    } catch (error) {
      console.error('Failed to save watchlist items:', error);
    }
  }, [items, isInitialized]);
  
  // Save settings to localStorage
  useEffect(() => {
    if (!isInitialized) return;
    
    try {
      localStorage.setItem('watchlist_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save watchlist settings:', error);
    }
  }, [settings, isInitialized]);
  
  // Debounced TMDB search
  useEffect(() => {
    if (!searchInput.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    setSearchLoading(true);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchMedia(searchInput, 'multi');
        setSearchResults(results);
        setShowSearchResults(true);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchInput]);
  
  // Status configuration
  const statusConfig = {
    'want-to-watch': {
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      icon: Bookmark,
      label: 'Want to Watch',
      order: 2
    },
    'watching': {
      color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      icon: Play,
      label: 'Watching',
      order: 1
    },
    'completed': {
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      icon: CheckCircle2,
      label: 'Completed',
      order: 3
    },
    'on-hold': {
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      icon: Pause,
      label: 'On Hold',
      order: 4
    },
    'dropped': {
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
      icon: XCircle,
      label: 'Dropped',
      order: 5
    }
  };
  
  // Sort items
  const getSortedItems = (itemsList) => {
    if (!settings.autoSort) return itemsList;
    
    return [...itemsList].sort((a, b) => {
      if (settings.sortBy === 'status') {
        const orderA = statusConfig[a.status]?.order || 999;
        const orderB = statusConfig[b.status]?.order || 999;
        if (orderA !== orderB) return orderA - orderB;
        return b.id - a.id; // Most recent first within same status
      } else if (settings.sortBy === 'title') {
        return a.title.localeCompare(b.title);
      } else if (settings.sortBy === 'rating') {
        return (b.rating || 0) - (a.rating || 0);
      } else {
        return b.id - a.id; // dateAdded (most recent first)
      }
    });
  };
  
  // Handle TMDB search result selection
  const handleSelectResult = async (result) => {
    setSearchLoading(true);
    setShowSearchResults(false);
    
    const newItem = {
      id: Date.now(),
      tmdbId: result.id,
      title: result.title,
      type: result.type,
      status: 'want-to-watch',
      rating: 0,
      notes: [],
      posterUrl: result.posterPath ? getPosterUrl(result.posterPath, 'w342') : null,
      releaseDate: result.releaseDate, // Store full date (YYYY-MM-DD)
      releaseYear: result.releaseYear,
      overview: result.overview,
      createdAt: new Date().toISOString(),
      watched: false,
      seasons: [],
      currentSeason: 1,
      currentEpisode: 1,
      totalSeasons: 0
    };
    
    // If TV show, fetch season data
    if (result.type === 'tv') {
      try {
        const tvDetails = await getTVDetails(result.id);
        if (tvDetails) {
          newItem.totalSeasons = tvDetails.numberOfSeasons;
          newItem.tvStatus = tvDetails.status;
          newItem.inProduction = tvDetails.inProduction;
          
          // Fetch all seasons
          const seasonsData = [];
          for (let i = 1; i <= tvDetails.numberOfSeasons; i++) {
            const seasonDetails = await getSeasonDetails(result.id, i);
            if (seasonDetails) {
              seasonsData.push({
                seasonNumber: seasonDetails.seasonNumber,
                totalEpisodes: seasonDetails.episodes.length,
                name: seasonDetails.name,
                airDate: seasonDetails.airDate,
                episodes: seasonDetails.episodes.map(ep => ({
                  episodeNumber: ep.episodeNumber,
                  name: ep.name,
                  airDate: ep.airDate,
                  watched: false
                }))
              });
            }
          }
          newItem.seasons = seasonsData;
        }
      } catch (error) {
        console.error('Error fetching TV details:', error);
      }
    }
    
    setItems([...items, newItem]);
    setSearchInput('');
    setSearchResults([]);
    setSearchLoading(false);
  };
  
  // Handle Enter key in input
  const handleInputKeyDown = (e) => {
    if (e.key === 'Escape') {
      setSearchInput('');
      setSearchResults([]);
      setShowSearchResults(false);
    }
  };
  
  // Settings handlers
  const handleSettingsOpen = () => {
    setTempSettings(settings);
    setSettingsOpen(true);
  };
  
  const handleSettingsSave = () => {
    setSettings(tempSettings);
    // Update active tab if default tab changed
    setActiveTab(tempSettings.defaultTab || 'movies');
    setSettingsOpen(false);
  };
  
  const handleSettingsCancel = () => {
    setTempSettings(settings);
    setSettingsOpen(false);
  };
  
  const handleRefresh = () => {
    setItems([...items]);
  };
  
  // Explorer handlers
  const handleOpenItem = (itemId) => {
    setSelectedItemId(itemId);
    setExplorerOpen(true);
  };
  
  const handleExplorerItemChange = (newItemId) => {
    setSelectedItemId(newItemId);
  };
  
  const handleExplorerClose = () => {
    setExplorerOpen(false);
    setSelectedItemId(null);
  };
  
  const handleItemUpdate = (updatedItem) => {
    if (updatedItem._deleted) {
      setItems(items.filter(item => item.id !== updatedItem.id));
      return;
    }
    setItems(items.map(item => 
      item.id === updatedItem.id ? updatedItem : item
    ));
  };
  
  // Calculate progress for TV shows
  const calculateProgress = (item) => {
    if (item.type !== 'tv' || !item.seasons || item.seasons.length === 0) {
      return null;
    }
    
    let totalEpisodes = 0;
    let watchedEpisodes = 0;
    
    item.seasons.forEach(season => {
      totalEpisodes += season.totalEpisodes;
      watchedEpisodes += season.episodes.filter(ep => ep.watched).length;
    });
    
    return {
      watched: watchedEpisodes,
      total: totalEpisodes,
      percentage: totalEpisodes > 0 ? Math.round((watchedEpisodes / totalEpisodes) * 100) : 0
    };
  };
  
  // Filter items
  const getFilteredItems = () => {
    let filtered = items;
    
    // Filter by active tab
    if (activeTab === 'movies') {
      filtered = filtered.filter(item => item.type === 'movie');
    } else if (activeTab === 'tv') {
      filtered = filtered.filter(item => item.type === 'tv');
    }
    
    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.title.toLowerCase().includes(query)
      );
    }
    
    // Filter by completion status
    if (!settings.showCompleted) {
      filtered = filtered.filter(item => item.status !== 'completed');
    }
    
    return getSortedItems(filtered);
  };
  
  const filteredItems = getFilteredItems();
  
  // Render star rating
  const renderStars = (rating) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 ${
              star <= rating
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300 dark:text-gray-600'
            }`}
          />
        ))}
      </div>
    );
  };
  
  const getWidgetState = () => {
    return 'positive';
  };
  
  // Render individual item
  const renderItem = (item) => {
    const StatusIcon = statusConfig[item.status]?.icon || Bookmark;
    const progress = calculateProgress(item);
    
    // Get next episode info for TV shows
    const getNextEpisode = () => {
      if (item.type !== 'tv' || !item.seasons || item.seasons.length === 0) {
        return null;
      }
      
      for (const season of item.seasons) {
        for (const episode of season.episodes) {
          if (!episode.watched) {
            return {
              seasonNumber: season.seasonNumber,
              episodeNumber: episode.episodeNumber,
              name: episode.name,
              airDate: episode.airDate
            };
          }
        }
      }
      return null;
    };
    
    const nextEpisode = getNextEpisode();
    
    return (
      <div
        key={item.id}
        onClick={() => handleOpenItem(item.id)}
        className="p-3 rounded-lg bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/40 dark:to-slate-900/40 border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer group"
      >
        <div className="flex items-start gap-3">
          {/* Poster or Type Icon */}
          <div className="flex-shrink-0 w-12 h-16 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
            {item.posterUrl ? (
              <img
                src={item.posterUrl}
                alt={item.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {item.type === 'movie' ? (
                  <Film className="h-6 w-6 text-gray-400" />
                ) : (
                  <Tv className="h-6 w-6 text-gray-400" />
                )}
              </div>
            )}
          </div>
          
          {/* Content */}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
              {item.title}
            </h4>
            
            {/* Metadata */}
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {/* Rating */}
              {item.rating > 0 && (
                <div className="flex items-center gap-1">
                  {renderStars(item.rating)}
                </div>
              )}
              
              {/* Status Badge - Only show if not "want-to-watch" */}
              {item.status !== 'want-to-watch' && (
                <Badge 
                  variant="secondary" 
                  className={`${statusConfig[item.status]?.color} text-xs`}
                >
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConfig[item.status]?.label}
                </Badge>
              )}
            </div>
            
            {/* Next Episode or Progress for TV shows */}
            {item.type === 'tv' && nextEpisode && (
              <div className="mt-2 flex items-center gap-2 text-xs">
                <Calendar className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                <span className="text-blue-600 dark:text-blue-400 font-medium">
                  Next: S{nextEpisode.seasonNumber}E{nextEpisode.episodeNumber}
                </span>
                {nextEpisode.airDate && (
                  <span className="text-gray-600 dark:text-gray-400">
                    • {new Date(nextEpisode.airDate).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </span>
                )}
              </div>
            )}
            
            {/* Release date for movies */}
            {item.type === 'movie' && (item.releaseDate || item.releaseYear) && (
              <div className="mt-2 flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <Calendar className="h-3 w-3" />
                <span>
                  {item.releaseDate ? (
                    new Date(item.releaseDate).toLocaleDateString('en-US', { 
                      month: 'short', 
                      day: 'numeric',
                      year: 'numeric'
                    })
                  ) : (
                    `Released ${item.releaseYear}`
                  )}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <>
      <BaseWidgetV2
        logo={Film}
        appName="Watchlist"
        widgetName="Movies & TV"
        tooltip="Track movies and TV shows"
        showSettings={true}
        onSettingsClick={handleSettingsOpen}
        showRefresh={true}
        onRefresh={handleRefresh}
        refreshing={false}
        state={getWidgetState()}
        emptyIcon={Film}
        emptyMessage={items.length === 0 ? "No items in watchlist" : "No items to display"}
        emptySubmessage={items.length === 0 ? "Add movies and TV shows to track" : "All items are hidden or filtered out"}
        searchEnabled={items.length > 5}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search watchlist..."
        rowSpan={rowSpan}
        dragRef={dragRef}
      >
        <div className="flex flex-col h-full min-h-0">
          {/* Tabs */}
          {items.length > 0 && (
            <div className="flex gap-1 mb-3 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <button
                onClick={() => setActiveTab('movies')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  activeTab === 'movies'
                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <Film className="h-4 w-4" />
                Movies
              </button>
              <button
                onClick={() => setActiveTab('tv')}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
                  activeTab === 'tv'
                    ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <Tv className="h-4 w-4" />
                TV Shows
              </button>
            </div>
          )}
          
          {/* Watchlist Items - Scrollable area */}
          <div className="flex-1 overflow-y-auto space-y-2 mb-2 min-h-0 custom-scrollbar">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <Film className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No items in watchlist</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Search for movies or TV shows below
                </p>
              </div>
            ) : filteredItems.length === 0 && searchQuery ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Film className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No items match your search</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <Film className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">No items to display</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="space-y-2">
                  {filteredItems.map((item) => renderItem(item))}
                </div>
              </div>
            )}
          </div>
          
          {/* Search Input with Autocomplete - Fixed at bottom */}
          <div className="relative">
            <div className="flex items-center gap-2 p-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <Search className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={handleInputKeyDown}
                onFocus={() => searchResults.length > 0 && setShowSearchResults(true)}
                placeholder="Search movies & TV shows on TMDB..."
                className="flex-1 min-w-0 px-3 py-1.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
              {searchLoading && (
                <Loader2 className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin flex-shrink-0" />
              )}
            </div>
            
            {/* Search Results Dropdown */}
            {showSearchResults && searchResults.length > 0 && (
              <div className="absolute bottom-full left-0 right-0 mb-2 max-h-80 overflow-y-auto bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 custom-scrollbar">
                {searchResults.map((result) => (
                  <button
                    key={`${result.type}-${result.id}`}
                    onClick={() => handleSelectResult(result)}
                    className="w-full flex items-start gap-3 p-3 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all text-left border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                  >
                    {/* Poster */}
                    <div className="flex-shrink-0 w-10 h-14 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                      {result.posterPath ? (
                        <img
                          src={getPosterUrl(result.posterPath, 'w92')}
                          alt={result.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {result.type === 'movie' ? (
                            <Film className="h-5 w-5 text-gray-400" />
                          ) : (
                            <Tv className="h-5 w-5 text-gray-400" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
                          {result.title}
                        </h4>
                        {result.type === 'movie' ? (
                          <Film className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        ) : (
                          <Tv className="h-4 w-4 text-gray-500 flex-shrink-0" />
                        )}
                      </div>

                      <div className="flex items-center gap-2 mt-1">
                        {result.releaseYear && (
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {result.releaseYear}
                          </span>
                        )}
                        {result.voteAverage > 0 && (
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {result.voteAverage.toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </BaseWidgetV2>
      
      {/* Settings Modal */}
      <WidgetModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        title="Watchlist Settings"
        description="Configure your watchlist preferences."
        icon={Film}
        footer={
          <WidgetModalFooter
            onCancel={handleSettingsCancel}
            onSave={handleSettingsSave}
          />
        }
      >
        <div className="space-y-4">
          {/* Show Completed Items */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Show Completed Items
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Display completed movies and TV shows
            </p>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={tempSettings.showCompleted}
                onChange={(e) => setTempSettings({ ...tempSettings, showCompleted: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900 dark:peer-checked:bg-gray-100 peer-checked:after:bg-white dark:peer-checked:after:bg-gray-900"></div>
              <span className="ml-3 text-sm text-gray-900 dark:text-gray-100">
                {tempSettings.showCompleted ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>
          
          {/* Auto Sort */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Auto Sort
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Automatically sort items by selected criteria
            </p>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={tempSettings.autoSort}
                onChange={(e) => setTempSettings({ ...tempSettings, autoSort: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900 dark:peer-checked:bg-gray-100 peer-checked:after:bg-white dark:peer-checked:after:bg-gray-900"></div>
              <span className="ml-3 text-sm text-gray-900 dark:text-gray-100">
                {tempSettings.autoSort ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>
          
          {/* Sort By */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Sort By
            </label>
            <select
              value={tempSettings.sortBy}
              onChange={(e) => setTempSettings({ ...tempSettings, sortBy: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="status">Status</option>
              <option value="dateAdded">Date Added</option>
              <option value="title">Title</option>
              <option value="rating">Rating</option>
            </select>
          </div>
          
          {/* Default Tab */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Default Tab
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Which tab to show when opening the widget
            </p>
            <select
              value={tempSettings.defaultTab || 'movies'}
              onChange={(e) => setTempSettings({ ...tempSettings, defaultTab: e.target.value })}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="movies">Movies</option>
              <option value="tv">TV Shows</option>
            </select>
          </div>
        </div>
      </WidgetModal>
      
      {/* Watchlist Explorer */}
      <WatchlistExplorer
        open={explorerOpen}
        onOpenChange={handleExplorerClose}
        itemId={selectedItemId}
        itemList={items}
        onItemChange={handleExplorerItemChange}
        onItemUpdate={handleItemUpdate}
      />
    </>
  );
}
