import React, { useState, useEffect } from 'react';
import { Widget } from '../Widget';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Mail, RefreshCw, Loader2, LogIn, ExternalLink, ChevronLeft, ChevronRight } from 'lucide-react';
import { fetchUnreadEmails, getAuthUrl, checkAuthStatus, getGmailUrl } from '@/services/gmailService';

const EMAILS_PER_PAGE = 3;

export function GmailWidget() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  const loadEmails = async () => {
    try {
      setError(null);
      // Check authentication status first
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

  const handleDismiss = async (emailId) => {
    try {
      setDismissingIds(prev => new Set(prev).add(emailId));
      await markAsRead(emailId);
      
      setEmails(prevEmails => {
        const newEmails = prevEmails.filter(email => email.id !== emailId);
        const totalPages = Math.ceil(newEmails.length / EMAILS_PER_PAGE);
        if (currentPage >= totalPages && totalPages > 0) {
          setCurrentPage(totalPages - 1);
        }
        return newEmails;
      });
    } catch (err) {
      console.error('Error dismissing email:', err);
    } finally {
      setDismissingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(emailId);
        return newSet;
      });
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
    setCurrentPage(0);
    loadEmails();
  };

  // Pagination calculations
  const totalPages = Math.ceil(emails.length / EMAILS_PER_PAGE);
  const startIndex = currentPage * EMAILS_PER_PAGE;
  const endIndex = startIndex + EMAILS_PER_PAGE;
  const currentEmails = emails.slice(startIndex, endIndex);

  const goToNextPage = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const badge = emails.length > 0 ? <Badge variant="secondary">{emails.length}</Badge> : null;
  const headerActions = (
    <>
      {!isAuthenticated && (
        <Button
          variant="default"
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
      )}
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
    <Widget
      icon={Mail}
      title="Unread Emails"
      description="Your latest unread messages from Gmail"
      badge={badge}
      headerActions={headerActions}
    >
      {loading ? (
        <div className="flex items-center justify-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
          <Mail className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm text-destructive mb-2">
            {isAuthenticated ? 'Failed to load emails' : 'Not authenticated'}
          </p>
          <p className="text-xs text-muted-foreground mb-4">{error}</p>
          <div className="flex gap-2">
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
        <div className="flex flex-col items-center justify-center h-full text-center p-4">
          <Mail className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">No unread emails</p>
          <p className="text-xs text-muted-foreground mt-1">You're all caught up! 🎉</p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {currentEmails.map((email) => {
              const fromMatch = email.from.match(/^(.+?)\s*<(.+?)>$/) || [null, email.from, ''];
              const senderName = fromMatch[1].trim();
              const senderEmail = fromMatch[2].trim();
              
              return (
                <div
                  key={email.id}
                  className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors relative group"
                >
                  <div className="flex items-start justify-between gap-2 mb-0.5">
                    <p className="font-semibold text-sm line-clamp-1 flex-1">{senderName}</p>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {formatDate(email.date)}
                    </span>
                  </div>
                  
                  <p className="text-xs text-muted-foreground line-clamp-1 mb-2">{senderEmail}</p>
                  
                  <div className="flex items-end justify-between gap-2">
                    <p className="text-sm font-medium line-clamp-1 flex-1">{email.subject}</p>
                    
                    <div className="flex gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => handleOpenEmail(email.id)}
                        title="Open in Gmail"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={goToPreviousPage}
                disabled={currentPage === 0}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {currentPage + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={goToNextPage}
                disabled={currentPage === totalPages - 1}
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </Widget>
  );
}
