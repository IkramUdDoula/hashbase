import React, { useState, useEffect } from 'react';
import { 
  Explorer, 
  ExplorerHeader, 
  ExplorerBody, 
  ExplorerFooter,
  ExplorerSection,
  ExplorerField 
} from '@/components/ui/explorer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Mail, 
  ExternalLink,
  Paperclip,
  User,
  Calendar
} from 'lucide-react';
import { getGmailUrl } from '@/services/gmailService';
import { formatRelativeDate } from '@/lib/dateUtils';

/**
 * GmailExplorer - Detailed email viewer
 * 
 * Displays full email content with:
 * - To, From, CC, BCC fields
 * - Subject
 * - Email body
 * - Attachments
 * - Action: Open in Gmail
 * 
 * @param {Object} props
 * @param {boolean} props.open - Controls visibility
 * @param {function} props.onOpenChange - Callback when open state changes
 * @param {string} props.emailId - Current email ID to display
 * @param {Array} props.emailList - List of all emails for navigation
 * @param {function} props.onEmailChange - Callback when navigating to different email
 * @param {function} props.onRefresh - Callback to refresh email list
 */
export function GmailExplorer({ 
  open, 
  onOpenChange, 
  emailId,
  emailList = [],
  onEmailChange,
  onRefresh
}) {
  const [copiedEmail, setCopiedEmail] = useState(null);

  // Find current email from the list
  const currentIndex = emailList.findIndex(e => e.id === emailId);
  const email = emailList[currentIndex] || null;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < emailList.length - 1;

  const handlePrevious = () => {
    if (hasPrevious) {
      const prevEmail = emailList[currentIndex - 1];
      onEmailChange(prevEmail.id);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      const nextEmail = emailList[currentIndex + 1];
      onEmailChange(nextEmail.id);
    }
  };

  const handleOpenInGmail = () => {
    const gmailUrl = getGmailUrl(emailId);
    window.open(gmailUrl, '_blank');
  };

  const handleCopyEmail = async (emailAddress) => {
    try {
      await navigator.clipboard.writeText(emailAddress);
      setCopiedEmail(emailAddress);
      setTimeout(() => setCopiedEmail(null), 2000);
    } catch (err) {
      console.error('Failed to copy email:', err);
    }
  };

  // Parse email addresses
  const parseEmailAddress = (emailStr) => {
    if (!emailStr) return { name: '', email: '' };
    const match = emailStr.match(/^(.+?)\s*<(.+?)>$/) || [null, emailStr, ''];
    return {
      name: match[1].trim(),
      email: match[2].trim() || emailStr
    };
  };

  return (
    <Explorer
      open={open}
      onOpenChange={onOpenChange}
      title="Gmail"
      showNavigation={emailList.length > 1}
      onPrevious={handlePrevious}
      onNext={handleNext}
      hasPrevious={hasPrevious}
      hasNext={hasNext}
    >
      {!email ? (
        <div className="flex flex-col items-center justify-center h-64 text-center p-4">
          <Mail className="h-12 w-12 text-gray-400 mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Email not found</p>
        </div>
      ) : (
        <>
          {/* Email Header Info */}
          <ExplorerHeader>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {email.subject || '(No Subject)'}
              </h3>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Calendar className="h-3 w-3" />
                <span>{formatRelativeDate(email.date)}</span>
                {email.labels && email.labels.length > 0 && (
                  <div className="flex gap-1 ml-2">
                    {email.labels.map((label, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {label}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ExplorerHeader>

          <ExplorerBody>
            {/* From */}
            <ExplorerSection>
              <ExplorerField label="From">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <div className="flex items-center gap-2 flex-wrap">
                    {parseEmailAddress(email.from).name && (
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {parseEmailAddress(email.from).name}
                      </span>
                    )}
                    <button
                      onClick={() => handleCopyEmail(parseEmailAddress(email.from).email)}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                      title="Click to copy email address"
                    >
                      {parseEmailAddress(email.from).email}
                    </button>
                    {copiedEmail === parseEmailAddress(email.from).email && (
                      <span className="text-xs text-green-600 dark:text-green-400">Copied!</span>
                    )}
                  </div>
                </div>
              </ExplorerField>
            </ExplorerSection>

            {/* To */}
            {email.to && (
              <ExplorerSection>
                <ExplorerField label="To">
                  <div className="space-y-1">
                    {Array.isArray(email.to) ? (
                      email.to.map((recipient, idx) => {
                        const parsed = parseEmailAddress(recipient);
                        return (
                          <div key={idx} className="text-sm">
                            <span className="font-medium">{parsed.name || parsed.email}</span>
                            {parsed.name && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                                ({parsed.email})
                              </span>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <span>{email.to}</span>
                    )}
                  </div>
                </ExplorerField>
              </ExplorerSection>
            )}

            {/* CC */}
            {email.cc && email.cc.length > 0 && (
              <ExplorerSection>
                <ExplorerField label="CC">
                  <div className="space-y-1">
                    {email.cc.map((recipient, idx) => {
                      const parsed = parseEmailAddress(recipient);
                      return (
                        <div key={idx} className="text-sm">
                          <span className="font-medium">{parsed.name || parsed.email}</span>
                          {parsed.name && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                              ({parsed.email})
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ExplorerField>
              </ExplorerSection>
            )}

            {/* BCC */}
            {email.bcc && email.bcc.length > 0 && (
              <ExplorerSection>
                <ExplorerField label="BCC">
                  <div className="space-y-1">
                    {email.bcc.map((recipient, idx) => {
                      const parsed = parseEmailAddress(recipient);
                      return (
                        <div key={idx} className="text-sm">
                          <span className="font-medium">{parsed.name || parsed.email}</span>
                          {parsed.name && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                              ({parsed.email})
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ExplorerField>
              </ExplorerSection>
            )}

            {/* Attachments */}
            {email.attachments && email.attachments.length > 0 && (
              <ExplorerSection title="Attachments">
                <div className="space-y-2">
                  {email.attachments.map((attachment, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                    >
                      <Paperclip className="h-4 w-4 text-gray-500" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {attachment.filename}
                        </p>
                        {attachment.size && (
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {(attachment.size / 1024).toFixed(1)} KB
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </ExplorerSection>
            )}

            {/* Email Body/Snippet */}
            <ExplorerSection title="Message">
              <div className="space-y-4">
                {/* Display email snippet (full body requires backend endpoint) */}
                {email.snippet ? (
                  <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                    {email.snippet}
                  </div>
                ) : email.body ? (
                  <div 
                    className="prose prose-sm dark:prose-invert max-w-none break-words"
                    dangerouslySetInnerHTML={{ __html: email.body }}
                  />
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                    (No content available)
                  </p>
                )}
                
                {/* Note about full content */}
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    💡 <strong>Note:</strong> This shows a preview. Click "Open in Gmail" below to view the complete email with full formatting, images, and thread history.
                  </p>
                </div>
              </div>
            </ExplorerSection>

          </ExplorerBody>

          {/* Actions Footer - Sticky at bottom */}
          <ExplorerFooter>
            <Button
              onClick={handleOpenInGmail}
              variant="outline"
              size="sm"
              className="w-full bg-transparent border-white/30 hover:bg-white/10 hover:border-white dark:border-white/30 dark:hover:bg-white/10 dark:hover:border-white"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open in Gmail
            </Button>
          </ExplorerFooter>
        </>
      )}
    </Explorer>
  );
}
