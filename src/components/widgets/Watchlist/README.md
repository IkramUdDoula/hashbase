# Watchlist Widget

A comprehensive widget for tracking movies and TV shows you want to watch or are currently watching, with TMDB integration for searching and adding content.

## Features

### Core Functionality
- ✅ Search movies and TV shows via TMDB API
- ✅ Add movies and TV shows from search results
- ✅ Track watch status (Want to Watch, Watching, Completed, On Hold, Dropped)
- ✅ Episode-level tracking for TV shows with automatic season data
- ✅ Rating system (1-5 stars)
- ✅ Notes for each entry
- ✅ Search and filter functionality
- ✅ Auto-sorting by status, title, rating, or date added
- ✅ Progress visualization for TV shows
- ✅ Movie posters and metadata from TMDB

## Setup

### TMDB API Configuration

This widget requires a TMDB (The Movie Database) API key to search for movies and TV shows.

1. **Get a free API key**:
   - Go to [themoviedb.org](https://www.themoviedb.org/)
   - Create an account (free)
   - Go to Settings → API
   - Request an API key (choose "Developer" option)
   - Copy your API key

2. **Add to Hashbase**:
   - Open Hashbase Settings (⚙️ icon)
   - Go to "Secrets" tab
   - Find "TMDB API Key"
   - Paste your API key
   - Click "Save Secrets"

3. **Start using**:
   - The search input will now work
   - Search for any movie or TV show
   - Click a result to add it to your watchlist

**Note**: The API key is stored securely in your browser's localStorage and is never sent to any external server except TMDB.

### Widget Features
- **TMDB Search**: Search movies and TV shows with autocomplete
- **Auto-populated Data**: Posters, release dates, and metadata from TMDB
- **Media Cards**: Display title, type, status, rating, and progress
- **Search**: Filter by title (enabled when > 5 items)
- **Status Badges**: Color-coded status indicators
- **Progress Bars**: Visual progress for TV shows
- **Tabs**: Separate views for Movies and TV Shows

### Explorer Features
- **Detailed View**: Full information about each entry
- **Navigation**: Previous/Next buttons and keyboard shortcuts (←/→)
- **Status Management**: Quick status change buttons
- **Rating Editor**: Interactive star rating system
- **Episode Tracking**: Checkbox grid for TV show episodes (auto-populated from TMDB)
- **Season Management**: Seasons automatically fetched from TMDB
- **Bulk Actions**: Mark entire season as watched/unwatched
- **Notes System**: Add, view, and delete notes with timestamps
- **Delete Confirmation**: Safe deletion with confirmation dialog
- **Poster Display**: Movie/TV show posters from TMDB

## Data Structure

### Movie Entry
```javascript
{
  id: timestamp,
  tmdbId: number,                    // TMDB movie ID
  title: string,
  type: 'movie',
  status: 'want-to-watch' | 'watching' | 'completed' | 'on-hold' | 'dropped',
  rating: 0-5,
  notes: [{ id, text, createdAt }],
  posterUrl: string,                 // TMDB poster URL
  releaseDate: string,               // YYYY-MM-DD
  releaseYear: number,
  overview: string,                  // Movie description from TMDB
  createdAt: ISO string,
  watched: boolean
}
```

### TV Show Entry
```javascript
{
  id: timestamp,
  tmdbId: number,                    // TMDB TV show ID
  title: string,
  type: 'tv',
  status: 'want-to-watch' | 'watching' | 'completed' | 'on-hold' | 'dropped',
  rating: 0-5,
  notes: [{ id, text, createdAt }],
  posterUrl: string,                 // TMDB poster URL
  releaseDate: string,               // YYYY-MM-DD
  releaseYear: number,
  overview: string,                  // Show description from TMDB
  createdAt: ISO string,
  seasons: [                         // Auto-fetched from TMDB
    {
      seasonNumber: number,
      totalEpisodes: number,
      name: string,                  // Season name from TMDB
      airDate: string,               // Season air date
      episodes: [
        {
          episodeNumber: number,
          name: string,              // Episode name from TMDB
          airDate: string,           // Episode air date
          watched: boolean
        }
      ]
    }
  ],
  currentSeason: number,
  currentEpisode: number,
  totalSeasons: number,              // Total seasons from TMDB
  tvStatus: string,                  // 'Returning Series', 'Ended', 'Canceled'
  inProduction: boolean              // Whether show is still in production
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

### Default Tab
- **Movies**: Show movies tab by default
- **TV Shows**: Show TV shows tab by default
- Default: Movies

## TMDB Integration

### Search Features
- **Real-time Search**: Debounced search with 500ms delay
- **Autocomplete**: Shows top 10 results as you type
- **Multi-type Search**: Searches both movies and TV shows
- **Rich Results**: Displays poster, title, year, and rating
- **Type Icons**: Visual indicators for movies vs TV shows

### Auto-populated Data
When you add a movie or TV show from search:
- ✅ Title and release year
- ✅ Poster image (high quality)
- ✅ Overview/description
- ✅ TMDB rating
- ✅ For TV shows: All seasons and episodes with names and air dates
- ✅ Production status (Returning Series, Ended, etc.)

### API Usage
- Free tier: 1000 requests per day
- No credit card required
- Rate limit: 40 requests per 10 seconds
- The widget caches data locally to minimize API calls

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

1. **Configure TMDB API**: Add your API key in Settings → Secrets (see Setup section)
2. **Search**: Type a movie or TV show name in the search box
3. **Select**: Click on a search result
4. **Auto-add**: Item is added with all metadata from TMDB
5. **TV Shows**: Seasons and episodes are automatically fetched

### Tracking TV Shows

1. **Open Explorer**: Click on a TV show card
2. **View Seasons**: All seasons are pre-loaded from TMDB
3. **Track Episodes**: Click episode numbers to mark as watched
4. **Episode Info**: Hover to see episode names and air dates
5. **Bulk Actions**: Use "Mark All" or "Clear All" for entire seasons
6. **Next Episode**: Widget shows next unwatched episode on the card

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

1. **Get TMDB API Key First**: Widget requires API key to search for content
2. **Use Search**: Let TMDB populate all the data automatically
3. **Track as You Watch**: Mark episodes as you finish them
4. **Use Notes**: Add thoughts, recommendations, or reminders
5. **Rate After Watching**: Rate items after completion for better tracking
6. **Use Status Wisely**: Update status as you progress through content
7. **Bulk Actions**: Use "Mark All" for binge-watching sessions
8. **Check Next Episode**: Widget shows which episode to watch next

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

- ✅ ~~TMDB API for metadata and posters~~ (Implemented)
- **Streaming Links**: Quick links to streaming services (JustWatch integration)
- **Watch Time Tracking**: Track total time spent watching
- **Statistics**: View watching habits and statistics
- **Recommendations**: Suggest similar content based on ratings
- **Import/Export**: Share watchlists with friends
- **Genre Tags**: Categorize by genre (from TMDB)
- **Release Dates**: Track upcoming releases and new episodes
- **Watchlist Sharing**: Generate shareable links
- **Trakt.tv Integration**: Sync with Trakt.tv

## Troubleshooting

### Search not working
- Verify TMDB API key is configured in Settings → Secrets
- Check browser console for API errors
- Ensure you have internet connection
- Verify API key is valid (test at themoviedb.org)

### Items not saving
- Check browser localStorage is enabled
- Verify no console errors
- Check localStorage quota not exceeded

### Progress not updating
- Ensure seasons are loaded from TMDB
- Verify episodes are being marked as watched
- Check console for errors

### Posters not loading
- Check TMDB API key is valid
- Verify internet connection
- Check browser console for image loading errors

### Config backup not working
- Verify keys are in `src/lib/dashboardKeys.js`
- Test config download/upload
- Check encryption key is configured
- Note: TMDB API key is backed up in encrypted secrets

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
- React (hooks: useState, useEffect, useRef)
- BaseWidgetV2 (widget container)
- Explorer components (detailed view)
- Lucide React (icons)
- UI components (Badge, Button, Modal)
- TMDB Service (API integration)
- Secrets Service (API key management)

### Testing Checklist
- [ ] Configure TMDB API key
- [ ] Search for movie
- [ ] Search for TV show
- [ ] Add movie from search
- [ ] Add TV show from search
- [ ] Verify poster loads
- [ ] Verify seasons auto-populate for TV shows
- [ ] Mark episodes as watched
- [ ] Change status
- [ ] Add rating
- [ ] Add notes
- [ ] Delete item
- [ ] Search functionality (filter)
- [ ] Settings changes
- [ ] Config backup/restore (including TMDB key)
- [ ] Dark mode
- [ ] Responsive design
- [ ] Next episode indicator
- [ ] Tab switching (Movies/TV)

---

**Version**: 2.0.0  
**Last Updated**: 2026-04-16  
**Author**: Hashbase Development Team
