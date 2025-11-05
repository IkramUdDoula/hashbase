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
  Receipt, 
  ExternalLink,
  Calendar,
  Loader2,
  DollarSign,
  User,
  Building,
  CreditCard,
  Hash,
  FileText,
  ArrowRightLeft
} from 'lucide-react';
import { getReceipt } from '@/services/haalkhataService';
import { formatRelativeDate } from '@/lib/dateUtils';

/**
 * HaalkhataExplorer - Detailed receipt viewer
 * 
 * Displays full receipt details with:
 * - Transaction information
 * - Amount and currency
 * - Sender/Receiver
 * - Platform and transaction ID
 * - Additional details
 */
export function HaalkhataExplorer({ 
  open, 
  onOpenChange, 
  receiptId,
  receipts = [],
  onReceiptChange,
  onRefresh
}) {
  const [fullReceipt, setFullReceipt] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Find current receipt from the list
  const currentIndex = receipts.findIndex(r => r.invoice_code === receiptId);
  const receipt = receipts[currentIndex] || null;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < receipts.length - 1;

  // Fetch full receipt details when receiptId changes
  useEffect(() => {
    const loadFullReceipt = async () => {
      if (!receiptId || !open) return;
      
      setLoading(true);
      setError(null);
      
      try {
        const details = await getReceipt(receiptId);
        setFullReceipt(details.receipt || details);
      } catch (err) {
        console.error('Failed to load receipt details:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadFullReceipt();
  }, [receiptId, open]);

  const handlePrevious = () => {
    if (hasPrevious) {
      const prevReceipt = receipts[currentIndex - 1];
      setFullReceipt(null);
      onReceiptChange(prevReceipt.invoice_code);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      const nextReceipt = receipts[currentIndex + 1];
      setFullReceipt(null);
      onReceiptChange(nextReceipt.invoice_code);
    }
  };

  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const displayReceipt = fullReceipt || receipt;

  return (
    <Explorer
      open={open}
      onOpenChange={onOpenChange}
      title="Receipt Details"
      showNavigation={receipts.length > 1}
      onPrevious={handlePrevious}
      onNext={handleNext}
      hasPrevious={hasPrevious}
      hasNext={hasNext}
    >
      {!displayReceipt ? (
        <div className="flex flex-col items-center justify-center h-64 text-center p-4">
          <Receipt className="h-12 w-12 text-gray-400 mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Receipt not found</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          <span className="ml-2 text-sm text-gray-500">Loading receipt details...</span>
        </div>
      ) : error ? (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-sm text-red-700 dark:text-red-300">
            ⚠️ Failed to load receipt details: {error}
          </p>
        </div>
      ) : (
        <>
          {/* Receipt Header Info */}
          <ExplorerHeader>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  {displayReceipt.purpose || '(No purpose)'}
                </h3>
                <Badge
                  variant={
                    displayReceipt.transaction_type === 'income' ? 'success' :
                    displayReceipt.transaction_type === 'expense' ? 'destructive' :
                    'default'
                  }
                >
                  {displayReceipt.transaction_type}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                <Calendar className="h-3 w-3" />
                <span>{formatRelativeDate(displayReceipt.transaction_date || displayReceipt.created_at)}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                {formatCurrency(displayReceipt.amount, displayReceipt.currency)}
              </p>
            </div>
          </ExplorerHeader>

          <ExplorerBody>
            {/* Invoice Code */}
            <ExplorerSection>
              <ExplorerField label="Invoice Code">
                <div className="flex items-center gap-2">
                  <Hash className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  <span className="font-mono text-sm">{displayReceipt.invoice_code}</span>
                </div>
              </ExplorerField>
            </ExplorerSection>

            {/* Transaction Details */}
            <ExplorerSection title="Transaction Details">
              <div className="space-y-3">
                {displayReceipt.sender && (
                  <ExplorerField label="Sender">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span>{displayReceipt.sender}</span>
                    </div>
                  </ExplorerField>
                )}

                {displayReceipt.receiver && (
                  <ExplorerField label="Receiver">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span>{displayReceipt.receiver}</span>
                    </div>
                  </ExplorerField>
                )}

                {displayReceipt.platform && (
                  <ExplorerField label="Platform">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span>{displayReceipt.platform}</span>
                    </div>
                  </ExplorerField>
                )}

                {displayReceipt.transaction_id && (
                  <ExplorerField label="Transaction ID">
                    <div className="flex items-center gap-2">
                      <Hash className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="font-mono text-sm">{displayReceipt.transaction_id}</span>
                    </div>
                  </ExplorerField>
                )}

                <ExplorerField label="Transaction Date">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span>{formatDate(displayReceipt.transaction_date)}</span>
                  </div>
                </ExplorerField>
              </div>
            </ExplorerSection>

            {/* Account Information */}
            {(displayReceipt.from_account || displayReceipt.to_account) && (
              <ExplorerSection title="Account Information">
                <div className="space-y-3">
                  {displayReceipt.from_account && (
                    <ExplorerField label="From Account">
                      <div className="flex items-center gap-2">
                        <ArrowRightLeft className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="font-mono text-sm">{displayReceipt.from_account}</span>
                      </div>
                    </ExplorerField>
                  )}

                  {displayReceipt.to_account && (
                    <ExplorerField label="To Account">
                      <div className="flex items-center gap-2">
                        <ArrowRightLeft className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="font-mono text-sm">{displayReceipt.to_account}</span>
                      </div>
                    </ExplorerField>
                  )}
                </div>
              </ExplorerSection>
            )}

            {/* Additional Details */}
            {displayReceipt.details && (
              <ExplorerSection title="Additional Details">
                <div className="flex items-start gap-2">
                  <FileText className="h-4 w-4 text-gray-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {displayReceipt.details}
                  </p>
                </div>
              </ExplorerSection>
            )}

            {/* Metadata */}
            <ExplorerSection title="Metadata">
              <div className="space-y-2 text-xs text-gray-500 dark:text-gray-400">
                <div className="flex justify-between">
                  <span>Created:</span>
                  <span>{formatDate(displayReceipt.created_at)}</span>
                </div>
                {displayReceipt.updated_at && displayReceipt.updated_at !== displayReceipt.created_at && (
                  <div className="flex justify-between">
                    <span>Updated:</span>
                    <span>{formatDate(displayReceipt.updated_at)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Processing Method:</span>
                  <span className="capitalize">{displayReceipt.processing_method || 'manual'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Complete:</span>
                  <Badge variant={displayReceipt.is_complete ? 'success' : 'secondary'} className="text-xs">
                    {displayReceipt.is_complete ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </div>
            </ExplorerSection>
          </ExplorerBody>

          {/* Actions Footer */}
          <ExplorerFooter>
            <div className="grid grid-cols-1 gap-2">
              <Button
                onClick={onRefresh}
                variant="outline"
                size="sm"
                className="bg-transparent border-white/30 hover:bg-white/10 hover:border-white dark:border-white/30 dark:hover:bg-white/10 dark:hover:border-white"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Refresh Receipts
              </Button>
            </div>
          </ExplorerFooter>
        </>
      )}
    </Explorer>
  );
}
