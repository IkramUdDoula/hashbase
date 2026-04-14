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
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                {item.type === 'movie' ? (
                  <Film className="h-6 w-6 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-1" />
                ) : (
                  <Tv className="h-6 w-6 text-gray-600 dark:text-gray-400 flex-shrink-0 mt-1" />
                )}
                <h3 className="text-xl font-bold flex-1 leading-tight text-gray-900 dark:text-gray-100">
                  {item.title}
                </h3>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <Badge 
                  variant="secondary" 
                  className={statusConfig[item.status]?.color}
                >
                  <StatusIcon className="h-3 w-3 mr-1" />
                  {statusConfig[item.status]?.label}
                </Badge>
                
                <Badge variant="outline">
                  {item.type === 'movie' ? 'Movie' : 'TV Show'}
                </Badge>
                
                <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  Added {formatRelativeDate(item.createdAt)}
                </span>

                {item.completedAt && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Completed {formatRelativeDate(item.completedAt)}
                  </span>
                )}
              </div>

              {/* Rating */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Your Rating
                </label>
                {renderStars(item.rating || 0, true)}
              </div>
            </div>
          </ExplorerHeader>

          <ExplorerBody>
            {/* Status Change Buttons */}
            <div className="mb-6 pb-4 border-b border-gray-200 dark:border-gray-800">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                Change Status
              </label>
              <div className="flex flex-wrap gap-2">
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
                    return (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(status)}
                        className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border transition-all ${
                          item.status === status
                            ? config.color + ' border-current'
                            : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        <Icon className="h-4 w-4" />
                        {config.label}
                      </button>
                    );
                  })}
              </div>
              {item.type === 'tv' && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  Status will automatically change to "Completed" when all episodes are watched
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
                    
                    return (
                      <div 
                        key={season.seasonNumber}
                        className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
                      >
                        {/* Season Header */}
                        <div className="bg-gray-50 dark:bg-gray-800 p-3">
                          <div className="flex items-center justify-between">
                            <button
                              onClick={() => toggleSeasonExpanded(season.seasonNumber)}
                              className="flex items-center gap-2 flex-1 text-left"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                              )}
                              <span className="font-medium text-gray-900 dark:text-gray-100">
                                Season {season.seasonNumber}
                              </span>
                              <span className="text-sm text-gray-600 dark:text-gray-400">
                                ({watchedCount}/{season.totalEpisodes})
                              </span>
                            </button>
                            
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleMarkSeasonWatched(actualSeasonIndex, true)}
                                className="text-xs px-2 py-1 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                              >
                                Mark All
                              </button>
                              <button
                                onClick={() => handleMarkSeasonWatched(actualSeasonIndex, false)}
                                className="text-xs px-2 py-1 text-gray-700 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                              >
                                Clear All
                              </button>
                            </div>
                          </div>
                          
                          {/* Progress Bar */}
                          <div className="mt-2 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-600 dark:bg-green-500 transition-all"
                              style={{ width: `${(watchedCount / season.totalEpisodes) * 100}%` }}
                            />
                          </div>
                        </div>
                        
                        {/* Episodes List */}
                        {isExpanded && (
                          <div className="p-3 grid grid-cols-3 gap-2">
                            {season.episodes.map((episode, episodeIndex) => (
                              <button
                                key={episode.episodeNumber}
                                onClick={() => handleToggleEpisode(actualSeasonIndex, episodeIndex)}
                                className={`flex flex-col items-center justify-center p-2 text-sm font-medium rounded-lg border-2 transition-all ${
                                  episode.watched
                                    ? 'bg-green-100 border-green-100 text-green-800 dark:bg-green-900/30 dark:border-green-900/30 dark:text-green-400'
                                    : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-green-500 dark:hover:border-green-400'
                                }`}
                                title={episode.name || `Episode ${episode.episodeNumber}`}
                              >
                                <span className="text-base font-bold">E{episode.episodeNumber}</span>
                                {episode.airDate && (
                                  <span className={`text-xs mt-1 ${
                                    episode.watched 
                                      ? 'text-green-700 dark:text-green-500' 
                                      : 'text-gray-500 dark:text-gray-400'
                                  }`}>
                                    {new Date(episode.airDate).toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric',
                                      year: 'numeric'
                                    })}
                                  </span>
                                )}
                              </button>
                            ))}
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
              <div className="space-y-2">
                {item.notes && item.notes.length > 0 ? (
                  item.notes.map((note) => (
                    <div 
                      key={note.id} 
                      className="group flex items-start gap-2 p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-lg"
                    >
                      <FileText className="h-4 w-4 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {note.text}
                        </p>
                        {note.createdAt && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {formatRelativeDate(note.createdAt)}
                          </p>
                        )}
                      </div>
                      <button 
                        onClick={() => handleDeleteNote(note.id)} 
                        className="opacity-0 group-hover:opacity-100 p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-600 dark:text-gray-400">No notes yet</p>
                )}
                
                {showNoteInput ? (
                  <div className="space-y-2">
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
                      placeholder="Add a note... (Ctrl+Enter to save)"
                      autoFocus
                      rows={3}
                      className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleAddNote}>Add Note</Button>
                      <Button 
                        size="sm" 
                        variant="ghost" 
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
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded-lg border border-yellow-200 dark:border-yellow-800 transition-all"
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
