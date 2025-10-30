import React, { useState, useEffect } from 'react';
import { BaseWidgetV2 } from '../../BaseWidgetV2';
import { Badge } from '@/components/ui/badge';
import { 
  Rocket, 
  AlertCircle,
  CheckCircle2, 
  XCircle, 
  Clock, 
  GitBranch, 
  Box, 
  Timer,
  Loader2
} from 'lucide-react';
import { SiNetlify } from 'react-icons/si';
import { 
  fetchNetlifyDeploys, 
  fetchNetlifySites,
  checkNetlifyStatus, 
  getNetlifyDeployUrl,
  getSiteSelectionPreferences,
  saveSiteSelectionPreferences
} from '@/services/netlifyService';
import { formatRelativeDate } from '@/lib/dateUtils';
import { WidgetModal, WidgetModalFooter } from '@/components/ui/widget-modal';

/**
 * DeploymentWidgetV2 - Netlify deployments widget using BaseWidgetV2
 * 
 * Features:
 * - Displays recent deployments from all Netlify sites
 * - Search functionality to filter deployments
 * - Real-time deployment status indicators
 * - Build time tracking
 * - Error message display
 */
export function DeploymentWidgetV2({ rowSpan = 3, dragRef }) {
  // Widget state management
  const [deploys, setDeploys] = useState([]);
  const [sites, setSites] = useState([]);
  const [currentState, setCurrentState] = useState('loading');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorActionLoading, setErrorActionLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState({
    selectedSites: [],
    selectAll: true,
    maxDeploys: 20,
    autoRefresh: true,
    refreshInterval: 1, // minutes
    showBuildTime: true,
    showBranch: true,
  });
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  
  // Temporary settings for modal
  const [tempSettings, setTempSettings] = useState(settings);
  
  // Load sites on mount
  useEffect(() => {
    loadSites();
    
    // Load saved preferences
    const prefs = getSiteSelectionPreferences();
    setSettings(prev => ({
      ...prev,
      selectedSites: prefs.selectedSites,
      selectAll: prefs.selectAll
    }));
    setPreferencesLoaded(true);
  }, []);
  
  // Load sites
  const loadSites = async () => {
    try {
      if (!await checkNetlifyStatus()) return;
      
      const netlifySites = await fetchNetlifySites();
      setSites(netlifySites);
    } catch (err) {
      console.warn('Failed to load sites:', err);
    }
  };
  
  // Load deployments from Netlify
  const loadDeploys = async () => {
    try {
      setErrorMessage('');
      const configStatus = await checkNetlifyStatus();
      setIsConfigured(configStatus);
      
      if (!configStatus) {
        setErrorMessage('Netlify access token not configured. Add it in Settings → Secrets.');
        setCurrentState('error');
        setRefreshing(false);
        return;
      }
      
      const sitesToFetch = settings.selectAll ? [] : settings.selectedSites;
      const netlifyDeploys = await fetchNetlifyDeploys(sitesToFetch);
      
      // Limit to max deploys from settings
      const limitedDeploys = netlifyDeploys.slice(0, settings.maxDeploys);
      
      if (limitedDeploys.length === 0) {
        setDeploys([]);
        setCurrentState('empty');
      } else {
        setDeploys(limitedDeploys);
        setCurrentState('positive');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load deployments. Please try again.');
      setCurrentState('error');
    } finally {
      setRefreshing(false);
    }
  };

  // Initial load - only after preferences are loaded
  useEffect(() => {
    if (preferencesLoaded) {
      loadDeploys();
    }
  }, [preferencesLoaded, settings.selectedSites, settings.selectAll, settings.maxDeploys]);

  // Auto-refresh based on settings
  useEffect(() => {
    if (!settings.autoRefresh) return;
    
    const interval = setInterval(() => {
      if (currentState === 'positive') {
        setRefreshing(true);
        loadDeploys();
      }
    }, settings.refreshInterval * 60 * 1000);

    const handleVisibilityChange = () => {
      if (!document.hidden && currentState === 'positive') {
        setRefreshing(true);
        loadDeploys();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentState, settings.autoRefresh, settings.refreshInterval]);

  // Handlers
  const handleRefresh = () => {
    setRefreshing(true);
    setCurrentState('loading');
    loadDeploys();
  };

  const handleErrorAction = async () => {
    setErrorActionLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setErrorActionLoading(false);
    setCurrentState('loading');
    loadDeploys();
  };
  
  const handleSettingsOpen = () => {
    setTempSettings(settings);
    setSettingsOpen(true);
  };
  
  const handleSettingsSave = () => {
    setSettings(tempSettings);
    saveSiteSelectionPreferences(tempSettings.selectedSites, tempSettings.selectAll);
    setSettingsOpen(false);
  };
  
  const handleSettingsCancel = () => {
    setTempSettings(settings);
    setSettingsOpen(false);
  };

  const handleDeployClick = (deploy) => {
    const deployUrl = getNetlifyDeployUrl(deploy.id, deploy.siteId);
    window.open(deployUrl, '_blank');
  };
  
  const handleSiteToggle = (siteId) => {
    setTempSettings(prev => {
      const isSelected = prev.selectedSites.includes(siteId);
      const newSelectedSites = isSelected
        ? prev.selectedSites.filter(s => s !== siteId)
        : [...prev.selectedSites, siteId];
      
      return {
        ...prev,
        selectedSites: newSelectedSites,
        selectAll: false
      };
    });
  };
  
  const handleSelectAllToggle = () => {
    setTempSettings(prev => ({
      ...prev,
      selectAll: !prev.selectAll,
      selectedSites: []
    }));
  };

  // Format build time
  const formatBuildTime = (seconds) => {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // Get state icon
  const getStateIcon = (state) => {
    switch (state) {
      case 'ready':
        return <CheckCircle2 className="h-4 w-4 text-green-500 dark:text-green-400" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500 dark:text-red-400" />;
      case 'building':
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 dark:text-blue-400 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />;
    }
  };

  // Filter deployments based on search
  const filteredDeploys = deploys.filter(deploy => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      deploy.siteName.toLowerCase().includes(query) ||
      deploy.branch?.toLowerCase().includes(query) ||
      deploy.context?.toLowerCase().includes(query)
    );
  });

  // Count failed deploys only
  const errorCount = filteredDeploys.filter(d => d.state === 'error').length;

  // Badge showing only failed deployment count
  const badge = errorCount > 0 ? (
    <Badge variant="destructive" className="text-xs">{errorCount}</Badge>
  ) : null;

  return (
    <>
      <BaseWidgetV2
        // Header Zone
        logo={SiNetlify}
        appName="Netlify"
        widgetName="Deploys"
        tooltip="Latest deployments from all your Netlify sites"
        badge={badge}
        
        // Action Buttons
        showSettings={true}
        onSettingsClick={handleSettingsOpen}
        showRefresh={true}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        
        // Content State
        state={currentState}
        
        // Loading State
        loadingMessage="Loading deployments from Netlify..."
        
        // Error State
        errorIcon={Rocket}
        errorMessage={errorMessage}
        errorActionLabel="Try Again"
        onErrorAction={handleErrorAction}
        errorActionLoading={errorActionLoading}
        
        // Empty State
        emptyIcon={Rocket}
        emptyMessage="No deployments found"
        emptySubmessage="Your Netlify sites will appear here when you deploy."
        
        // Positive State (Content)
        searchEnabled={true}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search deployments..."
        
        // Layout
        rowSpan={rowSpan}
        dragRef={dragRef}
      >
      {/* Content Cards */}
      {filteredDeploys.length === 0 && searchQuery ? (
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
          <Rocket className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No deployments match your search</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredDeploys.map((deploy) => {
            const isError = deploy.state === 'error';
            const isBuilding = deploy.state === 'building' || deploy.state === 'processing';
            
            return (
              <div
                key={deploy.id}
                className={`p-3 rounded-lg border transition-all cursor-pointer group ${
                  isError
                    ? 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-200 dark:border-red-800 hover:shadow-md'
                    : 'bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/40 dark:to-slate-900/40 border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600'
                }`}
                onClick={() => handleDeployClick(deploy)}
              >
                {/* Site name and time */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {getStateIcon(deploy.state)}
                    <p className={`font-semibold text-sm line-clamp-1 ${
                      isError
                        ? 'text-red-900 dark:text-red-100'
                        : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {deploy.siteName}
                    </p>
                  </div>
                  <span className={`text-xs whitespace-nowrap flex-shrink-0 ${
                    isError
                      ? 'text-red-700 dark:text-red-300'
                      : 'text-gray-600 dark:text-gray-400'
                  }`}>
                    {formatRelativeDate(deploy.createdAt)}
                  </span>
                </div>
                
                {/* Metadata */}
                <div className={`flex items-center gap-3 text-xs flex-wrap ${
                  isError
                    ? 'text-red-700 dark:text-red-300'
                    : 'text-gray-700 dark:text-gray-300'
                }`}>
                  {deploy.branch && (
                    <div className="flex items-center gap-1">
                      <GitBranch className="h-3 w-3" />
                      <span className="line-clamp-1">{deploy.branch}</span>
                    </div>
                  )}
                  {deploy.context && (
                    <div className="flex items-center gap-1">
                      <Box className="h-3 w-3" />
                      <span>{deploy.context}</span>
                    </div>
                  )}
                  {deploy.buildTime && (
                    <div className="flex items-center gap-1">
                      <Timer className="h-3 w-3" />
                      <span>{formatBuildTime(deploy.buildTime)}</span>
                    </div>
                  )}
                </div>
                
                {/* Error message */}
                {deploy.errorMessage && (
                  <div className="flex items-start gap-2 text-xs text-red-700 dark:text-red-300 mt-2 pt-2 border-t border-red-200 dark:border-red-800">
                    <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                    <span className="line-clamp-2">{deploy.errorMessage}</span>
                  </div>
                )}
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
      title="Netlify Deployment Settings"
      description="Configure how deployments are displayed and refreshed."
      icon={SiNetlify}
      footer={
        <WidgetModalFooter
          onCancel={handleSettingsCancel}
          onSave={handleSettingsSave}
        />
      }
    >
        <div className="space-y-4">
          {/* Site Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Site Selection
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Choose which sites to fetch deployments from
            </p>
            
            {/* Select All Toggle */}
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={tempSettings.selectAll}
                onChange={handleSelectAllToggle}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900 dark:peer-checked:bg-gray-100 peer-checked:after:bg-white dark:peer-checked:after:bg-gray-900"></div>
              <span className="ml-3 text-sm text-gray-900 dark:text-gray-100">
                All Sites
              </span>
            </label>
            
            {/* Site List */}
            {!tempSettings.selectAll && (
              <div className="mt-3 max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-700 rounded-lg">
                {sites.length === 0 ? (
                  <div className="p-3 text-sm text-gray-600 dark:text-gray-400 text-center">
                    Loading sites...
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {sites.map((site) => (
                      <label
                        key={site.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={tempSettings.selectedSites.includes(site.id)}
                          onChange={() => handleSiteToggle(site.id)}
                          className="h-4 w-4 rounded border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:ring-gray-400 dark:focus:ring-gray-600"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {site.name}
                          </p>
                          {site.url && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                              {site.url}
                            </p>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Max Deploys */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Maximum Deployments
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Number of deployments to fetch and display
            </p>
            <input
              type="number"
              min="5"
              max="50"
              value={tempSettings.maxDeploys}
              onChange={(e) => setTempSettings({ ...tempSettings, maxDeploys: parseInt(e.target.value) || 20 })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          
          {/* Auto Refresh Toggle */}
          <div className="space-y-2">
          <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Auto Refresh
          </label>
          <p className="text-xs text-gray-600 dark:text-gray-400">
            Automatically refresh deployments at regular intervals
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
              How often to automatically refresh deployments
            </p>
            <div className="relative">
              <select
                value={tempSettings.refreshInterval}
                onChange={(e) => setTempSettings({ ...tempSettings, refreshInterval: parseInt(e.target.value) })}
                className="w-full px-3 py-2 pr-8 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600 appearance-none cursor-pointer"
              >
                <option value="1">1 minute</option>
                <option value="2">2 minutes</option>
                <option value="5">5 minutes</option>
                <option value="10">10 minutes</option>
                <option value="15">15 minutes</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500 dark:text-gray-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
        )}
        
        {/* Reset to Defaults */}
        <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-800">
          <button
            onClick={() => {
              setTempSettings({
                selectedSites: [],
                selectAll: true,
                maxDeploys: 20,
                autoRefresh: true,
                refreshInterval: 1,
                showBuildTime: true,
                showBranch: true,
              });
            }}
            className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            Reset to Defaults
          </button>
        </div>
      </div>
    </WidgetModal>
  </>
  );
}
