import React, { useState, useEffect, useRef, useMemo } from 'react';
import { X, Eye, EyeOff, Save, Key, AppWindow, Trash2, Search, Plus, Grid3x3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { getSecrets, setSecrets, SECRET_KEYS } from '@/services/secretsService';
import { getWidgetPreferences, setWidgetPreferences } from '@/services/widgetRegistry';
import { ScrollbarStyles } from '@/components/ui/scrollbar-styles';
import { CanvasVisualization } from './CanvasVisualization';

export function SettingsModal({ isOpen, onClose, availableWidgets }) {
  const [activeTab, setActiveTab] = useState('apps');
  const [secrets, setSecretsState] = useState({});
  const [widgetPrefs, setWidgetPrefsState] = useState({});
  const [showSecrets, setShowSecrets] = useState({});
  const [saveStatus, setSaveStatus] = useState('');
  const [clearClickCount, setClearClickCount] = useState(0);
  const [appsSearchQuery, setAppsSearchQuery] = useState('');
  const [secretsSearchQuery, setSecretsSearchQuery] = useState('');
  const [newSecretKey, setNewSecretKey] = useState('');
  const [newSecretValue, setNewSecretValue] = useState('');
  const [showAddSecret, setShowAddSecret] = useState(false);
  const clearTimeoutRef = useRef(null);
  const modalRef = useRef(null);

  // Load data on mount
  useEffect(() => {
    if (isOpen) {
      const loadedSecrets = getSecrets();
      const loadedPrefs = getWidgetPreferences();
      
      setSecretsState(loadedSecrets);
      setWidgetPrefsState(loadedPrefs);
      setSaveStatus('');
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

  const handleSaveWidgetPrefs = () => {
    try {
      setWidgetPreferences(widgetPrefs);
      setSaveStatus('App preferences saved! Refresh to see changes.');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      setSaveStatus('Error saving preferences');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const handleAddSecret = () => {
    if (newSecretKey.trim() && newSecretValue.trim()) {
      handleSecretChange(newSecretKey.trim(), newSecretValue.trim());
      setNewSecretKey('');
      setNewSecretValue('');
      setShowAddSecret(false);
    }
  };

  const handleDeleteSecret = (key) => {
    setSecretsState(prev => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  };

  const handleClearAllData = () => {
    console.log('🗑️ handleClearAllData called, click count:', clearClickCount);
    
    if (clearClickCount === 0) {
      console.log('⚠️ First click - asking for confirmation');
      setClearClickCount(1);
      setSaveStatus('Click again to confirm deletion');
      
      // Reset after 3 seconds
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current);
      }
      clearTimeoutRef.current = setTimeout(() => {
        console.log('⏱️ Confirmation timeout - resetting');
        setClearClickCount(0);
        setSaveStatus('');
      }, 3000);
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
      description: 'Get from platform.openai.com/api-keys',
      placeholder: 'sk-proj-xxxxxxxxxxxxx'
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
    }
  ];

  // Filter and sort apps based on search query
  const filteredApps = useMemo(() => {
    if (!appsSearchQuery.trim()) return availableWidgets;
    const query = appsSearchQuery.toLowerCase();
    return availableWidgets.filter(widget => 
      widget.name.toLowerCase().includes(query) || 
      widget.description.toLowerCase().includes(query)
    );
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
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Configuration</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 border-b border-gray-200 dark:border-gray-800">
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('apps')}
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
              className={`px-4 py-2 rounded-t-lg font-medium transition-colors flex items-center gap-2 ${
                activeTab === 'canvas'
                  ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 border-b-2 border-gray-900 dark:border-gray-100'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Grid3x3 className="h-4 w-4" />
              Canvas
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <ScrollbarStyles />
          {activeTab === 'apps' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Enable or disable widgets to show on your canvas. Changes will take effect after refreshing the page.
              </p>
              
              {/* Search bar for apps */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="text"
                  placeholder="Search apps..."
                  value={appsSearchQuery}
                  onChange={(e) => setAppsSearchQuery(e.target.value)}
                  className="pl-10 rounded-lg border-gray-300 dark:border-gray-700 bg-transparent"
                />
              </div>
              
              <div className="space-y-3">
                {filteredApps.length === 0 ? (
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
                    No apps found matching "{appsSearchQuery}"
                  </p>
                ) : (
                  filteredApps.map((widget) => {
                  const isEnabled = widgetPrefs[widget.id] !== false;
                  return (
                    <div
                      key={widget.id}
                      className="flex items-center justify-between p-4 rounded-lg border-2 border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {widget.icon && <widget.icon className="h-5 w-5 text-gray-700 dark:text-gray-300" />}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{widget.name}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-400">{widget.description}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleWidget(widget.id)}
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
                  );
                  })
                )}
              </div>

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

          {activeTab === 'secrets' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Configure your API credentials. These are stored securely in your browser's local storage and never sent to any external server.
              </p>
              
              {/* Search bar and Add button for secrets */}
              <div className="flex gap-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search secrets..."
                    value={secretsSearchQuery}
                    onChange={(e) => setSecretsSearchQuery(e.target.value)}
                    className="pl-10 rounded-lg border-gray-300 dark:border-gray-700 bg-transparent"
                  />
                </div>
                <Button
                  onClick={() => setShowAddSecret(!showAddSecret)}
                  variant="outline"
                  size="icon"
                  title="Add custom secret"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Add custom secret form */}
              {showAddSecret && (
                <div className="p-4 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Add Custom Secret</h3>
                  <Input
                    placeholder="Secret key (e.g., MY_API_KEY)"
                    value={newSecretKey}
                    onChange={(e) => setNewSecretKey(e.target.value)}
                    className="rounded-lg border-gray-300 dark:border-gray-700 bg-transparent"
                  />
                  <Input
                    type="password"
                    placeholder="Secret value"
                    value={newSecretValue}
                    onChange={(e) => setNewSecretValue(e.target.value)}
                    className="rounded-lg border-gray-300 dark:border-gray-700 bg-transparent"
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleAddSecret} size="sm" className="flex-1">
                      Add Secret
                    </Button>
                    <Button onClick={() => setShowAddSecret(false)} variant="outline" size="sm" className="flex-1">
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {allSecrets.length === 0 ? (
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
                    No secrets found matching "{secretsSearchQuery}"
                  </p>
                ) : (
                  allSecrets.map((field) => (
                  <div key={field.key} className="space-y-2">
                    <Label htmlFor={field.key} className="text-sm font-medium">
                      {field.label}
                    </Label>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{field.description}</p>
                    <div className="relative">
                      <Input
                        id={field.key}
                        type={showSecrets[field.key] ? 'text' : 'password'}
                        value={secrets[field.key] || ''}
                        onChange={(e) => handleSecretChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="pr-10 rounded-lg border-gray-300 dark:border-gray-700 bg-transparent"
                      />
                      <button
                        type="button"
                        onClick={() => toggleSecretVisibility(field.key)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        {showSecrets[field.key] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                      {field.isCustom && (
                        <button
                          type="button"
                          onClick={() => handleDeleteSecret(field.key)}
                          className="absolute right-12 top-1/2 -translate-y-1/2 text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200"
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

              <div className="mt-6 p-4 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700">
                <p className="text-xs text-gray-900 dark:text-gray-100">
                  <strong>Note:</strong> Your secrets are stored locally in your browser. They will not be synced across devices.
                  Make sure to back them up if needed.
                </p>
              </div>

              <div className="mt-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">Danger Zone</h3>
                    <p className="text-xs text-red-800 dark:text-red-200">
                      Clear all stored data including secrets, preferences, Gmail tokens, and widget layouts.
                    </p>
                  </div>
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

          {activeTab === 'canvas' && (
            <CanvasVisualization />
          )}
        </div>
      </div>

    </div>
  );
}
