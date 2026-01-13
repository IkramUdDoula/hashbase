import React, { useState, useEffect } from 'react';
import { BaseWidgetV2 } from '../../BaseWidgetV2';
import { Badge } from '@/components/ui/badge';
import { 
  Train,
  AlertCircle,
  CheckCircle2, 
  XCircle, 
  Clock, 
  Loader2,
  Box,
  Server
} from 'lucide-react';
import { SiRailway } from "react-icons/si";
import { 
  fetchProjects,
  fetchDeployments,
  isRailwayConfigured,
  getProjectSelectionPreferences,
  saveProjectSelectionPreferences
} from '@/services/railwayService';
import { formatRelativeDate } from '@/lib/dateUtils';
import { WidgetModal, WidgetModalFooter } from '@/components/ui/widget-modal';
import { RailwayExplorer } from './RailwayExplorer';

/**
 * RailwayWidget - Railway projects widget
 * 
 * Features:
 * - Displays all Railway projects
 * - Shows service count per project
 * - Search functionality
 * - Auto-refresh capability
 * - Opens explorer for detailed view
 */
export function RailwayWidget({ rowSpan = 2, dragRef }) {
  const [projects, setProjects] = useState([]);
  const [projectDeployments, setProjectDeployments] = useState({}); // Store latest deployment per project
  const [currentState, setCurrentState] = useState('loading');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorActionLoading, setErrorActionLoading] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState({
    selectedProjects: [],
    selectAll: true,
    maxProjects: 20,
    autoRefresh: true,
    refreshInterval: 5,
  });
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [tempSettings, setTempSettings] = useState(settings);
  
  // Explorer state
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  
  // Load preferences on mount
  useEffect(() => {
    const prefs = getProjectSelectionPreferences();
    setSettings(prev => ({
      ...prev,
      selectedProjects: prefs.selectedProjects,
      selectAll: prefs.selectAll
    }));
    setPreferencesLoaded(true);
  }, []);
  
  // Load projects
  const loadProjects = async () => {
    try {
      setErrorMessage('');
      
      if (!isRailwayConfigured()) {
        setErrorMessage('Railway token not configured. Add it in Settings → Secrets.');
        setCurrentState('error');
        setRefreshing(false);
        return;
      }

      const projectData = await fetchProjects();
      
      // Filter by selected projects if not selectAll
      let filteredProjects = projectData;
      if (!settings.selectAll && settings.selectedProjects.length > 0) {
        filteredProjects = projectData.filter(p => 
          settings.selectedProjects.includes(p.id)
        );
      }
      
      // Limit to max projects
      filteredProjects = filteredProjects.slice(0, settings.maxProjects);
      
      if (filteredProjects.length === 0) {
        setProjects([]);
        setProjectDeployments({});
        setCurrentState('empty');
      } else {
        setProjects(filteredProjects);
        
        // Fetch latest deployment for each project
        const deploymentsMap = {};
        await Promise.all(
          filteredProjects.map(async (project) => {
            try {
              const deployments = await fetchDeployments(project.id, null, 1);
              if (deployments.length > 0) {
                deploymentsMap[project.id] = deployments[0];
              }
            } catch (err) {
              console.error(`Failed to load deployment for project ${project.id}:`, err);
            }
          })
        );
        setProjectDeployments(deploymentsMap);
        
        setCurrentState('positive');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load projects. Please try again.');
      setCurrentState('error');
    } finally {
      setRefreshing(false);
    }
  };
  
  // Initial load
  useEffect(() => {
    if (preferencesLoaded) {
      loadProjects();
    }
  }, [preferencesLoaded, settings.selectedProjects, settings.selectAll, settings.maxProjects]);
  
  // Auto-refresh
  useEffect(() => {
    if (settings.autoRefresh && currentState === 'positive') {
      const interval = setInterval(() => {
        setRefreshing(true);
        loadProjects();
      }, settings.refreshInterval * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [settings.autoRefresh, settings.refreshInterval, currentState]);
  
  // Handlers
  const handleRefresh = () => {
    setRefreshing(true);
    setCurrentState('loading');
    loadProjects();
  };
  
  const handleSettingsOpen = () => {
    setTempSettings(settings);
    setSettingsOpen(true);
  };
  
  const handleSettingsSave = () => {
    setSettings(tempSettings);
    saveProjectSelectionPreferences(tempSettings.selectedProjects, tempSettings.selectAll);
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
    loadProjects();
  };
  
  const handleProjectClick = (project) => {
    setSelectedProjectId(project.id);
    setExplorerOpen(true);
  };
  
  const handleProjectChange = (newProjectId) => {
    setSelectedProjectId(newProjectId);
  };
  
  const handleExplorerClose = () => {
    setExplorerOpen(false);
    setSelectedProjectId(null);
  };
  
  const handleSelectAllToggle = () => {
    setTempSettings(prev => ({
      ...prev,
      selectAll: !prev.selectAll,
      selectedProjects: []
    }));
  };
  
  // Filter projects based on search
  const filteredProjects = projects.filter(project => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      project.name.toLowerCase().includes(query) ||
      project.description?.toLowerCase().includes(query)
    );
  });
  
  // Get deployment status icon
  const getDeploymentStatusIcon = (status) => {
    if (!status) return null;
    
    const statusLower = status.toLowerCase();
    
    if (statusLower === 'success' || statusLower === 'active') {
      return <CheckCircle2 className="h-4 w-4 text-green-500 dark:text-green-400" />;
    }
    if (statusLower === 'failed' || statusLower === 'crashed' || statusLower === 'error') {
      return <XCircle className="h-4 w-4 text-red-500 dark:text-red-400" />;
    }
    if (statusLower === 'building' || statusLower === 'deploying' || statusLower === 'initializing') {
      return <Loader2 className="h-4 w-4 text-blue-500 dark:text-blue-400 animate-spin" />;
    }
    return <Clock className="h-4 w-4 text-yellow-500 dark:text-yellow-400" />;
  };
  
  // Check if deployment has failed
  const isDeploymentFailed = (status) => {
    if (!status) return false;
    const statusLower = status.toLowerCase();
    return statusLower === 'failed' || statusLower === 'crashed' || statusLower === 'error';
  };
  
  // Count failed deployments
  const failedCount = Object.values(projectDeployments).filter(d => 
    isDeploymentFailed(d.status)
  ).length;
  
  // Badge showing failed deployment count
  const badge = failedCount > 0 ? (
    <Badge variant="destructive" className="text-xs">{failedCount}</Badge>
  ) : null;

  return (
    <>
      <BaseWidgetV2
        logo={SiRailway}
        appName="Railway"
        widgetName="Projects"
        tooltip="Your Railway projects and deployments"
        badge={badge}
        
        showSettings={true}
        onSettingsClick={handleSettingsOpen}
        showRefresh={true}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        
        state={currentState}
        
        loadingMessage="Loading projects from Railway..."
        
        errorIcon={Train}
        errorMessage={errorMessage}
        errorActionLabel="Try Again"
        onErrorAction={handleErrorAction}
        errorActionLoading={errorActionLoading}
        
        emptyIcon={Train}
        emptyMessage="No projects found"
        emptySubmessage="Create a project on Railway to see it here."
        
        searchEnabled={true}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search projects..."
        
        rowSpan={rowSpan}
        dragRef={dragRef}
      >
        {filteredProjects.length === 0 && searchQuery ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <Train className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No projects match your search</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredProjects.map((project) => {
              const latestDeployment = projectDeployments[project.id];
              const isError = latestDeployment && isDeploymentFailed(latestDeployment.status);
              
              return (
                <div
                  key={project.id}
                  className={`p-3 rounded-lg border transition-all cursor-pointer group ${
                    isError
                      ? 'bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-900/20 dark:to-rose-900/20 border-red-200 dark:border-red-800 hover:shadow-md'
                      : 'bg-gradient-to-br from-gray-50 to-slate-50 dark:from-gray-900/40 dark:to-slate-900/40 border-gray-200 dark:border-gray-700 hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                  onClick={() => handleProjectClick(project)}
                >
                  {/* Project name and time */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Train className={`h-4 w-4 flex-shrink-0 ${
                        isError
                          ? 'text-red-600 dark:text-red-400'
                          : 'text-purple-600 dark:text-purple-400'
                      }`} />
                      <p className={`font-semibold text-sm line-clamp-1 ${
                        isError
                          ? 'text-red-900 dark:text-red-100'
                          : 'text-gray-900 dark:text-gray-100'
                      }`}>
                        {project.name}
                      </p>
                    </div>
                    <span className={`text-xs whitespace-nowrap flex-shrink-0 ${
                      isError
                        ? 'text-red-700 dark:text-red-300'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {formatRelativeDate(project.updatedAt)}
                    </span>
                  </div>
                  
                  {/* Description */}
                  {project.description && (
                    <p className={`text-xs line-clamp-1 mb-2 ${
                      isError
                        ? 'text-red-700 dark:text-red-300'
                        : 'text-gray-600 dark:text-gray-400'
                    }`}>
                      {project.description}
                    </p>
                  )}
                  
                  {/* Latest Deployment Status */}
                  {latestDeployment && (
                    <div className="mb-2 space-y-1.5">
                      {/* Service name with icon - truncate in middle */}
                      <div className="flex items-center gap-2">
                        {getDeploymentStatusIcon(latestDeployment.status)}
                        <span className={`text-xs font-medium truncate ${
                          isError
                            ? 'text-red-800 dark:text-red-200'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}>
                          {latestDeployment.service?.name || 'Unknown Service'}
                        </span>
                      </div>
                      
                      {/* Status and Environment chips */}
                      {/* <div className="flex items-center gap-2 flex-wrap"> */}
                        {/* Status chip */}
                        {/* <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          isError
                            ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200'
                            : latestDeployment.status?.toLowerCase() === 'active' || latestDeployment.status?.toLowerCase() === 'success'
                            ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200'
                            : latestDeployment.status?.toLowerCase() === 'building' || latestDeployment.status?.toLowerCase() === 'deploying'
                            ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200'
                            : 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200'
                        }`}>
                          {latestDeployment.status}
                        </span> */}
                        
                        {/* Environment chip */}
                        {/* {latestDeployment.environment?.name && (
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                            isError
                              ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                          }`}>
                            {latestDeployment.environment.name}
                          </span>
                        )}
                      </div> */}
                    </div>
                  )}
                  
                  {/* Metadata */}
                  <div className={`flex items-center gap-3 text-xs flex-wrap ${
                    isError
                      ? 'text-red-700 dark:text-red-300'
                      : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    <div className="flex items-center gap-1">
                      <Server className="h-3 w-3" />
                      <span>{project.services.length} service{project.services.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Box className="h-3 w-3" />
                      <span>{project.environments.length} env{project.environments.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </BaseWidgetV2>
      
      {/* Settings Modal */}
      <WidgetModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        title="Railway Settings"
        description="Configure how projects are displayed and refreshed."
        icon={Train}
        footer={
          <WidgetModalFooter
            onCancel={handleSettingsCancel}
            onSave={handleSettingsSave}
          />
        }
      >
        <div className="space-y-4">
          {/* Max Projects */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Maximum Projects
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Number of projects to display
            </p>
            <input
              type="number"
              min="5"
              max="50"
              value={tempSettings.maxProjects}
              onChange={(e) => setTempSettings({ ...tempSettings, maxProjects: parseInt(e.target.value) || 20 })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400 dark:focus:ring-gray-600 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>
          
          {/* Auto Refresh Toggle */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Auto Refresh
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Automatically refresh projects at regular intervals
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
                  selectedProjects: [],
                  selectAll: true,
                  maxProjects: 20,
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
      
      {/* Railway Explorer */}
      <RailwayExplorer
        open={explorerOpen}
        onOpenChange={handleExplorerClose}
        projectId={selectedProjectId}
        projectList={filteredProjects}
        onProjectChange={handleProjectChange}
      />
    </>
  );
}
