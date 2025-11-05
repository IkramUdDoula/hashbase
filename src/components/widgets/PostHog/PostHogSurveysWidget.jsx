import React, { useState, useEffect } from 'react';
import { BaseWidgetV2 } from '../../BaseWidgetV2';
import { 
  ClipboardList,
  Settings as SettingsIcon,
  Clock,
  MessageSquare,
  Archive,
  Play,
  Pause
} from 'lucide-react';
import { SiPosthog } from 'react-icons/si';
import { 
  fetchSurveys,
  isPostHogConfigured,
  getSurveyStatus,
  updateSurvey,
  fetchAllSurveyResponsesCount
} from '@/services/posthogService';
import { formatRelativeDate } from '@/lib/dateUtils';
import { WidgetModal, WidgetModalFooter } from '@/components/ui/widget-modal';
import { Badge } from '@/components/ui/badge';
import { PostHogSurveysExplorer } from './PostHogSurveysExplorer';

export function PostHogSurveysWidget({ rowSpan = 2, dragRef }) {
  const [surveys, setSurveys] = useState([]);
  const [responseCounts, setResponseCounts] = useState({});
  const [currentState, setCurrentState] = useState('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [errorActionLoading, setErrorActionLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const [settings, setSettings] = useState({
    projectId: '',
    projectUrl: 'https://app.posthog.com',
    maxSurveys: 50,
    refreshInterval: 5,
    autoRefresh: true,
    sortBy: 'created-desc',
    showArchived: false
  });
  
  const [tempSettings, setTempSettings] = useState(settings);
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [selectedSurveyId, setSelectedSurveyId] = useState(null);
  
  useEffect(() => {
    const savedSettings = localStorage.getItem('posthog_surveys_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
        setTempSettings(parsed);
      } catch (e) {
        console.error('Failed to load PostHog surveys settings:', e);
      }
    }
    setIsInitialized(true);
  }, []);
  
  useEffect(() => {
    if (!isInitialized) return;
    try {
      localStorage.setItem('posthog_surveys_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save PostHog surveys settings:', error);
    }
  }, [settings, isInitialized]);
  
  const loadSurveys = async () => {
    try {
      setErrorMessage('');
      
      if (!isPostHogConfigured()) {
        setErrorMessage('PostHog access token not configured. Add it in Settings → Secrets.');
        setCurrentState('error');
        setRefreshing(false);
        return;
      }

      if (!settings.projectId) {
        setErrorMessage('PostHog project ID not configured. Add it in widget settings.');
        setCurrentState('error');
        setRefreshing(false);
        return;
      }

      const [data, counts] = await Promise.all([
        fetchSurveys(settings.projectId, {
          limit: settings.maxSurveys,
          offset: 0
        }),
        fetchAllSurveyResponsesCount(settings.projectId, settings.projectUrl)
      ]);
      
      setResponseCounts(counts);
      
      if (data.results.length === 0) {
        setSurveys([]);
        setCurrentState('empty');
      } else {
        setSurveys(data.results);
        setCurrentState('positive');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load surveys');
      setCurrentState('error');
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (isInitialized) {
      loadSurveys();
    }
  }, [isInitialized, settings.projectId, settings.maxSurveys]);
  
  useEffect(() => {
    if (settings.autoRefresh && currentState === 'positive') {
      const interval = setInterval(() => {
        setRefreshing(true);
        loadSurveys();
      }, settings.refreshInterval * 60 * 1000);
      
      return () => clearInterval(interval);
    }
  }, [settings.autoRefresh, settings.refreshInterval, currentState]);
  
  const handleRefresh = () => {
    setRefreshing(true);
    setCurrentState('loading');
    loadSurveys();
  };
  
  const handleSettingsOpen = () => {
    setTempSettings(settings);
    setSettingsOpen(true);
  };
  
  const handleSettingsSave = () => {
    setSettings(tempSettings);
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
    loadSurveys();
  };
  
  const handleSurveyClick = (survey) => {
    setSelectedSurveyId(survey.id);
    setExplorerOpen(true);
  };
  
  const handleSurveyChange = (surveyId) => {
    setSelectedSurveyId(surveyId);
  };
  
  const filteredSurveys = surveys.filter(survey => {
    if (!settings.showArchived && survey.archived) return false;
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      survey.name?.toLowerCase().includes(query) ||
      survey.description?.toLowerCase().includes(query)
    );
  }).sort((a, b) => {
    switch (settings.sortBy) {
      case 'created-desc':
        return new Date(b.created_at) - new Date(a.created_at);
      case 'created-asc':
        return new Date(a.created_at) - new Date(b.created_at);
      case 'name-asc':
        return (a.name || '').localeCompare(b.name || '');
      case 'name-desc':
        return (b.name || '').localeCompare(a.name || '');
      default:
        return 0;
    }
  });
  
  const getStatusBadge = (survey) => {
    const status = getSurveyStatus(survey);
    const colors = {
      running: 'bg-green-100 hover:bg-green-200 text-green-800 dark:bg-green-900/30 hover:dark:bg-green-900/50 dark:text-green-300',
      draft: 'bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900/30 hover:dark:bg-blue-900/50 dark:text-blue-300',
      completed: 'bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-900/30 hover:dark:bg-gray-900/50 dark:text-gray-300',
      archived: 'bg-gray-200 hover:bg-gray-300 text-gray-600 dark:bg-gray-800/50 hover:dark:bg-gray-800/60 dark:text-gray-400'
    };
    
    return (
      <Badge className={`text-xs ${colors[status] || colors.draft}`}>
        {status}
      </Badge>
    );
  };
  
  return (
    <>
      <BaseWidgetV2
        logo={SiPosthog}
        appName="PostHog"
        widgetName="Surveys"
        tooltip="Manage and view PostHog surveys"
        badge={surveys.length > 0 ? <Badge variant="secondary">{surveys.length}</Badge> : null}
        showSettings={true}
        onSettingsClick={handleSettingsOpen}
        showRefresh={true}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        state={currentState}
        loadingMessage="Loading surveys from PostHog..."
        errorIcon={ClipboardList}
        errorMessage={errorMessage || "Failed to load surveys. Please check your settings and try again."}
        errorActionLabel="Try Again"
        onErrorAction={handleErrorAction}
        errorActionLoading={errorActionLoading}
        emptyIcon={ClipboardList}
        emptyMessage="No surveys found"
        emptySubmessage="Create your first survey in PostHog"
        searchEnabled={true}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search surveys..."
        rowSpan={rowSpan}
        dragRef={dragRef}
      >
        {filteredSurveys.length === 0 && searchQuery ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <ClipboardList className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No surveys match your search</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredSurveys.map((survey) => (
              <div
                key={survey.id}
                className="p-3 rounded-lg border bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-700 transition-all cursor-pointer group"
                onClick={() => handleSurveyClick(survey)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                      {survey.name}
                    </span>
                    {getStatusBadge(survey)}
                  </div>
                </div>
                
                {survey.description && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2 line-clamp-1">
                    {survey.description}
                  </p>
                )}

                <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-3">
                    {survey.questions && (
                      <div className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        <span>{survey.questions.length}</span>
                      </div>
                    )}
                    {responseCounts[survey.id] !== undefined && (
                      <div className="flex items-center gap-1">
                        <ClipboardList className="h-3 w-3" />
                        <span>{responseCounts[survey.id] || 0}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span className="whitespace-nowrap">
                      {formatRelativeDate(survey.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </BaseWidgetV2>
      
      <WidgetModal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        title="PostHog Surveys Settings"
        description="Configure your PostHog surveys preferences."
        icon={SiPosthog}
        footer={
          <WidgetModalFooter
            onCancel={handleSettingsCancel}
            onSave={handleSettingsSave}
          />
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Project ID *
            </label>
            <input
              type="text"
              value={tempSettings.projectId}
              onChange={(e) => setTempSettings({ ...tempSettings, projectId: e.target.value })}
              placeholder="12345"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Project URL
            </label>
            <input
              type="text"
              value={tempSettings.projectUrl}
              onChange={(e) => setTempSettings({ ...tempSettings, projectUrl: e.target.value })}
              placeholder="https://app.posthog.com"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Sort By
            </label>
            <select
              value={tempSettings.sortBy}
              onChange={(e) => setTempSettings({ ...tempSettings, sortBy: e.target.value })}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400"
            >
              <option value="created-desc">Created Date (Newest First)</option>
              <option value="created-asc">Created Date (Oldest First)</option>
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
            </select>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Show Archived Surveys
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Include archived surveys in the list
            </p>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={tempSettings.showArchived}
                onChange={(e) => setTempSettings({ ...tempSettings, showArchived: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-300 dark:bg-gray-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900 dark:peer-checked:bg-gray-100 peer-checked:after:bg-white dark:peer-checked:after:bg-gray-900"></div>
              <span className="ml-3 text-sm text-gray-900 dark:text-gray-100">
                {tempSettings.showArchived ? 'Enabled' : 'Disabled'}
              </span>
            </label>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
              Auto Refresh
            </label>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Automatically refresh surveys at regular intervals
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
          
          {tempSettings.autoRefresh && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">
                Refresh Interval (minutes)
              </label>
              <select
                value={tempSettings.refreshInterval}
                onChange={(e) => setTempSettings({ ...tempSettings, refreshInterval: parseInt(e.target.value) })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-gray-400"
              >
                <option value="1">1 minute</option>
                <option value="5">5 minutes</option>
                <option value="10">10 minutes</option>
                <option value="15">15 minutes</option>
                <option value="30">30 minutes</option>
              </select>
            </div>
          )}
        </div>
      </WidgetModal>
      
      <PostHogSurveysExplorer
        open={explorerOpen}
        onOpenChange={setExplorerOpen}
        surveyId={selectedSurveyId}
        surveyList={filteredSurveys}
        onSurveyChange={handleSurveyChange}
        projectUrl={settings.projectUrl}
        projectId={settings.projectId}
        onUpdate={loadSurveys}
      />
    </>
  );
}
