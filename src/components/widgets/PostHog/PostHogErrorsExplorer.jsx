import React, { useState, useEffect } from 'react';
import { 
  Explorer, 
  ExplorerHeader, 
  ExplorerBody, 
  ExplorerSection,
  ExplorerField 
} from '@/components/ui/explorer';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, AlertTriangle, Clock, Hash, User, Globe, Monitor, MapPin, Code, Loader2, Copy, Check } from 'lucide-react';
import { formatRelativeDate } from '@/lib/dateUtils';
import { fetchIssueIdFromFingerprint, fetchErrorEvent, fetchStackFrames } from '@/services/posthogService';

export function PostHogErrorsExplorer({ 
  open, 
  onOpenChange, 
  errorId,
  errorList = [],
  onErrorChange,
  projectUrl,
  projectId
}) {
  // Find current error from the list
  const currentIndex = errorList.findIndex(e => e.id === errorId);
  const error = errorList[currentIndex] || null;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < errorList.length - 1;
  
  // Stack trace state
  const [stackFrames, setStackFrames] = useState([]);
  const [loadingStackTrace, setLoadingStackTrace] = useState(false);
  const [stackTraceError, setStackTraceError] = useState(null);
  const [copied, setCopied] = useState(false);
  
  // Load stack trace when error changes
  useEffect(() => {
    async function loadStackTrace() {
      if (!error || !projectId || !open) {
        console.log('Stack trace loading skipped:', { error: !!error, projectId, open });
        setStackFrames([]);
        return;
      }
      
      console.log('Loading stack trace for error:', error.id, 'projectId:', projectId);
      setLoadingStackTrace(true);
      setStackTraceError(null);
      
      try {
        // Fetch the error event to get frames
        const errorEvent = await fetchErrorEvent(projectId, error.id);
        console.log('Error event received:', errorEvent);
        
        if (errorEvent && errorEvent.frames) {
          // Use frames directly from the exception list
          console.log('Using frames from exception list:', errorEvent.frames);
          setStackFrames(errorEvent.frames);
        } else {
          console.log('No frames in error event');
          setStackFrames([]);
        }
      } catch (err) {
        console.error('Failed to load stack trace:', err);
        setStackTraceError(err.message || 'Failed to load stack trace');
        setStackFrames([]);
      } finally {
        setLoadingStackTrace(false);
      }
    }
    
    loadStackTrace();
  }, [error?.id, projectId, open]);

  const handlePrevious = () => {
    if (hasPrevious) {
      const prevError = errorList[currentIndex - 1];
      onErrorChange(prevError.id);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      const nextError = errorList[currentIndex + 1];
      onErrorChange(nextError.id);
    }
  };

  const handleOpenExternal = () => {
    if (projectUrl && projectId) {
      // Ensure projectUrl has protocol
      let url = projectUrl;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      // Remove trailing slash if present
      url = url.replace(/\/$/, '');
      
      // Use issue_id if available, otherwise use fingerprint
      if (error?.issueId) {
        // Open the specific error issue page with issue_id
        window.open(`${url}/project/${projectId}/error_tracking/${error.issueId}`, '_blank');
      } else if (error?.fingerprint) {
        // Fallback to error tracking page with fingerprint filter
        window.open(`${url}/project/${projectId}/error_tracking?fingerprint=${encodeURIComponent(error.fingerprint)}`, '_blank');
      } else {
        // Just open the error tracking page
        window.open(`${url}/project/${projectId}/error_tracking`, '_blank');
      }
    }
  };

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
    <Explorer
      open={open}
      onOpenChange={onOpenChange}
      title="PostHog"
      showNavigation={errorList.length > 1}
      onPrevious={handlePrevious}
      onNext={handleNext}
      hasPrevious={hasPrevious}
      hasNext={hasNext}
      buttons={projectUrl ? [
        {
          label: 'Open in PostHog',
          icon: ExternalLink,
          onClick: handleOpenExternal,
          variant: 'outline'
        }
      ] : []}
    >
      {!error ? (
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-sm text-gray-600">Error not found</p>
        </div>
      ) : (
        <>
          <ExplorerHeader>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {error.type || 'Error'}
                  </h3>
                  {error.severity && (
                    <span className={`text-xs px-2 py-0.5 rounded ${getSeverityColor(error.severity)}`}>
                      {error.severity}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                  {error.exceptionValue || error.message || error.title || 'Unknown error'}
                </p>
                
                {/* Key Metrics Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Hash className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Occurrences</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {error.occurrences || 0}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">Affected Users</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                        {error.affectedUsers || 0}
                      </p>
                    </div>
                  </div>
                  {error.firstSeen && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-green-600 dark:text-green-400" />
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">First Seen</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {formatRelativeDate(error.firstSeen)}
                        </p>
                      </div>
                    </div>
                  )}
                  {error.lastSeen && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                      <div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">Last Seen</p>
                        <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {formatRelativeDate(error.lastSeen)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </ExplorerHeader>

          <ExplorerBody>
            {/* Exception Details */}
            <ExplorerSection title="Exception">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="py-2.5 pr-4 text-gray-600 dark:text-gray-400 font-medium w-32">Synthetic</td>
                      <td className="py-2.5 text-gray-900 dark:text-gray-100">
                        {error.synthetic !== undefined ? (error.synthetic ? 'true' : 'false') : 'false'}
                      </td>
                    </tr>
                    
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                      <td className="py-2.5 pr-4 text-gray-600 dark:text-gray-400 font-medium">Handled</td>
                      <td className="py-2.5 text-gray-900 dark:text-gray-100">
                        {error.handled !== undefined ? (error.handled ? 'true' : 'false') : 'true'}
                      </td>
                    </tr>

                    {error.lib && (
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="py-2.5 pr-4 text-gray-600 dark:text-gray-400 font-medium">Library</td>
                        <td className="py-2.5 text-gray-900 dark:text-gray-100">
                          {error.lib} {error.libVersion && `v${error.libVersion}`}
                        </td>
                      </tr>
                    )}

                    {error.environment?.url && (
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="py-2.5 pr-4 text-gray-600 dark:text-gray-400 font-medium">
                          <div className="flex items-center gap-1">
                            <Globe className="h-3.5 w-3.5" />
                            URL
                          </div>
                        </td>
                        <td className="py-2.5">
                          <a 
                            href={error.environment.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:underline break-all inline-flex items-center gap-1"
                          >
                            {error.environment.url}
                            <ExternalLink className="h-3 w-3 flex-shrink-0" />
                          </a>
                        </td>
                      </tr>
                    )}

                    {error.level && (
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="py-2.5 pr-4 text-gray-600 dark:text-gray-400 font-medium">Level</td>
                        <td className="py-2.5">
                          <span className={`text-xs px-2 py-0.5 rounded ${getSeverityColor(error.level)}`}>
                            {error.level}
                          </span>
                        </td>
                      </tr>
                    )}

                    {error.component && (
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="py-2.5 pr-4 text-gray-600 dark:text-gray-400 font-medium">
                          <div className="flex items-center gap-1">
                            <Code className="h-3.5 w-3.5" />
                            Component
                          </div>
                        </td>
                        <td className="py-2.5 text-gray-900 dark:text-gray-100">
                          {error.component}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </ExplorerSection>

            {/* Environment Info */}
            <ExplorerSection title="Environment">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {error.environment?.browser && (
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="py-2.5 pr-4 text-gray-600 dark:text-gray-400 font-medium w-32">
                          <div className="flex items-center gap-1">
                            <Monitor className="h-3.5 w-3.5" />
                            Browser
                          </div>
                        </td>
                        <td className="py-2.5 text-gray-900 dark:text-gray-100">
                          {error.environment.browser}
                        </td>
                      </tr>
                    )}
                    
                    {error.environment?.os && (
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                        <td className="py-2.5 pr-4 text-gray-600 dark:text-gray-400 font-medium">OS</td>
                        <td className="py-2.5 text-gray-900 dark:text-gray-100">
                          {error.environment.os}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </ExplorerSection>

            {/* Stack Trace */}
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  Stack Trace
                </h3>
                {stackFrames.length > 0 && (
                  <button
                    onClick={() => {
                      const errorTitle = `${error.type || 'Error'}: ${error.exceptionValue || error.message || error.title || 'Unknown error'}`;
                      const stackText = stackFrames.map((frame, index) => 
                        `#${index + 1} ${frame.mangled_name || 'anonymous'} at ${frame.source}:${frame.line}:${frame.column}`
                      ).join('\n');
                      const fullTrace = `${errorTitle}\n\n${stackText}`;
                      navigator.clipboard.writeText(fullTrace);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="flex items-center gap-1 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    title="Copy stack trace"
                  >
                    {copied ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              {loadingStackTrace ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading stack trace...</span>
                </div>
              ) : stackTraceError ? (
                <div className="text-sm text-red-600 dark:text-red-400 py-4">
                  {stackTraceError}
                </div>
              ) : stackFrames.length > 0 ? (
                <div className="space-y-2">
                  {stackFrames.map((frame, index) => {
                    const isInApp = frame.in_app;
                    const isResolved = frame.resolved;
                    
                    return (
                      <div
                        key={frame.raw_id || index}
                        className={`p-3 rounded-lg border ${
                          isInApp 
                            ? 'bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900' 
                            : 'bg-gray-50 dark:bg-gray-800/30 border-gray-200 dark:border-gray-700'
                        }`}
                      >
                        {/* Function name and badge */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <code className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                              {frame.resolved_name || frame.mangled_name || 'anonymous'}
                            </code>
                            {isInApp && (
                              <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                In App
                              </span>
                            )}
                            {!isResolved && (
                              <span className="text-xs px-2 py-0.5 rounded bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300">
                                Unresolved
                              </span>
                            )}
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                            #{index + 1}
                          </span>
                        </div>
                        
                        {/* File location */}
                        {frame.source && (
                          <div className="flex items-start gap-2 mb-1">
                            <Code className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <code className="text-xs text-gray-700 dark:text-gray-300 break-all">
                                {frame.source}
                                {frame.line && (
                                  <span className="text-gray-500 dark:text-gray-400">
                                    :{frame.line}
                                    {frame.column && `:${frame.column}`}
                                  </span>
                                )}
                              </code>
                            </div>
                          </div>
                        )}
                        
                        {/* Resolve failure message */}
                        {frame.resolve_failure && (
                          <div className="mt-2 text-xs text-yellow-700 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                            {frame.resolve_failure}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : error.stackTrace ? (
                <div className="bg-gray-900 dark:bg-black p-4 rounded-lg overflow-x-auto">
                  <pre className="text-xs text-gray-100 dark:text-gray-300 font-mono">
                    <code>{error.stackTrace}</code>
                  </pre>
                </div>
              ) : (
                <div className="text-sm text-gray-600 dark:text-gray-400 py-4">
                  No stack trace available for this error
                </div>
              )}
            </div>

            {/* Context/Properties */}
            {error.context && Object.keys(error.context).length > 0 && (
              <ExplorerSection title="Additional Properties">
                <div className="space-y-2">
                  {Object.entries(error.context).map(([key, value]) => (
                    <div key={key} className="flex items-start justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{key}</span>
                      <span className="text-sm text-gray-900 dark:text-gray-100 text-right ml-4 break-all">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </span>
                    </div>
                  ))}
                </div>
              </ExplorerSection>
            )}
          </ExplorerBody>
        </>
      )}
    </Explorer>
  );
}
