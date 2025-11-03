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
  Rocket,
  ExternalLink,
  User,
  Calendar,
  GitBranch,
  CheckCircle2,
  XCircle,
  Clock,
  Timer,
  FileText,
  File,
  Plus,
  Minus,
  BarChart3,
  Loader2,
  Globe,
  Code,
  AlertCircle,
  Zap,
  Package
} from 'lucide-react';
import { SiNetlify } from 'react-icons/si';
import { formatRelativeDate } from '@/lib/dateUtils';
import { fetchDeployDetails, getNetlifyDeployUrl } from '@/services/netlifyService';

/**
 * NetlifyDeployExplorer - Detailed deployment viewer
 * 
 * Displays comprehensive deployment information including:
 * - Site name and deployment status
 * - Branch and commit information
 * - Build time and timestamps
 * - File changes summary
 * - Functions and edge functions
 * - Deployment URLs
 * 
 * @param {Object} props
 * @param {boolean} props.open - Controls visibility
 * @param {function} props.onOpenChange - Callback when open state changes
 * @param {string} props.deployId - Current deploy ID to display
 * @param {Array} props.deployList - List of all deploys for navigation
 * @param {function} props.onDeployChange - Callback when navigating to different deploy
 */
export function NetlifyDeployExplorer({ 
  open, 
  onOpenChange, 
  deployId,
  deployList = [],
  onDeployChange
}) {
  // Find current deploy from the list
  const currentIndex = deployList.findIndex(d => d.id === deployId);
  const deploy = deployList[currentIndex] || null;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < deployList.length - 1;
  
  // State for detailed deploy info
  const [deployDetails, setDeployDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  
  // Fetch deploy details when deploy changes
  useEffect(() => {
    if (!deploy) {
      setDeployDetails(null);
      return;
    }
    
    const loadDeployDetails = async () => {
      setLoadingDetails(true);
      setDetailsError(null);
      
      try {
        const details = await fetchDeployDetails(deploy.id);
        setDeployDetails(details);
      } catch (err) {
        console.error('Failed to load deploy details:', err);
        setDetailsError(err.message);
      } finally {
        setLoadingDetails(false);
      }
    };
    
    loadDeployDetails();
  }, [deploy?.id]);

  const handlePrevious = () => {
    if (hasPrevious) {
      const prevDeploy = deployList[currentIndex - 1];
      onDeployChange(prevDeploy.id);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      const nextDeploy = deployList[currentIndex + 1];
      onDeployChange(nextDeploy.id);
    }
  };

  const handleOpenInNetlify = () => {
    if (deploy?.id && deploy?.siteId) {
      const deployUrl = getNetlifyDeployUrl(deploy.id, deploy.siteId);
      window.open(deployUrl, '_blank');
    }
  };

  const handleOpenDeployUrl = () => {
    if (deployDetails?.deployUrl) {
      window.open(deployDetails.deployUrl, '_blank');
    }
  };

  const handleDeployClick = (deployId) => {
    onDeployChange(deployId);
  };

  // Get status badge
  const getStatusBadge = (state) => {
    if (!state) return null;
    
    switch (state) {
      case 'ready':
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Ready
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      case 'building':
      case 'processing':
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Building
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="h-3 w-3 mr-1" />
            {state}
          </Badge>
        );
    }
  };

  // Format build time
  const formatBuildTime = (seconds) => {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <Explorer
      open={open}
      onOpenChange={onOpenChange}
      title="Netlify Deployment"
      showNavigation={deployList.length > 1}
      onPrevious={handlePrevious}
      onNext={handleNext}
      hasPrevious={hasPrevious}
      hasNext={hasNext}
      buttons={deploy ? [
        {
          label: 'Open in Netlify',
          icon: ExternalLink,
          onClick: handleOpenInNetlify,
          variant: 'outline'
        }
      ] : []}
    >
      {!deploy ? (
        <div className="flex flex-col items-center justify-center h-64 text-center p-4">
          <Rocket className="h-12 w-12 text-gray-400 mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Deployment not found</p>
        </div>
      ) : (
        <>
          {/* Deploy Header Info */}
          <ExplorerHeader>
            <div className="space-y-2">
              {/* Site name and Netlify icon */}
              <div className="flex items-center gap-2">
                <SiNetlify className="h-5 w-5 text-[#00C7B7]" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {deploy.siteName}
                </h3>
              </div>
              
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                <Calendar className="h-3 w-3" />
                <span>{formatRelativeDate(deploy.createdAt)}</span>
                {deploy.state && (
                  <div className="ml-2">
                    {getStatusBadge(deploy.state)}
                  </div>
                )}
              </div>
            </div>
          </ExplorerHeader>

          <ExplorerBody>
            {/* Context and Branch */}
            <ExplorerSection>
              <div className="grid grid-cols-2 gap-4">
                {deploy.context && (
                  <ExplorerField label="Context">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                      <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                        {deploy.context}
                      </span>
                    </div>
                  </ExplorerField>
                )}
                {deploy.branch && (
                  <ExplorerField label="Branch">
                    <div className="flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {deploy.branch}
                      </span>
                    </div>
                  </ExplorerField>
                )}
              </div>
            </ExplorerSection>

            {/* Build Time */}
            {deploy.buildTime && (
              <ExplorerSection>
                <ExplorerField label="Build Time">
                  <div className="flex items-center gap-2">
                    <Timer className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {formatBuildTime(deploy.buildTime)}
                    </span>
                  </div>
                </ExplorerField>
              </ExplorerSection>
            )}

            {/* Commit Information */}
            {deploy.commitRef && deploy.commitUrl && (
              <ExplorerSection>
                <ExplorerField label="Commit">
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <a 
                      href={deploy.commitUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 font-mono"
                    >
                      {deploy.commitRef.substring(0, 7)}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </div>
                </ExplorerField>
              </ExplorerSection>
            )}

            {/* Loading Details */}
            {loadingDetails ? (
              <ExplorerSection title="Deploy Details">
                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading deployment details...
                </div>
              </ExplorerSection>
            ) : detailsError ? (
              <ExplorerSection title="Deploy Details">
                <div className="text-sm text-red-600 dark:text-red-400">
                  Failed to load deployment details
                </div>
              </ExplorerSection>
            ) : deployDetails ? (
              <>
                {/* Title */}
                {deployDetails.title && (
                  <ExplorerSection title="Deploy Title">
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                      <div className="text-sm text-gray-700 dark:text-gray-300">
                        {deployDetails.title}
                      </div>
                    </div>
                  </ExplorerSection>
                )}

                {/* Framework */}
                {deployDetails.framework && (
                  <ExplorerSection>
                    <ExplorerField label="Framework">
                      <div className="flex items-center gap-2">
                        <Code className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {deployDetails.framework}
                        </span>
                      </div>
                    </ExplorerField>
                  </ExplorerSection>
                )}

                {/* Deployed By */}
                {deployDetails.deployedBy && (
                  <ExplorerSection>
                    <ExplorerField label="Deployed By">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-900 dark:text-gray-100">
                            {deployDetails.deployedBy.name || 'Unknown'}
                          </span>
                          {deployDetails.deployedBy.email && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {deployDetails.deployedBy.email}
                            </span>
                          )}
                        </div>
                      </div>
                    </ExplorerField>
                  </ExplorerSection>
                )}


                {/* Previous Deployments */}
                <ExplorerSection title="Previous Deployments">
                  <div className="space-y-2">
                    {deployList.slice(0, 5).map((d, index) => {
                      const isCurrentDeploy = d.id === deploy.id;
                      return (
                        <div
                          key={d.id}
                          onClick={() => !isCurrentDeploy && handleDeployClick(d.id)}
                          className={`p-3 rounded-lg border transition-all ${
                            isCurrentDeploy
                              ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
                              : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-pointer hover:border-gray-300 dark:hover:border-gray-600'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              {d.state === 'ready' ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500 dark:text-green-400 flex-shrink-0" />
                              ) : d.state === 'error' ? (
                                <XCircle className="h-4 w-4 text-red-500 dark:text-red-400 flex-shrink-0" />
                              ) : (
                                <Clock className="h-4 w-4 text-yellow-500 dark:text-yellow-400 flex-shrink-0" />
                              )}
                              <div className="flex flex-col flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                    {d.context}: {d.branch}@{d.commitRef?.substring(0, 7)}
                                  </span>
                                  <Badge variant="secondary" className="text-xs capitalize">
                                    {d.state}
                                  </Badge>
                                </div>
                                {d.title && (
                                  <span className="text-xs text-gray-600 dark:text-gray-400 line-clamp-1">
                                    {d.title}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400 ml-6">
                            <span>{formatRelativeDate(d.createdAt)}</span>
                            {d.buildTime && (
                              <span>Deployed in {d.buildTime}s</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </ExplorerSection>
              </>
            ) : null}

            {/* Error Message */}
            {deploy.errorMessage && (
              <ExplorerSection title="Error">
                <div className="flex items-start gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-red-700 dark:text-red-300">
                    {deploy.errorMessage}
                  </div>
                </div>
              </ExplorerSection>
            )}

          </ExplorerBody>
        </>
      )}
    </Explorer>
  );
}
