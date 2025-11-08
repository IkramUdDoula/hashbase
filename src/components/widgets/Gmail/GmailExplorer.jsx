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
  Code,
  MailCheck,
  Receipt,
  Download,
  FileImage,
  FileText,
  File
} from 'lucide-react';
import { getGmailUrl, fetchEmailDetails, markAsRead, downloadAttachment } from '@/services/gmailService';
import { formatRelativeDate } from '@/lib/dateUtils';
import { parseEmailHTML, extractKeyValuePairs } from '@/lib/emailParser';
import { getSecret, SECRET_KEYS } from '@/services/secretsService';
import { useToast } from '@/components/ui/toast';
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
  const { addToast } = useToast();
  const [copiedEmail, setCopiedEmail] = useState(null);
  const [fullEmail, setFullEmail] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [detailsError, setDetailsError] = useState(null);
  const [creatingReceipt, setCreatingReceipt] = useState(false);
  const [markingAsRead, setMarkingAsRead] = useState(false);

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

  const handleMarkAsRead = async () => {
    if (!emailId) return;
    
    setMarkingAsRead(true);
    try {
      await markAsRead(emailId);
      addToast('Email marked as read', 'success');
      
      // Refresh the email list after marking as read
      if (onRefresh) {
        onRefresh();
      }
      
      // Navigate to next email, or previous if this is the last one
      if (hasNext) {
        handleNext();
      } else if (hasPrevious) {
        handlePrevious();
      } else {
        // If no more emails, close the explorer
        onOpenChange(false);
      }
    } catch (error) {
      console.error('Failed to mark email as read:', error);
      addToast(`Failed to mark as read: ${error.message}`, 'error');
    } finally {
      setMarkingAsRead(false);
    }
  };

  const handleDownloadAttachment = async (attachment, messageId) => {
    try {
      addToast('Downloading attachment...', 'info');
      
      const blob = await downloadAttachment(messageId, attachment.attachmentId);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = attachment.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      addToast('Attachment downloaded successfully', 'success');
    } catch (error) {
      console.error('Failed to download attachment:', error);
      addToast(`Failed to download: ${error.message}`, 'error');
    }
  };

  const handleCreateReceipt = async () => {
    console.log('\n========================================');
    console.log('🚀 CREATE RECEIPT - PROCESS STARTED');
    console.log('========================================');
    console.log('📧 Email ID:', emailId);
    console.log('📝 Email Subject:', email?.subject || 'N/A');

    const openaiKey = getSecret(SECRET_KEYS.OPENAI_API_KEY);
    if (!openaiKey) {
      console.log('❌ FAILED: OpenAI API key not configured');
      console.log('========================================\n');
      addToast('OpenAI API key required for AI processing. Please add it in Settings > Secrets.', 'error');
      return;
    }
    console.log('✅ OpenAI API key: Configured');

    if (!fullEmail?.htmlBody && !fullEmail?.textBody) {
      console.log('❌ FAILED: No email content available');
      console.log('========================================\n');
      addToast('No email content available to process', 'error');
      return;
    }
    
    const content = fullEmail.htmlBody || fullEmail.textBody;
    const contentType = fullEmail.htmlBody ? 'HTML' : 'Text';
    console.log(`✅ Email content: ${contentType} (${content.length} characters)`);

    setCreatingReceipt(true);
    try {
      // Process email with AI to extract receipt data
      console.log('\n📊 STEP 1: AI Processing');
      console.log('─────────────────────────');
      console.log('🤖 Sending to OpenAI for extraction...');
      addToast('Processing email with AI...', 'info');
      
      const startTime = Date.now();
      const extractedData = await processEmailWithAI(content, openaiKey);
      const aiTime = Date.now() - startTime;
      
      console.log(`✅ AI extraction completed in ${aiTime}ms`);
      console.log('📋 Extracted data:', JSON.stringify(extractedData, null, 2));
      
      // Validate required fields
      if (!extractedData.transaction_date || !extractedData.purpose || !extractedData.amount) {
        console.log('❌ FAILED: Missing required fields');
        console.log('   - Date:', extractedData.transaction_date || 'MISSING');
        console.log('   - Purpose:', extractedData.purpose || 'MISSING');
        console.log('   - Amount:', extractedData.amount || 'MISSING');
        addToast('Cannot create receipt: Missing transaction date, purpose, or amount', 'error');
        return;
      }
      
      // Create receipt image
      console.log('\n🖼️  STEP 2: Creating Receipt Image');
      console.log('─────────────────────────────────────');
      addToast('Creating receipt image...', 'info');
      
      const imageStartTime = Date.now();
      const imageDataUrl = await generateReceiptImage(extractedData);
      const imageTime = Date.now() - imageStartTime;
      
      console.log(`✅ Receipt image created in ${imageTime}ms`);
      
      // Download the image
      const link = document.createElement('a');
      link.download = `receipt-${Date.now()}.jpg`;
      link.href = imageDataUrl;
      link.click();
      
      const totalTime = Date.now() - startTime;
      console.log('\n========================================');
      console.log('✅ SUCCESS - Receipt Created!');
      console.log(`⏱️  Total time: ${totalTime}ms`);
      console.log(`   - AI Processing: ${aiTime}ms`);
      console.log(`   - Image Creation: ${imageTime}ms`);
      console.log('========================================\n');
      
      addToast('Receipt image created and downloaded!', 'success');
    } catch (error) {
      console.log('\n========================================');
      console.log('❌ ERROR - Process Failed');
      console.log('========================================');
      console.error('Error details:', error);
      console.log('Error message:', error.message);
      console.log('Error stack:', error.stack);
      console.log('========================================\n');
      
      addToast(`Failed to create receipt: ${error.message}`, 'error');
    } finally {
      setCreatingReceipt(false);
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

  // Format file size helper
  const formatFileSize = (bytes) => {
    if (!bytes) return 'Unknown size';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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
                      <EmailContentRenderer htmlBody={fullEmail.htmlBody} textBody={fullEmail.textBody} addToast={addToast} />
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

            {/* Attachments */}
            {fullEmail?.attachments && fullEmail.attachments.length > 0 && (
              <ExplorerSection 
                title={
                  <div className="flex items-center gap-2">
                    <Paperclip className="h-4 w-4" />
                    <span>Attachments ({fullEmail.attachments.length})</span>
                  </div>
                }
              >
                <div className="space-y-2">
                  {fullEmail.attachments.map((attachment, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between w-full p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* File icon based on type */}
                        {attachment.mimeType?.startsWith('image/') ? (
                          <FileImage className="h-5 w-5 text-blue-500 flex-shrink-0" />
                        ) : attachment.mimeType?.includes('pdf') || attachment.mimeType?.includes('document') ? (
                          <FileText className="h-5 w-5 text-red-500 flex-shrink-0" />
                        ) : (
                          <File className="h-5 w-5 text-gray-500 flex-shrink-0" />
                        )}
                        
                        {/* Filename */}
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                          {attachment.filename}
                        </span>
                      </div>

                      {/* File size */}
                      <span className="text-xs text-gray-500 dark:text-gray-400 mx-4 flex-shrink-0">
                        {formatFileSize(attachment.size)}
                      </span>

                      {/* Download button */}
                      <Button
                        onClick={() => handleDownloadAttachment(attachment, emailId)}
                        variant="ghost"
                        size="sm"
                        className="flex-shrink-0 h-8 w-8 p-0"
                        title="Download attachment"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ExplorerSection>
            )}

          </ExplorerBody>

          {/* Actions Footer - Sticky at bottom */}
          <ExplorerFooter>
            <div className="grid grid-cols-3 gap-2">
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
                onClick={handleMarkAsRead}
                disabled={markingAsRead}
                variant="outline"
                size="sm"
                className="bg-transparent border-white/30 hover:bg-white/10 hover:border-white dark:border-white/30 dark:hover:bg-white/10 dark:hover:border-white"
              >
                {markingAsRead ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <MailCheck className="h-4 w-4 mr-2" />
                )}
                {markingAsRead ? 'Marking...' : 'Mark as Read'}
              </Button>
              <Button
                onClick={handleCreateReceipt}
                disabled={creatingReceipt}
                variant="outline"
                size="sm"
                className="bg-transparent border-white/30 hover:bg-white/10 hover:border-white dark:border-white/30 dark:hover:bg-white/10 dark:hover:border-white"
              >
                {creatingReceipt ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Receipt className="h-4 w-4 mr-2" />
                )}
                {creatingReceipt ? 'Creating...' : 'Create Receipt'}
              </Button>
            </div>
          </ExplorerFooter>
        </>
      )}
    </Explorer>
  );
}

/**
 * Process email HTML content with AI to extract receipt data
 * This uses OpenAI to extract structured data from email HTML
 */
async function processEmailWithAI(htmlContent, openaiApiKey) {
  console.log('🔧 processEmailWithAI() called');
  console.log('   - Content length:', htmlContent.length, 'characters');
  console.log('   - API Key present:', !!openaiApiKey);
  
  if (!openaiApiKey) {
    console.log('❌ OpenAI API key not configured');
    throw new Error('OpenAI API key not configured. Please add it in Settings > Secrets.');
  }

  const AI_PROMPT = `You are an intelligent financial document analyzer. Extract structured receipt/transaction data from this email HTML.

The email may contain: receipts, invoices, payment confirmations, transaction notifications from services like Stripe, PayPal, bKash, Nagad, etc.

EXTRACT THESE FIELDS (return as JSON):

REQUIRED:
- amount: Transaction amount as number (NOT balance/fees/charges)
- purpose: Transaction category or description
- transaction_type: "income" (credits/received) or "expense" (debits/payments) or "savings"
- transaction_date: ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)

OPTIONAL:
- sender: Person/entity who sent money
- from_account: Sender's account number (may be masked)
- to_account: Recipient's account number
- receiver: Person/entity who received money
- currency: Infer from symbols/text (৳/Tk/BDT → BDT, $ → USD, € → EUR)
- platform: Service used (bKash, Nagad, Stripe, PayPal, bank name)
- transaction_id: Reference/tracking number
- details: Additional info (fees, merchant address, notes)

PURPOSE CATEGORIES (choose best fit):
Food, Clothing, Essentials, Accommodation, Fuel, Transportation, Electricity, Gas, Water, Phone, Internet, Subscription, Education, Salary, Tax, Gift, or "Any Other Expenses"

EXTRACTION RULES:
1. Return ONLY valid JSON, no commentary
2. amount must be a number (extract from "Amount:", "Total:", currency symbols)
3. Ignore service charges, VAT, balance - only extract transaction amount
4. Use context clues: green/plus = income, red/minus = expense
5. Handle various date formats and convert to ISO 8601
6. Extract transaction IDs from any reference/confirmation numbers
7. Use null for fields that cannot be determined
8. Verify amount is transaction value, not account balance

EXAMPLE OUTPUT:
{
  "sender": "John Doe",
  "from_account": "****1234",
  "to_account": "****5678",
  "receiver": "Acme Corp",
  "amount": 150.50,
  "currency": "USD",
  "transaction_type": "expense",
  "platform": "Stripe",
  "transaction_id": "TXN-12345",
  "transaction_date": "2025-01-05T10:30:00Z",
  "purpose": "Office Supplies",
  "details": "Purchased office supplies"
}

Now analyze this email and return extracted data as JSON:`;

  try {
    console.log('📡 Making request to OpenAI API...');
    console.log('   - Model: gpt-4o-mini');
    console.log('   - Temperature: 0.1');
    console.log('   - Response format: JSON');
    
    const requestBody = {
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'user',
          content: `${AI_PROMPT}\n\nEmail HTML:\n${htmlContent}`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.1
    };
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });

    console.log('📥 OpenAI API response received');
    console.log('   - Status:', response.status, response.statusText);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      console.log('❌ OpenAI API error:', error);
      throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('📊 OpenAI response data:', {
      model: result.model,
      usage: result.usage,
      finish_reason: result.choices[0].finish_reason
    });
    
    const extracted = JSON.parse(result.choices[0].message.content);
    console.log('🔍 Raw extracted data:', extracted);

    // Post-process: ensure amount is number
    if (typeof extracted.amount === 'string') {
      console.log('🔧 Converting amount from string to number:', extracted.amount);
      extracted.amount = parseFloat(extracted.amount.replace(/[^0-9.-]/g, ''));
      console.log('   - Converted to:', extracted.amount);
    }

    // Validate required fields
    console.log('✓ Validating required fields...');
    
    if (!extracted.amount || typeof extracted.amount !== 'number') {
      console.log('❌ Validation failed: Invalid amount');
      throw new Error('Failed to extract amount from email');
    }
    console.log('   ✓ Amount:', extracted.amount);
    
    if (!extracted.purpose || typeof extracted.purpose !== 'string') {
      console.log('❌ Validation failed: Invalid purpose');
      throw new Error('Failed to extract purpose from email');
    }
    console.log('   ✓ Purpose:', extracted.purpose);
    
    if (!extracted.transaction_type || !['income', 'expense', 'savings'].includes(extracted.transaction_type.toLowerCase())) {
      console.log('❌ Validation failed: Invalid transaction_type');
      throw new Error('Failed to extract valid transaction_type from email');
    }
    console.log('   ✓ Transaction Type:', extracted.transaction_type);
    
    if (!extracted.transaction_date) {
      console.log('⚠️  Transaction date not found, using current date');
      extracted.transaction_date = new Date().toISOString();
    }
    console.log('   ✓ Transaction Date:', extracted.transaction_date);
    
    console.log('✅ All validations passed');
    return extracted;
  } catch (error) {
    console.error('❌ Error in processEmailWithAI:', error);
    throw error;
  }
}

/**
 * Generate a receipt image from extracted data
 * Creates a professional-looking receipt as a JPG image
 */
async function generateReceiptImage(data) {
  return new Promise((resolve, reject) => {
    try {
      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = 800;
      canvas.height = 1000;
      const ctx = canvas.getContext('2d');

      // Background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Header
      ctx.fillStyle = '#1e40af';
      ctx.fillRect(0, 0, canvas.width, 120);
      
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('TRANSACTION RECEIPT', canvas.width / 2, 75);

      // Transaction Type Badge
      const typeY = 160;
      const typeColor = data.transaction_type === 'income' ? '#10b981' : 
                        data.transaction_type === 'expense' ? '#ef4444' : '#3b82f6';
      ctx.fillStyle = typeColor;
      ctx.fillRect(250, typeY, 300, 50);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Arial';
      ctx.fillText(data.transaction_type.toUpperCase(), canvas.width / 2, typeY + 35);

      // Main content area
      let y = 250;
      const leftMargin = 80;
      const rightMargin = canvas.width - 80;
      const lineHeight = 60;

      // Helper function to draw a row
      const drawRow = (label, value, isBold = false) => {
        // Background for alternating rows
        if (Math.floor((y - 250) / lineHeight) % 2 === 0) {
          ctx.fillStyle = '#f9fafb';
          ctx.fillRect(40, y - 40, canvas.width - 80, lineHeight);
        }

        // Label
        ctx.fillStyle = '#6b7280';
        ctx.font = '20px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(label, leftMargin, y);

        // Value
        ctx.fillStyle = '#111827';
        ctx.font = isBold ? 'bold 24px Arial' : '22px Arial';
        ctx.textAlign = 'right';
        
        // Wrap text if too long
        const maxWidth = rightMargin - leftMargin - 200;
        const valueStr = String(value || 'N/A');
        if (ctx.measureText(valueStr).width > maxWidth) {
          const words = valueStr.split(' ');
          let line = '';
          for (let word of words) {
            const testLine = line + word + ' ';
            if (ctx.measureText(testLine).width > maxWidth) {
              ctx.fillText(line, rightMargin, y);
              y += 30;
              line = word + ' ';
            } else {
              line = testLine;
            }
          }
          ctx.fillText(line, rightMargin, y);
        } else {
          ctx.fillText(valueStr, rightMargin, y);
        }
        
        y += lineHeight;
      };

      // Draw all fields
      drawRow('Amount:', `${data.currency || 'USD'} ${data.amount.toFixed(2)}`, true);
      drawRow('Purpose:', data.purpose);
      drawRow('Date:', new Date(data.transaction_date).toLocaleString());
      
      if (data.sender) drawRow('Sender:', data.sender);
      if (data.receiver) drawRow('Receiver:', data.receiver);
      if (data.platform) drawRow('Platform:', data.platform);
      if (data.transaction_id) drawRow('Transaction ID:', data.transaction_id);
      if (data.from_account) drawRow('From Account:', data.from_account);
      if (data.to_account) drawRow('To Account:', data.to_account);
      if (data.details) drawRow('Details:', data.details);

      // Footer
      y += 40;
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(0, y, canvas.width, 2);
      
      y += 40;
      ctx.fillStyle = '#9ca3af';
      ctx.font = '16px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('Generated on ' + new Date().toLocaleString(), canvas.width / 2, y);
      
      y += 30;
      ctx.fillText('This is a computer-generated receipt', canvas.width / 2, y);

      // Convert to JPG
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      resolve(dataUrl);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * EmailContentRenderer - Parses and displays email HTML in a clean, structured format
 * For HTML emails, shows 3 sections:
 * 1. Key Data Points (tables and key-value pairs)
 * 2. Links
 * 3. Raw HTML Content (source code)
 */
function EmailContentRenderer({ htmlBody, textBody, addToast }) {
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
                    <div 
                      className="relative w-full h-32 bg-gray-100 dark:bg-gray-900 flex items-center justify-center p-3 cursor-pointer group"
                      onClick={() => window.open(img.src, '_blank')}
                      title="Click to open in new tab"
                    >
                      <img
                        src={img.src}
                        alt={img.alt}
                        className="max-w-full max-h-full w-auto h-auto object-contain rounded group-hover:opacity-80 transition-opacity"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 rounded">
                        <ExternalLink className="h-6 w-6 text-white" />
                      </div>
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
            <div className="flex items-center gap-2">
              <Button
                onClick={() => setShowRawHTML(!showRawHTML)}
                variant="outline"
                size="sm"
                className="text-xs bg-transparent border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
              >
                {showRawHTML ? 'Hide' : 'Show'} HTML
              </Button>
              <Button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(htmlBody);
                    addToast('HTML copied to clipboard', 'success');
                  } catch (err) {
                    console.error('Failed to copy HTML:', err);
                    addToast('Failed to copy HTML', 'error');
                  }
                }}
                variant="outline"
                size="sm"
                className="text-xs bg-transparent border-gray-300 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800"
              >
                Copy HTML
              </Button>
            </div>
          </div>
          
          {showRawHTML && (
            <div className="relative">
              <pre className="text-xs text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto max-h-96 overflow-y-auto font-mono">
                {htmlBody}
              </pre>
            </div>
          )}
        </div>
      </ExplorerSection>
    </div>
  );
}
