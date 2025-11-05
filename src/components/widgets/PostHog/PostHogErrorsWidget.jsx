import React, { useState, useEffect } from 'react';
import { BaseWidgetV2 } from '../../BaseWidgetV2';
import { 
  AlertTriangle,
  Settings as SettingsIcon,
  Clock,
  Hash,
  CheckSquare2,
  Users
} from 'lucide-react';
import { SiPosthog } from 'react-icons/si';
import { 
  fetchErrors,
  isPostHogConfigured,
  isErrorTrackingApiAvailable,
  fetchAvailableHosts
} from '@/services/posthogService';
import { formatRelativeDate } from '@/lib/dateUtils';
import { WidgetModal, WidgetModalFooter } from '@/components/ui/widget-modal';
import { Badge } from '@/components/ui/badge';
import { PostHogErrorsExplorer } from './PostHogErrorsExplorer';

/**
 * PostHogErrorsWidget - PostHog error tracking widget using BaseWidgetV2
 * 
 * Features:
 * - Displays recent errors from PostHog error tracking
 * - Filter by status (active, resolved, all)
 * - Search functionality
 * - Auto-refresh capability
 * - Click to view error details
 * - Open in PostHog dashboard
 */
export function PostHogErrorsWidget({ rowSpan = 2, dragRef }) {
  // Widget state management
  const [errors, setErrors] = useState([]);
  const [currentState, setCurrentState] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [errorActionLoading, setErrorActionLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState({
    projectId: '',
    projectUrl: 'https://us.posthog.com',
    maxErrors: 50,
    refreshInterval: 0.5, // 30 seconds in minutes
    autoRefresh: true,
    lastSeenDays: 30,
    filterTestAccounts: true,
    filterHosts: [],
    sortBy: 'occurrences-desc' // occurrences-desc, occurrences-asc, lastSeen-desc, lastSeen-asc, users-desc, users-asc
  });
  
  // API availability state
  const [hasErrorTrackingApi, setHasErrorTrackingApi] = useState(null);
  const [availableHosts, setAvailableHosts] = useState([]);
  const [loadingHosts, setLoadingHosts] = useState(false);
  
  // Temporary settings for modal
  const [tempSettings, setTempSettings] = useState(settings);
  
  // Explorer state
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [selectedErrorId, setSelectedErrorId] = useState(null);
  
  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem('posthog_errors_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        // Ensure filterHosts is always an array for backward compatibility
        const normalizedSettings = {
          ...parsed,
          filterHosts: Array.isArray(parsed.filterHosts) ? parsed.filterHosts : [],
          filterTestAccounts: parsed.filterTestAccounts !== undefined ? parsed.filterTestAccounts : true,
          lastSeenDays: parsed.lastSeenDays !== undefined ? parsed.lastSeenDays : 30,
          sortBy: parsed.sortBy || 'occurrences-desc'
        };
        setSettings(normalizedSettings);
        setTempSettings(normalizedSettings);
      } catch (e) {
        console.error('Failed to load PostHog settings:', e);
      }
    }
    setIsInitialized(true);
  }, []);
  
  // Check API availability when project ID changes
  useEffect(() => {
    async function checkApiAvailability() {
      if (!settings.projectId || !isPostHogConfigured()) {
        setHasErrorTrackingApi(null);
        return;
      }
      
      try {
        const available = await isErrorTrackingApiAvailable(settings.projectId);
        setHasErrorTrackingApi(available);
        
        // If API is not available, fetch available hosts
        if (!available) {
          setLoadingHosts(true);
          try {
            const hosts = await fetchAvailableHosts(settings.projectId);
            setAvailableHosts(hosts);
          } catch (err) {
            console.error('Failed to fetch available hosts:', err);
            setAvailableHosts([]);
          } finally {
            setLoadingHosts(false);
          }
        }
      } catch (err) {
        console.error('Failed to check API availability:', err);
        setHasErrorTrackingApi(false);
      }
    }
    
    checkApiAvailability();
  }, [settings.projectId]);
  
  // Save settings to localStorage
  useEffect(() => {
    if (!isInitialized) return;
    
    try {
      localStorage.setItem('posthog_errors_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save PostHog settings:', error);
    }
  }, [settings, isInitialized]);
  
  // Load errors from PostHog
  const loadErrors = async () => {
    try {
      setErrorMessage('');
      
      if (!isPostHogConfigured()) {
        setErrorMessage('PostHog access token not configured. Add it in Settings → Secrets.');
        setCurrentState('error');
        setRefreshing(false);
        return;
      }

      if (!settings.projectId) {
        setErrorMessage('PostHog project ID not configured. Add it in widget settings.');
        setCurrentState('error');
        setRefreshing(false);
        return;
      }

      const errorData = await fetchErrors(
        settings.projectId, 
        settings.maxErrors,
        settings.filterTestAccounts,
        settings.filterHosts,
        settings.lastSeenDays
      );
      
      if (errorData.length === 0) {
        setErrors([]);
        setCurrentState('empty');
      } else {
        setErrors(errorData);
        setCurrentState('positive');
      }
    } catch (err) {
      setCurrentState('error');
    } finally {
      setRefreshing(false);
    }
  };
  // Initial load - only after settings are loaded
  useEffect(() => {
    if (isInitialized) {
      loadErrors();
    }
  }, [isInitialized, settings.projectId, settings.maxErrors, settings.filterTestAccounts, settings.filterHosts, settings.lastSeenDays, settings.autoRefresh, settings.refreshInterval]);
  
  // Auto-refresh if enabled
  useEffect(() => {
    if (settings.autoRefresh && currentState === 'positive') {
      const interval = setInterval(() => {
        setRefreshing(true);
        loadErrors();
      }, settings.refreshInterval * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [settings.autoRefresh, settings.refreshInterval, currentState]);
  
  // Handlers
  const handleRefresh = () => {
    setRefreshing(true);
    setCurrentState('loading');
    loadErrors();
  };
  
  const handleSettingsOpen = async () => {
    setTempSettings(settings);
    setSettingsOpen(true);
    
    // Refresh API availability check when opening settings
    if (settings.projectId && isPostHogConfigured()) {
      try {
        const available = await isErrorTrackingApiAvailable(settings.projectId);
        setHasErrorTrackingApi(available);
        
        // If API is not available, refresh available hosts
        if (!available) {
          setLoadingHosts(true);
          try {
            const hosts = await fetchAvailableHosts(settings.projectId);
            setAvailableHosts(hosts);
          } catch (err) {
            console.error('Failed to fetch available hosts:', err);
          } finally {
            setLoadingHosts(false);
          }
        }
      } catch (err) {
        console.error('Failed to check API availability:', err);
      }
    }
  };
  
  const handleSettingsSave = () => {
    setSettings(tempSettings);
    setSettingsOpen(false);
  };
  
  const handleSettingsCancel = () => {
    setTempSettings(settings);
    setSettingsOpen(false);
  };
  
  const handleErrorAction = async () => {
    setErrorActionLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setErrorActionLoading(false);
    setCurrentState('loading');
    loadErrors();
  };
  
  const handleErrorClick = (error) => {
    setSelectedErrorId(error.id);
    setExplorerOpen(true);
  };
  
  const handleErrorChange = (errorId) => {
    setSelectedErrorId(errorId);
  };
  
  const handleOpenInPostHog = (error) => {
    if (settings.projectUrl && error.id) {
      window.open(`${settings.projectUrl}/error_tracking/${error.id}`, '_blank');
    }
  };
  
  // Filter and sort errors
  const filteredErrors = errors.filter(error => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      error.title?.toLowerCase().includes(query) ||
      error.type?.toLowerCase().includes(query) ||
      error.message?.toLowerCase().includes(query)
    );
  }).sort((a, b) => {
    switch (settings.sortBy) {
      case 'occurrences-desc':
        return (b.occurrences || 0) - (a.occurrences || 0);
      case 'occurrences-asc':
        return (a.occurrences || 0) - (b.occurrences || 0);
      case 'lastSeen-desc':
        return new Date(b.lastSeen || b.firstSeen) - new Date(a.lastSeen || a.firstSeen);
      case 'lastSeen-asc':
        return new Date(a.lastSeen || a.firstSeen) - new Date(b.lastSeen || b.firstSeen);
      case 'users-desc':
        return (b.affectedUsers || 0) - (a.affectedUsers || 0);
      case 'users-asc':
        return (a.affectedUsers || 0) - (b.affectedUsers || 0);
      default:
        return 0;
    }
  });
  
  // Get severity badge color
  const getSeverityColor = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'critical':
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-300';
    }
  };
  
  return (
    <>
      <BaseWidgetV2
        // Header Zone
        logo={SiPosthog}
        appName="PostHog"
        widgetName="Error Tracking"
        tooltip="Recent errors from PostHog error tracking"
        badge={errors.length > 0 ? <Badge variant="secondary">{errors.length}</Badge> : null}
        
        // Action Buttons
        showSettings={true}
        onSettingsClick={handleSettingsOpen}
        showRefresh={true}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        
        // Content State
        state={currentState}
        
        // Loading State
        loadingMessage="Loading errors from PostHog..."
        
        // Error State
        errorIcon={AlertTriangle}
        errorMessage={errorMessage || "Failed to load errors. Please check your settings and try again."}
        errorActionLabel="Try Again"
        onErrorAction={handleErrorAction}
        errorActionLoading={errorActionLoading}
        
        // Empty State
        emptyIcon={CheckSquare2}
        emptyMessage="No errors found"
        emptySubmessage={`No errors in the last ${settings.lastSeenDays} days. Great job!`}
        
        // Positive State (Content)
        searchEnabled={true}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search errors by type, message..."
        
        // Layout
        rowSpan={rowSpan}
        dragRef={dragRef}
      >
        {/* Content Cards */}
        {filteredErrors.length === 0 && searchQuery ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <AlertTriangle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No errors match your search</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredErrors.map((error) => {
              // All errors shown in red
              const cardClasses = 'p-3 rounded-lg bg-gradient-to-br from-red-50 to-red-100 dark:from-red-950/40 dark:to-red-900/40 border-2 border-red-300 dark:border-red-800 hover:shadow-md hover:border-red-400 dark:hover:border-red-700 transition-all cursor-pointer group';
              
              return (
                <div
                  key={error.id}
                  className={cardClasses}
                  onClick={() => handleErrorClick(error)}
                >
                  {/* Error type and severity */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
                      <span className="text-xs font-semibold text-red-900 dark:text-red-100">
                        {error.type || 'Error'}
                      </span>
                    </div>
                    {error.severity && (
                      <Badge className={`text-xs ${getSeverityColor(error.severity)}`}>
                        {error.severity}
                      </Badge>
                    )}
                  </div>
                  
                  {/* Error message */}
                  <p className="text-sm font-medium line-clamp-2 mb-2 text-red-900 dark:text-red-100">
                    {error.exceptionValue || error.message || error.title || 'Unknown error'}
                  </p>

                  {/* Metadata */}
                  <div className="flex items-center justify-between text-xs text-red-700 dark:text-red-300">
                    <div className="flex items-center gap-3">
                      {error.occurrences && (
                        <div className="flex items-center gap-1">
                          <Hash className="h-3 w-3" />
                          <span>{error.occurrences}</span>
                        </div>
                      )}
                      {error.affectedUsers && (
                        <div className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          <span>{error.affectedUsers}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span className="whitespace-nowrap">
                        {formatRelativeDate(error.lastSeen || error.firstSeen)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </BaseWidgetV2>
      
      {/* Settings Modal */}
      <WidgetModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        title="PostHog Error Tracking Settings"
        description="Configure your PostHog error tracking preferences."
        icon={SiPosthog}
        footer={
          <WidgetModalFooter
            onCancel={handleSettingsCancel}
            onSave={handleSettingsSave}
          />
        }
      >
        <div className="space-y-4">
          {/* Project ID */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Project ID *
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Your PostHog project ID (found in project settings)
            </p>
            <input
              type="text"
              value={tempSettings.projectId}
              onChange={(e) => setTempSettings({ ...tempSettings, projectId: e.target.value })}
              placeholder="12345"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600"
            />
          </div>

          {/* Project URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Project URL
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Your PostHog instance URL (e.g., https://app.posthog.com or https://your-instance.posthog.com)
            </p>
            <input
              type="text"
              value={tempSettings.projectUrl}
              onChange={(e) => setTempSettings({ ...tempSettings, projectUrl: e.target.value })}
              placeholder="https://app.posthog.com"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600"
            />
          </div>
          
          {/* Last Seen Timeline */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Last Seen Timeline
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              How far back to look for errors (in days)
            </p>
            <div className="relative">
              <select
                value={tempSettings.lastSeenDays}
                onChange={(e) => setTempSettings({ ...tempSettings, lastSeenDays: parseInt(e.target.value) })}
                className="w-full px-3 py-2 pr-8 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600 appearance-none cursor-pointer"
              >
                <option value="1">Last 24 hours</option>
                <option value="3">Last 3 days</option>
                <option value="7">Last 7 days</option>
                <option value="14">Last 14 days</option>
                <option value="30">Last 30 days</option>
                <option value="60">Last 60 days</option>
                <option value="90">Last 90 days</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500 dark:text-gray-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Sort By */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Sort By
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              How to sort the error list
            </p>
            <div className="relative">
              <select
                value={tempSettings.sortBy}
                onChange={(e) => setTempSettings({ ...tempSettings, sortBy: e.target.value })}
                className="w-full px-3 py-2 pr-8 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600 appearance-none cursor-pointer"
              >
                <option value="occurrences-desc">Occurrences (High to Low)</option>
                <option value="occurrences-asc">Occurrences (Low to High)</option>
                <option value="lastSeen-desc">Last Seen (Newest to Oldest)</option>
                <option value="lastSeen-asc">Last Seen (Oldest to Newest)</option>
                <option value="users-desc">Users Affected (Most to Least)</option>
                <option value="users-asc">Users Affected (Least to Most)</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500 dark:text-gray-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Max Errors */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Maximum Errors
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Number of errors to fetch and display
            </p>
            <input
              type="number"
              min="10"
              max="100"
              value={tempSettings.maxErrors}
              onChange={(e) => setTempSettings({ ...tempSettings, maxErrors: parseInt(e.target.value) || 50 })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          
          {/* Auto Refresh Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Auto Refresh
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Automatically refresh errors at regular intervals
            </p>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={tempSettings.autoRefresh}
                onChange={(e) => setTempSettings({ ...tempSettings, autoRefresh: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900 dark:peer-checked:bg-gray-100 peer-checked:after:bg-white dark:peer-checked:after:bg-gray-900"></div>
              <span className="ml-3 text-sm text-gray-900 dark:text-gray-100">
                {tempSettings.autoRefresh ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>
          
          {/* Refresh Interval */}
          {tempSettings.autoRefresh && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Refresh Interval (minutes)
              </label>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                How often to automatically refresh errors
              </p>
              <div className="relative">
                <select
                  value={tempSettings.refreshInterval}
                  onChange={(e) => setTempSettings({ ...tempSettings, refreshInterval: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 pr-8 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600 appearance-none cursor-pointer"
                >
                  <option value="0.5">30 seconds (realtime)</option>
                  <option value="1">1 minute</option>
                  <option value="5">5 minutes</option>
                  <option value="10">10 minutes</option>
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500 dark:text-gray-400">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          )}
          
          {/* Filter Test Accounts Toggle - Only show if API is available */}
          {hasErrorTrackingApi === true && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Filter Internal and Test Users
              </label>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Exclude errors from internal and test users (uses PostHog's test account filtering)
              </p>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={tempSettings.filterTestAccounts}
                  onChange={(e) => setTempSettings({ ...tempSettings, filterTestAccounts: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-300 dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900 dark:peer-checked:bg-gray-100 peer-checked:after:bg-white dark:peer-checked:after:bg-gray-900"></div>
                <span className="ml-3 text-sm text-gray-900 dark:text-gray-100">
                  {tempSettings.filterTestAccounts ? 'Enabled' : 'Disabled'}
                </span>
              </label>
            </div>
          )}

          {/* Filter by Host - Only show if API is NOT available */}
          {hasErrorTrackingApi === false && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Filter by Host
              </label>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                Only show errors from specific hosts. Advanced filtering API not available.
              </p>
              {loadingHosts ? (
                <div className="text-xs text-gray-500 dark:text-gray-400 py-2">
                  Loading available hosts...
                </div>
              ) : availableHosts.length > 0 ? (
                <div className="space-y-2">
                  <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-700 rounded-lg p-2 bg-gray-50 dark:bg-gray-800/50">
                    {availableHosts.map(host => (
                      <label
                        key={host}
                        className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={tempSettings.filterHosts.includes(host)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setTempSettings({ 
                                ...tempSettings, 
                                filterHosts: [...tempSettings.filterHosts, host] 
                              });
                            } else {
                              setTempSettings({ 
                                ...tempSettings, 
                                filterHosts: tempSettings.filterHosts.filter(h => h !== host) 
                              });
                            }
                          }}
                          className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 text-gray-900 dark:text-gray-100 focus:ring-gray-400 dark:focus:ring-gray-600 cursor-pointer"
                        />
                        <span className="text-sm text-gray-900 dark:text-gray-100 flex-1 truncate">
                          {host}
                        </span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {tempSettings.filterHosts.length > 0 
                      ? `${tempSettings.filterHosts.length} host${tempSettings.filterHosts.length !== 1 ? 's' : ''} selected` 
                      : 'All hosts shown (none selected)'}
                  </p>
                </div>
              ) : (
                <div className="text-xs text-gray-500 dark:text-gray-400 py-2">
                  No hosts found in error data
                </div>
              )}
            </div>
          )}
          
          {/* Reset to Defaults */}
          <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={() => {
                const defaults = {
                  projectId: '',
                  projectUrl: 'https://app.posthog.com',
                  lastSeenDays: 30,
                  maxErrors: 50,
                  autoRefresh: true,
                  refreshInterval: 0.5,
                  filterTestAccounts: true,
                  filterHosts: [],
                  sortBy: 'occurrences-desc'
                };
                setTempSettings(defaults);
              }}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      </WidgetModal>
      
      {/* Errors Explorer */}
      <PostHogErrorsExplorer
        open={explorerOpen}
        onOpenChange={setExplorerOpen}
        errorId={selectedErrorId}
        errorList={filteredErrors}
        onErrorChange={handleErrorChange}
        projectUrl={settings.projectUrl}
        projectId={settings.projectId}
      />
    </>
  );
}
