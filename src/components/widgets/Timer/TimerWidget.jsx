import React, { useState, useEffect, useRef } from 'react';
import { BaseWidgetV2 } from '../../BaseWidgetV2';
import { Badge } from '@/components/ui/badge';
import { 
  Timer, 
  Play,
  Pause,
  RotateCcw,
  Plus,
  Trash2,
  Clock,
  StopCircle
} from 'lucide-react';
import { WidgetModal, WidgetModalFooter } from '@/components/ui/widget-modal';

/**
 * TimerWidget - A comprehensive timer widget with stopwatch, lap system, and countdown timer
 * 
 * Features:
 * - Stopwatch with lap tracking
 * - Countdown timer
 * - Persistent storage in localStorage
 * - Clean, modern UI
 */
export function TimerWidget({ rowSpan = 2, dragRef }) {
  // Mode: 'stopwatch' or 'countdown'
  const [mode, setMode] = useState('stopwatch');
  
  // Stopwatch state
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const [laps, setLaps] = useState([]);
  
  // Countdown state
  const [countdownTime, setCountdownTime] = useState(0);
  const [countdownInitial, setCountdownInitial] = useState(300); // 5 minutes default
  const [countdownRunning, setCountdownRunning] = useState(false);
  
  // Settings
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [tempCountdownMinutes, setTempCountdownMinutes] = useState(5);
  const [tempCountdownSeconds, setTempCountdownSeconds] = useState(0);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Refs for intervals
  const stopwatchIntervalRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  
  // Load saved state on mount
  useEffect(() => {
    const savedMode = localStorage.getItem('timerMode');
    if (savedMode) setMode(savedMode);
    
    const savedStopwatchTime = localStorage.getItem('stopwatchTime');
    if (savedStopwatchTime) setStopwatchTime(parseInt(savedStopwatchTime));
    
    const savedLaps = localStorage.getItem('stopwatchLaps');
    if (savedLaps) {
      try {
        const parsed = JSON.parse(savedLaps);
        setLaps(parsed);
        console.log('📂 Loaded stopwatch laps:', parsed.length);
      } catch (e) {
        console.error('❌ Failed to load laps:', e);
      }
    }
    
    const savedCountdownInitial = localStorage.getItem('countdownInitial');
    if (savedCountdownInitial) {
      const initial = parseInt(savedCountdownInitial);
      setCountdownInitial(initial);
      setCountdownTime(initial);
    }
    
    // Mark as initialized after loading
    setIsInitialized(true);
  }, []);
  
  // Save state to localStorage (skip on initial mount)
  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem('timerMode', mode);
    console.log('✅ Saved timer mode:', mode);
  }, [mode, isInitialized]);
  
  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem('stopwatchTime', stopwatchTime.toString());
  }, [stopwatchTime, isInitialized]);
  
  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem('stopwatchLaps', JSON.stringify(laps));
    console.log('✅ Saved stopwatch laps:', laps.length);
  }, [laps, isInitialized]);
  
  useEffect(() => {
    if (!isInitialized) return;
    localStorage.setItem('countdownInitial', countdownInitial.toString());
    console.log('✅ Saved countdown initial:', countdownInitial);
  }, [countdownInitial, isInitialized]);
  
  // Stopwatch interval
  useEffect(() => {
    if (stopwatchRunning) {
      stopwatchIntervalRef.current = setInterval(() => {
        setStopwatchTime(prev => prev + 10);
      }, 10);
    } else {
      if (stopwatchIntervalRef.current) {
        clearInterval(stopwatchIntervalRef.current);
      }
    }
    
    return () => {
      if (stopwatchIntervalRef.current) {
        clearInterval(stopwatchIntervalRef.current);
      }
    };
  }, [stopwatchRunning]);
  
  // Countdown interval
  useEffect(() => {
    if (countdownRunning) {
      countdownIntervalRef.current = setInterval(() => {
        setCountdownTime(prev => {
          if (prev <= 10) {
            setCountdownRunning(false);
            // Play notification sound or alert
            if (typeof window !== 'undefined' && window.Notification && Notification.permission === 'granted') {
              new Notification('Timer Complete!', {
                body: 'Your countdown timer has finished.',
                icon: '/image.png'
              });
            }
            return 0;
          }
          return prev - 10;
        });
      }, 10);
    } else {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    }
    
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, [countdownRunning]);
  
  // Format time as HH:MM:SS.MS
  const formatTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const ms = Math.floor((milliseconds % 1000) / 10);
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };
  
  // Format time as MM:SS for countdown
  const formatCountdownTime = (milliseconds) => {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Stopwatch controls
  const handleStopwatchStartPause = () => {
    setStopwatchRunning(!stopwatchRunning);
  };
  
  const handleStopwatchReset = () => {
    setStopwatchRunning(false);
    setStopwatchTime(0);
    setLaps([]);
  };
  
  const handleAddLap = () => {
    if (stopwatchTime > 0) {
      const newLap = {
        id: Date.now(),
        time: stopwatchTime,
        lapTime: laps.length > 0 ? stopwatchTime - laps[laps.length - 1].time : stopwatchTime
      };
      setLaps([...laps, newLap]);
    }
  };
  
  const handleDeleteLap = (lapId) => {
    setLaps(laps.filter(lap => lap.id !== lapId));
  };
  
  // Countdown controls
  const handleCountdownStartPause = () => {
    if (countdownTime === 0 && !countdownRunning) {
      setCountdownTime(countdownInitial);
    }
    setCountdownRunning(!countdownRunning);
  };
  
  const handleCountdownReset = () => {
    setCountdownRunning(false);
    setCountdownTime(countdownInitial);
  };
  
  const handleCountdownStop = () => {
    setCountdownRunning(false);
    setCountdownTime(0);
  };
  
  // Settings handlers
  const handleSettingsOpen = () => {
    const minutes = Math.floor(countdownInitial / 60000);
    const seconds = Math.floor((countdownInitial % 60000) / 1000);
    setTempCountdownMinutes(minutes);
    setTempCountdownSeconds(seconds);
    setSettingsOpen(true);
  };
  
  const handleSettingsSave = () => {
    const newInitial = (tempCountdownMinutes * 60 + tempCountdownSeconds) * 1000;
    setCountdownInitial(newInitial);
    if (!countdownRunning) {
      setCountdownTime(newInitial);
    }
    setSettingsOpen(false);
  };
  
  const handleSettingsCancel = () => {
    setSettingsOpen(false);
  };
  
  // Request notification permission on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Notification && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);
  
  // Badge showing timer status
  const badge = mode === 'stopwatch' && stopwatchRunning ? (
    <Badge variant="secondary" className="bg-green-500 text-white">Running</Badge>
  ) : mode === 'countdown' && countdownRunning ? (
    <Badge variant="secondary" className="bg-blue-500 text-white">Running</Badge>
  ) : null;
  
  return (
    <>
      <BaseWidgetV2
        // Header Zone
        logo={Timer}
        appName="Timer"
        widgetName={mode === 'stopwatch' ? 'Stopwatch' : 'Countdown'}
        tooltip="Timer with stopwatch and countdown"
        badge={badge}
        
        // Action Buttons
        showSettings={true}
        onSettingsClick={handleSettingsOpen}
        showRefresh={false}
        
        // Content State
        state="positive"
        
        // Layout
        rowSpan={rowSpan}
        dragRef={dragRef}
      >
        {/* Content */}
        <div className="flex flex-col h-full min-h-0">
          {/* Stopwatch Mode */}
          {mode === 'stopwatch' && (
            <div className="flex flex-col h-full min-h-0">
              {/* Scrollable Content Area */}
              <div className="flex-1 overflow-y-auto min-h-0 custom-scrollbar">
                {/* Time Display */}
                <div className="text-center mb-4">
                  <div className="text-4xl font-mono font-bold text-gray-900 dark:text-gray-100 mb-4">
                    {formatTime(stopwatchTime)}
                  </div>
                  
                  {/* Controls */}
                  <div className="flex justify-center gap-3">
                    <button
                      onClick={handleStopwatchStartPause}
                      className={`p-4 rounded-lg font-medium transition-all ${
                        stopwatchRunning
                          ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                          : 'bg-green-500 hover:bg-green-600 text-white'
                      }`}
                      title={stopwatchRunning ? 'Pause' : 'Start'}
                    >
                      {stopwatchRunning ? (
                        <Pause className="h-6 w-6" />
                      ) : (
                        <Play className="h-6 w-6" />
                      )}
                    </button>
                    
                    <button
                      onClick={handleAddLap}
                      disabled={stopwatchTime === 0}
                      className="p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Lap"
                    >
                      <Plus className="h-6 w-6" />
                    </button>
                    
                    <button
                      onClick={handleStopwatchReset}
                      disabled={stopwatchTime === 0 && laps.length === 0}
                      className="p-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Reset"
                    >
                      <RotateCcw className="h-6 w-6" />
                    </button>
                  </div>
                </div>
                
                {/* Laps List */}
                <div className="min-h-0">
                  {laps.length > 0 ? (
                    <div className="space-y-2">
                      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Laps ({laps.length})
                      </h3>
                      {[...laps].reverse().map((lap, index) => (
                        <div
                          key={lap.id}
                          className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 group"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-gray-600 dark:text-gray-400">
                              #{laps.length - index}
                            </span>
                            <div>
                              <div className="text-sm font-mono font-medium text-gray-900 dark:text-gray-100">
                                {formatTime(lap.time)}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-500">
                                +{formatTime(lap.lapTime)}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDeleteLap(lap.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-all"
                            title="Delete lap"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <Clock className="h-12 w-12 text-gray-300 dark:text-gray-700 mb-3" />
                      <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">No laps yet</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">Start the stopwatch and add laps</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Countdown Mode */}
          {mode === 'countdown' && (
            <div className="flex flex-col items-center justify-center h-full">
              {/* Time Display */}
              <div className="text-center mb-6">
                <div className={`text-6xl font-mono font-bold mb-6 transition-colors ${
                  countdownTime < 10000 && countdownTime > 0
                    ? 'text-red-500 dark:text-red-400'
                    : 'text-gray-900 dark:text-gray-100'
                }`}>
                  {formatCountdownTime(countdownTime === 0 && !countdownRunning ? countdownInitial : countdownTime)}
                </div>
                
                {/* Controls */}
                <div className="flex justify-center gap-3">
                  <button
                    onClick={handleCountdownStartPause}
                    className={`p-4 rounded-lg font-medium transition-all ${
                      countdownRunning
                        ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                        : 'bg-green-500 hover:bg-green-600 text-white'
                    }`}
                    title={countdownRunning ? 'Pause' : 'Start'}
                  >
                    {countdownRunning ? (
                      <Pause className="h-6 w-6" />
                    ) : (
                      <Play className="h-6 w-6" />
                    )}
                  </button>
                  
                  <button
                    onClick={handleCountdownReset}
                    disabled={countdownTime === countdownInitial && !countdownRunning}
                    className="p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Reset"
                  >
                    <RotateCcw className="h-6 w-6" />
                  </button>
                  
                  <button
                    onClick={handleCountdownStop}
                    disabled={countdownTime === 0}
                    className="p-4 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Stop"
                  >
                    <StopCircle className="h-6 w-6" />
                  </button>
                </div>
              </div>
              
              {/* Progress Bar */}
              {countdownInitial > 0 && (
                <div className="w-full max-w-md">
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 dark:bg-blue-400 transition-all duration-100"
                      style={{
                        width: `${((countdownTime === 0 && !countdownRunning ? countdownInitial : countdownTime) / countdownInitial) * 100}%`
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Mode Switcher - Bottom */}
          <div className="flex gap-2 mt-4 pt-3 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={() => setMode('stopwatch')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                mode === 'stopwatch'
                  ? 'bg-blue-600 text-white dark:bg-blue-500'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Clock className="h-4 w-4 inline mr-2" />
              Stopwatch
            </button>
            <button
              onClick={() => setMode('countdown')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                mode === 'countdown'
                  ? 'bg-blue-600 text-white dark:bg-blue-500'
                  : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
            >
              <Timer className="h-4 w-4 inline mr-2" />
              Countdown
            </button>
          </div>
        </div>
      </BaseWidgetV2>
      
      {/* Settings Modal */}
      <WidgetModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        title="Timer Settings"
        description="Configure your timer preferences."
        icon={Timer}
        footer={
          <WidgetModalFooter
            onCancel={handleSettingsCancel}
            onSave={handleSettingsSave}
          />
        }
      >
        <div className="space-y-4">
          {/* Countdown Duration */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Countdown Duration
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
              Set the default countdown timer duration
            </p>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                  Minutes
                </label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={tempCountdownMinutes}
                  onChange={(e) => setTempCountdownMinutes(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-600 dark:text-gray-400 mb-1 block">
                  Seconds
                </label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  value={tempCountdownSeconds}
                  onChange={(e) => setTempCountdownSeconds(Math.max(0, Math.min(59, parseInt(e.target.value) || 0)))}
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
          
          {/* Quick Presets */}
          <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-800">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Quick Presets
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { label: '1 min', minutes: 1, seconds: 0 },
                { label: '5 min', minutes: 5, seconds: 0 },
                { label: '10 min', minutes: 10, seconds: 0 },
                { label: '15 min', minutes: 15, seconds: 0 },
                { label: '30 min', minutes: 30, seconds: 0 },
                { label: '1 hour', minutes: 60, seconds: 0 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => {
                    setTempCountdownMinutes(preset.minutes);
                    setTempCountdownSeconds(preset.seconds);
                  }}
                  className="px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </WidgetModal>
    </>
  );
}
