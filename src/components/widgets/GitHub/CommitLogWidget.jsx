import React, { useState, useEffect, useMemo } from 'react';
import { BaseWidget } from '../../BaseWidget';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { GitCommit, RefreshCw, Loader2, ExternalLink, CheckCircle2, XCircle, Clock, GitBranch } from 'lucide-react';
import { SiGithub } from 'react-icons/si';
import { fetchAllUserCommits, isGitHubConfigured } from '@/services/githubService';
import { formatRelativeDate } from '@/lib/dateUtils';
import { WidgetSearch } from '@/components/WidgetSearch';
import { WidgetEmptyState } from '@/components/WidgetEmptyState';

export function CommitLogWidget({ rowSpan = 3, dragRef }) {
  const [commits, setCommits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadCommits = async () => {
    try {
      setError(null);
      
      if (!isGitHubConfigured()) {
        setError('GitHub token not configured. Add it in Settings → Secrets.');
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const commitData = await fetchAllUserCommits(20);
      setCommits(commitData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCommits();
    const interval = setInterval(loadCommits, 300000); // Refresh every 5 minutes
    
    return () => clearInterval(interval);
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadCommits();
  };



  const getCommitMessage = (message) => {
    // Get first line of commit message
    const firstLine = message.split('\n')[0];
    return firstLine.length > 50 ? firstLine.substring(0, 50) + '...' : firstLine;
  };

  const getStatusIcon = (status) => {
    if (!status) return null;
    
    switch (status) {
      case 'success':
        return <CheckCircle2 className="h-3.5 w-3.5 text-green-500" title="Passed" />;
      case 'failure':
      case 'error':
        return <XCircle className="h-3.5 w-3.5 text-red-500" title="Failed" />;
      case 'pending':
        return <Clock className="h-3.5 w-3.5 text-yellow-500" title="Pending" />;
      default:
        return null;
    }
  };

  // Filter commits based on search query
  const filteredCommits = useMemo(() => {
    if (!searchQuery.trim()) return commits;
    
    const query = searchQuery.toLowerCase();
    return commits.filter(commit => 
      commit.message.toLowerCase().includes(query) ||
      commit.author.username.toLowerCase().includes(query) ||
      commit.repo.name.toLowerCase().includes(query) ||
      commit.sha.toLowerCase().includes(query)
    );
  }, [commits, searchQuery]);

  const badge = filteredCommits.length > 0 ? <Badge variant="secondary">{filteredCommits.length}</Badge> : null;
  const headerActions = (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleRefresh}
      disabled={refreshing}
    >
      <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
    </Button>
  );

  return (
    <BaseWidget
      logo={SiGithub}
      appName="GitHub"
      widgetName="Commits"
      tooltip="Recent commits from your GitHub repository"
      badge={badge}
      headerActions={headerActions}
      rowSpan={rowSpan}
      dragRef={dragRef}
    >
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-full text-center p-2">
          <GitCommit className="h-12 w-12 text-muted-foreground mb-2" />
          {/* <p className="text-sm text-destructive mb-2">Failed to load commits</p> */}
          <p className="text-xs text-muted-foreground mb-2">{error}</p>
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            Try Again
          </Button>
        </div>
      ) : commits.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center p-2">
          <GitCommit className="h-12 w-12 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No commits found</p>
        </div>
      ) : (
        <>
          <WidgetSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search commits..."
          />

          {filteredCommits.length === 0 ? (
            <WidgetEmptyState
              icon={GitCommit}
              message="No commits match your search"
            />
          ) : (
            <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
              {filteredCommits.map((commit) => (
            <div
              key={commit.sha}
              className="p-2 rounded-lg bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/40 dark:to-slate-900/40 border border-gray-200 dark:border-gray-800 hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => window.open(commit.url, '_blank')}
            >
              {/* Repository name */}
              <div className="flex items-center gap-1 mb-1">
                <GitBranch className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                  {commit.repo.name}
                </span>
              </div>
              {/* Author and time */}
              <div className="flex items-start justify-between gap-1 mb-0.5">
                <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm line-clamp-1">
                  {commit.author.username}
                </p>
                <span className="text-xs text-gray-600 dark:text-gray-400 whitespace-nowrap">
                  {formatRelativeDate(commit.date)}
                </span>
              </div>

              {/* Commit message */}
              <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2 mb-1">
                {getCommitMessage(commit.message)}
              </p>

              {/* Commit ID and Status */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <code className="text-xs font-mono text-gray-600 dark:text-gray-400 bg-gray-200 dark:bg-gray-800 px-1 py-0.5 rounded">
                    {commit.sha.substring(0, 7)}
                  </code>
                  {getStatusIcon(commit.status)}
                </div>
                <ExternalLink className="h-4 w-4 text-gray-600 dark:text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </div>
              ))}
            </div>
          )}
        </>
      )}
    </BaseWidget>
  );
}
