# Checklist Widget

A simple and elegant checklist widget with automatic reordering functionality.

## Features

- ✅ **Add Items**: Click the "+ Add Item" button to add new checklist items
- ✅ **Check/Uncheck**: Click the checkbox to mark items as complete or incomplete
- ✅ **Auto-Sort**: Checked items automatically move to the bottom of the list
- ✅ **Delete Items**: Hover over an item to reveal the delete button
- ✅ **Search**: Search through your checklist items (appears when you have 5+ items)
- ✅ **Persistent Storage**: All items are saved to localStorage
- ✅ **Settings**: Configure display and sorting preferences

## Usage

### Adding Items

1. Type your task in the **quick add input box** at the top of the widget
2. Press **Enter** or click the **Add** button to add the task
3. Press **Escape** to clear the input field
4. The input box is always visible for quick task entry

### Checking Items

- Click the checkbox next to any item to mark it as complete
- Checked items will automatically move to the bottom of the list (if auto-sort is enabled)
- Click again to uncheck and move back to the top

### Deleting Items

- Hover over any item to reveal the delete button (trash icon)
- Click the delete button to remove the item permanently

### Settings

Access settings by clicking the settings icon in the widget header:

- **Show Completed Items**: Toggle visibility of checked items
- **Auto Sort**: Enable/disable automatic reordering of checked items
- **Clear All Completed**: Remove all checked items at once

## Data Storage

All checklist items and settings are stored in the browser's localStorage:
- `checklistItems`: Array of checklist items
- `checklistSettings`: Widget preferences

## Component Props

```jsx
<ChecklistWidget 
  rowSpan={2}    // Number of grid rows (1-4)
  dragRef={ref}  // Ref for drag-and-drop functionality
/>
```

## States

The widget uses the following states:
- **Empty**: No items in the checklist
- **Positive**: Items exist and are displayed

## Keyboard Shortcuts

- **Enter**: Add new item (when input is focused)
- **Escape**: Cancel adding item (when input is focused)

## Styling

The widget uses:
- Green checkboxes for completed items
- Gray styling for checked items with strikethrough text
- Hover effects for interactive elements
- Smooth transitions for all state changes

## Technical Details

- Built with React hooks (useState, useEffect)
- Uses BaseWidgetV2 for consistent widget structure
- Implements localStorage for persistence
- Automatic sorting algorithm separates checked/unchecked items
- Responsive design with dark mode support
