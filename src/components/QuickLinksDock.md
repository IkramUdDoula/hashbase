# Quick Links Dock

A macOS dock-style quick access bar for your favorite URLs, positioned at the bottom of the screen.

## Features

- **Widget-Style Container**: Proper background and border styling matching other widgets
- **Empty State**: Shows helpful message with "Add Link" button when no links exist
- **Favicon Display**: Shows website favicons for quick visual recognition
- **Hover Tooltips**: Displays full title and URL on hover
- **Configurable**: Add, edit, delete, and reorder links via Settings
- **Responsive**: Horizontal scroll for many links
- **Persistent**: Saved to localStorage and included in config backups
- **Direct Settings Access**: Empty state button opens Settings directly to Quick Links tab

## Usage

### Adding Links

**From Empty State:**
1. Click "Add Link" button in the dock

**From Settings:**
1. Open Settings (gear icon in top-right)
2. Navigate to "Quick Links" tab
3. Enter URL and optional title
4. Click "Add Link"

### Managing Links

- **Edit**: Click the edit icon to modify URL or title
- **Delete**: Click the trash icon to remove a link
- **Reorder**: Drag and drop links to change their order

### Accessing Links

- Click any favicon in the dock to open the URL in a new tab
- Hover over a favicon to see the full title and URL

## Technical Details

### Components

- `QuickLinksDock.jsx` - Main dock component (fixed at bottom)
- `QuickLinksSettings.jsx` - Settings UI for managing links
- `quickLinksService.js` - CRUD operations and storage

### Storage

- **Key**: `hashbase_quicklinks`
- **Format**: Array of link objects
  ```json
  [
    {
      "id": "link-1234567890",
      "url": "https://example.com",
      "title": "Example Site",
      "favicon": "https://www.google.com/s2/favicons?domain=https://example.com&sz=64",
      "order": 0
    }
  ]
  ```

### Favicon Service

Uses Google's favicon service for reliable icon fetching:
- Primary: `https://www.google.com/s2/favicons?domain={url}&sz=64`
- Fallback: SVG placeholder icon

### Layout Integration

- Dock is fixed at bottom with `z-50`
- Positioned with `bottom-4 left-4 right-4` to match widget grid padding (16px)
- Main canvas has `pb-[88px]` bottom padding to prevent overlap
- Spacing between widgets and dock is 32px (double the gap between widgets)
- Full-width design respects the same padding as the widget grid

## Styling

### Container
- **Full Width**: Spans entire viewport width with `px-4` padding
- **Background**: `bg-white dark:bg-gray-900` (solid, matches widgets exactly)
- **Border**: `border-2 border-gray-200 dark:border-gray-800` (matches widgets)
- **Rounded**: `rounded-xl` (matches widgets)
- **Shadow**: `shadow-sm` (subtle, matches widgets)
- **Height**: Auto-adjusts based on content (empty state vs links)

### Empty State
- Icon in gray background (`bg-gray-100 dark:bg-gray-800`)
- Descriptive text with call-to-action button
- Button opens Settings modal directly to Quick Links tab
- Horizontal layout with space-between alignment

### Links Display
- **Icons**: 48px container (w-12 h-12) with 32px icons (w-8 h-8)
- **Hover**: Scale animation (1.1x) with subtle background (`bg-gray-100 dark:bg-gray-800`)
- **Active**: Scale down (0.95x) for click feedback
- **Scroll**: Horizontal overflow with hidden scrollbar
- **Spacing**: 8px gap between icons

## Events

### Listening
The dock listens for updates via:
- `storage` event (cross-tab updates)
- `quicklinks-updated` custom event (same-window updates)

### Dispatching
- `open-settings` custom event with `{ detail: { tab: 'quicklinks' } }` to open Settings modal

Settings component dispatches `quicklinks-updated` after any change.
