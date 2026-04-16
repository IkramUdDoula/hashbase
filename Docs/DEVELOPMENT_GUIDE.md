# Hashbase Development Guide

Complete guide for creating widgets and explorers in the Hashbase dashboard.

## Table of Contents

1. [Overview](#overview)
2. [Quick Start Setup](#quick-start-setup)
3. [Architecture](#architecture)
4. [Widget Development](#widget-development)
5. [Explorer Development](#explorer-development)
6. [Integration Guide](#integration-guide)
7. [Best Practices](#best-practices)
8. [Examples & Patterns](#examples--patterns)
9. [API Reference](#api-reference)
10. [Troubleshooting](#troubleshooting)
11. [Advanced Features](#advanced-features)

---

## Overview

### What is Hashbase?

Hashbase is a customizable dashboard system with modular widgets. Each widget can display data and optionally open detailed views using explorers.

### Core Components

- **BaseWidgetV2**: Standardized widget container with built-in states (loading, error, empty, positive)
- **Explorer**: Side sheet component for detailed item views
- **ExplorerContext**: Global state management for explorers
- **localStorage**: Persistent data storage
- **Config Service**: Backup/restore functionality

---

## Quick Start Setup

### For New Contributors

Follow these steps to set up your development environment:

#### 1. Clone and Install

```bash
git clone <repository-url>
cd hashbase
npm install
```

#### 2. Configure Encryption Key (REQUIRED)

Hashbase uses AES-256-GCM encryption for API secrets. You **must** configure an encryption key:

```bash
# Generate a secure encryption key
node generate-encryption-key.js
```

This will output a 64-character hex key. Copy it.

#### 3. Create .env File

Create a `.env` file in the project root:

```bash
cp .env.example .env
```

Edit `.env` and add your encryption key:

```env
VITE_CONFIG_ENCRYPTION_KEY=your_64_character_hex_key_here
```

⚠️ **IMPORTANT:** Never commit your `.env` file to version control!

#### 4. Start Development Server

```bash
npm run dev
```

The app will open at `http://localhost:5173`

#### 5. Understanding Config & Storage

Hashbase has a unified configuration system that backs up:

**What Gets Stored:**
- ✅ API secrets (encrypted)
- ✅ Widget enable/disable state
- ✅ Canvas layouts and widget positions
- ✅ All widget settings
- ✅ Widget data (Timer, Checklist, AI Chat, etc.)

**What's Excluded:**
- ❌ OAuth tokens (security - users re-authenticate)
- ❌ Storage configuration

**Storage Methods:**
1. **Browser localStorage** - Automatic, always active
2. **Config Download** - Manual backup as JSON file
3. **Folder Sync** - Auto-sync to local folder (Chrome/Edge only)

All three methods use the **same keys** and are **100% synchronized**.

#### 6. Adding localStorage Keys (CRITICAL)

When creating a widget that stores data, you **MUST** add your keys to the shared utility:

**File:** `src/lib/dashboardKeys.js`

```javascript
export function getDashboardKeys() {
  const baseKeys = [
    // ... existing keys
    
    // Your widget (add here)
    'yourWidget_data',      // Widget data
    'yourWidget_settings',  // Widget settings
  ];
  // ...
}
```

**Why?** This ensures your widget data is:
- ✅ Backed up in config downloads
- ✅ Synced in folder sync
- ✅ Restored when importing configs

**Encryption:** Only add keys to `getSecretKeys()` if they contain API keys/tokens.

#### 7. Testing Your Setup

```bash
# 1. Configure some widgets
# 2. Add API keys in Settings → Secrets
# 3. Download config (Settings → Storage → Download Config)
# 4. Check the JSON file contains your data
# 5. Clear localStorage (DevTools → Application → Clear)
# 6. Upload config (Settings → Storage → Upload Config)
# 7. Verify everything restored
```

---

## Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        App.jsx                               │
│  - Widget registration                                       │
│  - Layout management                                         │
│  - ExplorerProvider wrapper                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
        ┌───────────────────┐  ┌───────────────────┐
        │  Widget Component │  │ ExplorerContext   │
        │  - BaseWidgetV2   │  │  - Global state   │
        │  - Data mgmt      │  │  - Button config  │
        │  - localStorage   │  │  - Hooks          │
        └───────────────────┘  └───────────────────┘
                    │                   │
                    └─────────┬─────────┘
                              ▼
                    ┌───────────────────┐
                    │  Explorer         │
                    │  - Side sheet     │
                    │  - Navigation     │
                    │  - Auto buttons   │
                    └───────────────────┘
```

### File Structure

```
src/
├── components/
│   ├── ui/
│   │   ├── explorer.jsx          # Base explorer component
│   │   ├── widget-modal.jsx      # Settings modal
│   │   └── badge.jsx             # UI components
│   ├── BaseWidgetV2.jsx          # Widget container
│   └── widgets/
│       └── YourWidget/
│           ├── YourWidget.jsx           # Main widget
│           ├── YourWidgetExplorer.jsx   # Explorer (optional)
│           ├── index.js                 # Exports
│           └── README.md                # Documentation
├── contexts/
│   └── ExplorerContext.jsx       # Explorer state management
├── services/
│   └── configService.js          # Backup/restore
└── App.jsx                       # Main app
```

---

## Widget Development

### Step 1: Create Widget Directory

```bash
mkdir src/components/widgets/YourWidget
```

### Step 2: Create Widget Component

**File**: `src/components/widgets/YourWidget/YourWidget.jsx`

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
  
  // Save data to localStorage (skip initial mount)
  useEffect(() => {
    if (!isInitialized) return;
    
    try {
      localStorage.setItem('yourWidget_data', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save widget data:', error);
    }
  }, [data, isInitialized]);
  
  // Save settings to localStorage
  useEffect(() => {
    if (!isInitialized) return;
    
    try {
      localStorage.setItem('yourWidget_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save widget settings:', error);
    }
  }, [settings, isInitialized]);
  
  // Data fetching logic
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Your data fetching logic here
      // const response = await yourService.getData();
      // setData(response);
    } catch (err) {
      setError(err.message);
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
    return item.name?.toLowerCase().includes(query);
  });
  
  // Determine widget state
  const getWidgetState = () => {
    if (loading) return 'loading';
    if (error) return 'error';
    if (data.length === 0) return 'empty';
    return 'positive';
  };
  
  // Badge (optional)
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
                className="p-3 rounded-lg bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/40 dark:to-slate-900/40 border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer group"
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

**File**: `src/components/widgets/YourWidget/index.js`

```javascript
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
    rowSpan: 2,
    name: 'Your Widget Name',
    description: 'Brief description',
    icon: YourIcon
  },
];
```

**Add to default preferences:**

```javascript
const defaultPreferences = {
  // ... existing preferences
  'your-widget-id': true,
};
```

### Step 5: Add to Dashboard Keys (REQUIRED)

⚠️ **CRITICAL STEP** - Without this, your widget data won't be backed up!

**Edit `src/lib/dashboardKeys.js`:**

```javascript
export function getDashboardKeys() {
  const baseKeys = [
    // ... existing keys
    
    // Your widget - ADD YOUR KEYS HERE
    'yourWidget_data',        // Widget data (if storing data)
    'yourWidget_settings',    // Widget settings (if has settings)
  ];
  
  // ... rest of function
}
```

**What to add:**
- **Data keys**: If your widget stores data (like Timer, Checklist)
- **Settings keys**: If your widget has configurable settings
- **Both**: If your widget has both data and settings

**Encryption:**
Only add to `getSecretKeys()` if storing API keys/tokens:

```javascript
export function getSecretKeys() {
  return [
    'hashbase_secrets',  // Only this should be encrypted
    // DON'T add your widget keys here unless they contain API keys
  ];
}
```

**Verification:**
1. Add your widget
2. Store some data
3. Download config (Settings → Storage)
4. Open JSON file
5. Verify your keys are present

**Common Mistakes:**
- ❌ Forgetting to add keys → Data not backed up
- ❌ Adding to wrong file (old: configService.js, correct: dashboardKeys.js)
- ❌ Encrypting non-secret data → Unnecessary overhead
- ❌ Using generic key names → Conflicts with other widgets

---

## Explorer Development

### When to Use Explorers

Use explorers when you need to:
- Display detailed information about a widget item
- Provide contextual actions (reply, edit, delete)
- Navigate between multiple items
- Show content that doesn't fit in the widget

### Step 1: Create Explorer Component

**File**: `src/components/widgets/YourWidget/YourWidgetExplorer.jsx`

```jsx
import React from 'react';
import { 
  Explorer, 
  ExplorerHeader, 
  ExplorerBody, 
  ExplorerSection,
  ExplorerField 
} from '@/components/ui/explorer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';

export function YourWidgetExplorer({ 
  open, 
  onOpenChange, 
  itemId,
  itemList = [],
  onItemChange,
  onRefresh
}) {
  // Find current item from the list
  const currentIndex = itemList.findIndex(i => i.id === itemId);
  const item = itemList[currentIndex] || null;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < itemList.length - 1;

  const handlePrevious = () => {
    if (hasPrevious) {
      const prevItem = itemList[currentIndex - 1];
      onItemChange(prevItem.id);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      const nextItem = itemList[currentIndex + 1];
      onItemChange(nextItem.id);
    }
  };

  const handleOpenExternal = () => {
    if (item?.url) {
      window.open(item.url, '_blank');
    }
  };

  return (
    <Explorer
      open={open}
      onOpenChange={onOpenChange}
      title="Your Widget"
      showNavigation={itemList.length > 1}
      onPrevious={handlePrevious}
      onNext={handleNext}
      hasPrevious={hasPrevious}
      hasNext={hasNext}
      buttons={[
        {
          label: 'Open Externally',
          icon: ExternalLink,
          onClick: handleOpenExternal,
          variant: 'outline'
        }
      ]}
    >
      {!item ? (
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-sm text-gray-600">Item not found</p>
        </div>
      ) : (
        <>
          <ExplorerHeader>
            <h3 className="text-lg font-semibold">{item.title}</h3>
            <p className="text-sm text-gray-600">{item.subtitle}</p>
          </ExplorerHeader>

          <ExplorerBody>
            <ExplorerSection title="Details">
              <ExplorerField label="Field Name" value={item.fieldValue} />
              <ExplorerField label="Another Field" value={item.anotherValue} />
            </ExplorerSection>

            <ExplorerSection title="Description">
              <p className="text-sm text-gray-700 dark:text-gray-300">
                {item.description}
              </p>
            </ExplorerSection>
          </ExplorerBody>
        </>
      )}
    </Explorer>
  );
}
```

### Step 2: Integrate Explorer into Widget

**Update your widget component:**

```jsx
import { YourWidgetExplorer } from './YourWidgetExplorer';

export function YourWidget({ rowSpan = 2, dragRef }) {
  // ... existing state
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);

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

  return (
    <>
      <BaseWidgetV2 {...props}>
        {filteredData.map((item) => (
          <div
            key={item.id}
            onClick={() => handleOpenItem(item.id)}
            className="cursor-pointer"
          >
            {/* Item content */}
          </div>
        ))}
      </BaseWidgetV2>

      <YourWidgetExplorer
        open={explorerOpen}
        onOpenChange={handleExplorerClose}
        itemId={selectedItemId}
        itemList={filteredData}
        onItemChange={handleExplorerItemChange}
        onRefresh={fetchData}
      />
    </>
  );
}
```

### Explorer Features

#### Keyboard Shortcuts
- **Arrow Left (←)**: Navigate to previous item
- **Arrow Right (→)**: Navigate to next item
- **Escape (Esc)**: Close the explorer

#### Universal Button Support

The Explorer component supports automatic button rendering:

```jsx
buttons={[
  {
    label: 'Open in GitHub',
    icon: ExternalLink,
    onClick: handleOpen,
    variant: 'outline'  // 'outline' | 'ghost' | 'default'
  },
  {
    label: 'Copy Link',
    icon: Copy,
    onClick: handleCopy,
    variant: 'ghost'
  }
]}
```

---

## Integration Guide

### Complete Widget with Explorer

Here's a complete example showing how all pieces fit together:

```jsx
// YourWidget.jsx
import React, { useState, useEffect } from 'react';
import { BaseWidgetV2 } from '../../BaseWidgetV2';
import { YourWidgetExplorer } from './YourWidgetExplorer';
import { YourIcon } from 'lucide-react';

export function YourWidget({ rowSpan = 2, dragRef }) {
  // Data state
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // UI state
  const [searchQuery, setSearchQuery] = useState('');
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);
  
  // Load data on mount
  useEffect(() => {
    const savedData = localStorage.getItem('yourWidget_data');
    if (savedData) {
      try {
        setItems(JSON.parse(savedData));
      } catch (e) {
        console.error('Failed to load data:', e);
      }
    }
    setIsInitialized(true);
  }, []);
  
  // Save data on change
  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem('yourWidget_data', JSON.stringify(items));
    } catch (error) {
      console.error('Failed to save data:', error);
    }
  }, [items, isInitialized]);
  
  // Fetch data
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      // const data = await yourService.getData();
      // setItems(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Explorer handlers
  const handleOpenItem = (itemId) => {
    setSelectedItemId(itemId);
    setExplorerOpen(true);
  };
  
  const handleExplorerClose = () => {
    setExplorerOpen(false);
    setSelectedItemId(null);
  };
  
  // Filter items
  const filteredItems = items.filter(item => {
    if (!searchQuery.trim()) return true;
    return item.name?.toLowerCase().includes(searchQuery.toLowerCase());
  });
  
  // Widget state
  const getWidgetState = () => {
    if (loading) return 'loading';
    if (error) return 'error';
    if (items.length === 0) return 'empty';
    return 'positive';
  };
  
  return (
    <>
      <BaseWidgetV2
        logo={YourIcon}
        appName="Your App"
        widgetName="Widget Name"
        state={getWidgetState()}
        searchEnabled={items.length > 5}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        rowSpan={rowSpan}
        dragRef={dragRef}
      >
        <div className="flex flex-col h-full min-h-0">
          <div className="flex-1 overflow-y-auto space-y-2">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => handleOpenItem(item.id)}
                className="p-3 rounded-lg bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/40 dark:to-slate-900/40 border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer group"
              >
                <h4 className="font-medium">{item.name}</h4>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </BaseWidgetV2>

      <YourWidgetExplorer
        open={explorerOpen}
        onOpenChange={handleExplorerClose}
        itemId={selectedItemId}
        itemList={filteredItems}
        onItemChange={setSelectedItemId}
        onRefresh={fetchData}
      />
    </>
  );
}
```

---

## Best Practices

### State Management

✅ **DO:**
- Use `isInitialized` flag to prevent saving on initial mount
- Separate data state from settings state
- Use temporary state for modal forms
- Handle loading and error states properly

❌ **DON'T:**
- Save to localStorage on every render
- Mix data and settings in the same state
- Forget to handle edge cases

### localStorage Keys

✅ **DO:**
- Use descriptive, namespaced keys (e.g., `yourWidget_data`)
- Use consistent naming conventions
- Document all keys in your README
- **Add keys to `src/lib/dashboardKeys.js` for backup support** ⚠️ CRITICAL
- Wrap localStorage operations in try-catch
- Use `isInitialized` flag to prevent saving on mount

❌ **DON'T:**
- Use generic keys that might conflict (e.g., 'data', 'settings')
- Store sensitive data without encryption
- Forget to handle JSON parse errors
- Add keys to old `configService.js` (use `dashboardKeys.js` instead)
- Forget to add keys to `dashboardKeys.js` (data won't be backed up!)

### UI/UX

✅ **DO:**
- Use BaseWidgetV2 for consistency
- Provide clear empty states
- Show loading indicators
- Add helpful error messages
- Use tooltips for icon-only buttons
- Support dark mode (use Tailwind dark: classes)
- Use the standard hover effect for clickable items (see pattern below)

❌ **DON'T:**
- Create custom widget containers
- Leave users guessing what went wrong
- Forget about accessibility
- Hardcode colors
- Use inconsistent hover effects across widgets

### Performance

✅ **DO:**
- Use `useEffect` dependencies correctly
- Debounce search inputs if needed
- Lazy load heavy components
- Memoize expensive calculations

❌ **DON'T:**
- Fetch data on every render
- Create infinite loops with useEffect
- Store large objects in state unnecessarily

### Error Handling

✅ **DO:**
- Wrap localStorage operations in try-catch
- Provide user-friendly error messages
- Log errors to console for debugging
- Offer recovery actions (retry, reset)

❌ **DON'T:**
- Let errors crash the app
- Show technical error messages to users
- Ignore edge cases

---

## Examples & Patterns

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

### Pattern 2: Auto-refresh

```jsx
useEffect(() => {
  const interval = setInterval(() => {
    fetchData();
  }, 60000); // 60 seconds
  
  return () => clearInterval(interval);
}, []);
```

### Pattern 3: Debounced Search

```jsx
useEffect(() => {
  const timer = setTimeout(() => {
    performSearch(searchQuery);
  }, 300);
  
  return () => clearTimeout(timer);
}, [searchQuery]);
```

### Pattern 4: Confirmation Dialog

```jsx
const handleDelete = () => {
  if (confirm('Are you sure you want to delete this item?')) {
    // Delete logic
  }
};
```

### Pattern 5: Standard Item Hover Effect

Use this consistent hover effect for all clickable widget items:

```jsx
<div
  onClick={() => handleItemClick(item.id)}
  className="p-3 rounded-lg bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/40 dark:to-slate-900/40 border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer group"
>
  {/* Item content */}
</div>
```

**Why this pattern?**
- ✅ Consistent across all widgets (GitHub, Watchlist, etc.)
- ✅ Subtle gradient background for depth
- ✅ Shadow on hover for elevation feedback
- ✅ Border color change for clear interaction
- ✅ Dark mode support built-in
- ✅ `group` class enables child element hover effects

**Key classes:**
- `bg-gradient-to-br from-gray-50 to-slate-50` - Subtle gradient background
- `dark:from-gray-900/40 dark:to-slate-900/40` - Dark mode gradient
- `hover:shadow-md` - Elevation on hover
- `hover:border-gray-300 dark:hover:border-gray-600` - Border highlight
- `transition-all` - Smooth animation
- `group` - Enables group-hover for child elements

### Example Widgets

#### Simple Data Widget (Checklist)
- CRUD operations
- Auto-sorting
- Settings modal
- Search functionality
- **Reference**: `src/components/widgets/Checklist/ChecklistWidget.jsx`

#### API Integration Widget (GitHub)
- External API calls
- Authentication with tokens
- Auto-refresh intervals
- Configurable settings
- **Reference**: `src/components/widgets/GitHub/GitHubCommitsWidget.jsx`

#### Timer Widget
- Multiple modes
- Real-time updates
- Browser notifications
- **Reference**: `src/components/widgets/Timer/TimerWidget.jsx`

---

## API Reference

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

### Explorer Props

```typescript
// Core
open: boolean              // Controls visibility
onOpenChange: function     // Callback when open state changes
title: string              // Explorer title

// Navigation
showNavigation: boolean    // Show prev/next buttons (default: true)
onPrevious: function       // Previous item handler
onNext: function           // Next item handler
hasPrevious: boolean       // Whether previous item exists
hasNext: boolean           // Whether next item exists

// Buttons (Universal)
buttons: Array<{
  label: string           // Button text
  icon?: LucideIcon      // Optional icon
  onClick: function      // Click handler
  variant?: string       // 'outline' | 'ghost' | 'default'
  className?: string     // Additional CSS classes
}>

// Content
children: ReactNode        // Explorer body content
className: string          // Additional CSS classes
```

### Explorer Helper Components

```jsx
<ExplorerHeader className={string}>
  {children}
</ExplorerHeader>

<ExplorerBody className={string}>
  {children}
</ExplorerBody>

<ExplorerSection title={string} className={string}>
  {children}
</ExplorerSection>

<ExplorerField label={string} value={string} className={string}>
  {children}
</ExplorerField>
```

### Common Imports

```javascript
import React, { useState, useEffect, useRef } from 'react';
import { BaseWidgetV2 } from '../../BaseWidgetV2';
import { Badge } from '@/components/ui/badge';
import { WidgetModal, WidgetModalFooter } from '@/components/ui/widget-modal';
import { 
  Explorer, 
  ExplorerHeader, 
  ExplorerBody, 
  ExplorerSection,
  ExplorerField 
} from '@/components/ui/explorer';
import { 
  Settings,
  RefreshCw,
  Plus,
  Trash2,
  X,
  Check,
  Search,
  ExternalLink,
  // Your specific icons
} from 'lucide-react';
```

---

## Troubleshooting

### Widget Issues

#### Data not persisting
**Solution:** Check that:
1. `isInitialized` flag is set correctly
2. localStorage keys are unique
3. JSON.stringify/parse is working
4. Browser localStorage is not disabled

#### Widget not appearing
**Solution:** Verify:
1. Widget is registered in `App.jsx`
2. Widget ID is in default preferences
3. Widget is enabled in Settings > Apps
4. No JavaScript errors in console

#### Settings not saving
**Solution:** Ensure:
1. Settings state is updated before closing modal
2. useEffect dependencies include settings
3. localStorage is not full
4. No JSON serialization errors

### Explorer Issues

#### Explorer not opening
**Solution:** Check that:
1. `open` prop is set to `true`
2. `explorerOpen` state is being updated
3. Explorer component is rendered in JSX

#### Navigation not working
**Solution:** Verify:
1. `itemList` is passed correctly
2. `currentIndex` calculation is correct
3. `hasPrevious` and `hasNext` are computed properly

#### Content not loading
**Solution:**
1. Check API service function is working
2. Verify `itemId` is passed correctly
3. Add error handling and logging
4. Check network requests in browser DevTools

---

## Development Checklist

Use this checklist when creating a new widget:

### Widget Setup
- [ ] Created widget directory and files
- [ ] Implemented widget component with BaseWidgetV2
- [ ] Added state management (data, loading, error)
- [ ] Implemented localStorage persistence
- [ ] Added settings modal (if needed)
- [ ] Created index.js export file

### Registration
- [ ] Registered widget in App.jsx
- [ ] Added to default preferences
- [ ] **Added localStorage keys to `src/lib/dashboardKeys.js`** ⚠️ CRITICAL

### Explorer (if applicable)
- [ ] Created explorer component
- [ ] Integrated explorer into widget
- [ ] Added navigation support
- [ ] Added action buttons

### Testing
- [ ] Tested all states (loading, error, empty, positive)
- [ ] Tested search functionality (if applicable)
- [ ] Tested settings modal (if applicable)
- [ ] Tested drag-and-drop
- [ ] Tested resize functionality
- [ ] Tested dark mode
- [ ] Tested config backup/restore
- [ ] Tested explorer navigation (if applicable)

### Quality
- [ ] Added proper error handling
- [ ] Added console logging for debugging
- [ ] Verified no memory leaks (cleaned up intervals/listeners)
- [ ] Code reviewed for best practices
- [ ] Created widget README
- [ ] Updated main README

---

## Support

For questions or issues:
1. Check existing widgets for examples
2. Review BaseWidgetV2 documentation
3. Check the main README
4. Review this guide

---

## Configuration & Storage System

### Overview

Hashbase uses a unified configuration system with three storage methods:

1. **Browser localStorage** - Automatic, always active
2. **Config Download/Upload** - Manual JSON file backup
3. **Folder Sync** - Auto-sync to local folder (Chrome/Edge)

All three methods are **100% synchronized** and use the same keys.

### Single Source of Truth

**File:** `src/lib/dashboardKeys.js`

This file defines ALL localStorage keys that get backed up:

```javascript
export function getDashboardKeys() {
  const baseKeys = [
    // Core (4 keys)
    'hashbase_secrets',                    // API keys (ENCRYPTED)
    'hashbase_widget_preferences',         // Widget enable/disable
    'hashbase_widget_canvas_assignments',  // Widget-to-canvas mapping
    'hashbase-theme',                      // Light/dark mode
    
    // Canvas (2 + dynamic)
    'hashbase_canvases',                   // Canvas list
    'hashbase_active_canvas',              // Active canvas
    
    // Widget settings (10 keys)
    'hashbase_ai_chat_settings',
    'hashbase_ai_llm_settings',
    'news_country',
    'news_category',
    'github_widget_owner',
    'github_widget_repo',
    'checklistSettings',
    'posthog_errors_settings',
    'posthog_surveys_settings',
    
    // Widget data (8 keys)
    'timerMode',
    'stopwatchTime',
    'stopwatchLaps',
    'countdownInitial',
    'checklistItems',
    'hashbase_ai_conversations',
    'hashbase_ai_current_conversation',
    
    // YOUR WIDGET KEYS GO HERE
  ];
  
  // Dynamic canvas layout keys
  const canvasKeys = [];
  const canvasesJson = localStorage.getItem('hashbase_canvases');
  if (canvasesJson) {
    const canvases = JSON.parse(canvasesJson);
    canvases.forEach(canvas => {
      canvasKeys.push(`widgetLayout_${canvas.id}`);
      canvasKeys.push(`widgetRowSpans_${canvas.id}`);
    });
  }
  
  return [...baseKeys, ...canvasKeys];
}
```

### What Gets Stored

**Category 1: Secrets (Encrypted)**
- `hashbase_secrets` - All API keys (OpenAI, News, GitHub, PostHog, etc.)
- Encrypted with AES-256-GCM using `.env` key

**Category 2: Widgets**
- `hashbase_widget_preferences` - Which widgets are enabled/disabled

**Category 3: Canvas Layout**
- `hashbase_canvases` - List of canvases
- `hashbase_active_canvas` - Currently active canvas
- `hashbase_widget_canvas_assignments` - Which widget on which canvas
- `widgetLayout_{canvasId}` - Widget positions (dynamic)
- `widgetRowSpans_{canvasId}` - Row spans (dynamic)

**Category 4: Widget Settings**
- All widget configuration (project IDs, URLs, preferences, etc.)
- Stored as JSON objects
- NOT encrypted (only secrets are encrypted)

**Category 5: Widget Data**
- Timer: mode, time, laps, countdown
- Checklist: items, settings
- AI Chat: conversations, current conversation
- Any other widget data

### What's Excluded

```javascript
export function getExcludedKeys() {
  return [
    'hashbase_storage_settings',        // Storage config (not user data)
    'hashbase_storage_encryption_key',  // Local key (deprecated)
    'gmail_tokens',                     // OAuth tokens (SECURITY)
  ];
}
```

**Why exclude OAuth tokens?**
- Security: Prevents token theft if backup files are compromised
- Best practice: Users re-authenticate after restore
- Tokens expire anyway

### Adding Your Widget Keys

**Step 1:** Identify what your widget stores

```javascript
// Example: Your widget stores data and settings
localStorage.setItem('myWidget_data', JSON.stringify(data));
localStorage.setItem('myWidget_settings', JSON.stringify(settings));
```

**Step 2:** Add to `dashboardKeys.js`

```javascript
export function getDashboardKeys() {
  const baseKeys = [
    // ... existing keys
    
    // My Widget
    'myWidget_data',      // Widget data
    'myWidget_settings',  // Widget settings
  ];
  // ...
}
```

**Step 3:** Test backup/restore

```bash
1. Add data to your widget
2. Download config (Settings → Storage → Download Config)
3. Open JSON file, verify your keys are present
4. Clear localStorage
5. Upload config
6. Verify your widget data is restored
```

### Encryption

**Only encrypt API keys/tokens:**

```javascript
export function getSecretKeys() {
  return [
    'hashbase_secrets',  // ONLY this
  ];
}
```

**Don't encrypt:**
- Widget settings (project IDs, preferences)
- Widget data (timer, checklist items)
- Canvas layouts
- Theme preferences

### Cross-Device Sync

**Same encryption key required:**

```bash
# Device A
VITE_CONFIG_ENCRYPTION_KEY=abc123...

# Device B (must use SAME key)
VITE_CONFIG_ENCRYPTION_KEY=abc123...
```

**Without same key:**
- ❌ Config import will fail
- ❌ "Encryption key mismatch" error
- ❌ Cannot decrypt secrets

**Solution:**
- Use same `.env` file on all devices
- Or share encryption key securely
- Or use folder sync with cloud storage (Dropbox, OneDrive)

### Troubleshooting

**Data not backed up:**
- ✅ Check keys are in `dashboardKeys.js`
- ✅ Check spelling matches exactly
- ✅ Download config and inspect JSON

**Import fails:**
- ✅ Check encryption key matches
- ✅ Check `.env` file exists
- ✅ Restart dev server after changing `.env`

**Data lost after restore:**
- ✅ Verify keys were in `dashboardKeys.js` before export
- ✅ Check console for errors
- ✅ Verify localStorage keys match exactly

### Best Practices

1. **Always add keys to `dashboardKeys.js`** - Critical for backups
2. **Use namespaced keys** - Prevent conflicts (`myWidget_data`, not `data`)
3. **Only encrypt secrets** - Don't encrypt regular data
4. **Test backup/restore** - Verify your widget data is preserved
5. **Document your keys** - Add comments explaining what each key stores
6. **Handle errors** - Wrap localStorage in try-catch
7. **Use isInitialized** - Prevent saving on initial mount

---

## Advanced Features

### Gmail Persistent Login with Token Refresh

The Gmail widget implements automatic token refresh to keep users logged in indefinitely. See the complete documentation:

📖 **[Gmail Persistent Login Guide](./GMAIL_PERSISTENT_LOGIN.md)**

**Key Features:**
- ✅ Users authenticate **once** with Google OAuth
- ✅ Access tokens automatically refresh in the background
- ✅ Refresh tokens stored securely in localStorage
- ✅ No re-authentication required (unless token revoked)
- ✅ Works across browser sessions
- ✅ Encrypted in config exports for cross-device persistence

**Implementation Pattern:**
This pattern can be adapted for other OAuth-based widgets (Twitter, LinkedIn, etc.):

1. **Backend**: Check token expiry before API calls, auto-refresh if needed
2. **Frontend**: Handle refreshed tokens via response headers
3. **Storage**: Update localStorage automatically with new tokens

**Related Files:**
- Backend: `vite.config.js` - OAuth and token refresh logic
- Frontend: `src/services/gmailService.js` - Token handling
- Documentation: `Docs/GMAIL_PERSISTENT_LOGIN.md` - Complete guide

---

**Last Updated:** 2025-11-09  
**Version:** 2.2.0
