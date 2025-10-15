# Widgets System

This directory contains reusable widget components for the Hashbase dashboard, organized by service/category.

## Structure

```
widgets/
├── Gmail/
│   └── UnreadEmailWidget.jsx    - Gmail unread emails widget
├── Netlify/
│   └── DeploymentWidget.jsx     - Netlify deployment status widget
├── News/
│   ├── NewsWidget.jsx            - Latest news headlines widget
│   └── NewsSettingsDialog.jsx    - Settings dialog for country/topic
└── README.md
```

## Widget Architecture

### BaseWidget Component
All widgets use the `BaseWidget` component which provides:
- **Fixed height** based on `rowSpan` (1-4 rows)
- **Dynamic card pagination** - cards adapt to available space
- **Consistent styling** and layout
- **Overflow handling** with scrollable content area

### Row Span System
- **1 row** = 200px height, shows 1 card (no scrolling needed)
- **2 rows** = 400px height, shows 3 cards (no scrolling needed)
- **3 rows** = 600px height, shows 5 cards (no scrolling needed)
- **4 rows** = 800px height, shows 7 cards (no scrolling needed)

Users can resize widgets using the +/- buttons in the UI. Additional cards are paginated.

## Adding a New Widget

1. **Create a new folder** for your service/category:
   ```bash
   mkdir src/components/widgets/YourService
   ```

2. **Create your widget component:**
   ```javascript
   // src/components/widgets/YourService/YourWidget.jsx
   import React, { useState, useEffect, useMemo } from 'react';
   import { BaseWidget } from '../../BaseWidget';
   import { Button } from '@/components/ui/button';
   import { Badge } from '@/components/ui/badge';
   import { YourIcon } from 'lucide-react';
   
   export function YourWidget({ rowSpan = 2 }) {
     // Calculate cards per page based on rowSpan (no scrolling)
     const cardsPerPage = useMemo(() => {
       const heightMap = { 1: 1, 2: 3, 3: 5, 4: 7 };
       return heightMap[rowSpan] || 3;
     }, [rowSpan]);
     
     // Your data fetching and pagination logic
     const [items, setItems] = useState([]);
     const [currentPage, setCurrentPage] = useState(0);
     
     // Pagination
     const totalPages = Math.ceil(items.length / cardsPerPage);
     const currentItems = items.slice(
       currentPage * cardsPerPage,
       (currentPage + 1) * cardsPerPage
     );
     
     return (
       <BaseWidget
         icon={YourIcon}
         title="Your Widget"
         description="Widget description"
         rowSpan={rowSpan}
       >
         <div className="flex-1 overflow-y-auto space-y-3 pr-1">
           {currentItems.map(item => (
             <div key={item.id} className="p-3 rounded-lg border bg-card">
               {/* Your card content */}
             </div>
           ))}
         </div>
         
         {/* Pagination controls if needed */}
       </BaseWidget>
     );
   }
   ```

3. **Add to App.jsx:**
   ```javascript
   import { YourWidget } from './components/widgets/YourService/YourWidget';
   
   const widgets = [
     { id: 'your-widget', component: YourWidget, rowSpan: 2 },
   ];
   ```

## Widget Features

All widgets automatically include:
- ✅ Fixed height based on user-configurable rowSpan (1-4)
- ✅ Dynamic card pagination based on available space
- ✅ Auto-refresh every 60 seconds
- ✅ Refresh on tab visibility change
- ✅ Manual refresh button
- ✅ Loading states
- ✅ Error handling
- ✅ Consistent styling
- ✅ Responsive design
- ✅ Drag-and-drop repositioning
- ✅ Resizable via UI controls

## Available Widgets

- **Gmail/** - Unread emails with OAuth2 authentication
- **Netlify/** - Deployment status monitoring
- **News/** - Latest news headlines with filtering
- **BD24Live/** - Bangladesh news via RSS feed
- **GitHub/** - Recent commits from repositories
- **AI/** - Chat with AI assistants (GPT-4, Claude)
- **Checklist/** - Simple task checklist with auto-sorting
- **Timer/** - Stopwatch with laps and countdown timer

## Example Widgets to Build

- **Calendar/** - Upcoming events
- **Weather/** - Current weather
- **RSS/** - Latest articles
- **Twitter/** - Recent tweets

## BaseWidget Props

```javascript
<BaseWidget
  icon={IconComponent}           // Lucide icon component
  title="Widget Title"           // Widget header title
  description="Description"      // Optional subtitle
  badge={<Badge>5</Badge>}      // Optional badge (e.g., count)
  headerActions={<Button />}     // Optional header action buttons
  rowSpan={1-4}                 // Number of rows (height)
  className="custom-class"       // Optional additional classes
>
  {/* Your widget content */}
</BaseWidget>
```
