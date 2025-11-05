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
  Calendar,
  Loader2,
  Link,
  Code
} from 'lucide-react';
import { getGmailUrl, fetchEmailDetails } from '@/services/gmailService';
import { formatRelativeDate } from '@/lib/dateUtils';
import { parseEmailHTML, extractKeyValuePairs } from '@/lib/emailParser';
import './email-content.css';

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
  const [fullEmail, setFullEmail] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null);

  // Find current email from the list
  const currentIndex = emailList.findIndex(e => e.id === emailId);
  const email = emailList[currentIndex] || null;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < emailList.length - 1;

  // Fetch full email details when emailId changes
  useEffect(() => {
    const loadFullEmail = async () => {
      if (!emailId || !open) return;
      
      setLoadingDetails(true);
      setDetailsError(null);
      
      try {
        const details = await fetchEmailDetails(emailId);
        setFullEmail(details);
      } catch (error) {
        console.error('Failed to load email details:', error);
        setDetailsError(error.message);
      } finally {
        setLoadingDetails(false);
      }
    };

    loadFullEmail();
  }, [emailId, open]);

  const handlePrevious = () => {
    if (hasPrevious) {
      const prevEmail = emailList[currentIndex - 1];
      setFullEmail(null); // Reset full email when navigating
      onEmailChange(prevEmail.id);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      const nextEmail = emailList[currentIndex + 1];
      setFullEmail(null); // Reset full email when navigating
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
                {loadingDetails ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-sm text-gray-500">Loading email content...</span>
                  </div>
                ) : detailsError ? (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <p className="text-sm text-red-700 dark:text-red-300">
                      ⚠️ Failed to load email content: {detailsError}
                    </p>
                  </div>
                ) : fullEmail ? (
                  <>
                    {/* Render parsed email content */}
                    {fullEmail.htmlBody ? (
                      <EmailContentRenderer htmlBody={fullEmail.htmlBody} textBody={fullEmail.textBody} />
                    ) : fullEmail.textBody ? (
                      <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words font-mono bg-gray-50 dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                        {fullEmail.textBody}
                      </div>
                    ) : email.snippet ? (
                      <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                        {email.snippet}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                        (No content available)
                      </p>
                    )}
                  </>
                ) : (
                  <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
                    {email.snippet || '(No content available)'}
                  </div>
                )}
              </div>
            </ExplorerSection>

          </ExplorerBody>

          {/* Actions Footer - Sticky at bottom */}
          <ExplorerFooter>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleOpenInGmail}
                variant="outline"
                size="sm"
                className="bg-transparent border-white/30 hover:bg-white/10 hover:border-white dark:border-white/30 dark:hover:bg-white/10 dark:hover:border-white"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in Gmail
              </Button>
              <Button
                disabled
                variant="outline"
                size="sm"
                className="bg-transparent border-white/30 opacity-50 cursor-not-allowed relative"
                title="Coming Soon"
              >
                <img 
                  src="/icon-192x192-en.png" 
                  alt="Haalkhata" 
                  className="h-4 w-4 mr-2"
                />
                Send to Haalkhata
                <span className="ml-2 text-[10px] bg-blue-500/20 dark:bg-blue-500/20 text-blue-900 dark:text-blue-100 px-1.5 py-0.5 rounded">
                  Coming Soon
                </span>
              </Button>
            </div>
          </ExplorerFooter>
        </>
      )}
    </Explorer>
  );
}

/**
 * EmailContentRenderer - Parses and displays email HTML in a clean, structured format
 * For HTML emails, shows 3 sections:
 * 1. Key Data Points (tables and key-value pairs)
 * 2. Links
 * 3. Raw HTML Content (source code)
 */
function EmailContentRenderer({ htmlBody, textBody }) {
  const [parsedContent, setParsedContent] = useState(null);
  const [showRawHTML, setShowRawHTML] = useState(false);

  useEffect(() => {
    if (htmlBody) {
      const parsed = parseEmailHTML(htmlBody);
      setParsedContent(parsed);
    }
  }, [htmlBody]);

  if (!parsedContent) {
    return (
      <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
        {textBody || 'Loading content...'}
      </div>
    );
  }

  const keyValuePairs = extractKeyValuePairs(parsedContent.text);

  // Clean text by removing excessive whitespace
  const cleanText = parsedContent.text
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  return (
    <div className="space-y-6">
      {/* SECTION 1: Key Data Points */}
      <ExplorerSection>
        <div className="space-y-4">
          {/* Extracted tables */}
          {parsedContent.tables.length > 0 && (
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Tables ({parsedContent.tables.length})
              </h4>
              {parsedContent.tables.map((table, tableIdx) => (
                <div key={table.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto shadow-sm">
                  <table className="w-full border-collapse">
                    <tbody>
                      {table.rows.map((row, rowIdx) => (
                        <tr key={rowIdx} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                          {row.map((cell, cellIdx) => {
                            const alignClass = cell.align === 'right' ? 'text-right' : 
                                             cell.align === 'center' ? 'text-center' : 
                                             'text-left';
                            
                            return cell.isHeader ? (
                              <th
                                key={cellIdx}
                                colSpan={cell.colspan}
                                rowSpan={cell.rowspan}
                                className={`px-4 py-3 text-sm font-semibold ${alignClass} text-gray-900 dark:text-gray-100 bg-gray-100 dark:bg-gray-900/70 border-r border-gray-200 dark:border-gray-700 last:border-r-0`}
                              >
                                {cell.text || '\u00A0'}
                              </th>
                            ) : (
                              <td
                                key={cellIdx}
                                colSpan={cell.colspan}
                                rowSpan={cell.rowspan}
                                className={`px-4 py-3 text-sm ${alignClass} text-gray-900 dark:text-gray-100 border-r border-gray-200 dark:border-gray-700 last:border-r-0`}
                              >
                                {cell.text || '\u00A0'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          )}

          {/* Key-value pairs (common in transaction emails) */}
          {keyValuePairs.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
              <table className="w-full">
                <tbody>
                  {keyValuePairs.map((pair, idx) => (
                    <tr key={idx} className="border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                      <td className="px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-900/50 align-top">
                        {pair.key}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100 text-right font-semibold align-top">
                        {pair.value}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Main text content - cleaned */}
          {cleanText.length > 0 && (
            <div className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              {cleanText.map((line, idx) => (
                <p key={idx} className="mb-2">{line}</p>
              ))}
            </div>
          )}

          {/* Images */}
          {parsedContent.images.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">Images ({parsedContent.images.length})</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {parsedContent.images.map((img, idx) => (
                  <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <div className="relative w-full h-32 bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-3">
                      <img
                        src={img.src}
                        alt={img.alt}
                        className="max-w-full max-h-full w-auto h-auto object-contain rounded"
                        loading="lazy"
                      />
                    </div>
                    {img.alt && (
                      <div className="px-3 py-2 bg-gray-50 dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate" title={img.alt}>
                          {img.alt}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {parsedContent.tables.length === 0 && keyValuePairs.length === 0 && cleanText.length === 0 && parsedContent.images.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400 italic">No key data points extracted</p>
          )}
        </div>
      </ExplorerSection>

      {/* SECTION 2: Links */}
      <ExplorerSection 
        title={
          <div className="flex items-center gap-2">
            <Link className="h-4 w-4" />
            <span>Links</span>
          </div>
        }
      >
        {parsedContent.links.length > 0 ? (
          <div className="space-y-2">
            {parsedContent.links.map((link, idx) => (
              <div key={idx} className="flex items-start gap-2 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700">
                <ExternalLink className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
                  >
                    {link.text}
                  </a>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 break-all">
                    {link.href}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">No links found</p>
        )}
      </ExplorerSection>

      {/* SECTION 3: Raw HTML Content */}
      <ExplorerSection 
        title={
          <div className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            <span>Raw HTML Content</span>
          </div>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              View the raw HTML source of the email
            </p>
            <Button
              onClick={() => setShowRawHTML(!showRawHTML)}
              variant="outline"
              size="sm"
              className="text-xs bg-transparent border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
            >
              {showRawHTML ? 'Hide' : 'Show'} HTML
            </Button>
          </div>
          
          {showRawHTML && (
            <div className="relative">
              <pre className="text-xs text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto max-h-96 overflow-y-auto font-mono">
                {htmlBody}
              </pre>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(htmlBody);
                }}
                variant="outline"
                size="sm"
                className="absolute top-2 right-2 text-xs"
              >
                Copy HTML
              </Button>
            </div>
          )}
        </div>
      </ExplorerSection>
    </div>
  );
}
