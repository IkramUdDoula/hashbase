import React, { useState, useEffect, useRef } from 'react';
import { X, MessageSquare, Trash2, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollbarStyles } from '@/components/ui/scrollbar-styles';

const CONVERSATIONS_KEY = 'hashbase_ai_conversations';

export function ChatHistoryModal({ isOpen, onClose, onLoadConversation }) {
  const [conversations, setConversations] = useState([]);
  const modalRef = useRef(null);

  // Load conversations on mount
  useEffect(() => {
    if (isOpen) {
      loadConversations();
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

  const loadConversations = () => {
    try {
      const saved = localStorage.getItem(CONVERSATIONS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Sort by date (most recent first)
        const sorted = parsed.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        setConversations(sorted);
      }
    } catch (e) {
      console.error('Error loading conversations:', e);
    }
  };

  const handleDeleteConversation = (id, e) => {
    e.stopPropagation();
    if (confirm('Are you sure you want to delete this conversation?')) {
      try {
        const updated = conversations.filter(conv => conv.id !== id);
        localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(updated));
        setConversations(updated);
      } catch (e) {
        console.error('Error deleting conversation:', e);
      }
    }
  };

  const handleLoadConversation = (conversation) => {
    onLoadConversation(conversation);
    onClose();
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  const getConversationPreview = (messages) => {
    if (!messages || messages.length === 0) return 'No messages';
    const firstUserMessage = messages.find(m => m.role === 'user');
    if (!firstUserMessage) return 'No messages';
    return firstUserMessage.content.substring(0, 100) + (firstUserMessage.content.length > 100 ? '...' : '');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div ref={modalRef} className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col border-2 border-gray-200 dark:border-gray-800">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">Chat History</h2>
            <Badge variant="secondary" className="text-xs">
              {conversations.length}
            </Badge>
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
        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
          <ScrollbarStyles />
          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
              <MessageSquare className="h-16 w-16 text-gray-300 dark:text-gray-700 mb-4" />
              <p className="text-sm text-gray-600 dark:text-gray-400">No conversation history yet</p>
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                Start a new chat to see your conversations here
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  onClick={() => handleLoadConversation(conversation)}
                  className="group relative p-4 rounded-lg border-2 border-gray-200 dark:border-gray-800 hover:border-gray-400 dark:hover:border-gray-600 transition-all cursor-pointer bg-white dark:bg-gray-900 hover:shadow-md"
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-1">
                        {conversation.title || 'Untitled Conversation'}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{formatDate(conversation.updatedAt)}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          <span>{formatTime(conversation.updatedAt)}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {conversation.messages?.length || 0} msgs
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleDeleteConversation(conversation.id, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8"
                      title="Delete conversation"
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>

                  {/* Preview */}
                  <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                    {getConversationPreview(conversation.messages)}
                  </p>

                  {/* Model Badge */}
                  {conversation.model && (
                    <div className="mt-2">
                      <Badge variant="secondary" className="text-xs">
                        {conversation.model}
                      </Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper functions for managing conversations
export function saveConversation(id, messages, provider, model) {
  try {
    const conversations = JSON.parse(localStorage.getItem(CONVERSATIONS_KEY) || '[]');
    const existingIndex = conversations.findIndex(conv => conv.id === id);
    
    const conversation = {
      id,
      messages,
      provider,
      model,
      title: messages.find(m => m.role === 'user')?.content.substring(0, 50) || 'New Conversation',
      updatedAt: new Date().toISOString(),
      createdAt: existingIndex >= 0 ? conversations[existingIndex].createdAt : new Date().toISOString(),
    };

    if (existingIndex >= 0) {
      conversations[existingIndex] = conversation;
    } else {
      conversations.push(conversation);
    }

    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(conversations));
  } catch (e) {
    console.error('Error saving conversation:', e);
  }
}

export function deleteConversation(id) {
  try {
    const conversations = JSON.parse(localStorage.getItem(CONVERSATIONS_KEY) || '[]');
    const updated = conversations.filter(conv => conv.id !== id);
    localStorage.setItem(CONVERSATIONS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Error deleting conversation:', e);
  }
}

export function getAllConversations() {
  try {
    const saved = localStorage.getItem(CONVERSATIONS_KEY);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('Error loading conversations:', e);
  }
  return [];
}
