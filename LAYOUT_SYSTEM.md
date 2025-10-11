# Widget Layout System Documentation

## Overview

The HashBase dashboard implements a robust drag-and-drop widget layout system with intelligent validation and persistent storage. This document explains the architecture and features of the layout system.

## Architecture

### Grid Structure

- **5 columns × 4 rows** = 20 total dropzones
- Each dropzone is numbered 1-20 (not visible in UI)
- Dropzone numbering:
  - Column 0: Dropzones 1-4
  - Column 1: Dropzones 5-8
  - Column 2: Dropzones 9-12
  - Column 3: Dropzones 13-16
  - Column 4: Dropzones 17-20

### Widget Properties

Each widget has the following properties:
- **id**: Unique identifier (e.g., 'gmail-unread', 'netlify-deploys')
- **rowSpan**: Height in rows (1-4)
- **startRow**: Starting row position (0-3)
- **startDropzone**: Starting dropzone number (1-20)

## Key Features

### 1. Dropzone Labeling

Each dropzone is assigned a unique number from 1-20:

```javascript
// Convert column and row to dropzone number
function getDropzoneNumber(colIndex, rowIndex) {
  return colIndex * 4 + rowIndex + 1;
}

// Example: Column 2, Row 1 → Dropzone 10
```

### 2. Widget-to-Dropzone Tracking

The system maintains a comprehensive mapping:

```javascript
{
  widgets: {
    'gmail-unread': {
      dropzones: [1, 2],      // Occupies dropzones 1 and 2
      rowSpan: 2,              // 2 rows tall
      startDropzone: 1         // Starts at dropzone 1
    },
    'netlify-deploys': {
      dropzones: [5, 6, 7],    // Occupies dropzones 5, 6, and 7
      rowSpan: 3,              // 3 rows tall
      startDropzone: 5         // Starts at dropzone 5
    }
  },
  dropzones: {
    1: 'gmail-unread',
    2: 'gmail-unread',
    5: 'netlify-deploys',
    6: 'netlify-deploys',
    7: 'netlify-deploys'
  },
  occupiedDropzones: [1, 2, 5, 6, 7]
}
```

### 3. Widget Size Tracking

Each widget's height (rowSpan) is tracked:

```javascript
rowSpans = {
  'gmail-unread': 2,
  'netlify-deploys': 3,
  'ai-chat': 3,
  'github-commits': 3,
  'news-headlines': 2,
  'bd24live-news': 2
}
```

### 4. Fit Validation

Before allowing a drop or resize, the system validates:

1. **Boundary Check**: Widget doesn't exceed column bounds
2. **Collision Check**: Required dropzones are not occupied
3. **Space Check**: Sufficient empty dropzones below

```javascript
// Example validation
canWidgetFit(targetDropzone, rowSpan, occupiedDropzones, excludeWidgetId)
// Returns: { canFit: boolean, reason: string, requiredDropzones: number[] }
```

### 5. Local Persistence

Layout configuration is automatically saved to localStorage:

```javascript
// Storage key: 'widgetLayoutConfig'
{
  version: 2,
  timestamp: 1697123456789,
  widgets: { /* widget mappings */ },
  dropzones: { /* dropzone mappings */ },
  occupiedDropzones: [1, 2, 5, 6, 7, ...]
}
```

**Benefits:**
- Layout persists across browser sessions
- Survives server restarts
- Automatic save on every change
- Version tracking for future migrations

## User Interactions

### Drag and Drop

1. User drags a widget
2. System highlights valid drop zones (blue ring)
3. System shows invalid drop zones (red ring with "Cannot drop here")
4. On drop:
   - Validates the position
   - Updates layout if valid
   - Shows console warning if invalid
   - Restores widget to original position if invalid

### Resize

1. User clicks resize button (bottom-right corner)
2. System cycles through sizes: 1 → 2 → 3 → 4 → 1
3. Validates if new size fits
4. Updates size if valid
5. Shows console warning if invalid

## Visual Feedback

### Valid Drop Zone
- Blue ring (`ring-2 ring-blue-500`)
- Blue overlay with "Drop here" message
- Smooth transition animation

### Invalid Drop Zone
- Red ring (`ring-2 ring-red-500`)
- Red overlay with "Cannot drop here" message
- Prevents drop action

### Debug Mode
- Add `showDebug={true}` to DropZone component
- Shows dropzone numbers in top-left corner
- Useful for development and troubleshooting

## Console Logging

The system provides detailed console logs:

### Layout Updates
```
📊 Layout Configuration Updated: {
  totalDropzones: 20,
  occupied: 8,
  empty: 12,
  widgets: [
    { id: 'gmail-unread', dropzone: 1, occupies: [1, 2], height: 2 },
    ...
  ]
}
```

### Drop Attempts
```
🎯 Attempting to drop widget "gmail-unread" at dropzone 5 (col: 1, row: 0)
✅ Widget fits! Will occupy dropzones: 5, 6
```

### Validation Failures
```
❌ Cannot drop widget: Dropzones 5, 6 are already occupied
```

### Resize Attempts
```
📏 Attempting to resize widget "gmail-unread" to 3 rows
✅ Resize allowed! Will occupy dropzones: 1, 2, 3
```

## API Reference

### Layout Service (`src/services/layoutService.js`)

#### `getDropzoneNumber(colIndex, rowIndex)`
Converts column and row indices to dropzone number.

**Parameters:**
- `colIndex` (number): Column index (0-4)
- `rowIndex` (number): Row index (0-3)

**Returns:** Dropzone number (1-20)

#### `getDropzonePosition(dropzoneNum)`
Converts dropzone number to column and row indices.

**Parameters:**
- `dropzoneNum` (number): Dropzone number (1-20)

**Returns:** `{ colIndex: number, rowIndex: number }`

#### `getOccupiedDropzones(startDropzone, rowSpan)`
Gets all dropzone numbers occupied by a widget.

**Parameters:**
- `startDropzone` (number): Starting dropzone number
- `rowSpan` (number): Number of rows the widget spans

**Returns:** Array of dropzone numbers

#### `createLayoutConfig(layout)`
Creates layout configuration from widget layout.

**Parameters:**
- `layout` (Array): 2D array of widget objects

**Returns:** Configuration object with widget and dropzone mappings

#### `canWidgetFit(targetDropzone, rowSpan, occupiedDropzones, excludeWidgetId, currentConfig)`
Checks if a widget can fit at a specific dropzone.

**Parameters:**
- `targetDropzone` (number): Target dropzone number
- `rowSpan` (number): Widget's row span
- `occupiedDropzones` (Set): Set of currently occupied dropzones
- `excludeWidgetId` (string): Widget ID to exclude from collision check
- `currentConfig` (Object): Current layout configuration

**Returns:** `{ canFit: boolean, reason: string, requiredDropzones: number[] }`

#### `saveLayoutConfig(config)`
Saves layout configuration to localStorage.

#### `loadLayoutConfig()`
Loads layout configuration from localStorage.

**Returns:** Configuration object or null

#### `clearLayoutConfig()`
Clears layout configuration from localStorage.

#### `getLayoutDebugInfo(config)`
Gets debug information about the layout.

**Returns:** Debug information object

## Best Practices

### For Developers

1. **Always validate before modifying layout**
   ```javascript
   const fitCheck = canWidgetFit(...);
   if (!fitCheck.canFit) {
     console.warn(`Cannot place widget: ${fitCheck.reason}`);
     return;
   }
   ```

2. **Use console logs for debugging**
   - All major operations log to console
   - Check console for validation failures
   - Use debug mode to see dropzone numbers

3. **Test edge cases**
   - Widget at bottom of column trying to resize
   - Widget moving to occupied space
   - Multiple widgets in same column

### For Users

1. **Visual feedback is your guide**
   - Blue = valid drop zone
   - Red = invalid drop zone
   - No ring = not a drop target

2. **Resize carefully**
   - Click resize button to cycle through sizes
   - Widget won't resize if it doesn't fit
   - Check console for resize failures

3. **Layout persists automatically**
   - No need to save manually
   - Layout survives page refresh
   - Layout survives server restart

## Troubleshooting

### Layout not saving
- Check browser console for errors
- Verify localStorage is enabled
- Check localStorage quota

### Widget won't drop
- Check console for validation failure reason
- Verify target dropzones are empty
- Ensure widget fits within column bounds

### Widget won't resize
- Check console for validation failure reason
- Verify sufficient empty dropzones below
- Ensure new size doesn't exceed column bounds

### Layout reset unexpectedly
- Widget configuration changed (new widgets added/removed)
- localStorage was cleared
- Invalid layout data detected

## Future Enhancements

Potential improvements to consider:

1. **Multi-column widgets** - Widgets that span multiple columns
2. **Custom grid sizes** - User-configurable column/row counts
3. **Layout templates** - Pre-defined layout configurations
4. **Export/Import** - Share layouts between users
5. **Undo/Redo** - Layout history management
6. **Drag preview** - Show widget outline while dragging
7. **Snap to grid** - Magnetic alignment assistance
8. **Mobile support** - Touch-friendly drag and drop

## Technical Details

### Dependencies
- `react-dnd`: Drag and drop functionality
- `react-dnd-html5-backend`: HTML5 drag and drop backend

### Storage
- **Key**: `widgetLayoutConfig`
- **Format**: JSON
- **Size**: ~1-2KB typical
- **Persistence**: localStorage (survives browser restart)

### Performance
- Layout updates are O(n) where n = number of widgets
- Validation is O(m) where m = rowSpan of widget
- No performance impact on large layouts (20 dropzones is small)

### Browser Compatibility
- Modern browsers with localStorage support
- HTML5 drag and drop support required
- Tested on Chrome, Firefox, Edge, Safari

## Conclusion

The HashBase widget layout system provides a robust, user-friendly experience for customizing dashboard layouts. With intelligent validation, visual feedback, and automatic persistence, users can create their ideal dashboard configuration that persists across sessions.
