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
import { parseEmailHTML, parseEmailText, extractKeyValuePairs } from '@/lib/emailParser';
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
    // Use a flag to prevent race conditions
    let isCancelled = false;
    
    const loadFullEmail = async () => {
      if (!emailId || !open) return;
      
      setLoadingDetails(true);
      setDetailsError(null);
      
      try {
        const details = await fetchEmailDetails(emailId);
        
        // Only update state if this request wasn't cancelled
        if (!isCancelled) {
          setFullEmail(details);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('Failed to load email details:', error);
          setDetailsError(error.message);
          
          // If authentication expired, trigger parent refresh to update auth state
          if (error.message.includes('authentication expired')) {
            console.log('🔄 Gmail Explorer: Authentication expired, closing explorer and triggering parent refresh');
            // Close the explorer first to prevent re-triggering
            onOpenChange(false);
            // Then trigger parent refresh after a delay
            if (onRefresh) {
              setTimeout(() => onRefresh(), 500);
            }
          }
        }
      } finally {
        if (!isCancelled) {
          setLoadingDetails(false);
        }
      }
    };

    loadFullEmail();
    
    // Cleanup function to cancel the request if component unmounts or emailId changes
    return () => {
      isCancelled = true;
    };
  }, [emailId, open, onRefresh, onOpenChange]);

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
                        className="flex-shrink-0 h-8 w-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-700"
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

  const AI_PROMPT = `You are an intelligent financial document analyzer with vision and translation capabilities.

Your task is to **extract and normalize transaction attributes from financial receipts and documents**.

## OUTPUT FORMAT

Return structured data with all fields properly typed and validated.
The system will automatically ensure correct formatting.

---

## VISUAL + LANGUAGE PROCESSING

- Read the full image including header, footer, logos, icons, and layout
- Identify the financial platform or institution from visible branding or UI
- Detect the language of each text segment and translate internally to English before interpreting
- Preserve all numbers exactly as shown
- Separate transaction amount from balance, VAT, fees, discounts, or totals
- Handle blur, rotation, watermarks, screenshots, or handwriting
- Extract text from tables, forms, and structured layouts

---

## CURRENCY DETECTION

- Detect currency from symbols (৳, $, €, £, ¥, ₹), keywords, platform, or locale
- If multiple currencies appear, select the transaction currency (not balance currency)
- Output **ISO 4217** currency code only: BDT, USD, EUR, GBP, INR, JPY, etc.
- Common mappings:
  - ৳ or "Taka" → BDT
  - $ → USD (unless context suggests otherwise)
  - € → EUR
  - £ → GBP
  - ₹ or "Rupee" → INR
- If currency is unclear, return ""

---

## FIELD EXTRACTION RULES

### sender
- Extract sender/payer name if explicitly written
- Look for labels: "From", "Sender", "Payer", "Paid by"
- For person-to-person transfers, extract the sender's name or phone number
- If not visible or unclear, return ""
- Examples: "John Doe", "01712345678", "ABC Company"

### from_account
- Extract source account number or identifier if visible
- Can be full or masked: "01712****78", "Account: ****1234", "Card ending 5678"
- Look for labels: "From Account", "Source", "Debit from"
- Return exactly as shown (preserve masking)
- If not visible, return ""

### to_account
- Extract destination account number or identifier if visible
- Can be full or masked: "01798****32", "Account: ****5678", "Card ending 1234"
- Look for labels: "To Account", "Destination", "Credit to"
- Return exactly as shown (preserve masking)
- If not visible, return ""

### receiver
- Extract receiver/payee name if explicitly written
- Look for labels: "To", "Receiver", "Payee", "Paid to", "Merchant"
- For merchant payments, extract merchant name
- If not visible or unclear, return ""
- Examples: "Jane Smith", "01798765432", "Daraz.com.bd", "Starbucks"

### amount
- Extract the PRIMARY transaction amount only
- Look for labels: "Amount", "Transaction Amount", "Paid", "Received", "Total", "Grand Total"
- **EXCLUDE these:**
  - Balance amounts: "Balance", "Available Balance", "New Balance", "Previous Balance"
  - Fees: "Service Charge", "Fee", "VAT", "Tax" (unless part of total)
  - Subtotals (use final total instead)
- **If multiple amounts visible:**
  - For payments: use the amount paid (not remaining balance)
  - For receipts: use the transaction amount (not running balance)
  - For invoices: use the total amount due or paid
- Return as a positive number (remove any negative signs)
- Remove currency symbols and commas: "৳1,500.00" → 1500.00
- If amount is unclear or not visible, return 0

### currency
- ISO 4217 currency code (BDT, USD, EUR, GBP, INR, etc.)
- Detect from symbols, text, or platform context
- Default to BDT for Bangladesh platforms (bKash, Nagad, Rocket) if not specified
- If completely unclear, return ""

### transaction_type
**Allowed values:** "Expense", "Income", "Transfer"

Classify based on transaction flow and keywords:

**Expense:**
- Payment to merchant, shop, or service provider
- Bill payment (electricity, water, internet, phone)
- Purchase of goods or services
- Keywords: "paid", "purchase", "bill payment", "payment to", "debit"
- Money leaving your account to a non-financial entity
- Examples: grocery shopping, restaurant bill, online purchase

**Income:**
- Money received from person, organization, or system
- Salary, wages, refund, cashback, interest, dividend
- Keywords: "received", "credited", "refund", "salary", "cashback", "interest", "credit"
- Money entering your account from a non-financial entity
- Examples: salary deposit, refund from merchant, cashback reward

**Transfer:**
- Money moved between your own financial accounts or platforms
- Both source AND destination must be financial platforms (bank, wallet, card)
- Keywords: "send money", "transfer", "cash out", "withdraw", "deposit", "fund transfer"
- Examples:
  - bKash to bKash (different accounts) → Transfer
  - Bank to Nagad → Transfer
  - Rocket to Bank → Transfer
  - Cash withdrawal from ATM → Transfer
- **NOT Transfer:** bKash to merchant (this is Expense)

**Default:** If unclear, classify as "Expense"

### platform
Extract and normalize the platform name:

**Mobile Wallets:**
- bKash variations (bKash, BKASH, Bkash, বিকাশ) → return "bKash"
- Nagad variations (NAGAD, Nagad, নগদ) → return "Nagad"
- Rocket variations (ROCKET, Rocket, রকেট) → return "Rocket"
- Upay variations (UPAY, Upay, উপায়) → return "Upay"
- SureCash → return "SureCash"
- MCash → return "MCash"

**Banks:**
- Dutch-Bangla Bank, DBBL, ডাচ-বাংলা ব্যাংক → return "DBBL"
- Brac Bank, ব্র্যাক ব্যাংক → return "Brac Bank"
- City Bank → return "City Bank"
- Standard Chartered → return "Standard Chartered"
- HSBC → return "HSBC"
- If generic bank UI without specific name → return "Bank"

**Cards:**
- If credit card visible → return "Credit Card"
- If debit card visible → return "Debit Card"
- If specific bank card (e.g., "DBBL Credit Card") → return "DBBL"

**Other:**
- Cash receipts, handwritten notes → return "Cash"
- If completely unclear → return "Unknown"

Always normalize to consistent naming (proper case, standard abbreviations).

### transfer_to_platform
- Fill **ONLY IF:**
  - "transaction_type" = "Transfer"
  - AND destination platform name is explicitly visible or can be inferred
- Use same normalization rules as "platform" field
- Examples:
  - bKash to Nagad → "Nagad"
  - Bank to bKash → "bKash"
  - DBBL to Rocket → "Rocket"
- If destination platform unclear, return ""
- If not a transfer, return ""

### transaction_id
- Extract transaction/reference/TRX ID exactly as shown
- Common labels: "TrxID", "Transaction ID", "Reference", "Ref No", "Reference Number"
- Preserve exact format including letters, numbers, hyphens
- Examples: "ABC123XYZ", "TRX-2026-001234", "REF123456"
- If not visible, return ""

### transaction_date
- Normalize to ISO 8601 format: "YYYY-MM-DD HH:MM:SS+06:00"
- Handle relative dates:
  - "Today", "আজ" (Bengali) → use current date
  - "Yesterday", "গতকাল" (Bengali) → use previous date
- Handle various formats:
  - "05 Feb 2026, 2:30 PM" → "2026-02-05 14:30:00+06:00"
  - "06/02/2026" → "2026-02-06 00:00:00+06:00"
  - "2026-02-06 14:30" → "2026-02-06 14:30:00+06:00"
  - "05-02-2026" → "2026-02-05 00:00:00+06:00"
- Convert 12-hour to 24-hour format:
  - "2:30 PM" → "14:30:00"
  - "11:45 AM" → "11:45:00"
- If time not visible, use "00:00:00"
- If date unreadable or missing, use current datetime
- Always use +06:00 timezone (Bangladesh Standard Time)

### purpose
- Extract or infer the transaction purpose in 2-4 concise words
- **For merchant payments:** use merchant name or category
  - Examples: "Daraz Shopping", "Grocery", "Restaurant", "Fuel"
- **For transfers:** use "Money Transfer" or "Send Money"
- **For bills:** use "Bill Payment" or specific type
  - Examples: "Electricity Bill", "Internet Bill", "Phone Bill"
- **For salary:** use "Salary"
- **For refunds:** use "Refund"
- **For unclear transactions:** use "Payment" or "Transaction"
- Keep it brief, user-friendly, and descriptive
- If no clear purpose, return ""

### details
- Provide a brief summary of the transaction (1-2 sentences)
- Include key information: what, who, when
- Examples:
  - "bKash send money to 01798765432 on 05 Feb 2026"
  - "Payment to Daraz.com.bd using DBBL credit card"
  - "Electricity bill payment via Nagad"
  - "Salary received from ABC Company"
- If image quality is poor, mention: "Image quality low, some details unclear"
- If information is incomplete, mention: "Limited information visible"
- Keep it concise and informative

### is_complete
- Indicates if receipt has sufficient information for processing
- "true" if ALL of these are present:
  - "amount > 0"
  - "transaction_date" is not empty
  - "platform" is not empty and not "Unknown"
- "false" otherwise
- This helps users identify receipts that need manual review

---

## PLATFORM-SPECIFIC EXTRACTION TIPS

### bKash Receipts
- Look for pink/magenta branding
- Transaction ID format: usually 10 alphanumeric characters
- Phone numbers: 11 digits starting with 01
- Common keywords: "Send Money", "Cash Out", "Payment", "Mobile Recharge"

### Nagad Receipts
- Look for orange branding
- Transaction ID format: usually 14 alphanumeric characters
- Phone numbers: 11 digits starting with 01
- Common keywords: "Send Money", "Cash Out", "Payment"

### Rocket Receipts
- Look for purple/violet branding
- Phone numbers: 11 digits starting with 01
- Common keywords: "Send Money", "Cash Out"

### Bank Receipts
- Look for bank logo and name in header
- Account numbers: often masked (****1234)
- Common keywords: "Debit", "Credit", "Transfer", "Withdrawal", "Deposit"

### Credit/Debit Card Receipts
- Look for card network logos (Visa, Mastercard, Amex)
- Card numbers: always masked (****1234)
- Merchant name usually prominent
- Common keywords: "Purchase", "Sale", "Authorization"

### Cash Receipts
- Handwritten or printed receipts without digital platform branding
- May have shop/business name and address
- Often simpler format with just amount and date

---

## HANDLING EDGE CASES

### Poor Image Quality
- If text is blurry but partially readable, extract what you can
- Mention in "details": "Image quality low, some details unclear"
- Set "is_complete = false" if critical fields are unreadable

### Multiple Amounts
- Prioritize labeled amounts: "Transaction Amount", "Total", "Paid"
- Ignore balance amounts: "Available Balance", "New Balance"
- If still unclear, use the most prominent amount

### Ambiguous Transaction Type
- If receipt shows both payment and refund, use the net transaction
- If unclear between Expense and Transfer, default to Expense
- If keywords conflict, prioritize the transaction flow (who to whom)

### Missing Date
- Use current datetime as fallback
- Mention in "details": "Date not visible, using current date"

### Missing Platform
- Try to infer from visual branding, colors, layout
- If completely unclear, return "Unknown"
- Set "is_complete = false"

### Multiple Languages
- Translate all text internally to English before processing
- Preserve numbers and IDs exactly as shown
- Common Bengali keywords:
  - টাকা (Taka) → BDT
  - পাঠানো (Send) → Transfer/Expense
  - গ্রহণ (Receive) → Income
  - আজ (Today) → current date
  - গতকাল (Yesterday) → previous date

### Rotated or Upside-Down Images
- Mentally rotate the image to correct orientation
- Extract text as if properly oriented

### Screenshots with UI Elements
- Ignore phone status bar, navigation buttons, app UI
- Focus on the receipt content only

---

## VALIDATION RULES

Before returning data, verify:

1. **Amount:** Must be > 0 (if visible)
2. **Currency:** Must be valid ISO 4217 code or empty
3. **Transaction Type:** Must be exactly "Expense", "Income", or "Transfer"
4. **Date:** Must be valid ISO 8601 format with timezone
5. **Platform:** Should be normalized (proper case, standard names)
6. **Completeness:** Set "is_complete" correctly based on rules

---

## REMEMBER

1. **Accuracy over speed:** Take time to read the entire image carefully
2. **Context matters:** Use visual branding, layout, and keywords together
3. **Normalize consistently:** Use standard platform names and formats
4. **Handle ambiguity:** When unclear, use sensible defaults and note in details
5. **Validate output:** Ensure all required fields are properly formatted
6. **User-friendly:** Purpose and details should be clear and concise
7. **Completeness flag:** Set correctly to help users identify incomplete receipts

---

## CRITICAL RULES

- **NEVER** return null values (use empty string "" instead)
- **ALWAYS** return amount as a number (not string)
- **ALWAYS** use ISO 8601 date format with +06:00 timezone
- **ALWAYS** use proper transaction_type values (Expense, Income, Transfer)
- **ALWAYS** normalize platform names consistently
- **ALWAYS** set is_complete based on the defined rules
- **NEVER** include markdown, code blocks, or explanations in output

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
 * EmailContentRenderer - Parses and displays email content in a clean, structured format
 * For HTML emails, shows 3 sections:
 * 1. Key Data Points (tables and key-value pairs)
 * 2. Links
 * 3. Raw HTML Content (source code)
 * 
 * For plain text emails, shows:
 * 1. Structured content (headings, paragraphs, lists)
 * 2. Links
 */
function EmailContentRenderer({ htmlBody, textBody, addToast }) {
  const [parsedContent, setParsedContent] = useState(null);
  const [showRawHTML, setShowRawHTML] = useState(false);
  const [isPlainText, setIsPlainText] = useState(false);

  useEffect(() => {
    if (htmlBody) {
      const parsed = parseEmailHTML(htmlBody);
      setParsedContent(parsed);
      setIsPlainText(false);
    } else if (textBody) {
      const parsed = parseEmailText(textBody);
      setParsedContent(parsed);
      setIsPlainText(true);
    }
  }, [htmlBody, textBody]);

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

          {/* Structured content - headings, paragraphs, lists */}
          {parsedContent.structuredContent && parsedContent.structuredContent.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                Content
              </h4>
              <div className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg border border-gray-200 dark:border-gray-700 space-y-3">
                {parsedContent.structuredContent.map((item, idx) => (
                  <StructuredContentItem key={idx} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* Fallback: Main text content - cleaned */}
          {(!parsedContent.structuredContent || parsedContent.structuredContent.length === 0) && cleanText.length > 0 && (
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
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
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
            <span>Links ({parsedContent.links.length})</span>
          </div>
        }
      >
        {parsedContent.links.length > 0 ? (
          <div className="space-y-2">
            {parsedContent.links.map((link, idx) => {
              // Determine badge color based on link type
              const typeColors = {
                anchor: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
                text: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
                attribute: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
                onclick: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
                style: 'bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300'
              };
              
              const typeLabel = {
                anchor: 'Link',
                text: 'URL in Text',
                attribute: 'Data Attribute',
                onclick: 'Click Handler',
                style: 'Style URL'
              };
              
              return (
                <div key={idx} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
                  <ExternalLink className="h-4 w-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <a
                        href={link.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all font-medium"
                        title={link.href}
                      >
                        {link.text.length > 80 ? link.text.substring(0, 80) + '...' : link.text}
                      </a>
                      {link.type && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${typeColors[link.type] || typeColors.text}`}>
                          {typeLabel[link.type] || link.type}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {link.domain || link.href}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(link.href);
                        addToast('URL copied to clipboard', 'success');
                      } catch (err) {
                        console.error('Failed to copy URL:', err);
                        addToast('Failed to copy URL', 'error');
                      }
                    }}
                    className="text-xs px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 flex-shrink-0 transition-colors"
                    title="Copy URL to clipboard"
                  >
                    Copy
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400 italic">No links found</p>
        )}
      </ExplorerSection>

      {/* SECTION 3: Raw Content (HTML or Plain Text) */}
      {!isPlainText && htmlBody && (
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
      )}
    </div>
  );
}

/**
 * StructuredContentItem - Renders individual structured content items
 */
function StructuredContentItem({ item }) {
  switch (item.type) {
    case 'heading':
      // All headings use the same font size, but different weights for visual hierarchy
      const headingWeight = item.level <= 2 ? 'font-bold' : item.level <= 4 ? 'font-semibold' : 'font-medium';
      const headingMargin = item.level <= 2 ? 'mt-4 mb-2' : 'mt-3 mb-1.5';
      return (
        <h3 className={`text-sm ${headingWeight} ${headingMargin} first:mt-0 text-gray-900 dark:text-gray-100`}>
          {item.text}
        </h3>
      );
    
    case 'paragraph':
      return (
        <p className="text-sm leading-relaxed text-gray-800 dark:text-gray-200">
          {item.text}
        </p>
      );
    
    case 'list':
      return (
        <div className="ml-4">
          {item.ordered ? (
            <ol className="list-decimal list-outside space-y-1">
              {item.items.map((listItem, idx) => (
                <li key={idx} className="text-sm text-gray-800 dark:text-gray-200 pl-1">
                  {listItem}
                </li>
              ))}
            </ol>
          ) : (
            <ul className="list-disc list-outside space-y-1">
              {item.items.map((listItem, idx) => (
                <li key={idx} className="text-sm text-gray-800 dark:text-gray-200 pl-1">
                  {listItem}
                </li>
              ))}
            </ul>
          )}
        </div>
      );
    
    case 'blockquote':
      return (
        <blockquote className="border-l-4 border-gray-300 dark:border-gray-600 pl-4 py-2 italic text-sm text-gray-700 dark:text-gray-300">
          {item.text}
        </blockquote>
      );
    
    default:
      return null;
  }
}
