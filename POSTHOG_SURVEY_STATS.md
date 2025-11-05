# PostHog Survey Statistics Enhancement

## Overview
Enhanced the PostHog Surveys Explorer to fetch and display comprehensive survey response statistics using HogQL queries, similar to the PostHog web interface.

## What Was Implemented

### 1. New Service Functions (`posthogService.js`)

#### `fetchDetailedSurveyResponses()`
- **Purpose**: Fetches detailed survey responses using HogQL queries
- **Features**:
  - Dynamically builds HogQL query based on survey questions
  - Handles different question types (rating, multiple choice, single choice, text)
  - Extracts user information (email, name, username)
  - Deduplicates responses using `$survey_submission_id`
  - Supports date range filtering
  - Uses the `/api/environments/{projectId}/query/` endpoint

#### `aggregateSurveyResponses()`
- **Purpose**: Parses and aggregates raw HogQL response data
- **Calculates**:
  - Total responses
  - Unique users count
  - Responses by date
  - Per-question statistics:
    - Response counts and percentages
    - For rating questions: average, min, max
    - For choice questions: distribution breakdown

### 2. Enhanced Explorer UI (`PostHogSurveysExplorer.jsx`)

#### Statistics Section
- **Total Responses**: Shows the total number of survey submissions
- **Unique Users**: Displays count of distinct users who responded
- **Responses by Date**: Timeline of responses (last 7 days)

#### Response Breakdown Section
For each question in the survey:
- **Question text and type** (rating, multiple_choice, etc.)
- **Response count**
- **For rating questions**:
  - Average rating with 2 decimal precision
  - Min and max values
- **For all questions**:
  - Top 10 responses sorted by frequency
  - Count and percentage for each response
  - Visual progress bars showing distribution

## Technical Details

### HogQL Query Structure
The query dynamically adapts to survey questions:
```sql
SELECT
  -- Dynamic question response fields
  COALESCE(NULLIF(JSONExtractString(...), ''), ...) AS q0_response,
  if(JSONHas(...) AND length(...) > 0, ...) AS q1_response,
  
  -- User identification fields
  person.properties.email,
  person.properties.Email,
  person.properties.$email,
  person.properties.name,
  person.properties.Name,
  person.properties.username,
  person.properties.Username,
  person.properties.UserName,
  events.distinct_id,
  events.timestamp
FROM events
WHERE event = 'survey sent'
  AND properties.$survey_id = '{surveyId}'
  AND uuid in (
    -- Deduplication subquery using argMax
    SELECT argMax(uuid, timestamp)
    FROM events
    WHERE ...
    GROUP BY if(JSONHas(...), JSONExtractString(...), toString(uuid))
  )
ORDER BY events.timestamp DESC
LIMIT {limit}
```

### Response Parsing
- Handles array responses for multiple choice questions
- Cleans quoted strings from JSON extraction
- Tracks numeric values for rating calculations
- Groups responses by date for timeline view

## Usage

The enhanced statistics are automatically loaded when:
1. Opening a survey in the explorer
2. The survey has questions defined
3. PostHog API credentials are configured

The explorer will:
1. Fetch basic survey details
2. Fetch response counts
3. If questions exist, fetch detailed responses using HogQL
4. Aggregate and display comprehensive statistics

## Benefits

1. **Comprehensive Insights**: See detailed breakdowns without leaving the dashboard
2. **Visual Representation**: Progress bars and percentages for easy understanding
3. **Rating Analytics**: Automatic average, min, max calculations for rating questions
4. **User Tracking**: Know how many unique users responded
5. **Timeline View**: See response patterns over time
6. **Efficient Querying**: Uses HogQL for powerful, flexible queries

## API Endpoints Used

- `POST /api/environments/{projectId}/query/` - HogQL query execution
- `GET /api/projects/{projectId}/surveys/{surveyId}` - Survey details
- `GET /api/projects/{projectId}/surveys/responses_count/` - Response counts

## Future Enhancements

Potential additions:
- Export responses to CSV
- Filter responses by date range (UI controls)
- View individual response details
- Compare responses across time periods
- Sentiment analysis for text responses
- Custom aggregations and groupings
