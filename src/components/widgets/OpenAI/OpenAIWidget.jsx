import React, { useState, useEffect } from 'react';
import { BaseWidgetV2 } from '../../BaseWidgetV2';
import { 
  Brain,
  AlertCircle,
  TrendingUp,
  DollarSign,
  Zap,
  Calendar,
  Activity
} from 'lucide-react';
import { SiOpenai } from 'react-icons/si';
import { 
  fetchAllOpenAIData,
  isOpenAIAdminConfigured,
  getOpenAISettings,
  saveOpenAISettings,
  formatCurrency,
  formatNumber
} from '@/services/openaiService';
import { WidgetModal, WidgetModalFooter } from '@/components/ui/widget-modal';
import { OpenAIExplorer } from './OpenAIExplorer';

/**
 * OpenAIWidget - Display OpenAI usage statistics and billing information
 * 
 * Features:
 * - Token usage statistics (last 30 days)
 * - Cost breakdown by model
 * - Available credits/balance
 * - Daily usage trends
 * - Auto-refresh capability
 */
export function OpenAIWidget({ rowSpan = 2, dragRef }) {
  // Widget state management
  const [data, setData] = useState(null);
  const [currentState, setCurrentState] = useState('loading');
  const [refreshing, setRefreshing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [errorActionLoading, setErrorActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState({
    autoRefresh: true,
    refreshInterval: 30,
    dataTimeline: 30, // days
  });
  
  // Temporary settings for modal
  const [tempSettings, setTempSettings] = useState(settings);
  
  // Load settings and cached data on mount
  useEffect(() => {
    const savedSettings = getOpenAISettings();
    setSettings(savedSettings);
    setTempSettings(savedSettings);
    
    // Load cached data
    const cachedData = localStorage.getItem('openai_widget_data');
    if (cachedData) {
      try {
        const parsed = JSON.parse(cachedData);
        setData(parsed);
        setCurrentState('positive');
      } catch (e) {
        console.error('Failed to load cached OpenAI data:', e);
      }
    }
    
    setIsInitialized(true);
  }, []);
  
  // Save data to localStorage
  useEffect(() => {
    if (!isInitialized || !data) return;
    
    try {
      localStorage.setItem('openai_widget_data', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save OpenAI data:', error);
    }
  }, [data, isInitialized]);
  
  // Load data from OpenAI
  const loadData = async () => {
    try {
      setErrorMessage('');
      
      if (!isOpenAIAdminConfigured()) {
        setErrorMessage('OpenAI Admin API key not configured. Add OPENAI_ADMIN_KEY in Settings → Secrets.');
        setCurrentState('error');
        setRefreshing(false);
        return;
      }

      const openaiData = await fetchAllOpenAIData(settings.dataTimeline || 30);
      
      setData(openaiData);
      
      // Check if there's any actual usage data
      const hasUsage = openaiData.usage && openaiData.usage.totalTokens > 0;
      if (!hasUsage) {
        setCurrentState('empty');
      } else {
        setCurrentState('positive');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load OpenAI data. Please try again.');
      setCurrentState('error');
    } finally {
      setRefreshing(false);
    }
  };
  
  // Initial load
  useEffect(() => {
    if (isInitialized) {
      loadData();
    }
  }, [isInitialized]);
  
  // Auto-refresh if enabled
  useEffect(() => {
    if (settings.autoRefresh && currentState === 'positive') {
      const interval = setInterval(() => {
        setRefreshing(true);
        loadData();
      }, settings.refreshInterval * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [settings.autoRefresh, settings.refreshInterval, currentState]);
  
  // Handlers
  const handleRefresh = () => {
    setRefreshing(true);
    setCurrentState('loading');
    loadData();
  };
  
  const handleSettingsOpen = () => {
    setTempSettings(settings);
    setSettingsOpen(true);
  };
  
  const handleSettingsSave = () => {
    setSettings(tempSettings);
    saveOpenAISettings(tempSettings);
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
    loadData();
  };
  
  const handleOpenExplorer = () => {
    setExplorerOpen(true);
  };
  
  const handleExplorerClose = () => {
    setExplorerOpen(false);
  };
  
  // Calculate summary stats
  const getSummaryStats = () => {
    if (!data || !data.usage) {
      return {
        totalTokens: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalCost: 0,
        requestCount: 0
      };
    }
    
    const totalTokens = data.usage.totalTokens || 0;
    const inputTokens = data.usage.summary?.promptTokens || 0;
    const outputTokens = data.usage.summary?.completionTokens || 0;
    const totalCost = data.costs?.totalCost || 0;
    const requestCount = data.usage.summary?.requests || 0;
    
    return {
      totalTokens,
      inputTokens,
      outputTokens,
      totalCost,
      requestCount
    };
  };
  
  const stats = getSummaryStats();
  
  return (
    <>
      <BaseWidgetV2
        // Header Zone
        logo={SiOpenai}
        appName="OpenAI"
        widgetName="Usage Stats"
        tooltip="View your OpenAI API usage, costs, and available balance"
        
        // Action Buttons
        showSettings={true}
        onSettingsClick={handleSettingsOpen}
        showRefresh={true}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        
        // Content State
        state={currentState}
        
        // Loading State
        loadingMessage="Loading OpenAI usage data..."
        
        // Error State
        errorIcon={AlertCircle}
        errorMessage={errorMessage}
        errorActionLabel="Try Again"
        onErrorAction={handleErrorAction}
        errorActionLoading={errorActionLoading}
        
        // Empty State
        emptyIcon={Brain}
        emptyMessage="No API usage in last 30 days"
        emptySubmessage="Make some OpenAI API calls to see usage statistics here. The widget tracks completions, tokens, and costs."
        
        // Positive State (Content)
        searchEnabled={false}
        
        // Layout
        rowSpan={rowSpan}
        dragRef={dragRef}
      >
        {/* Content Cards */}
        <div className="space-y-2">
          {/* Total Tokens with Breakdown */}
          <div 
            className="p-3 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 cursor-pointer hover:shadow-md transition-all"
            onClick={handleOpenExplorer}
          >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">Token Usage</span>
                </div>
                <span className="text-xs text-blue-600 dark:text-blue-400">Last 30 days</span>
              </div>
              <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                {formatNumber(stats.totalTokens)}
              </p>
              <div className="flex items-center justify-between text-xs">
                <span className="text-blue-600 dark:text-blue-400">In/Out</span>
                <span className="font-mono font-medium text-blue-700 dark:text-blue-300">{formatNumber(stats.inputTokens)} / {formatNumber(stats.outputTokens)}</span>
              </div>
          </div>
          
          {/* Total Cost */}
          <div 
            className="p-3 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 cursor-pointer hover:shadow-md transition-all"
            onClick={handleOpenExplorer}
          >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <span className="text-xs font-semibold text-green-700 dark:text-green-300">Total Cost</span>
                </div>
                <span className="text-xs text-green-600 dark:text-green-400">Last 30 days</span>
              </div>
              <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                {formatCurrency(stats.totalCost)}
              </p>
          </div>
          
          {/* Request Count */}
          {/* <div 
            className="p-3 rounded-lg bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border border-orange-200 dark:border-orange-800 cursor-pointer hover:shadow-md transition-all"
            onClick={handleOpenExplorer}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                  <span className="text-xs font-semibold text-orange-700 dark:text-orange-300">API Requests</span>
                </div>
                <span className="text-xs text-orange-600 dark:text-orange-400">Last 30 days</span>
              </div>
              <p className="text-2xl font-bold text-orange-900 dark:text-orange-100">
                {formatNumber(stats.requestCount)}
              </p>
          </div> */}
          
          {/* Recent Usage Trend
          {data && data.usage && data.usage.dailyUsage && data.usage.dailyUsage.length > 0 && (
            <div className="p-3 rounded-lg bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/40 dark:to-slate-900/40 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">Recent Activity</span>
              </div>
              <div className="space-y-2">
                {data.usage.dailyUsage.slice(0, 5).map((day, index) => {
                  const dayCost = data.costs?.dailyCosts?.find(c => c.date === day.date)?.cost || 0;
                  return (
                    <div key={index} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                          {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                          {formatCurrency(dayCost)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs pl-2">
                        <span className="text-gray-500 dark:text-gray-500">Total</span>
                        <span className="text-gray-700 dark:text-gray-300 font-mono">
                          {formatNumber(day.totalTokens)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs pl-2">
                        <span className="text-gray-500 dark:text-gray-500">In/Out</span>
                        <span className="text-gray-600 dark:text-gray-400 font-mono">
                          {formatNumber(day.promptTokens)} / {formatNumber(day.completionTokens)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )} */}
          
          {/* Click to view details */}
          {/* <div className="text-center">
            <button
              onClick={handleOpenExplorer}
              className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors"
            >
              Click any card to view detailed breakdown →
            </button>
          </div> */}
        </div>
      </BaseWidgetV2>
      
      {/* Settings Modal */}
      <WidgetModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        title="OpenAI Widget Settings"
        description="Configure how OpenAI usage data is displayed and refreshed."
        icon={SiOpenai}
        footer={
          <WidgetModalFooter
            onCancel={handleSettingsCancel}
            onSave={handleSettingsSave}
          />
        }
      >
        <div className="space-y-4">
          {/* Auto Refresh Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Auto Refresh
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Automatically refresh usage data at regular intervals
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
                Refresh Interval
              </label>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                How often to automatically refresh usage data
              </p>
              <div className="relative">
                <select
                  value={tempSettings.refreshInterval}
                  onChange={(e) => setTempSettings({ ...tempSettings, refreshInterval: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 pr-8 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600 appearance-none cursor-pointer"
                >
                  <option value="5">5 minutes</option>
                  <option value="10">10 minutes</option>
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500 dark:text-gray-400">
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
          )}
          
          {/* Data Timeline */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Data Timeline
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              How far back to fetch usage data (max 31 days for daily view)
            </p>
            <div className="relative">
              <select
                value={tempSettings.dataTimeline}
                onChange={(e) => setTempSettings({ ...tempSettings, dataTimeline: parseInt(e.target.value) })}
                className="w-full px-3 py-2 pr-8 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600 appearance-none cursor-pointer"
              >
                <option value="1">Last 24 hours</option>
                <option value="7">Last 7 days</option>
                <option value="14">Last 14 days</option>
                <option value="30">Last 30 days</option>
                <option value="31">Last 31 days</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500 dark:text-gray-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Reset to Defaults */}
          <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={() => {
                setTempSettings({
                  autoRefresh: true,
                  refreshInterval: 30,
                  dataTimeline: 30,
                });
              }}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      </WidgetModal>
      
      {/* OpenAI Explorer */}
      <OpenAIExplorer
        open={explorerOpen}
        onOpenChange={handleExplorerClose}
        data={data}
        settings={settings}
        onRefresh={handleRefresh}
      />
    </>
  );
}
