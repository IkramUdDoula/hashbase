import React, { useState, useEffect } from 'react';
import { BaseWidget } from '../../BaseWidget';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Rocket, RefreshCw, Loader2, CheckCircle2, XCircle, Clock, AlertCircle, GitBranch, Box, Timer } from 'lucide-react';
import { SiNetlify } from 'react-icons/si';
import { fetchNetlifyDeploys, checkNetlifyStatus, getNetlifyDeployUrl } from '@/services/netlifyService';

export function DeploymentWidget({ rowSpan = 2, dragRef }) {
  const [deploys, setDeploys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  const loadDeploys = async () => {
    try {
      setError(null);
      const configStatus = await checkNetlifyStatus();
      setIsConfigured(configStatus);
      
      if (!configStatus) {
        setError('Netlify access token not configured');
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      const netlifyDeploys = await fetchNetlifyDeploys();
      setDeploys(netlifyDeploys);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleOpenDeploy = (deployId, siteId) => {
    const deployUrl = getNetlifyDeployUrl(deployId, siteId);
    window.open(deployUrl, '_blank');
  };

  useEffect(() => {
    loadDeploys();
    const interval = setInterval(loadDeploys, 60000);
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadDeploys();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDeploys();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()} ${date.getFullYear()}`;
  };

  const formatBuildTime = (seconds) => {
    if (!seconds) return 'N/A';
    if (seconds < 60) return `${seconds}s`;
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const getStateIcon = (state) => {
    switch (state) {
      case 'ready':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'building':
      case 'processing':
        return <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  // Count deploys by state
  const readyCount = deploys.filter(d => d.state === 'ready').length;
  const buildingCount = deploys.filter(d => d.state === 'building' || d.state === 'processing').length;
  const errorCount = deploys.filter(d => d.state === 'error').length;

  const badge = deploys.length > 0 ? (
    <div className="flex gap-1">
      {readyCount > 0 && <Badge variant="default" className="text-xs">{readyCount}</Badge>}
      {buildingCount > 0 && <Badge variant="secondary" className="text-xs">{buildingCount}</Badge>}
      {errorCount > 0 && <Badge variant="destructive" className="text-xs">{errorCount}</Badge>}
    </div>
  ) : null;

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
      logo={SiNetlify}
      appName="Netlify"
      widgetName="Deploys"
      tooltip="Latest deploys from all your projects"
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
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
          <Rocket className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm text-destructive mb-2">
            {isConfigured ? 'Failed to load deploys' : 'Not configured'}
          </p>
          <p className="text-xs text-muted-foreground mb-4">{error}</p>
          <div className="flex gap-2">
            {!isConfigured ? (
              <div className="text-xs text-muted-foreground max-w-xs">
                Add your Netlify access token to the .env file to see your deploys
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                Try Again
              </Button>
            )}
          </div>
        </div>
      ) : deploys.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
          <Rocket className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">No deploys found</p>
          <p className="text-xs text-muted-foreground mt-1">Your Netlify sites will appear here</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
          {deploys.map((deploy) => (
            <div
              key={deploy.id}
              className="p-4 rounded-lg bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border border-green-200 dark:border-green-800 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleOpenDeploy(deploy.id, deploy.siteId)}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {getStateIcon(deploy.state)}
                  <p className="font-semibold text-green-900 dark:text-green-100 text-sm line-clamp-1">{deploy.siteName}</p>
                </div>
                <span className="text-xs text-green-700 dark:text-green-300 whitespace-nowrap flex-shrink-0">
                  {formatDate(deploy.createdAt)}
                </span>
              </div>
              
              <div className="flex items-center gap-3 text-xs text-green-700 dark:text-green-300 flex-wrap">
                {deploy.branch && (
                  <div className="flex items-center gap-1">
                    <GitBranch className="h-3 w-3" />
                    <span className="line-clamp-1">{deploy.branch}</span>
                  </div>
                )}
                {deploy.context && (
                  <div className="flex items-center gap-1">
                    <Box className="h-3 w-3" />
                    <span>{deploy.context}</span>
                  </div>
                )}
                {deploy.buildTime && (
                  <div className="flex items-center gap-1">
                    <Timer className="h-3 w-3" />
                    <span>{formatBuildTime(deploy.buildTime)}</span>
                  </div>
                )}
              </div>
              
              {deploy.errorMessage && (
                <div className="flex items-start gap-2 text-xs text-red-600 dark:text-red-400 mt-2">
                  <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                  <span className="line-clamp-2">{deploy.errorMessage}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </BaseWidget>
  );
}
