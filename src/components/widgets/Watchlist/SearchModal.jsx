import React, { useState, useEffect, useRef } from 'react';
import { WidgetModal } from '@/components/ui/widget-modal';
import { Button } from '@/components/ui/button';
import { Film, Tv, Search, Loader2, Star } from 'lucide-react';
import { searchMedia, getPosterUrl } from '@/services/tmdbService';

/**
 * SearchModal - Search for movies and TV shows using TMDB API
 */
export function SearchModal({ open, onOpenChange, onSelect, type = 'multi' }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState(type);
  const searchTimeoutRef = useRef(null);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setLoading(true);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        const results = await searchMedia(searchQuery, selectedType);
        setSearchResults(results);
      } catch (error) {
        console.error('Search error:', error);
        setSearchResults([]);
      } finally {
        setLoading(false);
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, selectedType]);

  const handleSelect = (result) => {
    onSelect(result);
    setSearchQuery('');
    setSearchResults([]);
    onOpenChange(false);
  };

  const handleClose = () => {
    setSearchQuery('');
    setSearchResults([]);
    onOpenChange(false);
  };

  return (
    <WidgetModal
      open={open}
      onOpenChange={handleClose}
      title="Search Movies & TV Shows"
      description="Search TMDB database for movies and TV shows"
      icon={Search}
    >
      <div className="space-y-4">
        {/* Type Selector */}
        <div className="flex gap-2">
          <button
            onClick={() => setSelectedType('multi')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all border ${
              selectedType === 'multi'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400'
                : 'border-gray-300 dark:border-gray-700 bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSelectedType('movie')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all border ${
              selectedType === 'movie'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400'
                : 'border-gray-300 dark:border-gray-700 bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <Film className="h-4 w-4 inline mr-1" />
            Movies
          </button>
          <button
            onClick={() => setSelectedType('tv')}
            className={`flex-1 px-3 py-2 text-sm font-medium rounded-lg transition-all border ${
              selectedType === 'tv'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400'
                : 'border-gray-300 dark:border-gray-700 bg-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
            }`}
          >
            <Tv className="h-4 w-4 inline mr-1" />
            TV Shows
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for movies or TV shows..."
            autoFocus
            className="w-full pl-10 pr-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
          )}
        </div>

        {/* Search Results */}
        <div className="max-h-96 overflow-y-auto space-y-2">
          {searchResults.length === 0 && searchQuery.trim() && !loading && (
            <div className="text-center py-8">
              <p className="text-sm text-gray-600 dark:text-gray-400">No results found</p>
            </div>
          )}

          {searchResults.length === 0 && !searchQuery.trim() && (
            <div className="text-center py-8">
              <Search className="h-12 w-12 text-gray-300 dark:text-gray-700 mx-auto mb-2" />
              <p className="text-sm text-gray-600 dark:text-gray-400">Start typing to search</p>
            </div>
          )}

          {searchResults.map((result) => (
            <button
              key={`${result.type}-${result.id}`}
              onClick={() => handleSelect(result)}
              className="w-full flex items-start gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/20 transition-all text-left"
            >
              {/* Poster */}
              <div className="flex-shrink-0 w-12 h-18 bg-gray-200 dark:bg-gray-700 rounded overflow-hidden">
                {result.posterPath ? (
                  <img
                    src={getPosterUrl(result.posterPath, 'w92')}
                    alt={result.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {result.type === 'movie' ? (
                      <Film className="h-6 w-6 text-gray-400" />
                    ) : (
                      <Tv className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-medium text-gray-900 dark:text-gray-100 truncate">
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

                {result.overview && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                    {result.overview}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    </WidgetModal>
  );
}
