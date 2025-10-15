# Timer Widget

A comprehensive timer widget with stopwatch, lap system, and countdown timer functionality.

## Features

### Stopwatch Mode
- **Start/Pause/Reset Controls**: Full control over stopwatch timing
- **Lap System**: Record multiple laps with individual lap times
- **Lap Management**: View all laps with total time and lap duration
- **Delete Laps**: Remove individual laps from the list
- **Persistent Storage**: Stopwatch time and laps are saved to localStorage

### Countdown Timer Mode
- **Customizable Duration**: Set countdown time in minutes and seconds
- **Quick Presets**: One-click presets for common durations (1, 5, 10, 15, 30 min, 1 hour)
- **Progress Bar**: Visual progress indicator
- **Warning State**: Timer turns red when under 10 seconds
- **Notifications**: Browser notification when countdown completes (requires permission)
- **Start/Pause/Reset/Stop Controls**: Full control over countdown timing

## Usage

### Stopwatch
1. Click the **Stopwatch** tab
2. Press **Start** to begin timing
3. Press **Lap** to record a lap time
4. Press **Pause** to pause the stopwatch
5. Press **Reset** to clear the stopwatch and all laps

### Countdown Timer
1. Click the **Countdown** tab
2. Press **Start** to begin countdown
3. Press **Pause** to pause the countdown
4. Press **Reset** to reset to initial time
5. Press **Stop** to stop and clear the countdown

### Settings
- Click the **Settings** icon to configure countdown duration
- Enter custom minutes and seconds
- Or use quick presets for common durations
- Changes apply immediately to the countdown timer

## Technical Details

### State Management
- Uses React hooks for state management
- Persistent storage via localStorage
- Separate state for stopwatch and countdown modes

### Time Precision
- Stopwatch: Updates every 10ms for precise timing
- Countdown: Updates every 10ms for smooth countdown
- Display format: HH:MM:SS.MS (stopwatch) or MM:SS (countdown)

### Notifications
- Requests browser notification permission on mount
- Sends notification when countdown completes
- Gracefully handles denied permissions

### Storage Keys
- `timerMode`: Current mode (stopwatch/countdown)
- `stopwatchTime`: Current stopwatch time in milliseconds
- `stopwatchLaps`: Array of lap objects
- `countdownInitial`: Initial countdown duration in milliseconds

**Note:** All timer data is automatically included in dashboard config backups (Settings > Secrets > Download Config). This means your laps, stopwatch time, and countdown settings will be preserved when you export/import your dashboard configuration.

## UI Components

### Mode Switcher
- Toggle between Stopwatch and Countdown modes
- Preserves state when switching modes

### Time Display
- Large, easy-to-read font
- Monospace font for consistent digit width
- Color changes for countdown warnings

### Control Buttons
- Color-coded for different actions
- Disabled states for invalid operations
- Icon + text labels for clarity

### Lap List
- Scrollable list of all recorded laps
- Shows lap number, total time, and lap duration
- Hover to reveal delete button

### Progress Bar
- Visual indicator for countdown progress
- Smooth transitions
- Responsive to countdown time

## Integration

The Timer widget is integrated into the main app via `App.jsx`:

```jsx
import { TimerWidget } from './components/widgets/Timer/TimerWidget';

// In allWidgets array:
{ 
  id: 'timer', 
  component: TimerWidget, 
  rowSpan: 2,
  name: 'Timer',
  description: 'Stopwatch with lap system and countdown timer with notifications',
  icon: Timer
}
```

## Dependencies

- React (hooks: useState, useEffect, useRef)
- lucide-react (icons)
- BaseWidgetV2 (widget container)
- WidgetModal (settings modal)
- Badge (status badge)

## Future Enhancements

- Sound alerts for countdown completion
- Multiple countdown presets
- Export lap times
- Interval timer mode
- Pomodoro timer mode
- Custom themes
