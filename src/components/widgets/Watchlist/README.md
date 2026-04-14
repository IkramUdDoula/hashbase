# Watchlist Widget

A comprehensive widget for tracking movies and TV shows you want to watch or are currently watching.

## Features

### Core Functionality
- ✅ Add movies and TV shows manually
- ✅ Track watch status (Want to Watch, Watching, Completed, On Hold, Dropped)
- ✅ Episode-level tracking for TV shows
- ✅ Rating system (1-5 stars)
- ✅ Notes for each entry
- ✅ Search and filter functionality
- ✅ Auto-sorting by status, title, rating, or date added
- ✅ Progress visualization for TV shows

### Widget Features
- **Quick Add Input**: Fixed at bottom with movie/TV toggle
- **Media Cards**: Display title, type, status, rating, and progress
- **Search**: Filter by title (enabled when > 5 items)
- **Status Badges**: Color-coded status indicators
- **Progress Bars**: Visual progress for TV shows

### Explorer Features
- **Detailed View**: Full information about each entry
- **Navigation**: Previous/Next buttons and keyboard shortcuts (←/→)
- **Status Management**: Quick status change buttons
- **Rating Editor**: Interactive star rating system
- **Episode Tracking**: Checkbox grid for TV show episodes
- **Season Management**: Add seasons with episode counts
- **Bulk Actions**: Mark entire season as watched/unwatched
- **Notes System**: Add, view, and delete notes with timestamps
- **Delete Confirmation**: Safe deletion with confirmation dialog

## Data Structure

### Movie Entry
```javascript
{
  id: timestamp,
  title: string,
  type: 'movie',
  status: 'want-to-watch' | 'watching' | 'completed' | 'on-hold' | 'dropped',
  rating: 0-5,
  notes: [{ id, text, createdAt }],
  createdAt: ISO string,
  completedAt: ISO string (optional),
  watched: boolean,
  watchedDate: ISO string (optional)
}
```

### TV Show Entry
```javascript
{
  id: timestamp,
  title: string,
  type: 'tv',
  status: 'want-to-watch' | 'watching' | 'completed' | 'on-hold' | 'dropped',
  rating: 0-5,
  notes: [{ id, text, createdAt }],
  createdAt: ISO string,
  completedAt: ISO string (optional),
  seasons: [
    {
      seasonNumber: number,
      totalEpisodes: number,
      episodes: [
        {
          episodeNumber: number,
          watched: boolean,
          watchedDate: ISO string (optional)
        }
      ]
    }
  ],
  currentSeason: number,
  currentEpisode: number,
  totalSeasons: number
}
```

## localStorage Keys

This widget uses the following localStorage keys:

- `watchlist_items` - All watchlist entries (movies and TV shows)
- `watchlist_settings` - Widget settings (showCompleted, autoSort, defaultView, sortBy)

These keys are automatically backed up via the config system (registered in `src/lib/dashboardKeys.js`).

## Settings

### Show Completed Items
- Toggle to show/hide completed movies and TV shows
- Default: Enabled

### Auto Sort
- Automatically sort items by selected criteria
- Default: Enabled

### Sort By
- **Status**: Watching → Want to Watch → Completed → On Hold → Dropped
- **Date Added**: Most recent first
- **Title**: Alphabetical order
- **Rating**: Highest rated first
- Default: Status

### Default View
- **All**: Show both movies and TV shows
- **Movies Only**: Show only movies
- **TV Shows Only**: Show only TV shows
- Default: All

## Status Types

### Want to Watch (Blue)
- Items you plan to watch in the future
- Default status for new entries

### Watching (Green)
- Currently watching
- Shows in badge count

### Completed (Purple)
- Finished watching
- Automatically sets completion date

### On Hold (Yellow)
- Temporarily paused

### Dropped (Gray)
- Decided not to continue watching

## Usage Guide

### Adding Items

1. **Select Type**: Click Movie or TV Show button
2. **Enter Title**: Type the movie or TV show name
3. **Press Enter**: Item is added with "Want to Watch" status

### Tracking TV Shows

1. **Open Explorer**: Click on a TV show card
2. **Add Season**: Click "Add Season" button
3. **Enter Details**: Season number and episode count
4. **Track Episodes**: Click episode numbers to mark as watched
5. **Bulk Actions**: Use "Mark All" or "Clear All" for entire seasons

### Rating Items

1. **Open Explorer**: Click on any item
2. **Click Stars**: Select 1-5 stars
3. **Clear Rating**: Click "Clear" button to remove rating

### Adding Notes

1. **Open Explorer**: Click on any item
2. **Click "Add Note"**: Opens note input
3. **Type Note**: Enter your thoughts
4. **Save**: Press Ctrl+Enter or click "Add Note"

### Changing Status

1. **Open Explorer**: Click on any item
2. **Click Status Button**: Select new status
3. **Auto-Complete**: Marking as "Completed" sets completion date

## Keyboard Shortcuts

### Explorer View
- **← (Left Arrow)**: Navigate to previous item
- **→ (Right Arrow)**: Navigate to next item
- **Esc**: Close explorer
- **Ctrl+Enter**: Save note (when note input is focused)

## Progress Tracking

### TV Shows
- **Episode Grid**: Visual grid showing all episodes
- **Progress Bar**: Shows percentage of episodes watched
- **Season Progress**: Individual progress bars per season
- **Overall Progress**: Total episodes watched across all seasons

### Movies
- Simple watched/unwatched status
- Watch date recorded when marked as completed

## Tips & Best Practices

1. **Add Seasons First**: For TV shows, add all seasons before tracking episodes
2. **Use Notes**: Add thoughts, recommendations, or reminders
3. **Rate After Watching**: Rate items after completion for better tracking
4. **Use Status Wisely**: Update status as you progress through content
5. **Bulk Actions**: Use "Mark All" for binge-watching sessions

## Integration

### Widget Registration
The widget is registered in `src/App.jsx`:

```javascript
{
  id: 'watchlist',
  component: WatchlistWidget,
  rowSpan: 2,
  name: 'Watchlist',
  description: 'Track movies and TV shows you want to watch or are watching',
  icon: Film
}
```

### Config Backup
localStorage keys are registered in `src/lib/dashboardKeys.js` for automatic backup/restore support.

## Future Enhancements

Potential features for future versions:

- **API Integration**: TMDB API for metadata and posters
- **Streaming Links**: Quick links to streaming services
- **Watch Time Tracking**: Track total time spent watching
- **Statistics**: View watching habits and statistics
- **Recommendations**: Suggest similar content based on ratings
- **Import/Export**: Share watchlists with friends
- **Genre Tags**: Categorize by genre
- **Release Dates**: Track upcoming releases

## Troubleshooting

### Items not saving
- Check browser localStorage is enabled
- Verify no console errors
- Check localStorage quota not exceeded

### Progress not updating
- Ensure seasons are added with correct episode counts
- Verify episodes are being marked as watched
- Check console for errors

### Config backup not working
- Verify keys are in `src/lib/dashboardKeys.js`
- Test config download/upload
- Check encryption key is configured

## Development

### File Structure
```
src/components/widgets/Watchlist/
├── WatchlistWidget.jsx       # Main widget component
├── WatchlistExplorer.jsx     # Detailed view explorer
├── index.js                  # Exports
└── README.md                 # This file
```

### Dependencies
- React (hooks: useState, useEffect)
- BaseWidgetV2 (widget container)
- Explorer components (detailed view)
- Lucide React (icons)
- UI components (Badge, Button, Modal)

### Testing Checklist
- [ ] Add movie
- [ ] Add TV show
- [ ] Add seasons to TV show
- [ ] Mark episodes as watched
- [ ] Change status
- [ ] Add rating
- [ ] Add notes
- [ ] Delete item
- [ ] Search functionality
- [ ] Settings changes
- [ ] Config backup/restore
- [ ] Dark mode
- [ ] Responsive design

---

**Version**: 1.0.0  
**Last Updated**: 2026-04-14  
**Author**: Hashbase Development Team
