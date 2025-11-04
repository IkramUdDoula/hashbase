import React, { useState, useEffect, useRef } from 'react';
import { BaseWidgetV2 } from '../../BaseWidgetV2';
import { Button } from '@/components/ui/button';
import { 
  MessageSquare, 
  Loader2, 
  Trash2, 
  Settings, 
  Copy,
  Check,
  Bot,
  User,
  Sparkles,
  History,
  Plus,
  ChevronDown,
  Globe,
  RefreshCw
} from 'lucide-react';
import { 
  getAvailableProviders, 
  sendChatMessage, 
  estimateTokenCount,
  AI_PROVIDERS 
} from '@/services/aiService';
import { getSecret, SECRET_KEYS } from '@/services/secretsService';
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
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [searchEnabled, setSearchEnabled] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
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
      searchEnabled,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    // Reset textarea height
    if (inputRef.current) {
      inputRef.current.style.height = '42px';
    }
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
      searchResults: null,
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      // If search is enabled, perform web search first
      let searchContext = '';
      let searchResults = null;
      
      if (searchEnabled) {
        try {
          const tavilyApiKey = getSecret(SECRET_KEYS.TAVILY_API_KEY);
          
          if (!tavilyApiKey) {
            addToast('Tavily API key not configured. Please add it in Settings > Secrets', 'error');
            // Continue without search
          } else {
            const searchResponse = await fetch('/api/search', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'x-tavily-api-key': tavilyApiKey,
              },
              body: JSON.stringify({ query: userMessage.content }),
            });
            
            if (searchResponse.ok) {
              const data = await searchResponse.json();
              searchResults = data.results;
              
              // Add search context to the message
              if (searchResults && searchResults.length > 0) {
                searchContext = '\n\nWeb Search Results:\n' + 
                  searchResults.map((r, i) => 
                    `${i + 1}. ${r.title}\n   ${r.snippet}\n   Source: ${r.url}`
                  ).join('\n\n');
              }
            } else {
              const errorData = await searchResponse.json().catch(() => ({}));
              console.error('Search error:', errorData);
              addToast(errorData.message || 'Search failed', 'error');
            }
          }
        } catch (searchError) {
          console.error('Search error:', searchError);
          addToast('Search failed: ' + searchError.message, 'error');
          // Continue without search results
        }
      }

      // Prepare messages for API (exclude id and timestamp)
      const apiMessages = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content,
      }));

      // Add search context to the last user message if available
      if (searchContext) {
        apiMessages[apiMessages.length - 1].content += searchContext;
        // Update the assistant message with search results
        setMessages(prev => 
          prev.map(msg => 
            msg.id === assistantMessageId 
              ? { ...msg, searchResults }
              : msg
          )
        );
      }

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

  const getTotalTokens = () => {
    return messages.reduce((sum, msg) => sum + estimateTokenCount(msg.content), 0);
  };

  const currentProvider = providers.find(p => p.id === selectedProvider);
  const currentModel = currentProvider?.models.find(m => m.id === selectedModel);
  const isConfigured = providers.length > 0;


  const customActions = (
    <div className="flex items-center gap-1">
      <Button
        variant="ghost"
        size="icon"
        className="hover:bg-white/20"
        onClick={handleNewChat}
        title="New Chat"
      >
        <Plus className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="hover:bg-white/20"
        onClick={() => setShowHistory(true)}
        title="History"
      >
        <History className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className="hover:bg-white/20"
        onClick={() => setShowLLMSettings(true)}
        title="Settings"
      >
        <Settings className="h-4 w-4" />
      </Button>
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
      <BaseWidgetV2
        logo={Sparkles}
        appName="AI"
        widgetName="Chat"
        tooltip="Chat with AI assistants (OpenAI)"
        customActions={customActions}
        showRefresh={false}
        state={!isConfigured ? 'empty' : 'positive'}
        emptyIcon={Bot}
        emptyMessage="No AI provider configured"
        emptySubmessage="Add your OpenAI API key in Settings to start chatting"
        emptyActionLabel="Open Settings"
        onEmptyAction={() => setShowLLMSettings(true)}
        rowSpan={rowSpan}
        dragRef={dragRef}
      >
      {isConfigured && (
        <div className="flex flex-col h-full">
          {/* Messages */}
          <div className={`flex-1 pr-2 mb-2 ${messages.length > 0 ? 'overflow-y-auto custom-scrollbar' : 'overflow-hidden'}`}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-4">
                <h3 className="text-base font-medium text-gray-700 dark:text-gray-300 mb-1">Start a conversation</h3>
                <p className="text-xs text-gray-500 dark:text-gray-500">Type a message below to begin</p>
              </div>
            ) : (
              <div className="space-y-2 py-2">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`group flex gap-1 items-start ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {/* Action button - left side for user */}
                    {message.role === 'user' && message.content && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity pt-1">
                        <button
                          onClick={() => handleCopyMessage(message.content, message.id)}
                          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                          title="Copy message"
                        >
                          {copiedId === message.id ? (
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                          )}
                        </button>
                      </div>
                    )}
                    
                    {/* Message Content */}
                    <div className={`${
                      message.role === 'user' 
                        ? 'max-w-[85%] bg-gray-100 dark:bg-gray-800 rounded-lg' 
                        : 'flex-1 min-w-0 max-w-full border border-gray-300 dark:border-gray-700 rounded-lg'
                    } px-3 py-2`}>
                      {/* Search indicator for user messages */}
                      {message.role === 'user' && message.searchEnabled && (
                        <div className="flex items-center gap-0.5 text-xs text-gray-500 dark:text-gray-400 mb-0.5">
                          <Globe className="h-3 w-3" />
                          <span>Web search enabled</span>
                        </div>
                      )}
                      
                      {/* Search results for assistant messages */}
                      {message.role === 'assistant' && message.searchResults && message.searchResults.length > 0 && (
                        <div className="mb-1.5 pb-1.5 border-b border-gray-200 dark:border-gray-700">
                          <div className="flex items-center gap-0.5 text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">
                            <Globe className="h-3.5 w-3.5 flex-shrink-0" />
                            <span>Sources</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            {message.searchResults.slice(0, 5).map((result, idx) => {
                              const urlObj = new URL(result.url);
                              const domain = urlObj.hostname.replace('www.', '');
                              return (
                                <div key={idx} className="flex gap-1">
                                  <span className="text-xs text-gray-400 dark:text-gray-500 font-medium flex-shrink-0">{idx + 1}.</span>
                                  <a
                                    href={result.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-xs hover:underline break-words min-w-0"
                                  >
                                    <div className="font-medium text-gray-700 dark:text-gray-300">{domain}</div>
                                    <div className="text-blue-600 dark:text-blue-400 line-clamp-2">{result.title}</div>
                                  </a>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      
                      <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words leading-relaxed">
                        {message.content || (
                          <span className="text-gray-400 dark:text-gray-500 italic">Thinking...</span>
                        )}
                        {streaming && message.role === 'assistant' && message.content && (
                          <span className="inline-block w-0.5 h-4 ml-1 bg-gray-400 dark:bg-gray-500 animate-pulse" />
                        )}
                      </div>
                    </div>

                    {/* Action button - right side for AI */}
                    {message.role === 'assistant' && message.content && (
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity pt-1">
                        <button
                          onClick={() => handleCopyMessage(message.content, message.id)}
                          className="p-1.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                          title="Copy message"
                        >
                          {copiedId === message.id ? (
                            <Check className="h-3.5 w-3.5 text-green-600" />
                          ) : (
                            <Copy className="h-3.5 w-3.5 text-gray-500 dark:text-gray-400" />
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="border-t border-gray-200 dark:border-gray-800 pt-1.5">
            {/* Search toggle */}
            <div className="flex items-center gap-1 mb-1">
              <button
                onClick={() => setSearchEnabled(!searchEnabled)}
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-xs transition-colors ${
                  searchEnabled
                    ? 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    : 'text-gray-500 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
                title="Toggle web search"
              >
                <Globe className="h-3 w-3" />
                <span>{searchEnabled ? 'Search on' : 'Search off'}</span>
              </button>
            </div>
            
            {/* Input box */}
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Type a message..."
              disabled={loading}
              rows={1}
              className="w-full px-1.5 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-foreground placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none focus:outline-none focus:border-gray-400 dark:focus:border-gray-600 transition-colors custom-scrollbar"
              style={{ minHeight: '42px', maxHeight: '140px' }}
              onInput={(e) => {
                e.target.style.height = '42px';
                e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
              }}
            />
          </div>
        </div>
      )}
      </BaseWidgetV2>
    </>
  );
}
