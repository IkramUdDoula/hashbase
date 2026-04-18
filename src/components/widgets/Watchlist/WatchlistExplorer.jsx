import React, { useState } from 'react';
import { 
  Explorer, 
  ExplorerHeader, 
  ExplorerBody, 
  ExplorerSection,
  ExplorerField 
} from '@/components/ui/explorer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { WidgetModal } from '@/components/ui/widget-modal';
import { 
  Film,
  Tv,
  Star,
  Play,
  CheckCircle2,
  Pause,
  XCircle,
  Bookmark,
  Calendar,
  Clock,
  Plus,
  Trash2,
  ChevronRight,
  ChevronDown,
  FileText,
  Square,
  CheckSquare
} from 'lucide-react';
import { formatRelativeDate } from '@/lib/dateUtils';

/**
 * WatchlistExplorer - Detailed view for movies and TV shows
 */
export function WatchlistExplorer({ 
  open, 
  onOpenChange, 
  itemId,
  itemList = [],
  onItemChange,
  onItemUpdate
}) {
  const currentIndex = itemList.findIndex(i => i.id === itemId);
  const item = itemList[currentIndex] || null;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < itemList.length - 1;

  const [showNoteInput, setShowNoteInput] = useState(false);
  const [newNoteText, setNewNoteText] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [expandedSeasons, setExpandedSeasons] = useState({});
  const [showSeasonInput, setShowSeasonInput] = useState(false);
  const [newSeasonNumber, setNewSeasonNumber] = useState('');
  const [newSeasonEpisodes, setNewSeasonEpisodes] = useState('');
  const [showUpcoming, setShowUpcoming] = useState(true);

  const handlePrevious = () => {
    if (hasPrevious) onItemChange(itemList[currentIndex - 1].id);
  };

  const handleNext = () => {
    if (hasNext) onItemChange(itemList[currentIndex + 1].id);
  };

  const statusConfig = {
    'want-to-watch': {
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      icon: Bookmark,
      label: 'Want to Watch'
    },
    'watching': {
      color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      icon: Play,
      label: 'Watching'
    },
    'completed': {
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      icon: CheckCircle2,
      label: 'Completed'
    },
    'on-hold': {
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      icon: Pause,
      label: 'On Hold'
    },
    'dropped': {
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
      icon: XCircle,
      label: 'Dropped'
    }
  };

  const handleStatusChange = (newStatus) => {
    if (!item) return;
    const updates = {
      ...item,
      status: newStatus
    };
    
    if (newStatus === 'completed' && !item.completedAt) {
      updates.completedAt = new Date().toISOString();
      if (item.type === 'movie') {
        updates.watched = true;
        updates.watchedDate = new Date().toISOString();
      }
    }
    
    onItemUpdate(updates);
  };

  const handleRatingChange = (rating) => {
    if (!item) return;
    onItemUpdate({ ...item, rating });
  };

  const handleAddNote = () => {
    if (!newNoteText.trim() || !item) return;
    onItemUpdate({
      ...item,
      notes: [...(item.notes || []), {
        id: Date.now(),
        text: newNoteText.trim(),
        createdAt: new Date().toISOString()
      }]
    });
    setNewNoteText('');
    setShowNoteInput(false);
  };

  const handleDeleteNote = (noteId) => {
    if (!item) return;
    onItemUpdate({ ...item, notes: item.notes.filter(n => n.id !== noteId) });
  };

  const handleAddSeason = () => {
    if (!newSeasonNumber || !newSeasonEpisodes || !item) return;
    
    const seasonNum = parseInt(newSeasonNumber);
    const episodeCount = parseInt(newSeasonEpisodes);
    
    if (isNaN(seasonNum) || isNaN(episodeCount) || seasonNum < 1 || episodeCount < 1) return;
    
    const newSeason = {
      seasonNumber: seasonNum,
      totalEpisodes: episodeCount,
      episodes: Array.from({ length: episodeCount }, (_, i) => ({
        episodeNumber: i + 1,
        watched: false
      }))
    };
    
    const updatedSeasons = [...(item.seasons || []), newSeason].sort((a, b) => 
      a.seasonNumber - b.seasonNumber
    );
    
    onItemUpdate({
      ...item,
      seasons: updatedSeasons,
      totalSeasons: updatedSeasons.length
    });
    
    setNewSeasonNumber('');
    setNewSeasonEpisodes('');
    setShowSeasonInput(false);
  };

  const handleToggleEpisode = (seasonIndex, episodeIndex) => {
    if (!item) return;
    
    const updatedSeasons = [...item.seasons];
    updatedSeasons[seasonIndex].episodes[episodeIndex].watched = 
      !updatedSeasons[seasonIndex].episodes[episodeIndex].watched;
    
    // Check if all episodes are now watched
    const allWatched = updatedSeasons.every(season => 
      season.episodes.every(ep => ep.watched)
    );
    
    const updates = { 
      ...item, 
      seasons: updatedSeasons 
    };
    
    // Auto-complete if all episodes watched
    if (allWatched && item.status !== 'completed') {
      updates.status = 'completed';
      updates.completedAt = new Date().toISOString();
    }
    // Remove completed status if not all watched anymore
    else if (!allWatched && item.status === 'completed') {
      updates.status = 'watching';
      updates.completedAt = null;
    }
    
    onItemUpdate(updates);
  };

  const handleMarkSeasonWatched = (seasonIndex, watched) => {
    if (!item) return;
    
    const updatedSeasons = [...item.seasons];
    updatedSeasons[seasonIndex].episodes = updatedSeasons[seasonIndex].episodes.map(ep => ({
      ...ep,
      watched
    }));
    
    // Check if all episodes are now watched
    const allWatched = updatedSeasons.every(season => 
      season.episodes.every(ep => ep.watched)
    );
    
    const updates = { 
      ...item, 
      seasons: updatedSeasons 
    };
    
    // Auto-complete if all episodes watched
    if (allWatched && item.status !== 'completed') {
      updates.status = 'completed';
      updates.completedAt = new Date().toISOString();
    }
    // Remove completed status if not all watched anymore
    else if (!allWatched && item.status === 'completed') {
      updates.status = 'watching';
      updates.completedAt = null;
    }
    
    onItemUpdate(updates);
  };

  const handleDeleteItem = () => {
    if (!item) return;
    
    if (hasNext) {
      onItemChange(itemList[currentIndex + 1].id);
    } else if (hasPrevious) {
      onItemChange(itemList[currentIndex - 1].id);
    } else {
      onOpenChange(false);
    }
    
    onItemUpdate({ ...item, _deleted: true });
    setShowDeleteConfirm(false);
  };

  const toggleSeasonExpanded = (seasonNumber) => {
    setExpandedSeasons(prev => ({
      ...prev,
      [seasonNumber]: !prev[seasonNumber]
    }));
  };

  const calculateProgress = () => {
    if (!item || item.type !== 'tv' || !item.seasons || item.seasons.length === 0) {
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
  
  // Get upcoming episodes (not yet watched)
  const getUpcomingEpisodes = () => {
    if (!item || item.type !== 'tv' || !item.seasons || item.seasons.length === 0) {
      return [];
    }
    
    const upcoming = [];
    const today = new Date();
    
    item.seasons.forEach(season => {
      season.episodes.forEach(episode => {
        if (!episode.watched) {
          const hasAired = episode.airDate ? new Date(episode.airDate) <= today : true;
          upcoming.push({
            seasonNumber: season.seasonNumber,
            episodeNumber: episode.episodeNumber,
            name: episode.name,
            airDate: episode.airDate,
            hasAired
          });
        }
      });
    });
    
    return upcoming.slice(0, 10); // Show next 10 episodes
  };

  const renderStars = (currentRating, interactive = false) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => interactive && handleRatingChange(star)}
            disabled={!interactive}
            className={`${interactive ? 'cursor-pointer hover:scale-110' : 'cursor-default'} transition-transform`}
          >
            <Star
              className={`h-5 w-5 ${
                star <= currentRating
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300 dark:text-gray-600'
              }`}
            />
          </button>
        ))}
        {interactive && currentRating > 0 && (
          <button
            onClick={() => handleRatingChange(0)}
            className="ml-2 text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            Clear
          </button>
        )}
      </div>
    );
  };

  const progress = calculateProgress();
  const StatusIcon = item ? statusConfig[item.status]?.icon : Bookmark;

  return (
    <Explorer
      open={open}
      onOpenChange={onOpenChange}
      title={item?.type === 'movie' ? 'Movie Details' : 'TV Show Details'}
      showNavigation={itemList.length > 1}
      onPrevious={handlePrevious}
      onNext={handleNext}
      hasPrevious={hasPrevious}
      hasNext={hasNext}
      buttons={item ? [
        {
          label: 'Delete',
          icon: Trash2,
          onClick: () => setShowDeleteConfirm(true),
          variant: 'outline',
          className: 'text-red-600 dark:text-red-400 border-red-300 dark:border-red-700 hover:border-red-600 dark:hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
        }
      ] : []}
    >
      {!item ? (
        <div className="flex flex-col items-center justify-center h-64 text-center p-4">
          <Film className="h-12 w-12 text-gray-400 mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Item not found</p>
        </div>
      ) : (
        <>
          <ExplorerHeader>
            {/* Hero Section with Poster */}
            <div className="flex gap-4 mb-6">
              {/* Poster */}
              <div className="flex-shrink-0 w-32 h-48 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 rounded-lg overflow-hidden shadow-lg">
                {item.posterUrl ? (
                  <img
                    src={item.posterUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {item.type === 'movie' ? (
                      <Film className="h-12 w-12 text-gray-400" />
                    ) : (
                      <Tv className="h-12 w-12 text-gray-400" />
                    )}
                  </div>
                )}
              </div>

              {/* Title and Metadata */}
              <div className="flex-1 min-w-0 space-y-3">
                <div>
                  <h3 className="text-2xl font-bold leading-tight text-gray-900 dark:text-gray-100 mb-2">
                    {item.title}
                  </h3>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge 
                      variant="secondary" 
                      className={statusConfig[item.status]?.color}
                    >
                      <StatusIcon className="h-3 w-3 mr-1" />
                      {statusConfig[item.status]?.label}
                    </Badge>
                    
                    <Badge variant="outline" className="font-medium">
                      {item.type === 'movie' ? (
                        <>
                          <Film className="h-3 w-3 mr-1" />
                          Movie
                        </>
                      ) : (
                        <>
                          <Tv className="h-3 w-3 mr-1" />
                          TV Show
                        </>
                      )}
                    </Badge>

                    {item.releaseYear && (
                      <Badge variant="outline" className="text-gray-600 dark:text-gray-400">
                        <Calendar className="h-3 w-3 mr-1" />
                        {item.releaseYear}
                      </Badge>
                    )}

                    {item.type === 'tv' && item.totalSeasons > 0 && (
                      <Badge variant="outline" className="text-gray-600 dark:text-gray-400">
                        {item.totalSeasons} {item.totalSeasons === 1 ? 'Season' : 'Seasons'}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Overview */}
                {item.overview && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3 leading-relaxed">
                    {item.overview}
                  </p>
                )}

                {/* Progress Bar for TV Shows */}
                {item.type === 'tv' && progress && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        Progress: {progress.watched} / {progress.total} episodes
                      </span>
                      <span className="font-bold text-green-600 dark:text-green-400">
                        {progress.percentage}%
                      </span>
                    </div>
                    <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-green-500 to-green-600 transition-all duration-500"
                        style={{ width: `${progress.percentage}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Metadata Row */}
                <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Added {formatRelativeDate(item.createdAt)}
                  </span>

                  {item.completedAt && (
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" />
                      Completed {formatRelativeDate(item.completedAt)}
                    </span>
                  )}

                  {item.type === 'tv' && item.tvStatus && (
                    <span className="flex items-center gap-1">
                      <span className={`w-2 h-2 rounded-full ${
                        item.inProduction ? 'bg-green-500' : 'bg-gray-400'
                      }`} />
                      {item.tvStatus}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Rating Section */}
            <div className="pt-4 border-t border-gray-200 dark:border-gray-800">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Your Rating
              </label>
              {renderStars(item.rating || 0, true)}
            </div>
          </ExplorerHeader>

          <ExplorerBody>
            {/* Status Change Buttons */}
            <div className="mb-6 pb-6 border-b border-gray-200 dark:border-gray-800">
              <label className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3 block">
                Change Status
              </label>
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(statusConfig)
                  .filter(([status]) => {
                    // For TV shows, hide "completed" option (auto-managed)
                    if (item.type === 'tv' && status === 'completed') {
                      return false;
                    }
                    return true;
                  })
                  .map(([status, config]) => {
                    const Icon = config.icon;
                    const isActive = item.status === status;
                    return (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(status)}
                        className={`flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium rounded-lg border-2 transition-all ${
                          isActive
                            ? config.color + ' border-current shadow-sm'
                            : 'border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {config.label}
                      </button>
                    );
                  })}
              </div>
              {item.type === 'tv' && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-3 flex items-start gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                  <span>Status will automatically change to "Completed" when all episodes are watched</span>
                </p>
              )}
            </div>

            {/* TV Show Seasons */}
            {item.type === 'tv' && item.seasons && item.seasons.length > 0 && (
              <ExplorerSection title="Seasons & Episodes">
                <div className="space-y-3">
                  {item.seasons.filter(season => season.totalEpisodes > 0).map((season, seasonIndex) => {
                    const watchedCount = season.episodes.filter(ep => ep.watched).length;
                    const isExpanded = expandedSeasons[season.seasonNumber];
                    const actualSeasonIndex = item.seasons.findIndex(s => s.seasonNumber === season.seasonNumber);
                    const progressPercent = (watchedCount / season.totalEpisodes) * 100;
                    
                    return (
                      <div 
                        key={season.seasonNumber}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden bg-white dark:bg-gray-900 shadow-sm hover:shadow-md transition-shadow"
                      >
                        {/* Season Header */}
                        <div className="bg-gradient-to-r from-gray-50 to-slate-50 dark:from-gray-800 dark:to-slate-800 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <button
                              onClick={() => toggleSeasonExpanded(season.seasonNumber)}
                              className="flex items-center gap-2 flex-1 text-left group"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-5 w-5 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-400 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors" />
                              )}
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-base text-gray-900 dark:text-gray-100">
                                    Season {season.seasonNumber}
                                  </span>
                                  {season.name && season.name !== `Season ${season.seasonNumber}` && (
                                    <span className="text-sm text-gray-600 dark:text-gray-400">
                                      {season.name}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs text-gray-600 dark:text-gray-400">
                                    {season.totalEpisodes} {season.totalEpisodes === 1 ? 'episode' : 'episodes'}
                                  </span>
                                  {season.airDate && (
                                    <>
                                      <span className="text-xs text-gray-400">•</span>
                                      <span className="text-xs text-gray-600 dark:text-gray-400">
                                        {new Date(season.airDate).getFullYear()}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </button>
                            
                            <div className="flex items-center gap-3">
                              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {watchedCount}/{season.totalEpisodes}
                              </span>
                              <div className="flex gap-1.5">
                                <button
                                  onClick={() => handleMarkSeasonWatched(actualSeasonIndex, true)}
                                  className="text-xs px-2.5 py-1.5 font-medium text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-md transition-colors"
                                  title="Mark all watched"
                                >
                                  Mark All
                                </button>
                                <button
                                  onClick={() => handleMarkSeasonWatched(actualSeasonIndex, false)}
                                  className="text-xs px-2.5 py-1.5 font-medium text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
                                  title="Clear all"
                                >
                                  Clear
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="relative h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className={`h-full transition-all duration-500 ${
                                progressPercent === 100 
                                  ? 'bg-gradient-to-r from-green-500 to-emerald-500' 
                                  : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                              }`}
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>
                        
                        {/* Episodes Grid */}
                        {isExpanded && (
                          <div className="p-4 bg-white dark:bg-gray-900">
                            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                              {season.episodes.map((episode, episodeIndex) => {
                                const hasAired = episode.airDate ? new Date(episode.airDate) <= new Date() : true;
                                
                                return (
                                  <button
                                    key={episode.episodeNumber}
                                    onClick={() => handleToggleEpisode(actualSeasonIndex, episodeIndex)}
                                    className={`group relative flex flex-col items-center justify-center p-3 text-sm font-semibold rounded-lg border-2 transition-all ${
                                      episode.watched
                                        ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-500 text-green-800 dark:from-green-900/30 dark:to-emerald-900/30 dark:border-green-500 dark:text-green-400 shadow-sm'
                                        : hasAired
                                        ? 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:border-blue-500 dark:hover:border-blue-400 hover:shadow-md'
                                        : 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500 cursor-not-allowed'
                                    }`}
                                    title={episode.name || `Episode ${episode.episodeNumber}`}
                                    disabled={!hasAired}
                                  >
                                    {episode.watched && (
                                      <CheckCircle2 className="absolute top-1 right-1 h-3.5 w-3.5 text-green-600 dark:text-green-400" />
                                    )}
                                    <span className="text-lg font-bold">
                                      {episode.episodeNumber}
                                    </span>
                                    {episode.airDate && (
                                      <span className={`text-[10px] mt-1 leading-tight text-center ${
                                        episode.watched 
                                          ? 'text-green-700 dark:text-green-500' 
                                          : hasAired
                                          ? 'text-gray-500 dark:text-gray-400'
                                          : 'text-gray-400 dark:text-gray-500'
                                      }`}>
                                        {new Date(episode.airDate).toLocaleDateString('en-US', { 
                                          month: 'short', 
                                          day: 'numeric'
                                        })}
                                      </span>
                                    )}
                                    {episode.name && (
                                      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                                        {episode.name}
                                      </span>
                                    )}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ExplorerSection>
            )}

            {/* Add Season Button - Only show for TV shows without seasons */}
            {item.type === 'tv' && (!item.seasons || item.seasons.length === 0) && (
              <div className="mb-6">
                {!showSeasonInput ? (
                  <button
                    onClick={() => setShowSeasonInput(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg border border-blue-200 dark:border-blue-800 transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    Add Season
                  </button>
                ) : (
                  <div className="space-y-2 p-3 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="number"
                        value={newSeasonNumber}
                        onChange={(e) => setNewSeasonNumber(e.target.value)}
                        placeholder="Season #"
                        min="1"
                        className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <input
                        type="number"
                        value={newSeasonEpisodes}
                        onChange={(e) => setNewSeasonEpisodes(e.target.value)}
                        placeholder="Episodes"
                        min="1"
                        className="px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddSeason}>Add</Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
                        onClick={() => {
                          setShowSeasonInput(false);
                          setNewSeasonNumber('');
                          setNewSeasonEpisodes('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Notes Section */}
            <ExplorerSection title="Notes">
              <div className="space-y-3">
                {item.notes && item.notes.length > 0 ? (
                  item.notes.map((note) => (
                    <div 
                      key={note.id} 
                      className="group relative p-4 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-900/10 dark:to-yellow-900/10 border border-amber-200 dark:border-amber-800 rounded-lg shadow-sm hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                          <FileText className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                            {note.text}
                          </p>
                          {note.createdAt && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatRelativeDate(note.createdAt)}
                            </p>
                          )}
                        </div>
                        <button 
                          onClick={() => handleDeleteNote(note.id)} 
                          className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-all"
                          title="Delete note"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-800 mb-3">
                      <FileText className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">No notes yet</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">Add your thoughts and reminders</p>
                  </div>
                )}
                
                {showNoteInput ? (
                  <div className="space-y-3 p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg">
                    <textarea
                      value={newNoteText}
                      onChange={(e) => setNewNoteText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey) handleAddNote();
                        if (e.key === 'Escape') {
                          setShowNoteInput(false);
                          setNewNoteText('');
                        }
                      }}
                      placeholder="Write your note here... (Ctrl+Enter to save, Esc to cancel)"
                      autoFocus
                      rows={4}
                      className="w-full px-3 py-2.5 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none placeholder:text-gray-400"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddNote} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-3.5 w-3.5 mr-1" />
                        Add Note
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={() => {
                          setShowNoteInput(false);
                          setNewNoteText('');
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowNoteInput(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-lg border-2 border-dashed border-amber-300 dark:border-amber-700 hover:border-amber-400 dark:hover:border-amber-600 transition-all"
                  >
                    <Plus className="h-4 w-4" />
                    Add Note
                  </button>
                )}
              </div>
            </ExplorerSection>
          </ExplorerBody>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <WidgetModal
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        title={`Delete ${item?.type === 'movie' ? 'Movie' : 'TV Show'}`}
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Are you sure you want to delete this item? This action cannot be undone.
          </p>
          {item && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {item.title}
              </p>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {item.type === 'movie' ? 'Movie' : 'TV Show'}
              </p>
            </div>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteItem}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Delete
            </Button>
          </div>
        </div>
      </WidgetModal>
    </Explorer>
  );
}
