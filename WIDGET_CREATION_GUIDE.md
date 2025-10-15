# Widget Creation Guide

A comprehensive step-by-step guide for creating new widgets in the Hashbase dashboard.

## Table of Contents
1. [Overview](#overview)
2. [Widget Architecture](#widget-architecture)
3. [Step-by-Step Creation Process](#step-by-step-creation-process)
4. [Best Practices](#best-practices)
5. [Examples](#examples)

---

## Overview

All widgets in Hashbase follow a standardized architecture using **BaseWidgetV2**, which provides:
- Consistent UI/UX across all widgets
- Built-in state management (loading, error, empty, positive)
- Integrated search functionality
- Settings modal support
- Drag-and-drop support
- Persistent storage integration

---

## Widget Architecture

### Core Components

1. **BaseWidgetV2** - The standardized container that wraps all widget content
2. **Widget Component** - Your custom widget logic and UI
3. **WidgetModal** - Optional settings/configuration modal
4. **localStorage** - For persistent data storage
5. **Config Service** - For backup/restore functionality

### File Structure
```
src/components/widgets/YourWidget/
├── YourWidget.jsx          # Main widget component
├── index.js                # Export file
└── README.md               # Widget documentation (optional but recommended)
```

---

## Step-by-Step Creation Process

### Step 1: Create Widget Directory and Files

```bash
# Create widget directory
mkdir src/components/widgets/YourWidget

# Create main component file
touch src/components/widgets/YourWidget/YourWidget.jsx

# Create index file
touch src/components/widgets/YourWidget/index.js

# Create README (optional)
touch src/components/widgets/YourWidget/README.md
```

### Step 2: Create the Widget Component

**Template: `YourWidget.jsx`**

```jsx
import React, { useState, useEffect } from 'react';
import { BaseWidgetV2 } from '../../BaseWidgetV2';
import { Badge } from '@/components/ui/badge';
import { YourIcon } from 'lucide-react';
import { WidgetModal, WidgetModalFooter } from '@/components/ui/widget-modal';

/**
 * YourWidget - Brief description
 * 
 * Features:
 * - Feature 1
 * - Feature 2
 * - Feature 3
 */
export function YourWidget({ rowSpan = 2, dragRef }) {
  // State management
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState({
    // Your settings here
  });
  
  // Temporary settings for modal
  const [tempSettings, setTempSettings] = useState(settings);
  
  // Load data from localStorage on mount
  useEffect(() => {
    const savedData = localStorage.getItem('yourWidget_data');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setData(parsed);
        console.log('📂 Loaded widget data:', parsed.length);
      } catch (e) {
        console.error('Failed to load widget data:', e);
      }
    }
    
    const savedSettings = localStorage.getItem('yourWidget_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
        setTempSettings(parsed);
      } catch (e) {
        console.error('Failed to load widget settings:', e);
      }
    }
    
    setIsInitialized(true);
  }, []);
  
  // Save data to localStorage whenever it changes (skip initial mount)
  useEffect(() => {
    if (!isInitialized) return;
    
    try {
      localStorage.setItem('yourWidget_data', JSON.stringify(data));
      console.log('✅ Saved widget data');
    } catch (error) {
      console.error('❌ Failed to save widget data:', error);
    }
  }, [data, isInitialized]);
  
  // Save settings to localStorage
  useEffect(() => {
    if (!isInitialized) return;
    
    try {
      localStorage.setItem('yourWidget_settings', JSON.stringify(settings));
      console.log('✅ Saved widget settings');
    } catch (error) {
      console.error('❌ Failed to save widget settings:', error);
    }
  }, [settings, isInitialized]);
  
  // Data fetching/processing logic
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Your data fetching logic here
      // const response = await yourService.getData();
      // setData(response);
    } catch (err) {
      setError(err.message);
      console.error('Failed to fetch data:', err);
    } finally {
      setLoading(false);
    }
  };
  
  // Settings handlers
  const handleSettingsOpen = () => {
    setTempSettings(settings);
    setSettingsOpen(true);
  };
  
  const handleSettingsSave = () => {
    setSettings(tempSettings);
    setSettingsOpen(false);
  };
  
  const handleSettingsCancel = () => {
    setTempSettings(settings);
    setSettingsOpen(false);
  };
  
  const handleRefresh = () => {
    fetchData();
  };
  
  // Filter data based on search
  const filteredData = data.filter(item => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    // Your search logic here
    return item.name?.toLowerCase().includes(query);
  });
  
  // Determine widget state
  const getWidgetState = () => {
    if (loading) return 'loading';
    if (error) return 'error';
    if (data.length === 0) return 'empty';
    return 'positive';
  };
  
  // Badge (optional - for counts, status, etc.)
  const badge = data.length > 0 ? (
    <Badge variant="secondary">{data.length}</Badge>
  ) : null;
  
  return (
    <>
      <BaseWidgetV2
        // Header Zone
        logo={YourIcon}
        appName="Your App"
        widgetName="Widget Name"
        tooltip="Widget description"
        badge={badge}
        
        // Action Buttons
        showSettings={true}
        onSettingsClick={handleSettingsOpen}
        showRefresh={true}
        onRefresh={handleRefresh}
        refreshing={loading}
        
        // Content State
        state={getWidgetState()}
        
        // Loading State
        loadingMessage="Loading data..."
        
        // Error State
        errorIcon={YourIcon}
        errorMessage={error}
        errorActionLabel="Try Again"
        onErrorAction={handleRefresh}
        errorActionLoading={loading}
        
        // Empty State
        emptyIcon={YourIcon}
        emptyMessage="No data available"
        emptySubmessage="Add some data to get started"
        
        // Positive State (Content)
        searchEnabled={data.length > 5}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search..."
        
        // Layout
        rowSpan={rowSpan}
        dragRef={dragRef}
      >
        {/* Your widget content here */}
        <div className="flex flex-col h-full min-h-0">
          <div className="flex-1 overflow-y-auto space-y-2">
            {filteredData.map((item) => (
              <div
                key={item.id}
                className="p-3 rounded-lg border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all"
              >
                {/* Your item content */}
              </div>
            ))}
          </div>
        </div>
      </BaseWidgetV2>
      
      {/* Settings Modal (optional) */}
      <WidgetModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        title="Widget Settings"
        description="Configure your widget preferences."
        icon={YourIcon}
        footer={
          <WidgetModalFooter
            onCancel={handleSettingsCancel}
            onSave={handleSettingsSave}
          />
        }
      >
        <div className="space-y-4">
          {/* Your settings UI here */}
        </div>
      </WidgetModal>
    </>
  );
}
```

### Step 3: Create Index File

**`index.js`**

```javascript
// YourWidget
export { YourWidget } from './YourWidget';
```

### Step 4: Register Widget in App.jsx

**Add imports:**

```javascript
import { YourWidget } from './components/widgets/YourWidget/YourWidget';
import { YourIcon } from 'lucide-react';
```

**Add to `allWidgets` array:**

```javascript
const allWidgets = [
  // ... existing widgets
  { 
    id: 'your-widget-id', 
    component: YourWidget, 
    rowSpan: 2,  // Default size (1-4)
    name: 'Your Widget Name',
    description: 'Brief description of what your widget does',
    icon: YourIcon
  },
];
```

**Add to default preferences:**

```javascript
const defaultPreferences = {
  // ... existing preferences
  'your-widget-id': true,  // or false if disabled by default
};
```

### Step 5: Add to Config Service (for backup/restore)

**Edit `src/services/configService.js`:**

Add your localStorage keys to the `getDashboardKeys()` function:

```javascript
function getDashboardKeys() {
  return [
    // ... existing keys
    // Your widget data
    'yourWidget_data',
    'yourWidget_settings',
  ];
}
```

### Step 6: Create Widget README (Optional but Recommended)

**`README.md`**

```markdown
# Your Widget

Brief description of your widget.

## Features

- Feature 1
- Feature 2
- Feature 3

## Usage

### Basic Usage
Instructions on how to use the widget...

### Settings
Description of available settings...

## Technical Details

### State Management
- Uses React hooks for state management
- Persistent storage via localStorage

### Storage Keys
- `yourWidget_data`: Main widget data
- `yourWidget_settings`: Widget settings

**Note:** All widget data is automatically included in dashboard config backups.

## Dependencies

- React (hooks: useState, useEffect)
- lucide-react (icons)
- BaseWidgetV2 (widget container)
- WidgetModal (settings modal)

## Future Enhancements

- Enhancement 1
- Enhancement 2
```

### Step 7: Update Main README

**Edit `README.md`:**

Add your widget to the features list:

```markdown
### Widget Features (All using BaseWidgetV2)
- ... existing widgets
- 🆕 **Your Widget** - Brief description
```

Add usage section if needed:

```markdown
### Your Widget
- Feature description
- Usage instructions
- Settings information
```

Update the config backup section if needed:

```markdown
- **What's Included:**
  - ... existing items
  - ✅ Your widget data and settings
```

---

## Best Practices

### 1. State Management

✅ **DO:**
- Use `isInitialized` flag to prevent saving on initial mount
- Separate data state from settings state
- Use temporary state for modal forms
- Handle loading and error states properly

❌ **DON'T:**
- Save to localStorage on every render
- Mix data and settings in the same state
- Forget to handle edge cases (empty, error states)

### 2. localStorage Keys

✅ **DO:**
- Use descriptive, namespaced keys (e.g., `yourWidget_data`)
- Use consistent naming conventions
- Document all keys in your README
- Add keys to configService for backup support

❌ **DON'T:**
- Use generic keys that might conflict
- Store sensitive data without encryption
- Forget to handle JSON parse errors

### 3. UI/UX

✅ **DO:**
- Use BaseWidgetV2 for consistency
- Provide clear empty states
- Show loading indicators
- Add helpful error messages
- Use tooltips for icon-only buttons
- Support dark mode (use Tailwind dark: classes)

❌ **DON'T:**
- Create custom widget containers
- Leave users guessing what went wrong
- Forget about accessibility
- Hardcode colors (use Tailwind classes)

### 4. Performance

✅ **DO:**
- Use `useEffect` dependencies correctly
- Debounce search inputs if needed
- Lazy load heavy components
- Memoize expensive calculations

❌ **DON'T:**
- Fetch data on every render
- Create infinite loops with useEffect
- Store large objects in state unnecessarily

### 5. Code Organization

✅ **DO:**
- Keep components focused and single-purpose
- Extract complex logic into separate functions
- Add JSDoc comments for complex functions
- Use meaningful variable names
- Group related state together

❌ **DON'T:**
- Create monolithic components
- Use cryptic variable names
- Mix concerns (data fetching + UI logic)

### 6. Error Handling

✅ **DO:**
- Wrap localStorage operations in try-catch
- Provide user-friendly error messages
- Log errors to console for debugging
- Offer recovery actions (retry, reset)

❌ **DON'T:**
- Let errors crash the app
- Show technical error messages to users
- Ignore edge cases

### 7. Documentation

✅ **DO:**
- Add JSDoc comments to your component
- Create a README with features and usage
- Document localStorage keys
- Include examples in comments

❌ **DON'T:**
- Leave code undocumented
- Assume others will understand your logic
- Skip the README

---

## Examples

### Example 1: Simple Data Widget (Checklist)

**Key Features:**
- CRUD operations (Create, Read, Update, Delete)
- Auto-sorting functionality
- Settings modal
- Search functionality
- localStorage persistence

**Reference:** `src/components/widgets/Checklist/ChecklistWidget.jsx`

### Example 2: Timer Widget (Stopwatch + Countdown)

**Key Features:**
- Multiple modes (stopwatch/countdown)
- Real-time updates with intervals
- Lap system with history
- Browser notifications
- Mode switcher at bottom
- Icon-only buttons with tooltips

**Reference:** `src/components/widgets/Timer/TimerWidget.jsx`

### Example 3: API Integration Widget (GitHub)

**Key Features:**
- External API calls
- Authentication with tokens
- Auto-refresh intervals
- Configurable settings
- Error handling with retry

**Reference:** `src/components/widgets/GitHub/GitHubCommitsWidget.jsx`

### Example 4: AI Chat Widget

**Key Features:**
- Streaming responses
- Multiple conversations
- Message history
- Complex state management
- Custom UI components

**Reference:** `src/components/widgets/AI/AIChatWidget.jsx`

---

## Common Patterns

### Pattern 1: Toggle Settings

```jsx
const [enabled, setEnabled] = useState(false);

<label className="relative inline-flex items-center cursor-pointer">
  <input
    type="checkbox"
    checked={enabled}
    onChange={(e) => setEnabled(e.target.checked)}
    className="sr-only peer"
  />
  <div className="w-11 h-6 bg-gray-300 dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900 dark:peer-checked:bg-gray-100"></div>
  <span className="ml-3 text-sm">
    {enabled ? 'Enabled' : 'Disabled'}
  </span>
</label>
```

### Pattern 2: Confirmation Dialog

```jsx
const handleDelete = () => {
  if (confirm('Are you sure you want to delete this item?')) {
    // Delete logic
  }
};
```

### Pattern 3: Keyboard Shortcuts

```jsx
const handleKeyPress = (e) => {
  if (e.key === 'Enter') {
    handleSubmit();
  } else if (e.key === 'Escape') {
    handleCancel();
  }
};

<input onKeyDown={handleKeyPress} />
```

### Pattern 4: Auto-refresh

```jsx
useEffect(() => {
  const interval = setInterval(() => {
    fetchData();
  }, 60000); // 60 seconds
  
  return () => clearInterval(interval);
}, []);
```

### Pattern 5: Debounced Search

```jsx
useEffect(() => {
  const timer = setTimeout(() => {
    // Perform search
    performSearch(searchQuery);
  }, 300);
  
  return () => clearTimeout(timer);
}, [searchQuery]);
```

---

## Troubleshooting

### Issue: Data not persisting

**Solution:** Check that:
1. `isInitialized` flag is set correctly
2. localStorage keys are unique
3. JSON.stringify/parse is working
4. Browser localStorage is not disabled

### Issue: Widget not appearing

**Solution:** Verify:
1. Widget is registered in `App.jsx`
2. Widget ID is in default preferences
3. Widget is enabled in Settings > Apps
4. No JavaScript errors in console

### Issue: Settings not saving

**Solution:** Ensure:
1. Settings state is updated before closing modal
2. useEffect dependencies include settings
3. localStorage is not full
4. No JSON serialization errors

### Issue: Search not working

**Solution:** Check:
1. Search query state is updated
2. Filter logic is correct
3. Case sensitivity is handled
4. Empty strings are handled

---

## Checklist

Use this checklist when creating a new widget:

- [ ] Created widget directory and files
- [ ] Implemented widget component with BaseWidgetV2
- [ ] Added state management (data, loading, error)
- [ ] Implemented localStorage persistence
- [ ] Added settings modal (if needed)
- [ ] Created index.js export file
- [ ] Registered widget in App.jsx
- [ ] Added to default preferences
- [ ] Added localStorage keys to configService.js
- [ ] Created widget README
- [ ] Updated main README
- [ ] Tested all states (loading, error, empty, positive)
- [ ] Tested search functionality (if applicable)
- [ ] Tested settings modal (if applicable)
- [ ] Tested drag-and-drop
- [ ] Tested resize functionality
- [ ] Tested dark mode
- [ ] Tested config backup/restore
- [ ] Added proper error handling
- [ ] Added console logging for debugging
- [ ] Verified no memory leaks (cleaned up intervals/listeners)
- [ ] Code reviewed for best practices

---

## Quick Reference

### BaseWidgetV2 Props

```typescript
// Header Zone
logo: IconComponent          // Lucide icon
appName: string             // App name (e.g., "Gmail")
widgetName: string          // Widget name (e.g., "Unread")
tooltip: string             // Hover tooltip
badge: ReactNode            // Badge element

// Action Buttons
showSettings: boolean       // Show settings button
onSettingsClick: function   // Settings click handler
showRefresh: boolean        // Show refresh button
onRefresh: function         // Refresh click handler
refreshing: boolean         // Refresh loading state
customActions: ReactNode    // Custom action buttons

// Content State
state: string               // 'loading' | 'error' | 'empty' | 'positive'

// Loading State
loadingMessage: string      // Custom loading message

// Error State
errorIcon: IconComponent    // Error icon
errorMessage: string        // Error message
errorActionLabel: string    // Error button label
onErrorAction: function     // Error button handler
errorActionLoading: boolean // Error button loading

// Empty State
emptyIcon: IconComponent    // Empty icon
emptyMessage: string        // Empty message
emptySubmessage: string     // Empty submessage

// Positive State
searchEnabled: boolean      // Show search bar
searchValue: string         // Search value
onSearchChange: function    // Search change handler
searchPlaceholder: string   // Search placeholder
children: ReactNode         // Widget content

// Layout
rowSpan: number            // 1-4 rows
dragRef: Ref               // Drag handle ref
```

### Common Imports

```javascript
import React, { useState, useEffect, useRef } from 'react';
import { BaseWidgetV2 } from '../../BaseWidgetV2';
import { Badge } from '@/components/ui/badge';
import { WidgetModal, WidgetModalFooter } from '@/components/ui/widget-modal';
import { 
  // Common icons
  Settings,
  RefreshCw,
  Plus,
  Trash2,
  X,
  Check,
  Search,
  // Your specific icons
} from 'lucide-react';
```

---

## Support

For questions or issues:
1. Check existing widgets for examples
2. Review BaseWidgetV2 documentation
3. Check the main README
4. Review this guide

---

**Last Updated:** 2025-10-16
**Version:** 1.0.0
