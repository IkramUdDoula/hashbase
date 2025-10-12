import React, { useState, useEffect } from 'react';
import { BaseWidgetV2 } from '../../BaseWidgetV2';
import { Badge } from '@/components/ui/badge';
import { 
  GitCommit, 
  AlertCircle,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  GitBranch,
  Settings as SettingsIcon
} from 'lucide-react';
import { SiGithub } from 'react-icons/si';
import { fetchAllUserCommits, isGitHubConfigured } from '@/services/githubService';
import { formatRelativeDate } from '@/lib/dateUtils';
import { WidgetModal, WidgetModalFooter } from '@/components/ui/widget-modal';

/**
 * GitHubCommitsWidget - Improved GitHub commits widget using BaseWidgetV2
 * 
 * Features:
 * - Displays recent commits from all user repositories
 * - Search functionality to filter commits
 * - Settings modal for configuration
 * - Auto-refresh capability
 * - Commit status indicators
 * - Beautiful card-based UI with hover effects
 */
export function GitHubCommitsWidget({ rowSpan = 3, dragRef }) {
  // Widget state management
  const [commits, setCommits] = useState([]);
  const [currentState, setCurrentState] = useState('loading');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [errorActionLoading, setErrorActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Settings state
  const [settings, setSettings] = useState({
    maxCommits: 20,
    autoRefresh: true,
    refreshInterval: 5, // minutes
    showStatus: true,
    showRepoName: true,
  });
  
  // Temporary settings for modal
  const [tempSettings, setTempSettings] = useState(settings);
  
  // Load commits from GitHub
  const loadCommits = async () => {
    try {
      setErrorMessage('');
      
      if (!isGitHubConfigured()) {
        setErrorMessage('GitHub token not configured. Add it in Settings → Secrets.');
        setCurrentState('error');
        setRefreshing(false);
        return;
      }

      const commitData = await fetchAllUserCommits(settings.maxCommits);
      
      if (commitData.length === 0) {
        setCommits([]);
        setCurrentState('empty');
      } else {
        setCommits(commitData);
        setCurrentState('positive');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load commits. Please try again.');
      setCurrentState('error');
    } finally {
      setRefreshing(false);
    }
  };
  
  // Initial load
  useEffect(() => {
    loadCommits();
  }, [settings.maxCommits]);
  
  // Auto-refresh if enabled
  useEffect(() => {
    if (settings.autoRefresh && currentState === 'positive') {
      const interval = setInterval(() => {
        setRefreshing(true);
        loadCommits();
      }, settings.refreshInterval * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [settings.autoRefresh, settings.refreshInterval, currentState]);
  
  // Handlers
  const handleRefresh = () => {
    setRefreshing(true);
    setCurrentState('loading');
    loadCommits();
  };
  
  const handleSettingsOpen = () => {
    setTempSettings(settings);
    setSettingsOpen(true);
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
    loadCommits();
  };
  
  const handleCommitClick = (commit) => {
    window.open(commit.url, '_blank');
  };
  
  // Get commit message (first line only)
  const getCommitMessage = (message) => {
    const firstLine = message.split('\n')[0];
    return firstLine.length > 60 ? firstLine.substring(0, 60) + '...' : firstLine;
  };
  
  // Get status icon
  const getStatusIcon = (status) => {
    if (!status || !settings.showStatus) return null;
    
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-3.5 w-3.5 text-green-500 dark:text-green-400" title="Passed" />;
      case 'failure':
      case 'error':
        return <XCircle className="h-3.5 w-3.5 text-red-500 dark:text-red-400" title="Failed" />;
      case 'pending':
        return <Clock className="h-3.5 w-3.5 text-yellow-500 dark:text-yellow-400" title="Pending" />;
      default:
        return null;
    }
  };
  
  // Filter commits based on search
  const filteredCommits = commits.filter(commit => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      commit.message.toLowerCase().includes(query) ||
      commit.author.username.toLowerCase().includes(query) ||
      commit.repo.name.toLowerCase().includes(query) ||
      commit.sha.toLowerCase().includes(query)
    );
  });
  
  // Badge showing commit count
  const badge = filteredCommits.length > 0 ? (
    <Badge variant="secondary">{filteredCommits.length}</Badge>
  ) : null;
  
  return (
    <>
      <BaseWidgetV2
        // Header Zone
        logo={SiGithub}
        appName="GitHub"
        widgetName="Commits"
        tooltip="Recent commits from your GitHub repositories"
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
        loadingMessage="Loading commits from GitHub..."
        
        // Error State
        errorIcon={AlertCircle}
        errorMessage={errorMessage}
        errorActionLabel="Try Again"
        onErrorAction={handleErrorAction}
        errorActionLoading={errorActionLoading}
        
        // Empty State
        emptyIcon={GitCommit}
        emptyMessage="No commits found"
        emptySubmessage="Push some commits to your repositories to see them here."
        
        // Positive State (Content)
        searchEnabled={true}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search commits, repos, authors..."
        
        // Layout
        rowSpan={rowSpan}
        dragRef={dragRef}
      >
        {/* Content Cards */}
        {filteredCommits.length === 0 && searchQuery ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <GitCommit className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No commits match your search</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCommits.map((commit) => (
              <div
                key={commit.sha}
                className="p-3 rounded-lg bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/40 dark:to-slate-900/40 border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer group"
                onClick={() => handleCommitClick(commit)}
              >
                {/* Repository name */}
                {settings.showRepoName && (
                  <div className="flex items-center gap-1.5 mb-2">
                    <GitBranch className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                    <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                      {commit.repo.name}
                    </span>
                  </div>
                )}
                
                {/* Author and time */}
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                    {commit.author.username}
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap flex-shrink-0">
                    {formatRelativeDate(commit.date)}
                  </span>
                </div>

                {/* Commit message */}
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mb-2">
                  {getCommitMessage(commit.message)}
                </p>

                {/* Commit SHA and Status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <code className="text-xs font-mono text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded">
                      {commit.sha.substring(0, 7)}
                    </code>
                    {getStatusIcon(commit.status)}
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              </div>
            ))}
          </div>
        )}
      </BaseWidgetV2>
      
      {/* Settings Modal */}
      <WidgetModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        title="GitHub Commits Settings"
        description="Configure how commits are displayed and refreshed."
        icon={SiGithub}
        footer={
          <WidgetModalFooter
            onCancel={handleSettingsCancel}
            onSave={handleSettingsSave}
          />
        }
      >
        <div className="space-y-4">
          {/* Max Commits */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Maximum Commits
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Number of commits to fetch and display
            </p>
            <input
              type="number"
              min="5"
              max="50"
              value={tempSettings.maxCommits}
              onChange={(e) => setTempSettings({ ...tempSettings, maxCommits: parseInt(e.target.value) || 20 })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          
          {/* Auto Refresh Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Auto Refresh
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Automatically refresh commits at regular intervals
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
                How often to automatically refresh commits
              </p>
              <div className="relative">
                <select
                  value={tempSettings.refreshInterval}
                  onChange={(e) => setTempSettings({ ...tempSettings, refreshInterval: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 pr-8 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600 appearance-none cursor-pointer"
                >
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
          
          {/* Show Status Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Show Commit Status
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Display CI/CD status indicators for commits
            </p>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={tempSettings.showStatus}
                onChange={(e) => setTempSettings({ ...tempSettings, showStatus: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900 dark:peer-checked:bg-gray-100 peer-checked:after:bg-white dark:peer-checked:after:bg-gray-900"></div>
              <span className="ml-3 text-sm text-gray-900 dark:text-gray-100">
                {tempSettings.showStatus ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>
          
          {/* Show Repository Name Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Show Repository Name
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Display the repository name for each commit
            </p>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={tempSettings.showRepoName}
                onChange={(e) => setTempSettings({ ...tempSettings, showRepoName: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900 dark:peer-checked:bg-gray-100 peer-checked:after:bg-white dark:peer-checked:after:bg-gray-900"></div>
              <span className="ml-3 text-sm text-gray-900 dark:text-gray-100">
                {tempSettings.showRepoName ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>
          
          {/* Reset to Defaults */}
          <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={() => {
                setTempSettings({
                  maxCommits: 20,
                  autoRefresh: true,
                  refreshInterval: 5,
                  showStatus: true,
                  showRepoName: true,
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
