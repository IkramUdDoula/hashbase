import React, { useState, useEffect } from 'react';
import { BaseWidgetV2 } from '../../BaseWidgetV2';
import { 
  AlertCircle,
  ExternalLink,
  MessageSquare,
  Plus,
  Settings as SettingsIcon,
  CheckCircle2,
  Circle,
  Tag,
  GitBranch
} from 'lucide-react';
import { SiGithub } from 'react-icons/si';
import { 
  fetchIssues, 
  fetchUserRepositories,
  createIssue,
  isGitHubConfigured,
  getRepoSelectionPreferences,
  saveRepoSelectionPreferences
} from '@/services/githubIssuesService';
import { formatRelativeDate } from '@/lib/dateUtils';
import { WidgetModal, WidgetModalFooter } from '@/components/ui/widget-modal';
import { Button } from '@/components/ui/button';

/**
 * GitHubIssuesWidget - GitHub issues widget using BaseWidgetV2
 * 
 * Features:
 * - Displays issues from selected or all user repositories
 * - Create new issues directly from the widget
 * - Filter by repository
 * - Search functionality
 * - Auto-refresh capability
 * - Click to open issue in GitHub
 * - Realtime updates
 */
export function GitHubIssuesWidget({ rowSpan = 3, dragRef }) {
  // Widget state management
  const [issues, setIssues] = useState([]);
  const [repositories, setRepositories] = useState([]);
  const [currentState, setCurrentState] = useState('loading');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createIssueOpen, setCreateIssueOpen] = useState(false);
  const [errorActionLoading, setErrorActionLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Settings state
  const [settings, setSettings] = useState({
    selectedRepos: [],
    selectAll: true,
    issueState: 'open', // 'open', 'closed', 'all'
    maxIssues: 50,
    autoRefresh: true,
    refreshInterval: 5, // minutes
  });
  
  // Temporary settings for modal
  const [tempSettings, setTempSettings] = useState(settings);
  
  // Create issue form state
  const [newIssue, setNewIssue] = useState({
    repo: '',
    title: '',
    body: '',
  });
  const [creatingIssue, setCreatingIssue] = useState(false);
  
  // Load repositories on mount
  useEffect(() => {
    loadRepositories();
    
    // Load saved preferences
    const prefs = getRepoSelectionPreferences();
    setSettings(prev => ({
      ...prev,
      selectedRepos: prefs.selectedRepos,
      selectAll: prefs.selectAll
    }));
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
  
  // Load issues from GitHub
  const loadIssues = async () => {
    try {
      setErrorMessage('');
      
      if (!isGitHubConfigured()) {
        setErrorMessage('GitHub token not configured. Add it in Settings → Secrets.');
        setCurrentState('error');
        setRefreshing(false);
        return;
      }

      const reposToFetch = settings.selectAll ? [] : settings.selectedRepos;
      const issueData = await fetchIssues(reposToFetch, settings.issueState, settings.maxIssues);
      
      if (issueData.length === 0) {
        setIssues([]);
        setCurrentState('empty');
      } else {
        setIssues(issueData);
        setCurrentState('positive');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load issues. Please try again.');
      setCurrentState('error');
    } finally {
      setRefreshing(false);
    }
  };
  
  // Initial load
  useEffect(() => {
    loadIssues();
  }, [settings.selectedRepos, settings.selectAll, settings.issueState, settings.maxIssues]);
  
  // Auto-refresh if enabled
  useEffect(() => {
    if (settings.autoRefresh && currentState === 'positive') {
      const interval = setInterval(() => {
        setRefreshing(true);
        loadIssues();
      }, settings.refreshInterval * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [settings.autoRefresh, settings.refreshInterval, currentState]);
  
  // Handlers
  const handleRefresh = () => {
    setRefreshing(true);
    setCurrentState('loading');
    loadIssues();
  };
  
  const handleSettingsOpen = () => {
    setTempSettings(settings);
    setSettingsOpen(true);
  };
  
  const handleSettingsSave = () => {
    setSettings(tempSettings);
    saveRepoSelectionPreferences(tempSettings.selectedRepos, tempSettings.selectAll);
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
    loadIssues();
  };
  
  const handleIssueClick = (issue) => {
    window.open(issue.url, '_blank');
  };
  
  const handleCreateIssueOpen = () => {
    setNewIssue({
      repo: repositories.length > 0 ? repositories[0].fullName : '',
      title: '',
      body: '',
    });
    setCreateIssueOpen(true);
  };
  
  const handleCreateIssue = async () => {
    if (!newIssue.repo || !newIssue.title.trim()) {
      return;
    }
    
    setCreatingIssue(true);
    try {
      const createdIssue = await createIssue(
        newIssue.repo,
        newIssue.title,
        newIssue.body
      );
      
      // Add the new issue to the list
      setIssues(prev => [createdIssue, ...prev]);
      
      // Close modal and reset form
      setCreateIssueOpen(false);
      setNewIssue({ repo: '', title: '', body: '' });
      
      // Open the created issue in a new tab
      window.open(createdIssue.url, '_blank');
    } catch (err) {
      alert(err.message || 'Failed to create issue');
    } finally {
      setCreatingIssue(false);
    }
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
  
  // Get issue title (truncate if too long)
  const getIssueTitle = (title) => {
    return title.length > 80 ? title.substring(0, 80) + '...' : title;
  };
  
  // Filter issues based on search
  const filteredIssues = issues.filter(issue => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      issue.title.toLowerCase().includes(query) ||
      issue.repo.fullName.toLowerCase().includes(query) ||
      issue.user.login.toLowerCase().includes(query) ||
      issue.number.toString().includes(query)
    );
  });
  
  return (
    <>
      <BaseWidgetV2
        // Header Zone
        logo={SiGithub}
        appName="GitHub"
        widgetName="Issues"
        tooltip="Issues from your GitHub repositories"
        
        // Action Buttons
        showSettings={true}
        onSettingsClick={handleSettingsOpen}
        showRefresh={true}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        customActions={
          <Button
            variant="ghost"
            size="icon"
            onClick={handleCreateIssueOpen}
            title="Create Issue"
            className="hover:bg-white/20"
          >
            <Plus className="h-4 w-4" />
          </Button>
        }
        
        // Content State
        state={currentState}
        
        // Loading State
        loadingMessage="Loading issues from GitHub..."
        
        // Error State
        errorIcon={AlertCircle}
        errorMessage={errorMessage}
        errorActionLabel="Try Again"
        onErrorAction={handleErrorAction}
        errorActionLoading={errorActionLoading}
        
        // Empty State
        emptyIcon={Circle}
        emptyMessage="No issues found"
        emptySubmessage={settings.issueState === 'open' ? "No open issues in selected repositories." : "No issues match your criteria."}
        
        // Positive State (Content)
        searchEnabled={true}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search issues, repos, authors..."
        
        // Layout
        rowSpan={rowSpan}
        dragRef={dragRef}
      >
        {/* Content Cards */}
        {filteredIssues.length === 0 && searchQuery ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <Circle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No issues match your search</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredIssues.map((issue) => (
              <div
                key={issue.id}
                className="p-3 rounded-lg bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/40 dark:to-slate-900/40 border border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600 transition-all cursor-pointer group"
                onClick={() => handleIssueClick(issue)}
              >
                {/* Repository name */}
                <div className="flex items-center gap-1.5 mb-2">
                  <GitBranch className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" />
                  <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">
                    {issue.repo.fullName}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    #{issue.number}
                  </span>
                </div>
                
                {/* Issue title and state */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    {issue.state === 'open' ? (
                      <Circle className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
                    )}
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 line-clamp-2">
                      {getIssueTitle(issue.title)}
                    </p>
                  </div>
                  <ExternalLink className="h-4 w-4 text-gray-500 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </div>

                {/* Labels */}
                {issue.labels.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {issue.labels.slice(0, 3).map((label, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          backgroundColor: `#${label.color}20`,
                          color: `#${label.color}`,
                          borderColor: `#${label.color}40`,
                          borderWidth: '1px'
                        }}
                      >
                        <Tag className="h-2.5 w-2.5" />
                        {label.name}
                      </span>
                    ))}
                    {issue.labels.length > 3 && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        +{issue.labels.length - 3} more
                      </span>
                    )}
                  </div>
                )}

                {/* Author, comments, and time */}
                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-3">
                    <span className="font-medium">{issue.user.login}</span>
                    {issue.comments > 0 && (
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        <span>{issue.comments}</span>
                      </div>
                    )}
                  </div>
                  <span className="whitespace-nowrap">
                    {formatRelativeDate(issue.updatedAt)}
                  </span>
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
        title="GitHub Issues Settings"
        description="Configure which repositories and issue states to display."
        icon={SiGithub}
        footer={
          <WidgetModalFooter
            onCancel={handleSettingsCancel}
            onSave={handleSettingsSave}
          />
        }
      >
        <div className="space-y-4">
          {/* Issue State Filter */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Issue State
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Filter issues by their state
            </p>
            <div className="relative">
              <select
                value={tempSettings.issueState}
                onChange={(e) => setTempSettings({ ...tempSettings, issueState: e.target.value })}
                className="w-full px-3 py-2 pr-8 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600 appearance-none cursor-pointer"
              >
                <option value="open">Open Issues</option>
                <option value="closed">Closed Issues</option>
                <option value="all">All Issues</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500 dark:text-gray-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Repository Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Repository Selection
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Choose which repositories to fetch issues from
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
              <div className="mt-3 max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-700 rounded-lg">
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
                        {repo.openIssuesCount > 0 && (
                          <span className="text-xs text-gray-600 dark:text-gray-400">
                            {repo.openIssuesCount}
                          </span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Max Issues */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Maximum Issues
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Number of issues to fetch and display
            </p>
            <input
              type="number"
              min="10"
              max="100"
              value={tempSettings.maxIssues}
              onChange={(e) => setTempSettings({ ...tempSettings, maxIssues: parseInt(e.target.value) || 50 })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          
          {/* Auto Refresh Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Auto Refresh
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Automatically refresh issues at regular intervals
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
                How often to automatically refresh issues
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
          
          {/* Reset to Defaults */}
          <div className="space-y-2 pt-2 border-t border-gray-200 dark:border-gray-800">
            <button
              onClick={() => {
                setTempSettings({
                  selectedRepos: [],
                  selectAll: true,
                  issueState: 'open',
                  maxIssues: 50,
                  autoRefresh: true,
                  refreshInterval: 5,
                });
              }}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Reset to Defaults
            </button>
          </div>
        </div>
      </WidgetModal>
      
      {/* Create Issue Modal */}
      <WidgetModal
        open={createIssueOpen}
        onOpenChange={setCreateIssueOpen}
        title="Create New Issue"
        description="Create a new issue in your GitHub repository."
        icon={SiGithub}
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setCreateIssueOpen(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleCreateIssue}
              disabled={creatingIssue || !newIssue.title.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-gray-900 dark:bg-gray-100 dark:text-gray-900 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
            >
              {creatingIssue ? (
                <>
                  <div className="h-4 w-4 border-2 border-white dark:border-gray-900 border-t-transparent rounded-full animate-spin"></div>
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Create Issue
                </>
              )}
            </button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Repository Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Repository *
            </label>
            <div className="relative">
              <select
                value={newIssue.repo}
                onChange={(e) => setNewIssue({ ...newIssue, repo: e.target.value })}
                className="w-full px-3 py-2 pr-8 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600 appearance-none cursor-pointer"
              >
                {repositories.map((repo) => (
                  <option key={repo.id} value={repo.fullName}>
                    {repo.fullName}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500 dark:text-gray-400">
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          </div>
          
          {/* Issue Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Title *
            </label>
            <input
              type="text"
              value={newIssue.title}
              onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })}
              placeholder="Brief description of the issue"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600"
            />
          </div>
          
          {/* Issue Body */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Description
            </label>
            <textarea
              value={newIssue.body}
              onChange={(e) => setNewIssue({ ...newIssue, body: e.target.value })}
              placeholder="Detailed description of the issue (optional)"
              rows={6}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600 resize-none"
            />
          </div>
        </div>
      </WidgetModal>
    </>
  );
}
