import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Eye, EyeOff, Save, Key, AppWindow, Trash2, Search, Grid3x3, Download, Upload, Database, Layers, Plus, Edit2, AlertTriangle } from 'lucide-react';
import { useCanvas } from '@/contexts/CanvasContext';
import { useToast } from '@/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getSecrets, setSecrets, SECRET_KEYS } from '@/services/secretsService';
import { getWidgetPreferences, setWidgetPreferences, getWidgetCanvasAssignments, setWidgetCanvasAssignments } from '@/services/widgetRegistry';
import { downloadConfig, uploadConfig, getConfigSummary } from '@/services/configService';
import { ScrollbarStyles } from '@/components/ui/scrollbar-styles';
import { CanvasVisualization } from './CanvasVisualization';

export function SettingsModal({ isOpen, onClose, availableWidgets }) {
  const { canvases } = useCanvas();
  const [activeTab, setActiveTab] = useState('apps');
  const [secrets, setSecretsState] = useState({});
  const [widgetPrefs, setWidgetPrefsState] = useState({});
  const [widgetCanvasAssignments, setWidgetCanvasAssignmentsState] = useState({});
  const [showSecrets, setShowSecrets] = useState({});
  const [saveStatus, setSaveStatus] = useState('');
  const [clearClickCount, setClearClickCount] = useState(0);
  const [appsSearchQuery, setAppsSearchQuery] = useState('');
  const [secretsSearchQuery, setSecretsSearchQuery] = useState('');
  const [uploadStatus, setUploadStatus] = useState('');
  const [noSpaceWarning, setNoSpaceWarning] = useState(null);
  const clearTimeoutRef = useRef(null);
  const modalRef = useRef(null);

  // Load data on mount
  useEffect(() => {
    if (isOpen) {
      const loadedSecrets = getSecrets();
      const loadedPrefs = getWidgetPreferences();
      const loadedCanvasAssignments = getWidgetCanvasAssignments();
      
      setSecretsState(loadedSecrets);
      setWidgetPrefsState(loadedPrefs);
      setWidgetCanvasAssignmentsState(loadedCanvasAssignments);
      setSaveStatus('');
      
      // Check if there's a widget that couldn't be placed
      const noSpaceData = localStorage.getItem('hashbase_widget_no_space');
      if (noSpaceData) {
        try {
          const parsed = JSON.parse(noSpaceData);
          setNoSpaceWarning(parsed);
          // Clear the flag
          localStorage.removeItem('hashbase_widget_no_space');
        } catch (e) {
          console.error('Error parsing no space data:', e);
        }
      } else {
        setNoSpaceWarning(null);
      }
    }
  }, [isOpen]);

  // Handle clicking outside the modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleSecretChange = (key, value) => {
    setSecretsState(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const toggleSecretVisibility = (key) => {
    setShowSecrets(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSaveSecrets = () => {
    try {
      setSecrets(secrets);
      setSaveStatus('Secrets saved successfully!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      setSaveStatus('Error saving secrets');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const handleToggleWidget = (widgetId) => {
    setWidgetPrefsState(prev => ({
      ...prev,
      [widgetId]: prev[widgetId] === false ? true : false
    }));
  };

  const handleToggleCanvasAssignment = (widgetId, canvasId) => {
    setWidgetCanvasAssignmentsState(prev => {
      const current = prev[widgetId];
      // If already assigned to this canvas, unassign
      if (current === canvasId) {
        const updated = { ...prev };
        delete updated[widgetId];
        return updated;
      }
      // Otherwise, assign to this canvas (one widget can only be in one canvas)
      return {
        ...prev,
        [widgetId]: canvasId
      };
    });
  };

  const handleSaveWidgetPrefs = () => {
    try {
      setWidgetPreferences(widgetPrefs);
      setWidgetCanvasAssignments(widgetCanvasAssignments);
      setSaveStatus('App preferences saved! Refreshing page...');
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error) {
      setSaveStatus('Error saving preferences');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const handleDeleteSecret = (key) => {
    setSecretsState(prev => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  const handleClearAllData = async () => {
    console.log('🗑️ handleClearAllData called, click count:', clearClickCount);
    
    if (clearClickCount === 0) {
      console.log('⚠️ First click - downloading config and asking for confirmation');
      
      // Download config first
      try {
        await downloadConfig();
        console.log('✅ Config downloaded successfully');
        setSaveStatus('Config downloaded! Click again to delete all data');
      } catch (error) {
        console.error('❌ Error downloading config:', error);
        setSaveStatus('Config download failed. Click again to delete anyway');
      }
      
      setClearClickCount(1);
      
      // Reset after 5 seconds (longer to give user time to see the download)
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current);
      }
      clearTimeoutRef.current = setTimeout(() => {
        console.log('⏱️ Confirmation timeout - resetting');
        setClearClickCount(0);
        setSaveStatus('');
      }, 5000);
    } else {
      console.log('✅ Second click - proceeding with deletion');
      try {
        console.log('📦 Clearing localStorage...');
        // Clear all localStorage
        localStorage.clear();
        console.log('✅ localStorage cleared successfully');
        setSaveStatus('All data cleared! Refreshing page...');
        setClearClickCount(0);
        if (clearTimeoutRef.current) {
          clearTimeout(clearTimeoutRef.current);
        }
        console.log('⏳ Scheduling page reload in 1.5s...');
        setTimeout(() => {
          console.log('🔄 Reloading page now...');
          window.location.reload();
        }, 1500);
      } catch (error) {
        console.error('❌ Error clearing data:', error);
        setSaveStatus('Error clearing data');
        setTimeout(() => setSaveStatus(''), 3000);
        setClearClickCount(0);
      }
    }
  };

  const handleDownloadConfig = async () => {
    try {
      await downloadConfig();
      setSaveStatus('Configuration downloaded successfully!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error('Error downloading config:', error);
      setSaveStatus('Error downloading configuration');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const handleUploadConfig = async () => {
    try {
      setUploadStatus('Uploading...');
      const result = await uploadConfig();
      
      if (result.success) {
        const encryptMsg = result.encrypted ? ' (secrets were encrypted)' : '';
        setUploadStatus(`${result.message}${encryptMsg}. Refreshing in 2 seconds...`);
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setUploadStatus(`Error: ${result.message}`);
        setTimeout(() => setUploadStatus(''), 5000);
      }
    } catch (error) {
      console.error('Error uploading config:', error);
      setUploadStatus(`Error: ${error.message}`);
      setTimeout(() => setUploadStatus(''), 5000);
    }
  };

  const secretFields = [
    {
      key: SECRET_KEYS.NETLIFY_ACCESS_TOKEN,
      label: 'Netlify Access Token',
      description: 'Get from Netlify User Settings > Applications',
      placeholder: 'nfp_xxxxxxxxxxxxx'
    },
    {
      key: SECRET_KEYS.OPENAI_API_KEY,
      label: 'OpenAI API Key',
      description: 'Get from platform.openai.com/api-keys (for AI Chat widget)',
      placeholder: 'sk-proj-xxxxxxxxxxxxx'
    },
    {
      key: SECRET_KEYS.OPENAI_ADMIN_KEY,
      label: 'OpenAI Admin API Key',
      description: 'Get from platform.openai.com/settings/organization/admin-keys (for Usage widget)',
      placeholder: 'sk-xxxxxxxxxxxxx'
    },
    {
      key: SECRET_KEYS.CLAUDE_API_KEY,
      label: 'Claude API Key (Anthropic)',
      description: 'Get from console.anthropic.com/settings/keys',
      placeholder: 'sk-ant-xxxxxxxxxxxxx'
    },
    {
      key: SECRET_KEYS.TAVILY_API_KEY,
      label: 'Tavily API Key (Web Search)',
      description: 'Get from tavily.com (free tier: 1000 searches/month)',
      placeholder: 'tvly-xxxxxxxxxxxxx'
    },
    {
      key: SECRET_KEYS.GITHUB_TOKEN,
      label: 'GitHub Personal Access Token',
      description: 'Get from github.com/settings/tokens (needs repo scope)',
      placeholder: 'ghp_xxxxxxxxxxxxx'
    },
    {
      key: SECRET_KEYS.POSTHOG_ACCESS_TOKEN,
      label: 'PostHog Personal API Key',
      description: 'Get from PostHog Settings > Personal API Keys (requires project:read scope)',
      placeholder: 'phx_xxxxxxxxxxxxx'
    },
    {
      key: SECRET_KEYS.RAILWAY_TOKEN,
      label: 'Railway API Token',
      description: 'Get from railway.app/account/tokens (use Personal Token, not Project Token)',
      placeholder: 'railway_xxxxxxxxxxxxx'
    }
  ];

  // Filter and sort apps alphabetically based on search query
  const filteredApps = useMemo(() => {
    let apps = availableWidgets;
    
    // Filter by search query if provided
    if (appsSearchQuery.trim()) {
      const query = appsSearchQuery.toLowerCase();
      apps = apps.filter(widget => 
        widget.name.toLowerCase().includes(query) || 
        widget.description.toLowerCase().includes(query)
      );
    }
    
    // Sort alphabetically by name
    return apps.sort((a, b) => a.name.localeCompare(b.name));
  }, [availableWidgets, appsSearchQuery]);

  // Get all secrets (predefined + custom) and sort alphabetically
  const allSecrets = useMemo(() => {
    const predefinedKeys = secretFields.map(f => f.key);
    const customKeys = Object.keys(secrets).filter(key => !predefinedKeys.includes(key));
    
    // Combine predefined and custom secrets
    const combined = [
      ...secretFields,
      ...customKeys.map(key => ({
        key,
        label: key,
        description: 'Custom secret',
        placeholder: '••••••••',
        isCustom: true
      }))
    ];
    
    // Sort alphabetically by label
    combined.sort((a, b) => a.label.localeCompare(b.label));
    
    // Filter by search query
    if (!secretsSearchQuery.trim()) return combined;
    const query = secretsSearchQuery.toLowerCase();
    return combined.filter(field => 
      field.label.toLowerCase().includes(query) || 
      field.description.toLowerCase().includes(query)
    );
  }, [secrets, secretsSearchQuery]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div ref={modalRef} className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col border-2 border-gray-200 dark:border-gray-800">
        {/* Modal Header - Modal Name & Close Button */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Configuration</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="Close modal"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex gap-2" role="tablist">
            <button
              onClick={() => setActiveTab('apps')}
              role="tab"
              aria-selected={activeTab === 'apps'}
              aria-controls="apps-panel"
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'apps'
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-b-2 border-gray-900 dark:border-gray-100'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <AppWindow className="h-4 w-4" />
              Apps
            </button>
            <button
              onClick={() => setActiveTab('secrets')}
              role="tab"
              aria-selected={activeTab === 'secrets'}
              aria-controls="secrets-panel"
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'secrets'
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-b-2 border-gray-900 dark:border-gray-100'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Key className="h-4 w-4" />
              Secrets
            </button>
            <button
              onClick={() => setActiveTab('canvas')}
              role="tab"
              aria-selected={activeTab === 'canvas'}
              aria-controls="canvas-panel"
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'canvas'
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-b-2 border-gray-900 dark:border-gray-100'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Layers className="h-4 w-4" />
              Canvases
            </button>
            <button
              onClick={() => setActiveTab('storage')}
              role="tab"
              aria-selected={activeTab === 'storage'}
              aria-controls="storage-panel"
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'storage'
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-b-2 border-gray-900 dark:border-gray-100'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Database className="h-4 w-4" />
              Backup
            </button>
          </div>
        </div>

        {/* Modal Content Area */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <ScrollbarStyles />
          {/* Apps Tab Panel */}
          {activeTab === 'apps' && (
            <div id="apps-panel" role="tabpanel" aria-labelledby="apps-tab" className="space-y-4">
              {/* Tab Description */}
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Enable or disable widgets and assign them to specific canvases. Each widget can only be assigned to one canvas at a time. Changes will take effect after refreshing the page.
              </p>
              
              {/* No Space Warning */}
              {noSpaceWarning && (
                <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                  <h3 className="text-sm font-semibold text-yellow-900 dark:text-yellow-100 mb-1">
                    ⚠️ Widget Could Not Be Placed
                  </h3>
                  <p className="text-xs text-yellow-800 dark:text-yellow-200">
                    <strong>{noSpaceWarning.widgetName}</strong> requires {noSpaceWarning.rowSpan} row{noSpaceWarning.rowSpan > 1 ? 's' : ''} but no empty space was found in the layout. 
                    Please disable some widgets or rearrange your layout to make room, then try enabling this widget again.
                  </p>
                  <button
                    onClick={() => setNoSpaceWarning(null)}
                    className="mt-2 text-xs text-yellow-700 dark:text-yellow-300 hover:underline"
                  >
                    Dismiss
                  </button>
                </div>
              )}
              
              {/* Searchbar */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search apps..."
                  value={appsSearchQuery}
                  onChange={(e) => setAppsSearchQuery(e.target.value)}
                  className="pl-10 rounded-lg border-gray-300 dark:border-gray-700 bg-transparent"
                  aria-label="Search apps"
                />
              </div>
              
              {/* Content Specifics - List of Apps with Toggle Controls */}
              <div className="space-y-3">
                {filteredApps.length === 0 ? (
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
                    No apps found matching "{appsSearchQuery}"
                  </p>
                ) : (
                  filteredApps.map((widget) => {
                  const isEnabled = widgetPrefs[widget.id] !== false;
                  const assignedCanvas = widgetCanvasAssignments[widget.id];
                  return (
                    <div
                      key={widget.id}
                      className="p-4 rounded-lg border-2 border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
                    >
                      {/* Header: Icon, Title, Details & Toggle */}
                      <div className="flex items-center justify-between mb-3">
                        {/* Title & Details */}
                        <div className="flex items-center gap-3">
                          {widget.icon && <widget.icon className="h-5 w-5 text-gray-700 dark:text-gray-300" />}
                          <div>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {widget.name} <span className="text-gray-500 dark:text-gray-400">({widget.rowSpan} {widget.rowSpan === 1 ? 'row' : 'rows'})</span>
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400">{widget.description}</p>
                          </div>
                        </div>
                        {/* Parameter Type: Toggle Button */}
                        <button
                          onClick={() => handleToggleWidget(widget.id)}
                          role="switch"
                          aria-checked={isEnabled}
                          aria-label={`Toggle ${widget.name}`}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            isEnabled ? 'bg-gray-900 dark:bg-gray-100' : 'bg-gray-300 dark:bg-gray-700'
                          }`}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full transition-transform ${
                              isEnabled ? 'bg-white dark:bg-gray-900 translate-x-6' : 'bg-white translate-x-1'
                            }`}
                          />
                        </button>
                      </div>
                      
                      {/* Canvas Assignment Checkboxes */}
                      {isEnabled && (
                        <div className="pl-8">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">Assign to Canvas:</p>
                          <div className="flex flex-wrap gap-2">
                            {canvases.map((canvas) => {
                              const isAssigned = assignedCanvas === canvas.id;
                              return (
                                <button
                                  key={canvas.id}
                                  onClick={() => handleToggleCanvasAssignment(widget.id, canvas.id)}
                                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                                    isAssigned
                                      ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                  }`}
                                >
                                  <div className={`w-3 h-3 rounded-sm border-2 flex items-center justify-center ${
                                    isAssigned
                                      ? 'border-white dark:border-gray-900 bg-white dark:bg-gray-900'
                                      : 'border-gray-400 dark:border-gray-600'
                                  }`}>
                                    {isAssigned && (
                                      <svg className="w-2 h-2 text-gray-900 dark:text-gray-100" fill="currentColor" viewBox="0 0 12 12">
                                        <path d="M10 3L4.5 8.5L2 6" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                                      </svg>
                                    )}
                                  </div>
                                  {canvas.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                  })
                )}
              </div>

              {/* Action Button Area */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-800">
                <div>
                  {saveStatus && (
                    <p className={`text-sm ${saveStatus.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                      {saveStatus}
                    </p>
                  )}
                </div>
                <Button onClick={handleSaveWidgetPrefs} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save Preferences
                </Button>
              </div>
            </div>
          )}

          {/* Secrets Tab Panel */}
          {activeTab === 'secrets' && (
            <div id="secrets-panel" role="tabpanel" aria-labelledby="secrets-tab" className="space-y-4">
              {/* Tab Description */}
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Configure your API credentials. These are stored securely in your browser's local storage and never sent to any external server.
              </p>
              
              {/* Searchbar */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search secrets..."
                  value={secretsSearchQuery}
                  onChange={(e) => setSecretsSearchQuery(e.target.value)}
                  className="pl-10 rounded-lg border-gray-300 dark:border-gray-700 bg-transparent"
                  aria-label="Search secrets"
                />
              </div>

              {/* Content Specifics - List of Secrets with Input Controls */}
              <div className="space-y-4">
                {allSecrets.length === 0 ? (
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
                    No secrets found matching "{secretsSearchQuery}"
                  </p>
                ) : (
                  allSecrets.map((field) => (
                  <div key={field.key} className="space-y-2">
                    {/* Title */}
                    <Label htmlFor={field.key} className="text-sm font-medium">
                      {field.label}
                    </Label>
                    {/* Details */}
                    <p className="text-xs text-gray-600 dark:text-gray-400">{field.description}</p>
                    {/* Parameter Type: Input Box with Action Buttons */}
                    <div className="relative">
                      <Input
                        id={field.key}
                        type={showSecrets[field.key] ? 'text' : 'password'}
                        value={secrets[field.key] || ''}
                        onChange={(e) => handleSecretChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="pr-10 rounded-lg border-gray-300 dark:border-gray-700 bg-transparent"
                      />
                      {/* Action Button: Toggle Visibility */}
                      <button
                        type="button"
                        onClick={() => toggleSecretVisibility(field.key)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        aria-label={showSecrets[field.key] ? 'Hide secret' : 'Show secret'}
                      >
                        {showSecrets[field.key] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                      {/* Action Button: Delete (for custom secrets) */}
                      {field.isCustom && (
                        <button
                          type="button"
                          onClick={() => handleDeleteSecret(field.key)}
                          className="absolute right-12 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200"
                          aria-label="Delete custom secret"
                          title="Delete custom secret"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  ))
                )}
              </div>

              {/* Action Button Area */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-800">
                <div>
                  {saveStatus && (
                    <p className={`text-sm ${saveStatus.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                      {saveStatus}
                    </p>
                  )}
                </div>
                <Button onClick={handleSaveSecrets} className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Save Secrets
                </Button>
              </div>
            </div>
          )}

          {/* Canvas Tab Panel */}
          {activeTab === 'canvas' && (
            <CanvasManagementPanel onClose={onClose} />
          )}

          {/* Storage Tab Panel */}
          {activeTab === 'storage' && (
            <div id="storage-panel" role="tabpanel" aria-labelledby="storage-tab" className="space-y-4">
              {/* Tab Description */}
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Export and import your entire dashboard configuration with automatic AES-256 encryption.
              </p>

              {/* Configuration Backup & Restore */}
              <div className="p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800">
                <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-2">Configuration Backup & Restore</h3>
                <p className="text-xs text-purple-800 dark:text-purple-200 mb-3">
                  Export your entire dashboard configuration with automatic AES-256 encryption.
                </p>
                {/* Action Buttons: Download & Upload */}
                <div className="flex gap-2">
                  <Button
                    onClick={handleDownloadConfig}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 flex-1 border-purple-500 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20 bg-transparent"
                  >
                    <Download className="h-4 w-4" />
                    Download Config
                  </Button>
                  <Button
                    onClick={handleUploadConfig}
                    variant="outline"
                    size="sm"
                    className="flex items-center gap-2 flex-1 border-purple-500 text-purple-600 dark:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-950/20 bg-transparent"
                  >
                    <Upload className="h-4 w-4" />
                    Upload Config
                  </Button>
                </div>
                {uploadStatus && (
                  <p className={`text-xs mt-2 ${
                    uploadStatus.includes('Error') ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'
                  }`}>
                    {uploadStatus}
                  </p>
                )}
              </div>

              <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700">
                <p className="text-xs text-gray-900 dark:text-gray-100">
                  <strong>Note:</strong> Your data is stored locally in your browser. Use the backup features above to transfer settings between devices or browsers.
                </p>
              </div>

              {/* Danger Zone: Clear All Data */}
              <div className="p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">Danger Zone</h3>
                    <p className="text-xs text-red-800 dark:text-red-200">
                      Clear all stored data including secrets, preferences, Gmail tokens, and widget layouts.
                    </p>
                  </div>
                  {/* Action Button: Destructive Action */}
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={(e) => {
                      console.log('🖱️ Clear All Data button clicked', e);
                      handleClearAllData();
                    }}
                    className={`flex items-center gap-2 ml-4 transition-all ${
                      clearClickCount === 1 ? 'animate-pulse ring-2 ring-red-500' : ''
                    }`}
                  >
                    <Trash2 className="h-4 w-4" />
                    {clearClickCount === 1 ? 'Click Again to Confirm' : 'Clear All Data'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

/**
 * Canvas Management Panel Component
 * Manages multiple canvases - create, delete, rename, switch
 */
function CanvasManagementPanel({ onClose }) {
  const { 
    canvases, 
    activeCanvasId, 
    createCanvas, 
    deleteCanvas, 
    setActiveCanvasId,
    renameCanvas 
  } = useCanvas();
  const { addToast } = useToast();
  
  const [editingCanvasId, setEditingCanvasId] = useState(null);
  const [editName, setEditName] = useState('');

  const handleStartEdit = (canvas) => {
    setEditingCanvasId(canvas.id);
    setEditName(canvas.name);
  };

  const handleSaveEdit = () => {
    if (editName.trim() && editingCanvasId) {
      renameCanvas(editingCanvasId, editName.trim());
      setEditingCanvasId(null);
      setEditName('');
    }
  };

  const handleCancelEdit = () => {
    setEditingCanvasId(null);
    setEditName('');
  };

  const handleDeleteClick = (canvas) => {
    if (canvases.length <= 1) {
      addToast('You must have at least one canvas.', 'error');
      return;
    }

    const success = deleteCanvas(canvas.id);
    if (success) {
      addToast(`${canvas.name} has been permanently deleted.`, 'success');
    } else {
      addToast('Unable to delete the canvas. Please try again.', 'error');
    }
  };

  const handleCreateCanvas = () => {
    createCanvas();
  };

  const handleSwitchCanvas = (canvasId) => {
    setActiveCanvasId(canvasId);
  };

  return (
    <div id="canvas-panel" role="tabpanel" aria-labelledby="canvas-tab" className="space-y-4">
      {/* Tab Description */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        Manage your canvases. Each canvas has its own independent widget layout. Create multiple canvases to organize different workspaces.
      </p>

      {/* Create New Canvas Button */}
      <button
        onClick={handleCreateCanvas}
        className="w-full px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex items-center justify-center gap-2"
      >
        <Plus className="h-4 w-4" />
        Create New Canvas
      </button>

      {/* Canvas List */}
      <div className="space-y-3">
        {canvases.map((canvas) => {
          const isActive = canvas.id === activeCanvasId;
          const isEditing = editingCanvasId === canvas.id;

          return (
            <div
              key={canvas.id}
              className={`p-4 rounded-lg border-2 transition-all ${
                isActive
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center justify-between">
                {/* Canvas Info */}
                <div className="flex items-center gap-3 flex-1">
                  <Layers className={`h-5 w-5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`} />
                  
                  {isEditing ? (
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveEdit();
                          if (e.key === 'Escape') handleCancelEdit();
                        }}
                        className="h-8 text-sm"
                        autoFocus
                      />
                      <Button
                        onClick={handleSaveEdit}
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2"
                      >
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={handleCancelEdit}
                        size="sm"
                        variant="ghost"
                        className="h-8 px-2"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`font-medium ${isActive ? 'text-blue-900 dark:text-blue-100' : 'text-gray-900 dark:text-gray-100'}`}>
                          {canvas.name}
                        </p>
                        {isActive && (
                          <Badge className="bg-blue-500 text-white text-xs">Active</Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        Created: {new Date(canvas.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {!isEditing && (
                  <div className="flex items-center gap-2">
                    {/* Switch Button */}
                    {!isActive && (
                      <Button
                        onClick={() => handleSwitchCanvas(canvas.id)}
                        size="sm"
                        variant="outline"
                        className="border-blue-500 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/20"
                      >
                        Switch
                      </Button>
                    )}

                    {/* Edit Button */}
                    <Button
                      onClick={() => handleStartEdit(canvas)}
                      size="sm"
                      variant="ghost"
                      className="h-8 w-8 p-0"
                      title="Rename canvas"
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>

                    {/* Delete Button */}
                    {canvases.length > 1 && (
                      <Button
                        onClick={() => handleDeleteClick(canvas)}
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                        title="Delete canvas"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Info Note */}
      <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700">
        <p className="text-xs text-gray-900 dark:text-gray-100">
          <strong>Note:</strong> Each canvas maintains its own widget layout. Deleting a canvas will permanently remove its layout. You must have at least one canvas.
        </p>
      </div>

      {/* Canvas Visualization */}
      <div className="mt-6">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Current Canvas Layout</h3>
        <CanvasVisualization />
      </div>
    </div>
  );
}
