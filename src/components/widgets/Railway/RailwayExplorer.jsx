import React, { useState, useEffect } from 'react';
import { 
  Explorer, 
  ExplorerHeader, 
  ExplorerBody, 
  ExplorerSection
} from '@/components/ui/explorer';
import { Badge } from '@/components/ui/badge';
import { 
  Train,
  ExternalLink,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
  Server,
  Box,
  RefreshCw
} from 'lucide-react';
import { formatRelativeDate } from '@/lib/dateUtils';
import { 
  fetchDeployments,
  getDeploymentPublicUrl,
  getRailwayProjectUrl
} from '@/services/railwayService';

/**
 * RailwayExplorer - Recent deployments and services for a Railway project
 */
export function RailwayExplorer({ 
  open, 
  onOpenChange, 
  projectId,
  projectList = [],
  onProjectChange
}) {
  const currentIndex = projectList.findIndex(p => p.id === projectId);
  const project = projectList[currentIndex] || null;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < projectList.length - 1;
  
  // Tab state
  const [activeTab, setActiveTab] = useState('deployments');
  
  // Data states
  const [deploymentResult, setDeploymentResult] = useState(null);
  const currentProjectId = project?.id;
  const currentResult = deploymentResult?.projectId === currentProjectId ? deploymentResult : null;

  useEffect(() => {
    if (!open || !currentProjectId) {
      setDeploymentResult(null);
      return;
    }

    const controller = new AbortController();
    fetchDeployments(currentProjectId, null, 15, controller.signal).then(deployments => {
      if (!controller.signal.aborted) {
        setDeploymentResult({ projectId: currentProjectId, deployments });
      }
    }).catch(error => {
      if (!controller.signal.aborted) {
        setDeploymentResult({ projectId: currentProjectId, error: error.message });
      }
    });

    return () => controller.abort();
  }, [open, currentProjectId]);

  const handlePrevious = () => {
    if (hasPrevious) {
      const prevProject = projectList[currentIndex - 1];
      onProjectChange(prevProject.id);
      setActiveTab('deployments');
    }
  };

  const handleNext = () => {
    if (hasNext) {
      const nextProject = projectList[currentIndex + 1];
      onProjectChange(nextProject.id);
      setActiveTab('deployments');
    }
  };

  const handleOpenInRailway = () => {
    if (project?.id) {
      window.open(getRailwayProjectUrl(project.id), '_blank', 'noopener,noreferrer');
    }
  };

  // Get status badge
  const getStatusBadge = (status) => {
    if (!status) return null;
    
    const statusLower = status.toLowerCase();
    
    if (statusLower === 'success' || statusLower === 'active') {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {status}
        </Badge>
      );
    }
    if (statusLower === 'failed' || statusLower === 'crashed' || statusLower === 'error') {
      return (
        <Badge variant="secondary" className="bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
          <XCircle className="h-3 w-3 mr-1" />
          {status}
        </Badge>
      );
    }
    if (statusLower === 'building' || statusLower === 'deploying' || statusLower === 'initializing') {
      return (
        <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          {status}
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
        <Clock className="h-3 w-3 mr-1" />
        {status}
      </Badge>
    );
  };

  // Tab buttons - only show Deployments tab
  const tabs = [
    { id: 'deployments', label: 'Deployments', icon: RefreshCw },
  ];

  return (
    <Explorer
      open={open}
      onOpenChange={onOpenChange}
      title="Railway Project"
      showNavigation={projectList.length > 1}
      onPrevious={handlePrevious}
      onNext={handleNext}
      hasPrevious={hasPrevious}
      hasNext={hasNext}
      buttons={project ? [
        {
          label: 'Open in Railway',
          icon: ExternalLink,
          onClick: handleOpenInRailway,
          variant: 'outline'
        }
      ] : []}
    >
      {!project ? (
        <div className="flex flex-col items-center justify-center h-64 text-center p-4">
          <Train className="h-12 w-12 text-gray-400 mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Project not found</p>
        </div>
      ) : (
        <>
          {/* Project Header */}
          <ExplorerHeader>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Train className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {project.name}
                </h3>
              </div>
              
              {project.description && (
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {project.description}
                </p>
              )}
              
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex items-center gap-1">
                  <Server className="h-3 w-3" />
                  <span>{project.services.length} services</span>
                </div>
                <div className="flex items-center gap-1">
                  <Box className="h-3 w-3" />
                  <span>{project.environments.length} environments</span>
                </div>
                <div className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  <span>{formatRelativeDate(project.updatedAt)}</span>
                </div>
              </div>
            </div>
          </ExplorerHeader>

          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 dark:border-gray-800 px-4">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-purple-600 text-purple-600 dark:border-purple-400 dark:text-purple-400'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          <ExplorerBody>
            {/* Deployments Tab */}
            {activeTab === 'deployments' && (
              <ExplorerSection title="Recent Deployments">
                {!currentResult ? (
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading deployments...
                  </div>
                ) : currentResult.error ? (
                  <div role="alert" className="text-sm text-red-600 dark:text-red-400">
                    {currentResult.error}
                  </div>
                ) : currentResult.deployments.length === 0 ? (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    No deployments found
                  </div>
                ) : (
                  <div className="space-y-2">
                    {currentResult.deployments.map((deployment) => {
                      const publicUrl = getDeploymentPublicUrl(deployment);
                      return (
                        <div
                          key={deployment.id}
                          className="p-3 rounded-lg border bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                        >
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <Server className="h-4 w-4 text-gray-500 dark:text-gray-400 flex-shrink-0" />
                              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                {deployment.service?.name || 'Unknown Service'}
                              </span>
                            </div>
                            {getStatusBadge(deployment.status)}
                          </div>

                          <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400 ml-6">
                            {deployment.environment?.name && (
                              <span className="flex items-center gap-1">
                                <Box className="h-3 w-3" />
                                {deployment.environment.name}
                              </span>
                            )}
                            <span>{formatRelativeDate(deployment.createdAt)}</span>
                          </div>

                          {publicUrl && (
                            <div className="mt-2 ml-6">
                              <a
                                href={publicUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Open public URL
                              </a>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </ExplorerSection>
            )}

            {/* Services List */}
            {project.services.length > 0 && (
              <ExplorerSection title="Services">
                <div className="space-y-2">
                  {project.services.map((service) => (
                    <div
                      key={service.id}
                      className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded-lg"
                    >
                      <Server className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-gray-100">
                        {service.name}
                      </span>
                    </div>
                  ))}
                </div>
              </ExplorerSection>
            )}
            
            {/* Note about Railway Dashboard */}
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                💡 <strong>Note:</strong> For detailed metrics, logs, and cost information, visit the Railway dashboard using the "Open in Railway" button above.
              </p>
            </div>
          </ExplorerBody>
        </>
      )}
    </Explorer>
  );
}
