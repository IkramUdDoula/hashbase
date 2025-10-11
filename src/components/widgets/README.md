# Widgets System

This directory contains reusable widget components for the Hashbase dashboard.

## Structure

- **Widget.jsx** - Base widget component with consistent styling and layout
- **GmailWidget.jsx** - Gmail unread emails widget
- **WidgetTemplate.jsx** - Template for creating new widgets

## Adding a New Widget

1. **Copy the template:**
   ```bash
   cp WidgetTemplate.jsx YourWidget.jsx
   ```

2. **Customize your widget:**
   - Update the icon, title, and description
   - Implement your data fetching logic
   - Design your item cards/layout
   - Add any specific actions or interactions

3. **Add to App.jsx:**
   ```javascript
   import { YourWidget } from './components/widgets/YourWidget';
   
   const widgets = [
     { id: 'gmail', component: GmailWidget },
     { id: 'your-widget', component: YourWidget },
   ];
   ```

## Widget Features

All widgets automatically include:
- ✅ Auto-refresh every 60 seconds
- ✅ Refresh on tab visibility change
- ✅ Manual refresh button
- ✅ Loading states
- ✅ Error handling
- ✅ Consistent styling
- ✅ Responsive design

## Example Widgets to Build

- **GitHub Widget** - Show recent notifications, PRs, issues
- **Netlify Widget** - Display recent deployments and build status
- **Calendar Widget** - Show upcoming events
- **Weather Widget** - Display current weather
- **Tasks Widget** - Show your to-do list
- **RSS Feed Widget** - Display latest articles

## Widget Props

The base `Widget` component accepts:

```javascript
<Widget
  icon={IconComponent}           // Lucide icon component
  title="Widget Title"           // Widget header title
  description="Description"      // Optional subtitle
  badge={<Badge>5</Badge>}      // Optional badge (e.g., count)
  headerActions={<Button />}     // Optional header action buttons
  className="custom-class"       // Optional additional classes
>
  {/* Your widget content */}
</Widget>
```
