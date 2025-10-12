# Widget Upgrade Guide - BaseWidget to BaseWidgetV2

## Overview

This guide documents the upgrade from `BaseWidget` to `BaseWidgetV2`, which provides a standardized, feature-rich widget container with built-in state management, search functionality, settings modal support, and consistent UI/UX.

## What's New in BaseWidgetV2

### Key Features

1. **Built-in State Management**
   - `loading` - Shows loading spinner with optional message
   - `error` - Shows error state with icon, message, and action buttons
   - `empty` - Shows empty state with icon and messages
   - `positive` - Shows content with optional search

2. **Standardized Header**
   - Logo with drag handle (light white hover effect)
   - App name and widget name
   - Badge support for counts/status
   - Settings button (optional)
   - Refresh button (with loading state)
   - Custom action buttons support

3. **Error State Enhancements**
   - Primary error action button (e.g., "Try Again")
   - Secondary error action button (e.g., "Authenticate")
   - Loading states for both buttons
   - Custom error icons

4. **Search Integration**
   - Built-in search bar component
   - Automatic show/hide based on content
   - Customizable placeholder

5. **Responsive Height System**
   - `rowSpan` 1-4 with predefined heights
   - Consistent sizing across all widgets

6. **Modern UI Components**
   - Improved toggle buttons (dark blue theme with white borders)
   - Better hover states
   - Consistent spacing and padding

## Upgraded Widgets

### ✅ Completed Upgrades

1. **GitHubCommitsWidget** → `GitHubCommitsWidget.jsx`
   - Settings modal for configuration
   - Auto-refresh with configurable intervals
   - Commit status indicators
   - Repository name display toggle

2. **UnreadEmailWidgetV2** → `UnreadEmailWidgetV2.jsx`
   - Dual error actions (Try Again + Authenticate)
   - Gmail authentication flow
   - Auto-refresh on visibility change

3. **DeploymentWidgetV2** → `DeploymentWidgetV2.jsx`
   - Deployment status badges (ready/building/error)
   - Color-coded cards by state
   - Build time tracking

4. **NewsWidgetV2** → `NewsWidgetV2.jsx`
   - Country and category filtering
   - Settings modal integration
   - Auto-refresh every 5 minutes

5. **BD24LiveWidgetV2** → `BD24LiveWidgetV2.jsx`
   - Last fetched timestamp display
   - 30-minute auto-refresh
   - RSS feed status checking

6. **DemoWidget** → `DemoWidget.jsx`
   - Comprehensive feature showcase
   - All widget states demonstrated
   - Settings modal with various input types

### 🔄 Legacy Widgets (Still using BaseWidget)

- **AIChatWidget** - Complex chat interface, requires custom implementation
- **UnreadEmailWidget** (old) - Kept for backward compatibility
- **CommitLogWidget** (old) - Replaced by GitHubCommitsWidget

## Migration Guide

### Step 1: Update Import

```javascript
// Old
import { BaseWidget } from '../../BaseWidget';

// New
import { BaseWidgetV2 } from '../../BaseWidgetV2';
```

### Step 2: Convert State Management

**Before (BaseWidget):**
```javascript
const [loading, setLoading] = useState(true);
const [error, setError] = useState(null);

return (
  <BaseWidget {...props}>
    {loading ? (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    ) : error ? (
      <div className="flex flex-col items-center justify-center h-full">
        <p>{error}</p>
        <Button onClick={handleRetry}>Try Again</Button>
      </div>
    ) : (
      // Content
    )}
  </BaseWidget>
);
```

**After (BaseWidgetV2):**
```javascript
const [currentState, setCurrentState] = useState('loading');
const [errorMessage, setErrorMessage] = useState('');
const [errorActionLoading, setErrorActionLoading] = useState(false);

return (
  <BaseWidgetV2
    state={currentState}
    loadingMessage="Loading data..."
    errorMessage={errorMessage}
    errorActionLabel="Try Again"
    onErrorAction={handleErrorAction}
    errorActionLoading={errorActionLoading}
    emptyMessage="No items found"
    emptySubmessage="Try refreshing"
  >
    {/* Content only shown in 'positive' state */}
  </BaseWidgetV2>
);
```

### Step 3: Update Header Actions

**Before:**
```javascript
const headerActions = (
  <>
    <Button variant="ghost" size="icon" onClick={handleSettings}>
      <Settings className="h-4 w-4" />
    </Button>
    <Button variant="ghost" size="icon" onClick={handleRefresh}>
      <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
    </Button>
  </>
);

<BaseWidget headerActions={headerActions} {...props} />
```

**After:**
```javascript
<BaseWidgetV2
  showSettings={true}
  onSettingsClick={handleSettingsOpen}
  showRefresh={true}
  onRefresh={handleRefresh}
  refreshing={refreshing}
  customActions={customActions} // Optional additional buttons
  {...props}
/>
```

### Step 4: Add Search Functionality

```javascript
const [searchQuery, setSearchQuery] = useState('');

const filteredItems = items.filter(item => {
  if (!searchQuery.trim()) return true;
  return item.name.toLowerCase().includes(searchQuery.toLowerCase());
});

<BaseWidgetV2
  searchEnabled={true}
  searchValue={searchQuery}
  onSearchChange={setSearchQuery}
  searchPlaceholder="Search items..."
>
  {filteredItems.map(item => (
    // Render items
  ))}
</BaseWidgetV2>
```

### Step 5: Implement Settings Modal (Optional)

```javascript
import { WidgetModal, WidgetModalFooter } from '@/components/ui/widget-modal';

const [settingsOpen, setSettingsOpen] = useState(false);
const [settings, setSettings] = useState({ /* ... */ });
const [tempSettings, setTempSettings] = useState(settings);

const handleSettingsSave = () => {
  setSettings(tempSettings);
  setSettingsOpen(false);
};

return (
  <>
    <BaseWidgetV2
      showSettings={true}
      onSettingsClick={() => setSettingsOpen(true)}
      // ... other props
    />
    
    <WidgetModal
      open={settingsOpen}
      onOpenChange={setSettingsOpen}
      title="Widget Settings"
      description="Configure your widget"
      icon={YourIcon}
      footer={
        <WidgetModalFooter
          onCancel={() => setSettingsOpen(false)}
          onSave={handleSettingsSave}
        />
      }
    >
      {/* Settings form */}
    </WidgetModal>
  </>
);
```

## BaseWidgetV2 Props Reference

### Header Zone
- `logo` - Icon component for the widget
- `appName` - Application name (e.g., "Gmail")
- `widgetName` - Widget name (e.g., "Unread")
- `tooltip` - Tooltip text for header (optional)
- `badge` - Badge element to display (optional)

### Action Buttons
- `showSettings` - Show settings button (default: false)
- `onSettingsClick` - Settings button click handler
- `showRefresh` - Show refresh button (default: true)
- `onRefresh` - Refresh button click handler
- `refreshing` - Refresh loading state (default: false)
- `customActions` - Additional custom action buttons

### Content States
- `state` - Current state: 'loading' | 'error' | 'empty' | 'positive'

### Loading State
- `loadingMessage` - Custom loading message (optional)

### Error State
- `errorIcon` - Error icon component (optional)
- `errorMessage` - Error message to display
- `errorActionLabel` - Primary error action button label
- `onErrorAction` - Primary error action button click handler
- `errorActionLoading` - Primary error action button loading state
- `errorSecondaryActionLabel` - Secondary error action button label (optional)
- `onErrorSecondaryAction` - Secondary error action button click handler (optional)
- `errorSecondaryActionLoading` - Secondary error action button loading state (optional)

### Empty State
- `emptyIcon` - Empty state icon component
- `emptyMessage` - Primary empty message
- `emptySubmessage` - Secondary empty message (optional)

### Positive State (Content)
- `searchEnabled` - Show search bar (default: false)
- `searchValue` - Search input value
- `onSearchChange` - Search value change handler
- `searchPlaceholder` - Search placeholder text
- `children` - Widget content (cards/list)

### Layout
- `rowSpan` - Number of rows (1-4) this widget occupies
- `className` - Additional CSS classes
- `dragRef` - Ref for drag handle

## UI Component Standards

### Toggle Buttons
```javascript
<label className="relative inline-flex items-center cursor-pointer">
  <input
    type="checkbox"
    checked={value}
    onChange={(e) => setValue(e.target.checked)}
    className="sr-only peer"
  />
  <div className="w-11 h-6 bg-gray-300 dark:bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 dark:peer-focus:ring-gray-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-2 after:border-gray-300 dark:after:border-gray-700 after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-900 dark:peer-checked:bg-blue-900 peer-checked:border-2 peer-checked:border-white dark:peer-checked:border-white peer-checked:after:border-white"></div>
  <span className="ml-3 text-sm text-gray-900 dark:text-gray-100">
    {value ? 'Enabled' : 'Disabled'}
  </span>
</label>
```

### Card Styling
- Use gradient backgrounds: `bg-gradient-to-br from-{color}-50 to-{color}-50 dark:from-{color}-900/20 dark:to-{color}-900/20`
- Border colors: `border-{color}-200 dark:border-{color}-700`
- Hover effects: `hover:shadow-md hover:border-{color}-300 dark:hover:border-{color}-600`
- Transition: `transition-all cursor-pointer group`

## Best Practices

1. **Always use state management** - Use `currentState` instead of multiple boolean flags
2. **Provide meaningful messages** - Use descriptive loading, error, and empty messages
3. **Handle errors gracefully** - Always provide a way to retry failed operations
4. **Implement search when applicable** - Enable search for lists with 5+ items
5. **Use settings modals** - For configuration options instead of inline controls
6. **Follow color schemes** - Use consistent gradient colors for different content types
7. **Add tooltips** - Provide helpful tooltips for icons and actions
8. **Auto-refresh wisely** - Implement auto-refresh with reasonable intervals
9. **Show loading states** - Always indicate when actions are in progress
10. **Test all states** - Verify loading, error, empty, and positive states work correctly

## Testing Checklist

- [ ] Loading state displays correctly
- [ ] Error state shows with proper message and action buttons
- [ ] Empty state displays when no data
- [ ] Positive state shows content correctly
- [ ] Search functionality filters items
- [ ] Refresh button works and shows loading state
- [ ] Settings modal opens and saves correctly
- [ ] Toggle buttons have correct styling (dark blue + white)
- [ ] Drag handle has light white hover effect
- [ ] Auto-refresh works at specified intervals
- [ ] Responsive layout works across screen sizes
- [ ] Dark mode styling is correct
- [ ] All icons display properly
- [ ] Badges show correct counts

## Troubleshooting

### Issue: Widget stuck in loading state
**Solution:** Ensure `setCurrentState('positive')` or other states are called in the `finally` block

### Issue: Search not working
**Solution:** Verify `searchEnabled={true}` and `onSearchChange` handler is properly connected

### Issue: Settings not saving
**Solution:** Check that `tempSettings` is properly synced with `settings` on save

### Issue: Toggle buttons look wrong
**Solution:** Use the exact toggle button class string from the UI Component Standards section

### Issue: Hover effects not working
**Solution:** Ensure `group` class is on parent and `group-hover:` prefix on child elements

## Additional Resources

- See `DemoWidget.jsx` for a comprehensive example of all features
- Check `BASEWIDGET_V2_*.md` files for detailed documentation
- Review existing V2 widgets for implementation patterns
