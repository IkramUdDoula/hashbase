import React, { useState, useEffect } from 'react';
import { 
  Explorer, 
  ExplorerHeader, 
  ExplorerBody, 
  ExplorerSection,
  ExplorerField 
} from '@/components/ui/explorer';
import { Badge } from '@/components/ui/badge';
import { 
  GitCommit,
  ExternalLink,
  User,
  Calendar,
  GitBranch,
  CheckCircle2,
  XCircle,
  Clock,
  Hash,
  FileText,
  File,
  Plus,
  Minus,
  BarChart3,
  Loader2
} from 'lucide-react';
import { formatRelativeDate } from '@/lib/dateUtils';
import { fetchCommitDetails } from '@/services/githubService';

/**
 * GitHubCommitsExplorer - Detailed commit viewer
 * 
 * Displays full commit information with:
 * - Repository name
 * - Author information
 * - Commit message (full)
 * - Commit SHA
 * - Date
 * - Status (CI/CD)
 * - Action: Open in GitHub
 * 
 * @param {Object} props
 * @param {boolean} props.open - Controls visibility
 * @param {function} props.onOpenChange - Callback when open state changes
 * @param {string} props.commitSha - Current commit SHA to display
 * @param {Array} props.commitList - List of all commits for navigation
 * @param {function} props.onCommitChange - Callback when navigating to different commit
 */
export function GitHubCommitsExplorer({ 
  open, 
  onOpenChange, 
  commitSha,
  commitList = [],
  onCommitChange
}) {
  // Find current commit from the list
  const currentIndex = commitList.findIndex(c => c.sha === commitSha);
  const commit = commitList[currentIndex] || null;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < commitList.length - 1;
  
  // State for detailed commit info
  const [commitDetails, setCommitDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  
  // Fetch commit details when commit changes
  useEffect(() => {
    if (!commit) {
      setCommitDetails(null);
      return;
    }
    
    const loadCommitDetails = async () => {
      setLoadingDetails(true);
      setDetailsError(null);
      
      try {
        const details = await fetchCommitDetails(
          commit.repo.owner,
          commit.repo.name,
          commit.sha
        );
        setCommitDetails(details);
      } catch (err) {
        console.error('Failed to load commit details:', err);
        setDetailsError(err.message);
      } finally {
        setLoadingDetails(false);
      }
    };
    
    loadCommitDetails();
  }, [commit?.sha]);

  const handlePrevious = () => {
    if (hasPrevious) {
      const prevCommit = commitList[currentIndex - 1];
      onCommitChange(prevCommit.sha);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      const nextCommit = commitList[currentIndex + 1];
      onCommitChange(nextCommit.sha);
    }
  };

  const handleOpenInGitHub = () => {
    if (commit?.url) {
      window.open(commit.url, '_blank');
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    if (!status) return null;
    
    switch (status) {
      case 'success':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Passed
          </Badge>
        );
      case 'failure':
      case 'error':
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case 'pending':
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return null;
    }
  };

  // Parse commit message into title and body
  const parseCommitMessage = (message) => {
    if (!message) return { title: '', body: '' };
    const lines = message.split('\n');
    const title = lines[0];
    const body = lines.slice(1).join('\n').trim();
    return { title, body };
  };

  const { title: commitTitle, body: commitBody } = commit ? parseCommitMessage(commit.message) : { title: '', body: '' };
  
  // Get file status icon and color
  const getFileStatusBadge = (status) => {
    switch (status) {
      case 'added':
        return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 text-xs">Added</Badge>;
      case 'removed':
        return <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 text-xs">Removed</Badge>;
      case 'modified':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 text-xs">Modified</Badge>;
      case 'renamed':
        return <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 text-xs">Renamed</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{status}</Badge>;
    }
  };

  return (
    <Explorer
      open={open}
      onOpenChange={onOpenChange}
      title="GitHub Commits"
      showNavigation={commitList.length > 1}
      onPrevious={handlePrevious}
      onNext={handleNext}
      hasPrevious={hasPrevious}
      hasNext={hasNext}
      buttons={commit ? [
        {
          label: 'Open in GitHub',
          icon: ExternalLink,
          onClick: handleOpenInGitHub,
          variant: 'outline'
        }
      ] : []}
    >
      {!commit ? (
        <div className="flex flex-col items-center justify-center h-64 text-center p-4">
          <GitCommit className="h-12 w-12 text-gray-400 mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Commit not found</p>
        </div>
      ) : (
        <>
          {/* Commit Header Info */}
          <ExplorerHeader>
            <div className="space-y-2">
              {/* Commit SHA Tag */}
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded border border-gray-300 dark:border-gray-600">
                  {commit.sha.substring(0, 7)}
                </code>
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {commitTitle}
              </h3>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                <Calendar className="h-3 w-3" />
                <span>{formatRelativeDate(commit.date)}</span>
                {commit.status && (
                  <div className="ml-2">
                    {getStatusBadge(commit.status)}
                  </div>
                )}
              </div>
            </div>
          </ExplorerHeader>

          <ExplorerBody>
            {/* Repository */}
            <ExplorerSection>
              <ExplorerField label="Repository">
                <div className="flex items-center gap-2">
                  <GitBranch className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {commit.repo.fullName}
                  </span>
                </div>
              </ExplorerField>
            </ExplorerSection>

            {/* Branch Information */}
            {commit.branch && (
              <ExplorerSection>
                <ExplorerField label="Branch">
                  <div className="flex items-center gap-2">
                    <GitBranch className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {commit.branch}
                    </span>
                  </div>
                </ExplorerField>
              </ExplorerSection>
            )}

            {/* Author */}
            <ExplorerSection>
              <ExplorerField label="Author">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div className="flex flex-col">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {commit.author.username}
                    </span>
                    {/* {commit.author.name !== commit.author.username && (
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {commit.author.name}
                      </span>
                    )} */}
                    {commit.author.email && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {commit.author.email}
                      </span>
                    )}
                  </div>
                </div>
              </ExplorerField>
            </ExplorerSection>

            {/* Commit Message Body */}
            {commitBody && (
              <ExplorerSection title="Description">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                    {commitBody}
                  </div>
                </div>
              </ExplorerSection>
            )}

            {/* Commit Statistics */}
            {loadingDetails ? (
              <ExplorerSection title="Statistics">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading commit details...
                </div>
              </ExplorerSection>
            ) : detailsError ? (
              <ExplorerSection title="Statistics">
                <div className="text-sm text-red-600 dark:text-red-400">
                  Failed to load commit details
                </div>
              </ExplorerSection>
            ) : commitDetails?.stats ? (
              <ExplorerSection title="Statistics">
                <div className="flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                      {commitDetails.files.length} {commitDetails.files.length === 1 ? 'file' : 'files'} changed
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Plus className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-green-700 dark:text-green-300">
                      {commitDetails.stats.additions.toLocaleString()} additions
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Minus className="h-4 w-4 text-red-600 dark:text-red-400" />
                    <span className="text-sm font-medium text-red-700 dark:text-red-300">
                      {commitDetails.stats.deletions.toLocaleString()} deletions
                    </span>
                  </div>
                </div>
              </ExplorerSection>
            ) : null}

            {/* Changed Files */}
            {commitDetails?.files && commitDetails.files.length > 0 && (
              <ExplorerSection title="Changed Files">
                <div className="space-y-2">
                  {commitDetails.files.map((file, index) => (
                    <div
                      key={index}
                      className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <File className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                          <span className="text-sm font-mono text-gray-900 dark:text-gray-100 truncate" title={file.filename}>
                            {file.filename}
                          </span>
                        </div>
                        {getFileStatusBadge(file.status)}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400 ml-5">
                        {file.additions > 0 && (
                          <span className="text-green-600 dark:text-green-400">
                            +{file.additions}
                          </span>
                        )}
                        {file.deletions > 0 && (
                          <span className="text-red-600 dark:text-red-400">
                            -{file.deletions}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ExplorerSection>
            )}

            {/* Note about GitHub */}
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                💡 <strong>Note:</strong> Click "Open in GitHub" below to view the full commit diff, file changes, and comments on GitHub.
              </p>
            </div>
          </ExplorerBody>
        </>
      )}
    </Explorer>
  );
}
