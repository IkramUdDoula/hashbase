import React, { useState, useEffect } from 'react';
import { BaseWidgetV2 } from '../../BaseWidgetV2';
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
import { 
  fetchAllUserCommits, 
  fetchUserRepositories,
  isGitHubConfigured,
  getCommitRepoSelectionPreferences,
  saveCommitRepoSelectionPreferences
} from '@/services/githubService';
import { formatRelativeDate } from '@/lib/dateUtils';
import { WidgetModal, WidgetModalFooter } from '@/components/ui/widget-modal';
import { GitHubCommitsExplorer } from './GitHubCommitsExplorer';

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
  const [repositories, setRepositories] = useState([]);
  const [currentState, setCurrentState] = useState('loading');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [errorActionLoading, setErrorActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [selectedCommitSha, setSelectedCommitSha] = useState(null);
  
  // Settings state
  const [settings, setSettings] = useState({
    selectedRepos: [],
    selectAll: true,
    maxCommits: 20,
    autoRefresh: true,
    refreshInterval: 5, // minutes
    showStatus: true,
    showRepoName: true,
    showBranch: true,
  });
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  
  // Temporary settings for modal
  const [tempSettings, setTempSettings] = useState(settings);
  
  // Load repositories on mount
  useEffect(() => {
    loadRepositories();
    
    // Load saved preferences
    const prefs = getCommitRepoSelectionPreferences();
    setSettings(prev => ({
      ...prev,
      selectedRepos: prefs.selectedRepos,
      selectAll: prefs.selectAll
    }));
    setPreferencesLoaded(true);
  }, []);
  
  // Load repositories
  const loadRepositories = async () => {
    try {
      if (!isGitHubConfigured()) return;
      
      const repos = await fetchUserRepositories();
      setRepositories(repos);
    } catch (err) {
      console.warn('Failed to load repositories:', err);
    }
  };
  
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

      const reposToFetch = settings.selectAll ? [] : settings.selectedRepos;
      const commitData = await fetchAllUserCommits(reposToFetch, settings.maxCommits);
      
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
  
  // Initial load - only after preferences are loaded
  useEffect(() => {
    if (preferencesLoaded) {
      loadCommits();
    }
  }, [preferencesLoaded, settings.selectedRepos, settings.selectAll, settings.maxCommits]);
  
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
    saveCommitRepoSelectionPreferences(tempSettings.selectedRepos, tempSettings.selectAll);
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
    setSelectedCommitSha(commit.sha);
    setExplorerOpen(true);
  };
  
  const handleExplorerCommitChange = (newCommitSha) => {
    setSelectedCommitSha(newCommitSha);
  };
  
  const handleExplorerClose = () => {
    setExplorerOpen(false);
    setSelectedCommitSha(null);
  };
  
  const handleRepoToggle = (repoFullName) => {
    setTempSettings(prev => {
      const isSelected = prev.selectedRepos.includes(repoFullName);
      const newSelectedRepos = isSelected
        ? prev.selectedRepos.filter(r => r !== repoFullName)
        : [...prev.selectedRepos, repoFullName];
      
      return {
        ...prev,
        selectedRepos: newSelectedRepos,
        selectAll: false
      };
    });
  };
  
  const handleSelectAllToggle = () => {
    setTempSettings(prev => ({
      ...prev,
      selectAll: !prev.selectAll,
      selectedRepos: []
    }));
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
      commit.sha.toLowerCase().includes(query) ||
      (commit.branch && commit.branch.toLowerCase().includes(query))
    );
  });
  
  return (
    <>
      <BaseWidgetV2
        // Header Zone
        logo={SiGithub}
        appName="GitHub"
        widgetName="Commits"
        tooltip="Recent commits from your GitHub repositories"
        
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
        searchPlaceholder="Search commits, repos, branches, authors..."
        
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
                {/* Repository name and Branch */}
                {settings.showRepoName && (
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <GitBranch className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                      <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                        {commit.repo.name}
                      </span>
                    </div>
                    {settings.showBranch && commit.branch && (
                      <div className="flex items-center gap-1.5">
                        <GitBranch className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                        <code className="text-xs font-mono font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                          {commit.branch}
                        </code>
                      </div>
                    )}
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
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-800 px-2 py-0.5 rounded">
                    {commit.sha.substring(0, 7)}
                  </code>
                  {getStatusIcon(commit.status)}
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
          {/* Repository Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Repository Selection
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Choose which repositories to fetch commits from
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
                All Repositories
              </span>
            </label>
            
            {/* Repository List */}
            {!tempSettings.selectAll && (
              <div className="mt-3 max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-700 rounded-lg custom-scrollbar">
                {repositories.length === 0 ? (
                  <div className="p-3 text-sm text-gray-600 dark:text-gray-400 text-center">
                    Loading repositories...
                  </div>
                ) : (
                  <div className="divide-y divide-gray-200 dark:divide-gray-700">
                    {repositories.map((repo) => (
                      <label
                        key={repo.id}
                        className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={tempSettings.selectedRepos.includes(repo.fullName)}
                          onChange={() => handleRepoToggle(repo.fullName)}
                          className="h-4 w-4 rounded border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100 focus:ring-gray-400 dark:focus:ring-gray-600"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                            {repo.fullName}
                          </p>
                          {repo.description && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                              {repo.description}
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
          
          {/* Show Branch Name Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Show Branch Name
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Display the branch name for each commit
            </p>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={tempSettings.showBranch}
                onChange={(e) => setTempSettings({ ...tempSettings, showBranch: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900 dark:peer-checked:bg-gray-100 peer-checked:after:bg-white dark:peer-checked:after:bg-gray-900"></div>
              <span className="ml-3 text-sm text-gray-900 dark:text-gray-100">
                {tempSettings.showBranch ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>
          
          {/* Reset to Defaults */}
          <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={() => {
                setTempSettings({
                  selectedRepos: [],
                  selectAll: true,
                  maxCommits: 20,
                  autoRefresh: true,
                  refreshInterval: 5,
                  showStatus: true,
                  showRepoName: true,
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
      
      {/* GitHub Commits Explorer */}
      <GitHubCommitsExplorer
        open={explorerOpen}
        onOpenChange={handleExplorerClose}
        commitSha={selectedCommitSha}
        commitList={filteredCommits}
        onCommitChange={handleExplorerCommitChange}
      />
    </>
  );
}
