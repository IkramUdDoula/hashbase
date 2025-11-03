# Checklist Widget

A comprehensive checklist widget with advanced task management features and detailed explorer view.

## Features

### Basic Features
- ✅ **Add Items**: Quick add input box for fast task entry
- ✅ **Check/Uncheck**: Click the checkbox to mark items as complete or incomplete
- ✅ **Auto-Sort**: Checked items automatically move to the bottom of the list
- ✅ **Delete Items**: Hover over an item to reveal the delete button
- ✅ **Search**: Search through your checklist items (appears when you have 5+ items)
- ✅ **Persistent Storage**: All items are saved to localStorage
- ✅ **Settings**: Configure display and sorting preferences

### Advanced Features (Explorer View)
- 📋 **Subtasks**: Add and manage subtasks with progress tracking
- 📝 **Notes/Comments**: Add detailed notes to any task
- 🔗 **Links**: Attach URLs with custom labels
- 📅 **Due Dates**: Set due dates and times
- ⏱️ **Time Estimates**: Track estimated duration
- 🚩 **Priority Levels**: High, Medium, Low priority
- 🏷️ **Tags**: Organize with custom tags
- 📊 **Smart Status**: Track status (In Progress, Waiting, Blocked, Completed, Skipped)
- 📁 **Groups/Sections**: Organize tasks into groups
- 🔄 **Repeat Frequency**: Set recurring tasks
- 🔔 **Reminders**: Configure notification settings
- ⚠️ **Dependencies**: Track task dependencies
- 📈 **Progress Indicators**: Visual progress for subtasks
- 🕐 **Timeline**: Creation and completion timestamps

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

### Viewing Task Details (Explorer)

- **Click on any task** to open the detailed explorer view
- Navigate between tasks using arrow buttons or keyboard (← →)
- View and edit all task properties
- Add subtasks, notes, links, and more
- Mark as done/undone with the footer button

### Deleting Items

- Hover over any item to reveal the delete button (trash icon)
- Click the delete button to remove the item permanently

### Settings

Access settings by clicking the settings icon in the widget header:

- **Show Completed Items**: Toggle visibility of checked items
- **Auto Sort**: Enable/disable automatic reordering of checked items
- **Clear All Completed**: Remove all checked items at once

## Explorer Features

### Subtasks
- Add unlimited subtasks to any task
- Check/uncheck subtasks independently
- Visual progress bar showing completion percentage
- Delete subtasks individually

### Notes/Comments
- Add multiple notes to document task details
- Timestamps for each note
- Rich text support with line breaks
- Delete notes when no longer needed

### Links
- Attach relevant URLs to tasks
- Custom labels for better organization
- Open links in new tab
- Delete links as needed

### Task Properties
- **Due Date**: Set deadlines with optional time
- **Priority**: High (red), Medium (yellow), Low (blue)
- **Status**: Completed, In Progress, Waiting, Blocked, Skipped
- **Group**: Organize tasks into sections/categories
- **Tags**: Add multiple tags for filtering and organization
- **Estimated Time**: Track how long tasks should take
- **Dependencies**: Note tasks that block or are required by others
- **Repeat Frequency**: Daily, Weekly, Custom recurring tasks
- **Reminders**: Set notification preferences

## Keyboard Shortcuts

### Widget View
- **Enter**: Add new item (when input is focused)
- **Escape**: Cancel adding item (when input is focused)

### Explorer View
- **← (Left Arrow)**: Navigate to previous task
- **→ (Right Arrow)**: Navigate to next task
- **Escape**: Close explorer
- **Ctrl+Enter**: Save note (when adding note)

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
- Explorer component for detailed task management
- Real-time updates across widget and explorer views

## Data Structure

Each checklist item supports the following properties:

```javascript
{
  id: Number,                    // Unique identifier (timestamp)
  text: String,                  // Task name/title
  checked: Boolean,              // Completion status
  createdAt: String,             // ISO timestamp
  completedAt: String,           // ISO timestamp (when completed)
  
  // Optional advanced properties
  status: String,                // 'completed', 'in-progress', 'waiting', 'blocked', 'skipped'
  priority: String,              // 'high', 'medium', 'low'
  group: String,                 // Section/category name
  tags: Array<String>,           // ['urgent', 'review', etc.]
  
  dueDate: String,               // ISO date string
  dueTime: String,               // Time string (e.g., '14:30')
  estimatedTime: String,         // Duration (e.g., '2 hours', '30 mins')
  
  subtasks: Array<{              // Subtask items
    id: Number,
    text: String,
    checked: Boolean,
    createdAt: String
  }>,
  
  notes: Array<{                 // Notes/comments
    id: Number,
    text: String,
    createdAt: String
  }>,
  
  links: Array<{                 // Attached URLs
    id: Number,
    url: String,
    label: String
  }>,
  
  dependencies: Array<String>,   // Task dependencies
  repeatFrequency: String,       // 'daily', 'weekly', 'monthly', 'custom'
  reminder: String               // Reminder settings
}
```

## Example Usage

### Simple Task
```javascript
{
  id: 1699123456789,
  text: "Buy groceries",
  checked: false,
  createdAt: "2024-11-03T10:30:00.000Z"
}
```

### Advanced Task
```javascript
{
  id: 1699123456789,
  text: "Complete project documentation",
  checked: false,
  createdAt: "2024-11-03T10:30:00.000Z",
  status: "in-progress",
  priority: "high",
  group: "Work",
  tags: ["urgent", "documentation"],
  dueDate: "2024-11-10T00:00:00.000Z",
  dueTime: "17:00",
  estimatedTime: "4 hours",
  subtasks: [
    { id: 1699123456790, text: "Write API docs", checked: true, createdAt: "2024-11-03T10:31:00.000Z" },
    { id: 1699123456791, text: "Add examples", checked: false, createdAt: "2024-11-03T10:32:00.000Z" }
  ],
  notes: [
    { id: 1699123456792, text: "Remember to include code samples", createdAt: "2024-11-03T11:00:00.000Z" }
  ],
  links: [
    { id: 1699123456793, url: "https://docs.example.com", label: "API Reference" }
  ],
  dependencies: ["Setup development environment"],
  repeatFrequency: "weekly",
  reminder: "1 day before"
}
```
