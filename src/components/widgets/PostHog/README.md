# PostHog Error Tracking Widget

Monitor and track errors from PostHog error tracking with real-time updates.

## Features

- 📊 **Real-time Error Monitoring** - View recent errors from your PostHog project
- 🔍 **Search & Filter** - Search errors by type, message, or filter by status
- 🔄 **Auto-refresh** - Configurable automatic refresh intervals (1-30 minutes)
- 📈 **Error Statistics** - View occurrence counts and affected user counts
- 🎯 **Severity Badges** - Visual indicators for error severity levels
- 🔗 **Direct Links** - Open errors directly in PostHog dashboard
- 💾 **Persistent Settings** - Widget settings saved to localStorage

## Setup

### 1. Get PostHog Personal API Key

1. Go to your PostHog instance (e.g., https://app.posthog.com)
2. Navigate to **Settings** → **Personal API Keys**
3. Click **Create Personal API Key**
4. Give it a name (e.g., "Hashbase Widget")
5. Ensure it has the `project:read` scope
6. Copy the generated key (starts with `phx_`)

### 2. Add API Key to Hashbase

1. Open Hashbase Settings (gear icon)
2. Go to the **Secrets** tab
3. Find **PostHog Personal API Key**
4. Paste your API key
5. Click **Save**

### 3. Configure Widget Settings

1. Enable the **PostHog Error Tracking** widget in Settings → Apps
2. Click the settings icon (⚙️) on the widget
3. Configure:
   - **Project ID**: Your PostHog project ID (found in project settings)
   - **Project URL**: Your PostHog instance URL (e.g., `https://app.posthog.com`)
   - **Error Status**: Filter by active, resolved, or all errors
   - **Maximum Errors**: Number of errors to display (10-100)
   - **Auto Refresh**: Enable/disable automatic refresh
   - **Refresh Interval**: How often to refresh (1-30 minutes)

## Configuration

### Widget Settings

The widget stores its configuration in localStorage under the key `posthog_errors_settings`:

```json
{
  "projectId": "12345",
  "projectUrl": "https://app.posthog.com",
  "status": "active",
  "maxErrors": 50,
  "autoRefresh": true,
  "refreshInterval": 5
}
```

### localStorage Keys

- `posthog_errors_settings` - Widget configuration

These keys are automatically included in config backup/restore.

## Usage

### Viewing Errors

- Errors are displayed as cards showing:
  - Error type and severity
  - Error message
  - Number of occurrences
  - Number of affected users
  - Time since last occurrence

### Searching Errors

- Use the search bar to filter errors by:
  - Error type
  - Error message
  - Any text in the error details

### Error Details

Click on any error card to open the explorer view with:
- Full error message and stack trace
- Occurrence statistics
- Timeline (first seen, last seen)
- Error details (file, line, column, function)
- Browser/environment information
- Additional context

### Opening in PostHog

- Click the "View in PostHog" link on any error card
- Or use the "Open in PostHog" button in the explorer view
- This opens the error directly in your PostHog dashboard

## API Integration

The widget uses PostHog's Query API to fetch error data:

### Endpoints Used

- `POST /api/projects/{projectId}/query/` - Fetch errors using HogQL queries

### Query Structure

The widget queries `$exception` events with the following data:
- Exception type, message, and fingerprint
- Stack traces
- Browser and OS information
- User information
- Timestamps

### Error Grouping

Errors are automatically grouped by fingerprint to show:
- Total occurrences of each unique error
- Number of affected users
- First and last occurrence times

## Troubleshooting

### "PostHog access token not configured"

**Solution:** Add your PostHog Personal API Key in Settings → Secrets

### "PostHog project ID not configured"

**Solution:** Add your project ID in the widget settings (⚙️ icon)

### "Invalid PostHog access token"

**Causes:**
- Token is incorrect
- Token has been revoked
- Token doesn't have required permissions

**Solution:** Generate a new Personal API Key with `project:read` scope

### "Project not found"

**Causes:**
- Project ID is incorrect
- You don't have access to the project

**Solution:** Verify your project ID in PostHog settings

### No errors showing

**Possible causes:**
1. No errors in the selected time period
2. Status filter is too restrictive
3. Project has no error tracking data

**Solutions:**
- Change status filter to "All Errors"
- Increase the maximum errors limit
- Verify error tracking is set up in your app

### Auto-refresh not working

**Solution:**
- Ensure auto-refresh is enabled in widget settings
- Check that the refresh interval is set
- Verify the widget hasn't encountered an error state

## Performance Considerations

- **API Rate Limits**: PostHog has rate limits on API requests
- **Refresh Interval**: Recommended minimum is 5 minutes to avoid rate limits
- **Max Errors**: Higher limits may slow down the widget
- **Recommended Settings**:
  - Max Errors: 50
  - Refresh Interval: 5-10 minutes
  - Status: Active (to reduce data volume)

## Security

- API keys are stored in localStorage and encrypted in config exports
- Keys are never exposed in the UI (masked with dots)
- All API requests use HTTPS
- Personal API Keys can be revoked at any time in PostHog settings

## Widget States

The widget has four states:

1. **Loading** - Fetching errors from PostHog
2. **Error** - Configuration issue or API error
3. **Empty** - No errors found (good news!)
4. **Positive** - Displaying errors

## Best Practices

1. **Use Personal API Keys** - Don't use project API keys for security
2. **Set Appropriate Refresh Intervals** - 5-10 minutes is recommended
3. **Filter by Status** - Use "Active" to focus on unresolved errors
4. **Monitor Regularly** - Check the widget daily for new errors
5. **Link to PostHog** - Configure project URL for quick access to details

## Related Documentation

- [PostHog Error Tracking Docs](https://posthog.com/docs/error-tracking)
- [PostHog API Documentation](https://posthog.com/docs/api)
- [PostHog Query API](https://posthog.com/docs/api/query)

## Support

For issues with:
- **The widget**: Check Hashbase documentation
- **PostHog API**: Check PostHog documentation
- **Error tracking setup**: Check PostHog error tracking docs

## Version History

- **v1.0.0** (2025-11-04)
  - Initial release
  - Error listing with search and filter
  - Auto-refresh capability
  - Error details explorer
  - Direct links to PostHog dashboard
