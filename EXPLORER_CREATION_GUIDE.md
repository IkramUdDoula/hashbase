# Explorer Creation Guide

This guide explains how to create and integrate Explorer components in your widgets. Explorers are side sheets that open from the right to display detailed content of widget items.

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Base Explorer Component](#base-explorer-component)
4. [Creating a Custom Explorer](#creating-a-custom-explorer)
5. [Integrating Explorer into Widgets](#integrating-explorer-into-widgets)
6. [Using Explorer Context (Optional)](#using-explorer-context-optional)
7. [Best Practices](#best-practices)
8. [Examples](#examples)

---

## Overview

**Explorers** are specialized UI components that provide detailed views of widget items. They:

- Open as a side sheet from the right
- Apply a backdrop overlay to focus user attention
- Support navigation between items (previous/next)
- Display dynamic content specific to each widget type
- Provide contextual actions (e.g., Reply, Forward, Mark as Read)

### Key Features

- **Header**: Navigation buttons, title, and close button
- **Body**: Dynamic content zone customized per widget
- **Footer**: Action buttons relevant to the content
- **Navigation**: Move between items without closing the explorer
- **Keyboard Shortcuts**: Arrow keys for navigation, Escape to close
- **Responsive**: Adapts to different screen sizes

### Keyboard Shortcuts

All explorers support the following keyboard shortcuts:

- **Arrow Left (←)**: Navigate to previous item
- **Arrow Right (→)**: Navigate to next item
- **Escape (Esc)**: Close the explorer

---

## Architecture

The Explorer system consists of:

1. **Base Explorer Component** (`src/components/ui/explorer.jsx`)
   - Provides the shell (header, body, footer structure)
   - Handles open/close state
   - Manages navigation logic (buttons and keyboard shortcuts)
   - Applies backdrop overlay
   - Keyboard event handling for accessibility

2. **Custom Explorer Components** (e.g., `GmailExplorer.jsx`)
   - Extends the base explorer
   - Implements widget-specific content
   - Handles data fetching and actions

3. **Explorer Context** (`src/contexts/ExplorerContext.jsx`) - Optional
   - Global state management for explorers
   - Ensures only one explorer is open at a time
   - Provides hooks for easy integration

---

## Base Explorer Component

The base `Explorer` component is located at `src/components/ui/explorer.jsx`.

### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | boolean | - | Controls visibility |
| `onOpenChange` | function | - | Callback when open state changes |
| `title` | string | - | Explorer title (e.g., "Gmail") |
| `showNavigation` | boolean | `true` | Show prev/next navigation buttons |
| `onPrevious` | function | - | Previous item handler |
| `onNext` | function | - | Next item handler |
| `hasPrevious` | boolean | `false` | Whether previous item exists |
| `hasNext` | boolean | `false` | Whether next item exists |
| `children` | ReactNode | - | Explorer body content |
| `className` | string | - | Additional CSS classes |

### Helper Components

The base explorer includes several helper components for structuring content:

- **`ExplorerHeader`**: Optional header section for metadata
- **`ExplorerBody`**: Main content section with padding
- **`ExplorerFooter`**: Footer section for action buttons
- **`ExplorerSection`**: Reusable section with optional title
- **`ExplorerField`**: Label-value pair for displaying information

---

## Creating a Custom Explorer

Follow these steps to create a custom explorer for your widget:

### Step 1: Create the Explorer Component File

Create a new file in your widget's directory:

```
src/components/widgets/[YourWidget]/[YourWidget]Explorer.jsx
```

### Step 2: Import Required Dependencies

```jsx
import React, { useState, useEffect } from 'react';
import { 
  Explorer, 
  ExplorerHeader, 
  ExplorerBody, 
  ExplorerFooter,
  ExplorerSection,
  ExplorerField 
} from '@/components/ui/explorer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';
// Import your service functions
import { fetchItemDetails } from '@/services/yourService';
```

### Step 3: Define the Explorer Component

**Option A: Using Existing Data (Recommended)**

If your widget already has all the data needed to display details, use the item from the list:

```jsx
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
    >
      {!item ? (
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-sm text-gray-600">Item not found</p>
        </div>
      ) : (
        <>
          <ExplorerHeader>
            {/* Header metadata */}
            <h3 className="text-lg font-semibold">{item.title}</h3>
          </ExplorerHeader>

          <ExplorerBody>
            {/* Main content */}
            <ExplorerSection title="Details">
              <ExplorerField label="Field Name" value={item.fieldValue} />
            </ExplorerSection>
          </ExplorerBody>

          <ExplorerFooter>
            {/* Action buttons */}
            <Button onClick={() => {/* action */}}>
              Primary Action
            </Button>
          </ExplorerFooter>
        </>
      )}
    </Explorer>
  );
}
```

**Option B: Fetching Additional Data**

If you need to fetch more detailed data when the explorer opens:

```jsx
export function YourWidgetExplorer({ 
  open, 
  onOpenChange, 
  itemId,
  itemList = [],
  onItemChange,
  onRefresh
}) {
  const [itemDetails, setItemDetails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const currentIndex = itemList.findIndex(i => i.id === itemId);
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < itemList.length - 1;

  useEffect(() => {
    if (open && itemId) {
      loadItemDetails();
    }
  }, [open, itemId]);

  const loadItemDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const details = await fetchItemDetails(itemId);
      setItemDetails(details);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ... navigation handlers

  return (
    <Explorer {...props}>
      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState error={error} onRetry={loadItemDetails} />
      ) : itemDetails ? (
        <DetailedContent item={itemDetails} />
      ) : null}
    </Explorer>
  );
}
```

### Step 4: Customize the Content

Adapt the content structure to match your widget's data:

> **Note**: The Gmail Explorer uses **Option A** (existing data) since the email list already contains all necessary information (from, subject, snippet, date). This avoids additional API calls and provides instant display.

- **Header**: Display title, metadata, badges, timestamps
- **Body**: Show detailed information using `ExplorerSection` and `ExplorerField`
- **Footer**: Add relevant action buttons

---

## Integrating Explorer into Widgets

### Step 1: Import the Explorer

In your widget component file:

```jsx
import { YourWidgetExplorer } from './YourWidgetExplorer';
```

### Step 2: Add State Management

Add state variables to manage the explorer:

```jsx
export function YourWidget({ rowSpan = 2, dragRef }) {
  const [items, setItems] = useState([]);
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState(null);

  // ... other state and logic
}
```

### Step 3: Create Handler Functions

```jsx
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
```

### Step 4: Update Item Click Handler

Modify your item click handler to open the explorer:

```jsx
// Before: Opening external link
onClick={() => window.open(getItemUrl(item.id), '_blank')}

// After: Opening explorer
onClick={() => handleOpenItem(item.id)}
```

### Step 5: Render the Explorer

Add the explorer component to your widget's return statement:

```jsx
return (
  <>
    <BaseWidgetV2
      // ... widget props
    >
      {/* Widget content */}
    </BaseWidgetV2>

    {/* Explorer */}
    <YourWidgetExplorer
      open={explorerOpen}
      onOpenChange={handleExplorerClose}
      itemId={selectedItemId}
      itemList={items}
      onItemChange={handleExplorerItemChange}
      onRefresh={loadItems}
    />
  </>
);
```

---

## Using Explorer Context (Optional)

For more complex scenarios or to ensure only one explorer is open at a time, use the Explorer Context.

### Step 1: Wrap Your App with ExplorerProvider

In `src/App.jsx` or your main component:

```jsx
import { ExplorerProvider } from '@/contexts/ExplorerContext';

function App() {
  return (
    <ExplorerProvider>
      {/* Your app content */}
    </ExplorerProvider>
  );
}
```

### Step 2: Use the Hook in Your Widget

```jsx
import { useWidgetExplorer } from '@/contexts/ExplorerContext';

export function YourWidget({ rowSpan = 2, dragRef }) {
  const explorer = useWidgetExplorer('yourwidget');

  const handleOpenItem = (itemId) => {
    explorer.open(itemId, items, { /* metadata */ });
  };

  return (
    <>
      <BaseWidgetV2>
        {/* Widget content */}
      </BaseWidgetV2>

      <YourWidgetExplorer
        open={explorer.isOpen}
        onOpenChange={() => explorer.close()}
        itemId={explorer.currentItemId}
        itemList={explorer.itemList}
        onItemChange={explorer.changeItem}
      />
    </>
  );
}
```

---

## Best Practices

### 1. Loading States

Always show a loading indicator while fetching item details:

```jsx
{loading && (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="h-8 w-8 animate-spin" />
  </div>
)}
```

### 2. Error Handling

Provide clear error messages and retry options:

```jsx
{error && (
  <div className="text-center p-4">
    <p className="text-red-600 mb-3">{error}</p>
    <Button onClick={loadItemDetails}>Try Again</Button>
  </div>
)}
```

### 3. Navigation

Enable navigation only when there are multiple items:

```jsx
showNavigation={itemList.length > 1}
```

### 4. Refresh After Actions

Refresh the widget data after actions that modify state:

```jsx
const handleMarkAsRead = async () => {
  await markAsRead(itemId);
  if (onRefresh) {
    onRefresh(); // Refresh widget data
  }
  onOpenChange(false); // Close explorer
};
```

### 5. Responsive Design

Use Tailwind's responsive classes for mobile optimization:

```jsx
<div className="w-full sm:w-[600px]">
  {/* Content */}
</div>
```

### 6. Accessibility

- Use semantic HTML elements
- Provide descriptive `title` attributes for buttons
- Include `aria-label` for icon-only buttons
- Ensure keyboard navigation works

### 7. Performance

- Lazy load item details (fetch only when explorer opens)
- Memoize expensive computations
- Avoid unnecessary re-renders

---

## Examples

### Example 1: Gmail Explorer (Email Details)

**File**: `src/components/widgets/Gmail/GmailExplorer.jsx`

**Features**:
- Displays email metadata (From, To, CC, BCC)
- Shows email body with HTML rendering
- Lists attachments
- Provides actions: Reply, Forward, Mark as Read, Open in Gmail

**Key Implementation Details**:
```jsx
// Parse email addresses
const parseEmailAddress = (emailStr) => {
  const match = emailStr.match(/^(.+?)\s*<(.+?)>$/);
  return {
    name: match ? match[1].trim() : emailStr,
    email: match ? match[2].trim() : emailStr
  };
};

// Render email body with HTML
<div 
  className="prose prose-sm dark:prose-invert"
  dangerouslySetInnerHTML={{ __html: email.body }}
/>
```

### Example 2: Task Explorer (Hypothetical)

**Features**:
- Display task title, description, due date
- Show assignees and priority
- List subtasks and comments
- Actions: Edit, Complete, Delete, Assign

**Structure**:
```jsx
<Explorer title="Tasks">
  <ExplorerHeader>
    <h3>{task.title}</h3>
    <Badge>{task.priority}</Badge>
  </ExplorerHeader>

  <ExplorerBody>
    <ExplorerSection title="Details">
      <ExplorerField label="Due Date" value={task.dueDate} />
      <ExplorerField label="Assignee" value={task.assignee} />
    </ExplorerSection>

    <ExplorerSection title="Description">
      <p>{task.description}</p>
    </ExplorerSection>

    <ExplorerSection title="Subtasks">
      {task.subtasks.map(subtask => (
        <div key={subtask.id}>{subtask.title}</div>
      ))}
    </ExplorerSection>
  </ExplorerBody>

  <ExplorerFooter>
    <Button onClick={handleComplete}>Complete</Button>
    <Button onClick={handleEdit} variant="outline">Edit</Button>
  </ExplorerFooter>
</Explorer>
```

### Example 3: GitHub Issue Explorer (Hypothetical)

**Features**:
- Display issue title, number, state
- Show author, labels, assignees
- List comments and timeline
- Actions: Comment, Close, Assign, Add Label

**Key Sections**:
- **Header**: Issue number, title, state badge
- **Body**: 
  - Author and creation date
  - Labels and assignees
  - Issue description
  - Comments thread
- **Footer**: Comment input, action buttons

---

## Troubleshooting

### Explorer Not Opening

**Issue**: Explorer doesn't appear when clicking an item.

**Solutions**:
1. Check that `open` prop is set to `true`
2. Verify `explorerOpen` state is being updated
3. Ensure the explorer component is rendered in the JSX

### Navigation Not Working

**Issue**: Previous/Next buttons are disabled or don't work.

**Solutions**:
1. Verify `itemList` is passed correctly
2. Check that `currentIndex` calculation is correct
3. Ensure `hasPrevious` and `hasNext` are computed properly

### Content Not Loading

**Issue**: Explorer opens but shows loading state indefinitely.

**Solutions**:
1. Check API service function is working
2. Verify `itemId` is passed correctly
3. Add error handling and logging
4. Check network requests in browser DevTools

### Styling Issues

**Issue**: Explorer doesn't look right or overlaps content.

**Solutions**:
1. Ensure Tailwind CSS is configured correctly
2. Check z-index values (explorer should be `z-50`)
3. Verify animations are defined in `tailwind.config.js`
4. Test in different screen sizes

---

## API Reference

### Explorer Component

```jsx
<Explorer
  open={boolean}
  onOpenChange={(open: boolean) => void}
  title={string}
  showNavigation={boolean}
  onPrevious={() => void}
  onNext={() => void}
  hasPrevious={boolean}
  hasNext={boolean}
  className={string}
>
  {children}
</Explorer>
```

### ExplorerHeader

```jsx
<ExplorerHeader className={string}>
  {children}
</ExplorerHeader>
```

### ExplorerBody

```jsx
<ExplorerBody className={string}>
  {children}
</ExplorerBody>
```

### ExplorerFooter

```jsx
<ExplorerFooter className={string}>
  {children}
</ExplorerFooter>
```

### ExplorerSection

```jsx
<ExplorerSection title={string} className={string}>
  {children}
</ExplorerSection>
```

### ExplorerField

```jsx
<ExplorerField 
  label={string} 
  value={string} 
  className={string}
>
  {children}
</ExplorerField>
```

---

## Conclusion

The Explorer system provides a consistent, reusable pattern for displaying detailed content in your widgets. By following this guide, you can create rich, interactive explorers that enhance the user experience.

**Key Takeaways**:
- Use the base `Explorer` component for consistent UI
- Create custom explorers for each widget type
- Integrate explorers with simple state management
- Follow best practices for loading, errors, and navigation
- Leverage helper components for structured content

For questions or issues, refer to the existing `GmailExplorer` implementation as a reference example.

---

**Happy Coding! 🚀**
