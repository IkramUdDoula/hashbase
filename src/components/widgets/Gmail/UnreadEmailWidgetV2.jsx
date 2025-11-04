import React, { useState, useEffect, useMemo } from 'react';
import { BaseWidgetV2 } from '../../BaseWidgetV2';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, LogIn, ExternalLink, Loader2, MailCheck, MailWarning } from 'lucide-react';
import { SiGmail } from 'react-icons/si';
import { fetchUnreadEmails, getAuthUrl, checkAuthStatus, getGmailUrl } from '@/services/gmailService';
import { formatRelativeDate } from '@/lib/dateUtils';
import { GmailExplorer } from './GmailExplorer';

export function UnreadEmailWidgetV2({ rowSpan = 2, dragRef }) {
  const [emails, setEmails] = useState([]);
  const [currentState, setCurrentState] = useState('loading');
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [selectedEmailId, setSelectedEmailId] = useState(null);

  const loadEmails = async () => {
    try {
      setError(null);
      const authStatus = await checkAuthStatus();
      setIsAuthenticated(authStatus);
      
      if (!authStatus) {
        setError('Not authenticated with Gmail');
        setCurrentState('error');
        setRefreshing(false);
        return;
      }
      
      const unreadEmails = await fetchUnreadEmails();
      setEmails(unreadEmails);
      setCurrentState(unreadEmails.length === 0 ? 'empty' : 'positive');
    } catch (err) {
      setError(err.message);
      setCurrentState('error');
    } finally {
      setRefreshing(false);
    }
  };

  const handleAuthenticate = async () => {
    try {
      setAuthenticating(true);
      const authUrl = await getAuthUrl();
      window.location.href = authUrl;
    } catch (err) {
      console.error('Error getting auth URL:', err);
      setError('Failed to get authentication URL');
      setAuthenticating(false);
    }
  };

  const handleOpenEmail = (emailId) => {
    // Open explorer instead of external link
    setSelectedEmailId(emailId);
    setExplorerOpen(true);
  };

  const handleExplorerEmailChange = (newEmailId) => {
    setSelectedEmailId(newEmailId);
  };

  const handleExplorerClose = () => {
    setExplorerOpen(false);
    setSelectedEmailId(null);
  };

  useEffect(() => {
    loadEmails();
    const interval = setInterval(loadEmails, 60000);
    
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        loadEmails();
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
    setCurrentState('loading');
    loadEmails();
  };

  const handleErrorAction = () => {
    if (!isAuthenticated) {
      handleAuthenticate();
    } else {
      handleRefresh();
    }
  };

  // Filter emails based on search query
  const filteredEmails = useMemo(() => {
    if (!searchQuery.trim()) return emails;
    
    const query = searchQuery.toLowerCase();
    return emails.filter(email => {
      const fromMatch = email.from.match(/^(.+?)\s*<(.+?)>$/) || [null, email.from, ''];
      const senderName = fromMatch[1].trim().toLowerCase();
      const senderEmail = fromMatch[2].trim().toLowerCase();
      
      return senderName.includes(query) ||
             senderEmail.includes(query) ||
             email.subject.toLowerCase().includes(query);
    });
  }, [emails, searchQuery]);

  // Badge showing email count
  const badge = filteredEmails.length > 0 ? (
    <Badge variant="secondary">{filteredEmails.length}</Badge>
  ) : null;

  // Custom action: Authenticate button
  const customActions = !isAuthenticated && (
    <Button
      variant="ghost"
      size="icon"
      onClick={handleAuthenticate}
      disabled={authenticating}
      title="Authenticate with Gmail"
    >
      {authenticating ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LogIn className="h-4 w-4" />
      )}
    </Button>
  );

  return (
    <>
      <BaseWidgetV2
        logo={SiGmail}
        appName="Gmail"
        widgetName="Unread"
        tooltip="Your latest unread messages from Gmail"
        badge={badge}
        
        // Action Buttons
        customActions={customActions}
        showRefresh={true}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        
        // Content State
        state={currentState}
        
        // Loading State
        loadingMessage="Loading emails..."
        
        // Error State
        errorLogo={SiGmail}
        errorIcon={MailWarning}
        errorMessage={error || 'Failed to load emails'}
        errorActionLabel="Try Again"
        errorActionLoading={refreshing}
        onErrorAction={handleRefresh}
        errorSecondaryActionLabel="Authenticate with Gmail"
        errorSecondaryActionLoading={authenticating}
        onErrorSecondaryAction={handleAuthenticate}
        
        // Empty State
        emptyIcon={MailCheck}
        emptyMessage="No unread emails"
        emptySubmessage="You're all caught up!"
        
        // Search
        searchEnabled={emails.length > 0}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search emails..."
        
        rowSpan={rowSpan}
        dragRef={dragRef}
      >
      {filteredEmails.length === 0 && searchQuery ? (
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
          <Mail className="h-8 w-8 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No emails match your search</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filteredEmails.map((email) => {
            const fromMatch = email.from.match(/^(.+?)\s*<(.+?)>$/) || [null, email.from, ''];
            const senderName = fromMatch[1].trim();
            const senderEmail = fromMatch[2].trim();
            
            return (
              <div
                key={email.id}
                className="p-2 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 hover:shadow-md transition-shadow cursor-pointer group"
                onClick={() => handleOpenEmail(email.id)}
              >
                <div className="flex items-start justify-between gap-1 mb-0.5">
                  <p className="font-semibold text-blue-900 dark:text-blue-100 text-sm line-clamp-1 flex-1">
                    {senderName}
                  </p>
                  <span className="text-xs text-blue-700 dark:text-blue-300 whitespace-nowrap">
                    {formatRelativeDate(email.date)}
                  </span>
                </div>
                
                <p className="text-xs text-blue-600 dark:text-blue-400 line-clamp-1 mb-1">{senderEmail}</p>
                
                <p className="text-sm font-medium text-blue-900 dark:text-blue-100 line-clamp-1">
                  {email.subject}
                </p>
              </div>
            );
          })}
        </div>
      )}
      </BaseWidgetV2>

      {/* Gmail Explorer */}
      <GmailExplorer
        open={explorerOpen}
        onOpenChange={handleExplorerClose}
        emailId={selectedEmailId}
        emailList={filteredEmails}
        onEmailChange={handleExplorerEmailChange}
        onRefresh={loadEmails}
      />
    </>
  );
}
