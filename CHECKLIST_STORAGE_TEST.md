# Checklist Storage Testing Guide

## How to Test localStorage Saving

### Step 1: Open Browser DevTools
1. Press `F12` to open DevTools
2. Go to the **Console** tab
3. Go to the **Application** tab

### Step 2: Add a Checklist Item
1. Type a task in the input box at the bottom
2. Press Enter
3. Check the Console for: `✅ Saved checklist items: 1`

### Step 3: Verify localStorage
1. In DevTools, go to **Application** > **Local Storage** > `http://localhost:5173` (or your dev URL)
2. Look for these keys:
   - `checklistItems` - Should contain your tasks as JSON array
   - `checklistSettings` - Should contain settings as JSON object

### Step 4: Test Config Export
1. Click the Settings button (gear icon)
2. Go to "Configuration" tab
3. Click "Export Configuration"
4. Open the downloaded JSON file
5. Search for `"checklistItems"` - should be present in the `data` section

## Expected localStorage Values

### checklistItems
```json
[
  {
    "id": 1697123456789,
    "text": "My first task",
    "checked": false,
    "createdAt": "2025-10-16T01:30:00.000Z"
  }
]
```

### checklistSettings
```json
{
  "showCompleted": true,
  "autoSort": true
}
```

## Troubleshooting

### If localStorage is empty:
1. Check browser console for errors
2. Make sure you're adding items (press Enter after typing)
3. Check if localStorage is disabled in your browser
4. Try in incognito mode to rule out extensions

### If config export doesn't include checklist data:
1. Verify items exist in localStorage first
2. Check console for export errors
3. Make sure you have items added before exporting

### Console Commands to Test Manually

Open browser console and run:

```javascript
// Check if items are saved
console.log('Items:', localStorage.getItem('checklistItems'));

// Check if settings are saved
console.log('Settings:', localStorage.getItem('checklistSettings'));

// Manually save test data
localStorage.setItem('checklistItems', JSON.stringify([
  {id: Date.now(), text: "Test task", checked: false, createdAt: new Date().toISOString()}
]));

// Reload the page to see if it loads
location.reload();
```

## Current Implementation Status

✅ **localStorage saving is implemented** (lines 62-79 in ChecklistWidget.jsx)
✅ **localStorage loading is implemented** (lines 38-59 in ChecklistWidget.jsx)
✅ **Config service includes checklist keys** (lines 148-149 in configService.js)
✅ **Console logging added for debugging**

The storage mechanism is correctly implemented. If it's not working, it's likely a runtime issue that needs debugging in the browser console.
