import React, { useState, useEffect, useRef } from 'react';
import { X, Save, Sliders } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getAvailableProviders } from '@/services/aiService';
import { ScrollbarStyles } from '@/components/ui/scrollbar-styles';

const LLM_SETTINGS_KEY = 'hashbase_ai_llm_settings';
const CHAT_SETTINGS_KEY = 'hashbase_ai_chat_settings';

const DEFAULT_SETTINGS = {
  temperature: 0.7,
  maxTokens: 2000,
  topP: 1,
  frequencyPenalty: 0,
  presencePenalty: 0,
};

export function LLMSettingsModal({ isOpen, onClose, onSettingsChange }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);
  const [saveStatus, setSaveStatus] = useState('');
  const modalRef = useRef(null);

  // Load settings on mount
  useEffect(() => {
    if (isOpen) {
      // Load available providers
      const availableProviders = getAvailableProviders();
      setProviders(availableProviders);

      // Load LLM settings
      try {
        const savedSettings = localStorage.getItem(LLM_SETTINGS_KEY);
        if (savedSettings) {
          setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) });
        }
      } catch (e) {
        console.error('Error loading LLM settings:', e);
      }

      // Load provider/model settings
      try {
        const savedChatSettings = localStorage.getItem(CHAT_SETTINGS_KEY);
        if (savedChatSettings) {
          const { provider, model } = JSON.parse(savedChatSettings);
          setSelectedProvider(provider);
          setSelectedModel(model);
        } else if (availableProviders.length > 0) {
          // Set defaults
          setSelectedProvider(availableProviders[0].id);
          setSelectedModel(availableProviders[0].models[0].id);
        }
      } catch (e) {
        console.error('Error loading chat settings:', e);
      }

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

  const handleSave = () => {
    try {
      // Save LLM settings
      localStorage.setItem(LLM_SETTINGS_KEY, JSON.stringify(settings));
      
      // Save provider/model settings
      if (selectedProvider && selectedModel) {
        localStorage.setItem(CHAT_SETTINGS_KEY, JSON.stringify({
          provider: selectedProvider,
          model: selectedModel,
        }));
        
        // Notify parent component of changes
        if (onSettingsChange) {
          onSettingsChange(selectedProvider, selectedModel);
        }
      }
      
      setSaveStatus('Settings saved successfully!');
      setTimeout(() => {
        setSaveStatus('');
        onClose();
      }, 1500);
    } catch (error) {
      setSaveStatus('Error saving settings');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const handleReset = () => {
    setSettings(DEFAULT_SETTINGS);
    setSaveStatus('Settings reset to defaults');
    setTimeout(() => setSaveStatus(''), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div ref={modalRef} className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col border-2 border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">LLM Settings</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
          <ScrollbarStyles />
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Configure AI provider, model, and parameters to control response generation.
          </p>

          {/* Provider & Model Selection */}
          {providers.length > 0 && (
            <div className="space-y-3 pb-4 border-b border-gray-200 dark:border-gray-800">
              <Label className="text-sm font-medium">Provider & Model</Label>
              
              {/* Provider Selection */}
              <div className="space-y-2">
                <Label htmlFor="provider" className="text-xs text-gray-600 dark:text-gray-400">
                  AI Provider
                </Label>
                <select
                  id="provider"
                  value={selectedProvider || ''}
                  onChange={(e) => {
                    const newProvider = e.target.value;
                    setSelectedProvider(newProvider);
                    const provider = providers.find(p => p.id === newProvider);
                    if (provider) {
                      setSelectedModel(provider.models[0].id);
                    }
                  }}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600"
                >
                  {providers.map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Model Selection */}
              <div className="space-y-2">
                <Label htmlFor="model" className="text-xs text-gray-600 dark:text-gray-400">
                  Model
                </Label>
                <select
                  id="model"
                  value={selectedModel || ''}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600"
                >
                  {providers.find(p => p.id === selectedProvider)?.models.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {providers.length === 0 && (
            <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 mb-4">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                No AI providers configured. Add your OpenAI or Claude API key in the main Settings.
              </p>
            </div>
          )}

          <Label className="text-sm font-medium">Model Parameters</Label>

          {/* Temperature */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="temperature" className="text-sm font-medium">
                Temperature
              </Label>
              <span className="text-xs text-gray-600 dark:text-gray-400">{settings.temperature}</span>
            </div>
            <input
              id="temperature"
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={settings.temperature}
              onChange={(e) => setSettings({ ...settings, temperature: parseFloat(e.target.value) })}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-gray-900 dark:accent-gray-100"
            />
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Controls randomness: 0 is focused and deterministic, 2 is more creative and random.
            </p>
          </div>

          {/* Max Tokens */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="maxTokens" className="text-sm font-medium">
                Max Tokens
              </Label>
              <span className="text-xs text-gray-600 dark:text-gray-400">{settings.maxTokens}</span>
            </div>
            <input
              id="maxTokens"
              type="range"
              min="100"
              max="4000"
              step="100"
              value={settings.maxTokens}
              onChange={(e) => setSettings({ ...settings, maxTokens: parseInt(e.target.value) })}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-gray-900 dark:accent-gray-100"
            />
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Maximum length of the generated response.
            </p>
          </div>

          {/* Top P */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="topP" className="text-sm font-medium">
                Top P
              </Label>
              <span className="text-xs text-gray-600 dark:text-gray-400">{settings.topP}</span>
            </div>
            <input
              id="topP"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.topP}
              onChange={(e) => setSettings({ ...settings, topP: parseFloat(e.target.value) })}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-gray-900 dark:accent-gray-100"
            />
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Nucleus sampling: considers tokens with top_p probability mass.
            </p>
          </div>

          {/* Frequency Penalty */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="frequencyPenalty" className="text-sm font-medium">
                Frequency Penalty
              </Label>
              <span className="text-xs text-gray-600 dark:text-gray-400">{settings.frequencyPenalty}</span>
            </div>
            <input
              id="frequencyPenalty"
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={settings.frequencyPenalty}
              onChange={(e) => setSettings({ ...settings, frequencyPenalty: parseFloat(e.target.value) })}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-gray-900 dark:accent-gray-100"
            />
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Reduces repetition of tokens based on their frequency.
            </p>
          </div>

          {/* Presence Penalty */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="presencePenalty" className="text-sm font-medium">
                Presence Penalty
              </Label>
              <span className="text-xs text-gray-600 dark:text-gray-400">{settings.presencePenalty}</span>
            </div>
            <input
              id="presencePenalty"
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={settings.presencePenalty}
              onChange={(e) => setSettings({ ...settings, presencePenalty: parseFloat(e.target.value) })}
              className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-gray-900 dark:accent-gray-100"
            />
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Encourages the model to talk about new topics.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800">
          <div className="flex items-center justify-between mb-3">
            {saveStatus && (
              <p className={`text-sm ${saveStatus.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>
                {saveStatus}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleReset}
              className="flex-1"
            >
              Reset to Defaults
            </Button>
            <Button
              onClick={handleSave}
              className="flex-1 flex items-center justify-center gap-2"
            >
              <Save className="h-4 w-4" />
              Save Settings
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function getLLMSettings() {
  try {
    const saved = localStorage.getItem(LLM_SETTINGS_KEY);
    if (saved) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Error loading LLM settings:', e);
  }
  return DEFAULT_SETTINGS;
}
