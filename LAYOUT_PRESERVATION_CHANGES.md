# Layout Preservation Implementation

## Overview
Implemented a system to preserve widget layout when enabling/disabling widgets from settings. The layout now remains intact when widgets are toggled, and new widgets are intelligently placed in available empty spaces.

## Critical Bug Fix

### Issue
The original implementation had a bug where disabling a widget would trigger a full layout reset. This was caused by the `allSavedIdsValid` check that would return `false` when any saved widget was disabled, causing the code to fall through to the default layout creation.

### Solution
Removed the `allSavedIdsValid` conditional check and instead always process the layout changes (enable/disable) as long as the saved layout format is valid. This ensures that:
- Disabled widgets are removed from their positions
- Enabled widgets are added to empty spaces
- All other widgets remain in their original positions

## Changes Made

### 1. Layout Service (`src/services/layoutService.js`)

Added three new helper functions:

#### `findEmptySpace(layout, rowSpan)`
- Searches through all columns to find the first available empty space
- Checks each column row-by-row to find consecutive empty rows
- Returns `{colIndex, startRow}` if space found, `null` otherwise
- Used when enabling a new widget to find where to place it

#### `removeWidgetFromLayout(layout, widgetId)`
- Removes a widget from the layout by filtering it out
- Preserves all other widgets in their positions
- Used when disabling a widget

#### `addWidgetToLayout(layout, widgetId, rowSpan, colIndex, startRow)`
- Adds a widget to the layout at a specific position
- Automatically sorts widgets by startRow to maintain order
- Used when enabling a widget and space is found

### 2. Canvas Component (`src/components/Canvas.jsx`)

#### Updated `getInitialLayout()` function
The function now handles three scenarios:

**Scenario 1: Widget Disabled**
- Detects widgets in saved layout that are no longer in current widgets list
- Removes them from layout using `removeWidgetFromLayout()`
- Preserves positions of all other widgets

**Scenario 2: Widget Enabled**
- Detects new widgets not in saved layout
- For each new widget:
  - Calls `findEmptySpace()` to locate available space
  - If space found: places widget using `addWidgetToLayout()`
  - If no space: stores widget info in localStorage and auto-disables it
- Preserves positions of all existing widgets

**Scenario 3: No Changes**
- Uses saved layout as-is
- No modifications needed

#### Auto-disable on No Space
When a widget can't be placed:
1. Stores widget info in `hashbase_widget_no_space` localStorage key
2. Automatically disables the widget using `setWidgetEnabled(widgetId, false)`
3. User is notified in settings modal on next open

### 3. Settings Modal (`src/components/SettingsModal.jsx`)

#### Added No Space Warning
- Checks for `hashbase_widget_no_space` flag on modal open
- Displays yellow warning banner with:
  - Widget name that couldn't be placed
  - Required row span
  - Instructions to free up space
  - Dismiss button
- Clears the flag after displaying

#### Auto-refresh on Save
- Changed `handleSaveWidgetPrefs()` to auto-refresh after 1.5 seconds
- Ensures user sees the result immediately
- Shows "Refreshing page..." status message

## User Experience Flow

### Enabling a Widget
1. User opens Settings → Apps tab
2. User toggles a widget ON
3. User clicks "Save Preferences"
4. Page refreshes automatically
5. **If space available**: Widget appears in first available empty spot, other widgets stay in place
6. **If no space**: Widget is auto-disabled, warning appears in settings on next open

### Disabling a Widget
1. User opens Settings → Apps tab
2. User toggles a widget OFF
3. User clicks "Save Preferences"
4. Page refreshes automatically
5. Widget is removed from layout, other widgets stay in place
6. Empty space is left where widget was (can be filled by future widgets)

## Technical Details

### Layout Structure
- 5 columns × 4 rows = 20 total dropzones
- Each widget occupies 1-4 rows (rowSpan)
- Layout stored in localStorage as `widgetLayout`

### Space Finding Algorithm
```
For each column (0-4):
  Build set of occupied rows
  For each possible starting row:
    Check if rowSpan consecutive rows are free
    If yes: return position
    If no: continue searching
Return null if no space found
```

### Widget Tracking
- `widgetLayout`: Current layout structure
- `widgetRowSpans`: Row span for each widget
- `hashbase_widget_preferences`: Enabled/disabled state
- `hashbase_widget_no_space`: Temporary flag for placement failures

## Benefits

1. **Layout Preservation**: Users don't lose their carefully arranged layout
2. **Intelligent Placement**: New widgets automatically find best available spot
3. **User Feedback**: Clear warnings when space is unavailable
4. **Auto-correction**: Widgets that can't be placed are auto-disabled
5. **No Manual Refresh**: Page refreshes automatically after changes

## Testing Recommendations

1. **Enable Widget with Space**: Verify it appears in empty spot
2. **Enable Widget without Space**: Verify warning appears and widget is disabled
3. **Disable Widget**: Verify it's removed but others stay in place
4. **Multiple Enables**: Enable several widgets and verify placement
5. **Fill Layout**: Fill all 20 dropzones, try enabling another widget
6. **Mixed Operations**: Enable and disable multiple widgets in one session

## Edge Cases Handled

- Widget list changes significantly (rebuilds layout)
- Corrupted localStorage data (clears and rebuilds)
- Multiple widgets enabled at once (processes sequentially)
- Widget requires more rows than available in any column
- All dropzones occupied (auto-disables and warns)
