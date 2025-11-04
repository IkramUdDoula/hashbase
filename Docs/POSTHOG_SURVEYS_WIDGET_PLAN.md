# PostHog Surveys Widget - Comprehensive Plan

## Overview

A comprehensive PostHog Surveys widget that allows users to view, manage, and analyze surveys directly from the Hashbase dashboard.

## Features

### Core Features
- ✅ **List All Surveys** - Display all surveys with status indicators
- ✅ **Survey Status Management** - Start, stop, pause, and resume surveys
- ✅ **Survey Details** - View comprehensive survey information
- ✅ **Response Statistics** - View survey response counts and metrics
- ✅ **Response Analysis** - View and analyze survey responses
- ✅ **Archive/Unarchive** - Archive completed surveys
- ✅ **Search & Filter** - Search surveys by name, filter by status
- ✅ **Auto-refresh** - Configurable automatic data refresh
- ✅ **Direct Links** - Open surveys in PostHog dashboard

### Survey Information Display
- Survey name and description
- Survey type (popover, API, etc.)
- Status (running, completed, draft, archived)
- Start and end dates
- Response count and limits
- Completion rate
- Question count
- Targeting information

---

## Architecture

### Components

```
PostHogSurveysWidget/
├── PostHogSurveysWidget.jsx      # Main widget component
├── PostHogSurveysExplorer.jsx    # Survey details explorer
├── index.js                       # Exports
└── README.md                      # Documentation
```

### Service Layer

**File**: `src/services/posthogService.js` (extend existing)

New functions to add:
- `fetchSurveys(projectId, options)` - List all surveys
- `fetchSurveyDetails(projectId, surveyId)` - Get survey details
- `fetchSurveyStats(projectId, surveyId)` - Get survey statistics
- `fetchSurveyResponses(projectId, surveyId, options)` - Get survey responses
- `updateSurvey(projectId, surveyId, updates)` - Update survey (pause/resume/archive)
- `fetchSurveyActivity(projectId, surveyId)` - Get survey activity log

---

## Widget Design

### Widget States

1. **Loading State**
   - Message: "Loading surveys from PostHog..."
   - Spinner animation

2. **Error State**
   - Icon: AlertTriangle
   - Message: Dynamic error message
   - Action: "Try Again" button

3. **Empty State**
   - Icon: ClipboardList
   - Message: "No surveys found"
   - Submessage: "Create your first survey in PostHog"

4. **Positive State** (Content)
   - Survey cards with status indicators
   - Search bar (when > 5 surveys)
   - Sortable list

### Survey Card Design

Each survey card displays:

```
┌─────────────────────────────────────────────────────────┐
│ [Status Badge]  Survey Name                   [Actions] │
│ Description (truncated)                                 │
│                                                         │
│ [Icon] Type    [Icon] Responses    [Icon] Questions    │
│ [Icon] Started: Date  [Icon] Ends: Date               │
└─────────────────────────────────────────────────────────┘
```

**Status Badge Colors**:
- 🟢 **Running** - Green (active, collecting responses)
- 🔵 **Draft** - Blue (not started)
- 🟡 **Paused** - Yellow (temporarily stopped)
- ⚫ **Completed** - Gray (ended)
- 📦 **Archived** - Dark gray (archived)

**Card Actions** (Quick actions on hover):
- Play/Pause toggle
- Archive/Unarchive toggle
- Open in PostHog (external link)

---

## Settings Modal

### Configuration Options

#### **1. Project Configuration**
- **Project ID** (required)
  - Type: Text input
  - Description: "Your PostHog project ID"
  - Validation: Required

- **Project URL**
  - Type: Text input
  - Default: "https://app.posthog.com"
  - Description: "Your PostHog instance URL"

#### **2. Display Settings**
- **Maximum Surveys**
  - Type: Number input
  - Range: 10-100
  - Default: 50
  - Description: "Number of surveys to fetch and display"

- **Sort By**
  - Type: Dropdown
  - Options:
    - "Created Date (Newest First)"
    - "Created Date (Oldest First)"
    - "Name (A-Z)"
    - "Name (Z-A)"
    - "Responses (Most First)"
    - "Responses (Least First)"
  - Default: "Created Date (Newest First)"

#### **3. Filter Settings**
- **Status Filter**
  - Type: Multi-select checkboxes
  - Options:
    - ☑ Running
    - ☑ Draft
    - ☑ Completed
    - ☐ Archived (default unchecked)
  - Description: "Show surveys with these statuses"

- **Show Archived Surveys**
  - Type: Toggle
  - Default: false
  - Description: "Include archived surveys in the list"

#### **4. Auto-Refresh Settings**
- **Auto Refresh**
  - Type: Toggle
  - Default: true
  - Description: "Automatically refresh surveys at regular intervals"

- **Refresh Interval** (when auto-refresh enabled)
  - Type: Dropdown
  - Options: 1m, 5m, 10m, 15m, 30m, 1h
  - Default: 5 minutes
  - Description: "How often to automatically refresh surveys"

#### **5. Response Settings**
- **Load Response Details**
  - Type: Toggle
  - Default: true
  - Description: "Load detailed response statistics for each survey"

- **Response Limit**
  - Type: Number input
  - Range: 10-1000
  - Default: 100
  - Description: "Maximum responses to load per survey in explorer"

---

## Explorer Design

### PostHogSurveysExplorer Component

The explorer provides detailed information about a selected survey.

#### **Header Section**
- Survey name (large, bold)
- Status badge
- Type badge
- Description (full text)

#### **Key Metrics Section** (Grid layout)
```
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ [Icon] Total │ [Icon] Compl │ [Icon] Quest │ [Icon] Comp  │
│ Responses    │ Limit        │ Count        │ Rate         │
│   1,234      │   5,000      │     8        │   24.7%      │
└──────────────┴──────────────┴──────────────┴──────────────┘
```

#### **Survey Details Section**
Table format with key-value pairs:
- **Survey ID**: UUID
- **Type**: Popover / API / etc.
- **Created**: Date + relative time
- **Created By**: User name/email
- **Started**: Date + relative time
- **Ends**: Date + relative time (or "No end date")
- **Status**: Badge with status
- **Archived**: Yes/No

#### **Targeting Section**
- **Linked Feature Flag**: Flag name (if any)
- **Targeting Flag**: Flag name (if any)
- **Conditions**: Display targeting conditions
- **Sampling**: Response sampling details

#### **Questions Section**
Expandable list of questions:
```
Question 1: [Type Badge] Question text
  - Type: Open / Rating / Single Choice / Multiple Choice
  - Optional: Yes/No
  - Choices: (for multiple choice)
  - Branching: Logic description
```

#### **Schedule Section**
- **Start Date**: Date and time
- **End Date**: Date and time (or "No end date")
- **Iteration**: Current iteration / Total iterations
- **Frequency**: Days between iterations
- **Response Sampling**: Interval and limits

#### **Appearance Section**
- **Theme**: Display appearance settings
- **Position**: Survey position on page
- **Custom CSS**: If any

#### **Response Statistics Section**
- **Total Responses**: Count
- **Unique Respondents**: Count
- **Completion Rate**: Percentage
- **Average Time**: Time to complete
- **Response Trend**: Simple chart or list

#### **Recent Responses Section** (Optional)
Table of recent responses:
- Timestamp
- User (if identified)
- Answers (summary)
- Completion status

#### **Activity Log Section**
Timeline of survey changes:
- Created
- Started
- Paused
- Resumed
- Archived
- Settings changed

### Explorer Actions (Buttons)

1. **Open in PostHog**
   - Icon: ExternalLink
   - Variant: outline
   - Action: Opens survey in PostHog dashboard

2. **Pause/Resume Survey** (conditional)
   - Icon: Pause / Play
   - Variant: outline
   - Action: Toggles survey running state
   - Only shown if survey is running or paused

3. **Archive/Unarchive**
   - Icon: Archive / ArchiveRestore
   - Variant: ghost
   - Action: Toggles archive state

4. **Copy Survey ID**
   - Icon: Copy
   - Variant: ghost
   - Action: Copies survey ID to clipboard

### Navigation
- Previous/Next buttons to navigate between surveys
- Keyboard shortcuts: ← → for navigation

---

## Data Flow

### Initial Load
```
1. Widget mounts
2. Load settings from localStorage
3. Check PostHog configuration
4. Fetch surveys from PostHog API
5. Transform and display data
6. Start auto-refresh if enabled
```

### Survey Card Click
```
1. User clicks survey card
2. Set selected survey ID
3. Open explorer
4. Fetch detailed survey data
5. Fetch survey statistics
6. Fetch recent responses (optional)
7. Display in explorer
```

### Survey Action (Pause/Resume/Archive)
```
1. User clicks action button
2. Show confirmation (if needed)
3. Call PostHog API to update survey
4. Update local state
5. Refresh survey list
6. Show success/error message
```

---

## API Integration

### PostHog API Endpoints

#### 1. List Surveys
```
GET /api/projects/:project_id/surveys
Query params:
  - limit: number
  - offset: number
  - search: string
```

#### 2. Get Survey Details
```
GET /api/projects/:project_id/surveys/:id
```

#### 3. Update Survey
```
PATCH /api/projects/:project_id/surveys/:id
Body:
  - archived: boolean
  - start_date: string
  - end_date: string
  - (other survey fields)
```

#### 4. Get Survey Stats
```
GET /api/projects/:project_id/surveys/:id/stats
Query params:
  - date_from: ISO timestamp
  - date_to: ISO timestamp
```

#### 5. Get Survey Responses
```
GET /api/projects/:project_id/surveys/:id/responses_count
```

#### 6. Get Survey Activity
```
GET /api/projects/:project_id/surveys/:id/activity
```

---

## Data Models

### Survey Object
```typescript
{
  id: string;                    // UUID
  name: string;                  // Survey name
  description: string;           // Survey description
  type: string;                  // 'popover', 'api', etc.
  status: string;                // 'running', 'draft', 'completed', 'paused'
  archived: boolean;             // Archive status
  created_at: string;            // ISO timestamp
  created_by: {                  // Creator info
    id: number;
    uuid: string;
    first_name: string;
    last_name: string;
    email: string;
  };
  start_date: string | null;     // ISO timestamp
  end_date: string | null;       // ISO timestamp
  questions: Array<Question>;    // Survey questions
  responses_limit: number;       // Max responses
  response_count: number;        // Current response count
  completion_rate: number;       // Percentage
  linked_flag: object | null;    // Feature flag
  targeting_flag: object | null; // Targeting flag
  conditions: object | null;     // Targeting conditions
  appearance: object | null;     // Appearance settings
  iteration_count: number;       // Number of iterations
  iteration_frequency_days: number;
  current_iteration: number;
  enable_partial_responses: boolean;
}
```

### Question Object
```typescript
{
  id: string;
  type: 'open' | 'link' | 'rating' | 'single_choice' | 'multiple_choice';
  question: string;
  description?: string;
  descriptionContentType?: 'html' | 'text';
  optional: boolean;
  buttonText?: string;
  // Type-specific fields
  link?: string;                 // For 'link' type
  display?: 'number' | 'emoji';  // For 'rating' type
  scale?: number;                // For 'rating' type
  lowerBoundLabel?: string;      // For 'rating' type
  upperBoundLabel?: string;      // For 'rating' type
  choices?: string[];            // For choice types
  shuffleOptions?: boolean;      // For choice types
  hasOpenChoice?: boolean;       // For choice types
  branching?: BranchingLogic;
}
```

### Survey Stats Object
```typescript
{
  total_responses: number;
  unique_respondents: number;
  completion_rate: number;
  average_time: number;
  responses_by_date: Array<{
    date: string;
    count: number;
  }>;
}
```

---

## localStorage Keys

```javascript
// Widget settings
'posthog_surveys_settings' = {
  projectId: string;
  projectUrl: string;
  maxSurveys: number;
  sortBy: string;
  statusFilter: string[];
  showArchived: boolean;
  autoRefresh: boolean;
  refreshInterval: number;
  loadResponseDetails: boolean;
  responseLimit: number;
}

// Cached survey data (optional, for offline support)
'posthog_surveys_cache' = {
  surveys: Array<Survey>;
  lastFetch: string; // ISO timestamp
}
```

---

## Error Handling

### Error Scenarios

1. **No Access Token**
   - Message: "PostHog access token not configured. Add it in Settings → Secrets."
   - Action: Link to settings

2. **No Project ID**
   - Message: "PostHog project ID not configured. Add it in widget settings."
   - Action: Open settings modal

3. **Invalid Credentials**
   - Message: "Invalid PostHog access token. Please check your credentials."
   - Action: Try again

4. **Project Not Found**
   - Message: "Project not found. Check your project ID."
   - Action: Open settings

5. **Network Error**
   - Message: "Failed to connect to PostHog. Check your internet connection."
   - Action: Retry

6. **API Error**
   - Message: "PostHog API error: [error details]"
   - Action: Retry

---

## UI/UX Considerations

### Search Functionality
- Debounced search (300ms)
- Search by survey name and description
- Case-insensitive
- Clear search button

### Sorting
- Client-side sorting for better performance
- Persist sort preference in settings

### Filtering
- Multi-select status filter
- Show/hide archived toggle
- Filter count indicator

### Loading States
- Skeleton loaders for survey cards
- Inline loading for actions (pause/resume)
- Progress indicators for long operations

### Responsive Design
- Card layout adapts to widget size
- Metrics grid collapses on small sizes
- Scrollable content areas

### Accessibility
- Keyboard navigation support
- ARIA labels for icons
- Focus indicators
- Screen reader friendly

---

## Performance Optimizations

1. **Pagination**
   - Load surveys in batches
   - Infinite scroll or "Load More" button

2. **Caching**
   - Cache survey list in localStorage
   - Invalidate cache on refresh
   - Show cached data while fetching

3. **Lazy Loading**
   - Load survey details only when explorer opens
   - Load statistics on demand

4. **Debouncing**
   - Debounce search input
   - Debounce filter changes

5. **Memoization**
   - Memoize filtered/sorted lists
   - Memoize computed values

---

## Testing Checklist

### Widget Tests
- [ ] Widget loads with valid configuration
- [ ] Widget shows error with missing token
- [ ] Widget shows error with missing project ID
- [ ] Search filters surveys correctly
- [ ] Sort options work correctly
- [ ] Status filter works correctly
- [ ] Auto-refresh works
- [ ] Manual refresh works
- [ ] Settings save and load correctly

### Explorer Tests
- [ ] Explorer opens with survey details
- [ ] Navigation between surveys works
- [ ] External link opens correctly
- [ ] Pause/Resume action works
- [ ] Archive/Unarchive action works
- [ ] Copy ID works
- [ ] All sections display correctly

### Integration Tests
- [ ] Config export includes survey settings
- [ ] Config import restores survey settings
- [ ] Widget works in different row spans
- [ ] Widget works in dark mode
- [ ] Widget works with drag and drop

---

## Future Enhancements

### Phase 2 Features
- [ ] Create new surveys from widget
- [ ] Edit survey questions
- [ ] Duplicate surveys
- [ ] Export survey responses (CSV/JSON)
- [ ] Response analytics dashboard
- [ ] Survey templates
- [ ] Bulk actions (archive multiple, etc.)

### Phase 3 Features
- [ ] AI-powered response analysis
- [ ] Response sentiment analysis
- [ ] Custom response filters
- [ ] Response notifications
- [ ] Survey scheduling
- [ ] A/B testing support

---

## Implementation Phases

### Phase 1: Core Widget (MVP)
1. Service layer implementation
2. Basic widget with survey list
3. Settings modal
4. Basic explorer with details
5. Pause/Resume/Archive actions

### Phase 2: Enhanced Features
1. Response statistics
2. Response list in explorer
3. Activity log
4. Advanced filtering
5. Performance optimizations

### Phase 3: Advanced Features
1. Response analysis
2. Charts and visualizations
3. Export functionality
4. Bulk operations

---

## Dependencies

### Existing Dependencies (Already in project)
- React
- Lucide React (icons)
- Tailwind CSS
- BaseWidgetV2
- Explorer components
- PostHog service (extend)

### New Dependencies (None required)
All functionality can be built with existing dependencies.

---

## File Structure

```
src/
├── components/
│   └── widgets/
│       └── PostHog/
│           ├── PostHogErrorsWidget.jsx          # Existing
│           ├── PostHogErrorsExplorer.jsx        # Existing
│           ├── PostHogSurveysWidget.jsx         # NEW
│           ├── PostHogSurveysExplorer.jsx       # NEW
│           └── index.js                         # Update
├── services/
│   └── posthogService.js                        # Extend
└── App.jsx                                      # Register widget
```

---

## Configuration Export/Import

### Keys to Export
```javascript
'posthog_surveys_settings'  // Widget settings
```

### Update configService.js
Add to `getDashboardKeys()`:
```javascript
'posthog_surveys_settings',
```

---

## Documentation

### Widget README
Create `src/components/widgets/PostHog/SURVEYS_README.md` with:
- Feature overview
- Setup instructions
- API requirements
- Usage guide
- Troubleshooting

### Main README Update
Add PostHog Surveys widget to the widgets list in main README.

---

## Success Criteria

### Must Have
- ✅ Display list of surveys
- ✅ Show survey status and basic info
- ✅ Open survey details in explorer
- ✅ Pause/Resume surveys
- ✅ Archive/Unarchive surveys
- ✅ Search and filter surveys
- ✅ Open in PostHog dashboard
- ✅ Settings persistence

### Should Have
- ✅ Response statistics
- ✅ Auto-refresh
- ✅ Sort options
- ✅ Activity log
- ✅ Question list display

### Nice to Have
- ⭕ Response list
- ⭕ Response analysis
- ⭕ Charts/visualizations
- ⭕ Export responses

---

## Timeline Estimate

### Phase 1 (Core Widget)
- Service layer: 2-3 hours
- Widget component: 3-4 hours
- Explorer component: 3-4 hours
- Testing & polish: 2 hours
- **Total: 10-13 hours**

### Phase 2 (Enhanced)
- Response features: 2-3 hours
- Activity log: 1-2 hours
- Optimizations: 1-2 hours
- **Total: 4-7 hours**

---

**Document Version**: 1.0  
**Last Updated**: 2025-11-05  
**Status**: Ready for Implementation
