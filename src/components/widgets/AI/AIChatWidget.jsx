import React, { useState, useEffect, useRef } from 'react';
import { BaseWidget } from '../../BaseWidget';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Send, 
  Loader2, 
  Trash2, 
  Settings, 
  Copy,
  Check,
  Bot,
  User,
  Sparkles,
  Menu,
  History,
  Plus,
  ChevronDown
} from 'lucide-react';
import { 
  getAvailableProviders, 
  sendChatMessage, 
  estimateTokenCount,
  AI_PROVIDERS 
} from '@/services/aiService';
import { useToast } from '@/components/ui/toast';
import { LLMSettingsModal, getLLMSettings } from './LLMSettingsModal';
import { ChatHistoryModal, saveConversation } from './ChatHistoryModal';

const CHAT_SETTINGS_KEY = 'hashbase_ai_chat_settings';
const CURRENT_CONVERSATION_KEY = 'hashbase_ai_current_conversation';

export function AIChatWidget({ rowSpan = 3, dragRef }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [providers, setProviders] = useState([]);
  const [selectedProvider, setSelectedProvider] = useState(null);
  const [selectedModel, setSelectedModel] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showLLMSettings, setShowLLMSettings] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const messagesEndRef = useRef(null);
  const menuRef = useRef(null);
  const { addToast } = useToast();

  // Load chat history and settings
  useEffect(() => {
    const availableProviders = getAvailableProviders();
    setProviders(availableProviders);

    // Load saved settings
    try {
      const savedSettings = localStorage.getItem(CHAT_SETTINGS_KEY);
      if (savedSettings) {
        const { provider, model } = JSON.parse(savedSettings);
        const providerExists = availableProviders.find(p => p.id === provider);
        if (providerExists) {
          setSelectedProvider(provider);
          const modelExists = providerExists.models.find(m => m.id === model);
          setSelectedModel(modelExists ? model : providerExists.models[0].id);
        }
      }
    } catch (e) {
      console.error('Error loading chat settings:', e);
    }

    // Set default provider if none selected
    if (!selectedProvider && availableProviders.length > 0) {
      const defaultProvider = availableProviders[0];
      setSelectedProvider(defaultProvider.id);
      setSelectedModel(defaultProvider.models[0].id);
    }

    // Load current conversation
    try {
      const savedConversation = localStorage.getItem(CURRENT_CONVERSATION_KEY);
      if (savedConversation) {
        const { id, messages: savedMessages } = JSON.parse(savedConversation);
        setCurrentConversationId(id);
        setMessages(savedMessages || []);
      } else {
        // Create new conversation
        const newId = Date.now().toString();
        setCurrentConversationId(newId);
      }
    } catch (e) {
      console.error('Error loading conversation:', e);
      const newId = Date.now().toString();
      setCurrentConversationId(newId);
    }
  }, []);

  // Save current conversation
  useEffect(() => {
    if (currentConversationId && messages.length > 0) {
      localStorage.setItem(CURRENT_CONVERSATION_KEY, JSON.stringify({
        id: currentConversationId,
        messages
      }));
      // Also save to conversations history
      saveConversation(currentConversationId, messages, selectedProvider, selectedModel);
    }
  }, [messages, currentConversationId, selectedProvider, selectedModel]);

  // Save settings
  useEffect(() => {
    if (selectedProvider && selectedModel) {
      localStorage.setItem(CHAT_SETTINGS_KEY, JSON.stringify({
        provider: selectedProvider,
        model: selectedModel,
      }));
    }
  }, [selectedProvider, selectedModel]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    if (!selectedProvider || !selectedModel) {
      addToast('Please configure an AI provider in Settings', 'error');
      return;
    }

    const userMessage = {
      id: Date.now(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);
    setStreaming(true);

    // Create placeholder for assistant message
    const assistantMessageId = Date.now() + 1;
    const assistantMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toISOString(),
      provider: selectedProvider,
      model: selectedModel,
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      // Prepare messages for API (exclude id and timestamp)
      const apiMessages = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      let fullResponse = '';

      await sendChatMessage(
        selectedProvider,
        selectedModel,
        apiMessages,
        (chunk) => {
          fullResponse += chunk;
          setMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessageId 
                ? { ...msg, content: fullResponse }
                : msg
            )
          );
        }
      );

      setStreaming(false);
    } catch (error) {
      console.error('Error sending message:', error);
      addToast(error.message || 'Failed to send message', 'error');
      
      // Remove the failed assistant message
      setMessages(prev => prev.filter(msg => msg.id !== assistantMessageId));
    } finally {
      setLoading(false);
      setStreaming(false);
    }
  };

  const handleNewChat = () => {
    if (messages.length > 0) {
      // Save current conversation before starting new one
      if (currentConversationId) {
        saveConversation(currentConversationId, messages, selectedProvider, selectedModel);
      }
    }
    // Create new conversation
    const newId = Date.now().toString();
    setCurrentConversationId(newId);
    setMessages([]);
    localStorage.removeItem(CURRENT_CONVERSATION_KEY);
    setShowMenu(false);
    addToast('Started new conversation', 'success');
  };

  const handleLoadConversation = (conversation) => {
    // Save current conversation first
    if (currentConversationId && messages.length > 0) {
      saveConversation(currentConversationId, messages, selectedProvider, selectedModel);
    }
    // Load selected conversation
    setCurrentConversationId(conversation.id);
    setMessages(conversation.messages || []);
    if (conversation.provider) setSelectedProvider(conversation.provider);
    if (conversation.model) setSelectedModel(conversation.model);
    localStorage.setItem(CURRENT_CONVERSATION_KEY, JSON.stringify({
      id: conversation.id,
      messages: conversation.messages || []
    }));
    addToast('Conversation loaded', 'success');
  };

  const handleCopyMessage = (content, id) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
    addToast('Message copied to clipboard', 'success');
  };

  const handleDeleteMessage = (id) => {
    setMessages(prev => prev.filter(msg => msg.id !== id));
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getTotalTokens = () => {
    return messages.reduce((sum, msg) => sum + estimateTokenCount(msg.content), 0);
  };

  const currentProvider = providers.find(p => p.id === selectedProvider);
  const isConfigured = providers.length > 0;

  const badge = messages.length > 0 ? (
    <Badge variant="secondary" className="text-xs">
      {messages.length} msgs
    </Badge>
  ) : null;

  const headerActions = (
    <div className="relative" ref={menuRef}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setShowMenu(!showMenu)}
        title="Menu"
      >
        <Menu className="h-4 w-4" />
      </Button>
      
      {/* Dropdown Menu */}
      {showMenu && (
        <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
          <button
            onClick={handleNewChat}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-gray-100"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </button>
          <button
            onClick={() => {
              setShowHistory(true);
              setShowMenu(false);
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-gray-100"
          >
            <History className="h-4 w-4" />
            History
          </button>
          <button
            onClick={() => {
              setShowLLMSettings(true);
              setShowMenu(false);
            }}
            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center gap-2 text-gray-900 dark:text-gray-100"
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
        </div>
      )}
    </div>
  );

  return (
    <>
      <LLMSettingsModal 
        isOpen={showLLMSettings} 
        onClose={() => setShowLLMSettings(false)}
        onSettingsChange={(provider, model) => {
          setSelectedProvider(provider);
          setSelectedModel(model);
        }}
      />
      <ChatHistoryModal 
        isOpen={showHistory} 
        onClose={() => setShowHistory(false)}
        onLoadConversation={handleLoadConversation}
      />
      <BaseWidget
        logo={Sparkles}
        appName="AI"
        widgetName="Chat"
        tooltip="Chat with AI assistants (OpenAI & Claude)"
        badge={badge}
        headerActions={headerActions}
        rowSpan={rowSpan}
        dragRef={dragRef}
      >
      {!isConfigured ? (
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
          <Bot className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground mb-2">No AI provider configured</p>
          <p className="text-xs text-muted-foreground mb-4">
            Add your OpenAI or Claude API key in Settings to start chatting
          </p>
          <div className="space-y-2 text-xs text-left">
            <a
              href="https://platform.openai.com/api-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-blue-600 dark:text-blue-400 hover:underline"
            >
              Get OpenAI API Key →
            </a>
            <a
              href="https://console.anthropic.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="block text-blue-600 dark:text-blue-400 hover:underline"
            >
              Get Claude API Key →
            </a>
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          {/* Messages */}
          <div className={`flex-1 space-y-3 pr-1 mb-3 ${messages.length > 0 ? 'overflow-y-auto custom-scrollbar' : 'overflow-hidden'}`}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4 w-full">
                <p className="text-sm text-muted-foreground">Start a conversation</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {message.role === 'assistant' && (
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-white" />
                    </div>
                  )}
                  <div
                    className={`group relative max-w-[85%] rounded-lg px-3 py-2 ${
                      message.role === 'user'
                        ? 'bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100'
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap break-words">
                      {message.content}
                      {streaming && message.role === 'assistant' && message.content && (
                        <span className="inline-block w-1 h-4 ml-1 bg-current animate-pulse" />
                      )}
                    </div>
                    <div className="flex items-center gap-1 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleCopyMessage(message.content, message.id)}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        title="Copy message"
                      >
                        {copiedId === message.id ? (
                          <Check className="h-3 w-3 text-green-600" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                      <button
                        onClick={() => handleDeleteMessage(message.id)}
                        className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        title="Delete message"
                      >
                        <Trash2 className="h-3 w-3 text-red-600" />
                      </button>
                    </div>
                  </div>
                  {message.role === 'user' && (
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                      <User className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type a message..."
              disabled={loading}
              rows={2}
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-white dark:bg-gray-900 text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600"
            />
            <Button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              size="icon"
              className="self-end h-10 w-10"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      )}
      </BaseWidget>
    </>
  );
}
