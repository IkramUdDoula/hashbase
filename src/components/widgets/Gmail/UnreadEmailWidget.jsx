import React, { useState, useEffect, useMemo } from 'react';
import { BaseWidget } from '../../BaseWidget';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, RefreshCw, Loader2, LogIn, ExternalLink } from 'lucide-react';
import { SiGmail } from 'react-icons/si';
import { fetchUnreadEmails, getAuthUrl, checkAuthStatus, getGmailUrl } from '@/services/gmailService';
import { formatRelativeDate } from '@/lib/dateUtils';
import { WidgetSearch } from '@/components/WidgetSearch';
import { WidgetEmptyState } from '@/components/WidgetEmptyState';

export function UnreadEmailWidget({ rowSpan = 2, dragRef }) {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const loadEmails = async () => {
    try {
      setError(null);
      const authStatus = await checkAuthStatus();
      setIsAuthenticated(authStatus);
      
      if (!authStatus) {
        setError('Not authenticated with Gmail');
        setLoading(false);
        setRefreshing(false);
        return;
      }
      
      const unreadEmails = await fetchUnreadEmails();
      setEmails(unreadEmails);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
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
    const gmailUrl = getGmailUrl(emailId);
    window.open(gmailUrl, '_blank');
    
    setTimeout(() => {
      loadEmails();
    }, 3000);
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
    loadEmails();
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

  const badge = filteredEmails.length > 0 ? <Badge variant="secondary">{filteredEmails.length}</Badge> : null;
  const headerActions = (
    <>
      <Button
        variant={isAuthenticated ? "ghost" : "ghost"}
        size="icon"
        onClick={handleAuthenticate}
        disabled={authenticating}
      >
        {authenticating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LogIn className="h-4 w-4" />
        )}
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleRefresh}
        disabled={refreshing}
      >
        <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
      </Button>
    </>
  );

  return (
    <BaseWidget
      logo={SiGmail}
      appName="Gmail"
      widgetName="Unread"
      tooltip="Your latest unread messages from Gmail"
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
        <div className="flex flex-col items-center justify-center h-full text-center p-2">
          <Mail className="h-12 w-12 text-muted-foreground mb-2" />
          {/* <p className="text-sm text-destructive mb-2">
            {isAuthenticated ? 'Failed to load emails' : 'Not authenticated'}
          </p> */}
          <p className="text-xs text-muted-foreground mb-2">{error}</p>
          <div className="flex gap-1">
            {!isAuthenticated ? (
              <Button variant="default" size="sm" onClick={handleAuthenticate} disabled={authenticating}>
                {authenticating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <LogIn className="h-4 w-4 mr-2" />
                )}
                Authenticate with Gmail
              </Button>
            ) : (
              <Button variant="outline" size="sm" onClick={handleRefresh}>
                Try Again
              </Button>
            )}
          </div>
        </div>
      ) : emails.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-full text-center p-2">
          <Mail className="h-12 w-12 text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">No unread emails</p>
          <p className="text-xs text-muted-foreground mt-1">You're all caught up!</p>
        </div>
      ) : (
        <>
          <WidgetSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search emails..."
          />

          {filteredEmails.length === 0 ? (
            <WidgetEmptyState
              icon={Mail}
              message="No emails match your search"
            />
          ) : (
            <div className="flex-1 overflow-y-auto space-y-1.5 custom-scrollbar pr-1">
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
                
                <div className="flex items-center justify-between gap-1">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100 line-clamp-1 flex-1">
                    {email.subject}
                  </p>
                  <ExternalLink className="h-4 w-4 text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </div>
              </div>
            );
              })}
            </div>
          )}
        </>
      )}
    </BaseWidget>
  );
}
