import React from 'react';
import { 
  Explorer, 
  ExplorerHeader, 
  ExplorerBody, 
  ExplorerSection,
  ExplorerField 
} from '@/components/ui/explorer';
import { Badge } from '@/components/ui/badge';
import { 
  Circle,
  ExternalLink,
  User,
  Calendar,
  GitBranch,
  CheckCircle2,
  MessageSquare,
  Tag,
  FileText,
  Clock
} from 'lucide-react';
import { formatRelativeDate } from '@/lib/dateUtils';

/**
 * GitHubIssuesExplorer - Detailed issue viewer
 * 
 * Displays full issue information with:
 * - Repository name
 * - Issue number and state
 * - Title and description
 * - Author information
 * - Labels
 * - Comments count
 * - Timestamps (created, updated, closed)
 * - Action: Open in GitHub
 * 
 * @param {Object} props
 * @param {boolean} props.open - Controls visibility
 * @param {function} props.onOpenChange - Callback when open state changes
 * @param {string} props.issueId - Current issue ID to display
 * @param {Array} props.issueList - List of all issues for navigation
 * @param {function} props.onIssueChange - Callback when navigating to different issue
 */
export function GitHubIssuesExplorer({ 
  open, 
  onOpenChange, 
  issueId,
  issueList = [],
  onIssueChange
}) {
  // Find current issue from the list
  const currentIndex = issueList.findIndex(i => i.id === issueId);
  const issue = issueList[currentIndex] || null;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < issueList.length - 1;

  const handlePrevious = () => {
    if (hasPrevious) {
      const prevIssue = issueList[currentIndex - 1];
      onIssueChange(prevIssue.id);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      const nextIssue = issueList[currentIndex + 1];
      onIssueChange(nextIssue.id);
    }
  };

  const handleOpenInGitHub = () => {
    if (issue?.url) {
      window.open(issue.url, '_blank');
    }
  };

  // Get state badge
  const getStateBadge = (state) => {
    if (state === 'open') {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          <Circle className="h-3 w-3 mr-1" />
          Open
        </Badge>
      );
    } else if (state === 'closed') {
      return (
        <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          Closed
        </Badge>
      );
    }
    return null;
  };

  return (
    <Explorer
      open={open}
      onOpenChange={onOpenChange}
      title="GitHub Issues"
      showNavigation={issueList.length > 1}
      onPrevious={handlePrevious}
      onNext={handleNext}
      hasPrevious={hasPrevious}
      hasNext={hasNext}
      buttons={issue ? [
        {
          label: 'Open in GitHub',
          icon: ExternalLink,
          onClick: handleOpenInGitHub,
          variant: 'outline'
        }
      ] : []}
    >
      {!issue ? (
        <div className="flex flex-col items-center justify-center h-64 text-center p-4">
          <Circle className="h-12 w-12 text-gray-400 mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Issue not found</p>
        </div>
      ) : (
        <>
          {/* Issue Header Info */}
          <ExplorerHeader>
            <div className="space-y-2">
              {/* Issue Number and State */}
              <div className="flex items-center gap-2">
                <code className="text-xs font-mono text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded border border-gray-300 dark:border-gray-600">
                  #{issue.number}
                </code>
                {getStateBadge(issue.state)}
              </div>
              
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {issue.title}
              </h3>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                <Calendar className="h-3 w-3" />
                <span>Updated {formatRelativeDate(issue.updatedAt)}</span>
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
                    {issue.repo.fullName}
                  </span>
                </div>
              </ExplorerField>
            </ExplorerSection>

            {/* Author */}
            <ExplorerSection>
              <ExplorerField label="Author">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {issue.user.login}
                  </span>
                </div>
              </ExplorerField>
            </ExplorerSection>

            {/* Labels */}
            {issue.labels.length > 0 && (
              <ExplorerSection title="Labels">
                <div className="flex flex-wrap gap-2">
                  {issue.labels.map((label, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                      style={{
                        backgroundColor: `#${label.color}20`,
                        color: `#${label.color}`,
                        borderColor: `#${label.color}40`,
                        borderWidth: '1px'
                      }}
                    >
                      <Tag className="h-3 w-3" />
                      {label.name}
                    </span>
                  ))}
                </div>
              </ExplorerSection>
            )}

            {/* Description */}
            {issue.body && (
              <ExplorerSection title="Description">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                    {issue.body}
                  </div>
                </div>
              </ExplorerSection>
            )}

            {/* Comments Count */}
            {issue.comments > 0 && (
              <ExplorerSection title="Comments">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {issue.comments} {issue.comments === 1 ? 'comment' : 'comments'}
                  </span>
                </div>
              </ExplorerSection>
            )}

            {/* Timestamps */}
            <ExplorerSection title="Timeline">
              <div className="space-y-2">
                <ExplorerField label="Created">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {formatRelativeDate(issue.createdAt)}
                    </span>
                  </div>
                </ExplorerField>
                
                <ExplorerField label="Last Updated">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {formatRelativeDate(issue.updatedAt)}
                    </span>
                  </div>
                </ExplorerField>
                
                {issue.closedAt && (
                  <ExplorerField label="Closed">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {formatRelativeDate(issue.closedAt)}
                      </span>
                    </div>
                  </ExplorerField>
                )}
              </div>
            </ExplorerSection>

            {/* Note about GitHub */}
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                💡 <strong>Note:</strong> Click "Open in GitHub" below to view the full issue with all comments, reactions, and activity on GitHub.
              </p>
            </div>
          </ExplorerBody>
        </>
      )}
    </Explorer>
  );
}
