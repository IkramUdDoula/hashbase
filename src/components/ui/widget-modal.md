# WidgetModal Component

A reusable modal/popup component for widgets that matches the LLM Settings modal design and behavior.

## Features

- ✅ Consistent dark theme styling matching the codebase
- ✅ Click outside to close
- ✅ Escape key to close
- ✅ Custom scrollbar support
- ✅ Flexible header with icon support
- ✅ Optional description text
- ✅ Customizable footer
- ✅ Pre-built footer with Cancel/Save buttons

## Usage

### Basic Example

```jsx
import { WidgetModal, WidgetModalFooter } from '@/components/ui/widget-modal';
import { Settings } from 'lucide-react';

function MySettingsDialog({ open, onOpenChange }) {
  const handleSave = () => {
    // Save logic
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <WidgetModal
      open={open}
      onOpenChange={onOpenChange}
      title="Widget Settings"
      description="Configure your widget preferences."
      icon={Settings}
      footer={
        <WidgetModalFooter
          onCancel={handleCancel}
          onSave={handleSave}
        />
      }
    >
      {/* Your content here */}
      <div>
        <p>Settings content goes here</p>
      </div>
    </WidgetModal>
  );
}
```

### Custom Footer Example

```jsx
<WidgetModal
  open={open}
  onOpenChange={onOpenChange}
  title="Confirmation"
  icon={AlertCircle}
  footer={
    <div className="flex gap-2">
      <Button onClick={handleDelete} variant="destructive" className="flex-1">
        Delete
      </Button>
      <Button onClick={handleCancel} variant="outline" className="flex-1">
        Cancel
      </Button>
    </div>
  }
>
  <p>Are you sure you want to delete this item?</p>
</WidgetModal>
```

### Without Footer

```jsx
<WidgetModal
  open={open}
  onOpenChange={onOpenChange}
  title="Information"
  icon={Info}
>
  <p>This is a simple informational modal without a footer.</p>
</WidgetModal>
```

## Props

### WidgetModal

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `open` | `boolean` | - | Whether the modal is open (required) |
| `onOpenChange` | `function` | - | Callback when modal state changes (required) |
| `title` | `string` | - | Modal title (required) |
| `description` | `string` | - | Optional description text below title |
| `icon` | `React.Component` | - | Optional Lucide icon component |
| `children` | `React.ReactNode` | - | Modal content (required) |
| `footer` | `React.ReactNode` | - | Optional footer content |
| `maxWidth` | `string` | `'max-w-md'` | Tailwind max-width class |
| `showScrollbar` | `boolean` | `true` | Whether to show custom scrollbar |

### WidgetModalFooter

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `onCancel` | `function` | - | Cancel button callback (required) |
| `onSave` | `function` | - | Save button callback (required) |
| `cancelText` | `string` | `'Cancel'` | Cancel button text |
| `saveText` | `string` | `'Save Changes'` | Save button text |
| `saveDisabled` | `boolean` | `false` | Whether save button is disabled |

## Styling

The modal uses the following color scheme to match the LLM Settings modal:

- **Background**: `bg-white dark:bg-gray-900`
- **Border**: `border-gray-200 dark:border-gray-800`
- **Text**: `text-gray-900 dark:text-gray-100`
- **Muted text**: `text-gray-600 dark:text-gray-400`
- **Backdrop**: `bg-black/50 backdrop-blur-sm`

## Examples in Codebase

See `NewsSettingsDialog.jsx` for a complete implementation example.
