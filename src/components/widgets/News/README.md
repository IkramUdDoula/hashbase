# News Widget

A widget that displays the latest news headlines from around the world using the NewsAPI service.

## Features

- 📰 **Latest Headlines** - Fetches top news stories from NewsAPI
- 🌍 **Country Selection** - Choose from 20+ countries
- 🏷️ **Topic Categories** - Filter by General, Business, Technology, Entertainment, Sports, Science, or Health
- 🔍 **Search** - Search through headlines by title, description, or source
- ⚙️ **Settings Dialog** - Easy configuration via settings button
- 🔄 **Auto-refresh** - Updates every 5 minutes
- 💾 **Persistent Settings** - Country and topic preferences saved in localStorage

## Setup

### 1. Get a NewsAPI Key

1. Visit [newsapi.org/register](https://newsapi.org/register)
2. Sign up for a free account (100 requests/day)
3. Copy your API key

### 2. Configure Environment

Add your API key to `.env`:

```bash
NEWS_API_KEY=your_api_key_here
```

### 3. Add Widget to Dashboard

In your `App.jsx` or dashboard component:

```javascript
import { NewsWidget } from './components/widgets/News/NewsWidget';

// Add to your widgets array
const widgets = [
  { id: 'news', component: NewsWidget, rowSpan: 2 },
];
```

## Usage

### Default Configuration

By default, the widget shows:
- **Country**: United States (us)
- **Topic**: General

### Changing Settings

1. Click the **Settings** icon (⚙️) in the widget header
2. Select your preferred **Country** from the dropdown
3. Select your preferred **Topic** from the dropdown
4. Click **Save Changes**

Settings are automatically saved to localStorage and persist across sessions.

### Available Countries

- United States, United Kingdom, Canada, Australia
- India, Germany, France, Japan, China
- Brazil, Mexico, Italy, Spain, Russia
- South Korea, Netherlands, Sweden, Norway
- Switzerland, Singapore

### Available Topics

- **General** - Top headlines from all categories
- **Business** - Business and financial news
- **Technology** - Tech industry and innovation
- **Entertainment** - Movies, TV, music, celebrities
- **Sports** - Sports news and updates
- **Science** - Scientific discoveries and research
- **Health** - Health and medical news

## Widget Props

```javascript
<NewsWidget 
  rowSpan={2}    // Number of rows (1-4), default: 2
  dragRef={ref}  // Optional: Ref for drag-and-drop
/>
```

## API Integration

### Backend Endpoint

The widget uses the following backend endpoint:

```
GET /api/news?country={country}&category={category}
```

**Parameters:**
- `country` - ISO 3166-1 alpha-2 country code (e.g., 'us', 'gb')
- `category` - News category (e.g., 'general', 'technology')

**Response:**
```json
{
  "articles": [
    {
      "title": "Article headline",
      "description": "Article description",
      "url": "https://...",
      "source": { "name": "Source Name" },
      "publishedAt": "2024-01-01T12:00:00Z"
    }
  ]
}
```

### Service Functions

Located in `src/services/newsService.js`:

- `fetchNews(country, category)` - Fetch news articles
- `checkNewsApiStatus()` - Check if API key is configured
- `NEWS_COUNTRIES` - Array of available countries
- `NEWS_CATEGORIES` - Array of available topics

## Styling

The widget uses a warm orange/red gradient theme:
- Cards: `from-orange-50 to-red-50` (light mode)
- Cards: `from-orange-900/20 to-red-900/20` (dark mode)
- Borders: `border-orange-200` / `border-orange-800`

## Error Handling

The widget handles various error states:
- **No API Key** - Shows setup instructions with link to newsapi.org
- **API Error** - Displays error message with retry button
- **No Results** - Shows empty state message
- **Search No Match** - Shows "No articles match your search" message

## Rate Limits

NewsAPI free tier limits:
- **100 requests per day**
- **Top headlines only** (no historical data)
- **20 articles per request** (max)

The widget is configured to:
- Fetch 20 articles per request
- Auto-refresh every 5 minutes (288 requests/day max)
- Consider adjusting refresh interval if needed

## Troubleshooting

### Widget shows "NewsAPI not configured"

1. Ensure `NEWS_API_KEY` is in your `.env` file
2. Restart the backend server after adding the key
3. Check server logs for any API errors

### No articles showing

1. Try different country/topic combinations
2. Some countries may have limited news in certain categories
3. Check NewsAPI dashboard for rate limit status

### Articles are outdated

1. Click the refresh button (🔄) to manually update
2. Check your internet connection
3. Verify NewsAPI service status

## Development

### File Structure

```
News/
├── NewsWidget.jsx           # Main widget component
├── NewsSettingsDialog.jsx   # Settings configuration dialog
└── README.md               # This file
```

### Dependencies

- `@radix-ui/react-dialog` - Settings dialog component
- `lucide-react` - Icons
- `newsapi.org` - News data source

## Future Enhancements

Potential improvements:
- [ ] Add source filtering
- [ ] Implement article bookmarking
- [ ] Add language selection
- [ ] Show article images/thumbnails
- [ ] Add keyword search (requires paid plan)
- [ ] Implement infinite scroll
- [ ] Add article preview modal
