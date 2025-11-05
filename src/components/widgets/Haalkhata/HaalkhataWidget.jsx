import React, { useState, useEffect } from 'react';
import { BaseWidgetV2 } from '../../BaseWidgetV2';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Receipt, 
  Plus,
  Upload,
  Loader2,
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  RefreshCw
} from 'lucide-react';
import { WidgetModal, WidgetModalFooter } from '@/components/ui/widget-modal';
import { useToast } from '@/components/ui/toast';
import { 
  getReceipts, 
  isHaalkhataConfigured,
  createReceipt,
  processImageWithAI 
} from '@/services/haalkhataService';
import { getSecret, SECRET_KEYS } from '@/services/secretsService';
import { formatRelativeDate } from '@/lib/dateUtils';
import { HaalkhataExplorer } from './HaalkhataExplorer';
import { CreateReceiptModal } from './CreateReceiptModal';

/**
 * HaalkhataWidget - Receipt management widget
 * 
 * Features:
 * - View latest receipts
 * - Create receipts manually via form
 * - Upload and process receipts with AI
 * - Configurable number of receipts to display
 */
export function HaalkhataWidget({ rowSpan = 2, dragRef }) {
  const { addToast } = useToast();
  
  // Widget state
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  // Explorer state
  const [explorerOpen, setExplorerOpen] = useState(false);
  const [selectedReceiptId, setSelectedReceiptId] = useState(null);
  
  // Create receipt modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  
  // Settings
  const [settings, setSettings] = useState({
    limit: 10,
    sortBy: 'created_at:desc'
  });
  const [tempSettings, setTempSettings] = useState(settings);
  
  // Check if configured
  const haalkhataConfigured = isHaalkhataConfigured();

  // Load settings from localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('haalkhata_widget_settings');
    if (savedSettings) {
      try {
        const parsed = JSON.parse(savedSettings);
        setSettings(parsed);
        setTempSettings(parsed);
      } catch (e) {
        console.error('Failed to load Haalkhata settings:', e);
      }
    }
  }, []);

  // Save settings to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('haalkhata_widget_settings', JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save Haalkhata settings:', error);
    }
  }, [settings]);

  // Load receipts
  const loadReceipts = async () => {
    if (!haalkhataConfigured) {
      setError('Haalkhata not configured');
      return;
    }

    setLoading(true);
    setError(null);
    
    try {
      const result = await getReceipts({
        limit: settings.limit,
        sort: settings.sortBy
      });
      setReceipts(result.data || []);
    } catch (err) {
      console.error('Error loading receipts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load receipts on mount and when settings change
  useEffect(() => {
    if (haalkhataConfigured) {
      loadReceipts();
    }
  }, [haalkhataConfigured, settings.limit, settings.sortBy]);

  // Handle receipt click
  const handleReceiptClick = (receipt) => {
    setSelectedReceiptId(receipt.invoice_code);
    setExplorerOpen(true);
  };

  // Handle refresh
  const handleRefresh = () => {
    loadReceipts();
  };

  // Handle settings save
  const handleSettingsSave = () => {
    setSettings(tempSettings);
    setSettingsOpen(false);
  };

  // Handle create receipt success
  const handleCreateSuccess = (receipt) => {
    addToast(`Receipt created! Invoice: ${receipt.invoice_code}`, 'success');
    setCreateModalOpen(false);
    loadReceipts(); // Refresh list
  };

  // Calculate summary stats
  const stats = receipts.reduce((acc, receipt) => {
    const amount = receipt.amount || 0;
    if (receipt.transaction_type === 'income') {
      acc.income += amount;
    } else if (receipt.transaction_type === 'expense') {
      acc.expense += amount;
    } else if (receipt.transaction_type === 'savings') {
      acc.savings += amount;
    }
    return acc;
  }, { income: 0, expense: 0, savings: 0 });

  // Format currency
  const formatCurrency = (amount, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  // Widget actions
  const widgetActions = [
    {
      icon: Plus,
      label: 'Create Receipt',
      onClick: () => setCreateModalOpen(true),
      disabled: !haalkhataConfigured
    },
    {
      icon: Upload,
      label: 'Upload & Process',
      onClick: () => setUploadModalOpen(true),
      disabled: !haalkhataConfigured
    },
    {
      icon: RefreshCw,
      label: 'Refresh',
      onClick: handleRefresh,
      disabled: !haalkhataConfigured || loading
    }
  ];

  return (
    <>
      <BaseWidgetV2
        title="Haalkhata Receipts"
        icon={Receipt}
        dragRef={dragRef}
        rowSpan={rowSpan}
        actions={widgetActions}
        onSettingsClick={() => setSettingsOpen(true)}
      >
        {!haalkhataConfigured ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <Receipt className="h-12 w-12 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              Haalkhata not configured
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              Add your Haalkhata Access Token in Settings → Secrets
            </p>
          </div>
        ) : loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <Receipt className="h-12 w-12 text-red-400 mb-2" />
            <p className="text-sm text-red-600 dark:text-red-400 mb-2">
              Error loading receipts
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500">
              {error}
            </p>
            <Button
              onClick={handleRefresh}
              variant="outline"
              size="sm"
              className="mt-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        ) : receipts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <Receipt className="h-12 w-12 text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              No receipts yet
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mb-4">
              Create your first receipt or upload an image
            </p>
            <div className="flex gap-2">
              <Button
                onClick={() => setCreateModalOpen(true)}
                variant="outline"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Receipt
              </Button>
              <Button
                onClick={() => setUploadModalOpen(true)}
                variant="outline"
                size="sm"
              >
                <Upload className="h-4 w-4 mr-2" />
                Upload Image
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col h-full">
            {/* Summary Stats */}
            <div className="grid grid-cols-3 gap-2 mb-3 px-3 pt-3">
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2 border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingUp className="h-3 w-3 text-green-600 dark:text-green-400" />
                  <span className="text-xs font-medium text-green-700 dark:text-green-300">Income</span>
                </div>
                <p className="text-sm font-bold text-green-900 dark:text-green-100">
                  {formatCurrency(stats.income)}
                </p>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2 border border-red-200 dark:border-red-800">
                <div className="flex items-center gap-1 mb-1">
                  <TrendingDown className="h-3 w-3 text-red-600 dark:text-red-400" />
                  <span className="text-xs font-medium text-red-700 dark:text-red-300">Expense</span>
                </div>
                <p className="text-sm font-bold text-red-900 dark:text-red-100">
                  {formatCurrency(stats.expense)}
                </p>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2 border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-1 mb-1">
                  <Wallet className="h-3 w-3 text-blue-600 dark:text-blue-400" />
                  <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Savings</span>
                </div>
                <p className="text-sm font-bold text-blue-900 dark:text-blue-100">
                  {formatCurrency(stats.savings)}
                </p>
              </div>
            </div>

            {/* Receipts List */}
            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
              {receipts.map((receipt) => (
                <button
                  key={receipt.id}
                  onClick={() => handleReceiptClick(receipt)}
                  className="w-full p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500 transition-colors text-left bg-white dark:bg-gray-800"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                        {receipt.purpose || '(No purpose)'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {receipt.invoice_code}
                      </p>
                    </div>
                    <Badge
                      variant={
                        receipt.transaction_type === 'income' ? 'success' :
                        receipt.transaction_type === 'expense' ? 'destructive' :
                        'default'
                      }
                      className="ml-2 flex-shrink-0"
                    >
                      {receipt.transaction_type}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-lg font-bold text-gray-900 dark:text-gray-100">
                      {formatCurrency(receipt.amount, receipt.currency)}
                    </p>
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                      <Calendar className="h-3 w-3" />
                      <span>{formatRelativeDate(receipt.transaction_date || receipt.created_at)}</span>
                    </div>
                  </div>
                  {receipt.platform && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      via {receipt.platform}
                    </p>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </BaseWidgetV2>

      {/* Settings Modal */}
      <WidgetModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Haalkhata Settings"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Number of Receipts to Display
            </label>
            <select
              value={tempSettings.limit}
              onChange={(e) => setTempSettings({ ...tempSettings, limit: parseInt(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value={5}>5 receipts</option>
              <option value={10}>10 receipts</option>
              <option value={20}>20 receipts</option>
              <option value={50}>50 receipts</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Sort By
            </label>
            <select
              value={tempSettings.sortBy}
              onChange={(e) => setTempSettings({ ...tempSettings, sortBy: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="created_at:desc">Newest First</option>
              <option value="created_at:asc">Oldest First</option>
              <option value="amount:desc">Highest Amount</option>
              <option value="amount:asc">Lowest Amount</option>
            </select>
          </div>
        </div>

        <WidgetModalFooter>
          <Button
            onClick={() => setSettingsOpen(false)}
            variant="outline"
          >
            Cancel
          </Button>
          <Button onClick={handleSettingsSave}>
            Save Settings
          </Button>
        </WidgetModalFooter>
      </WidgetModal>

      {/* Explorer */}
      {explorerOpen && (
        <HaalkhataExplorer
          open={explorerOpen}
          onOpenChange={setExplorerOpen}
          receiptId={selectedReceiptId}
          receipts={receipts}
          onReceiptChange={setSelectedReceiptId}
          onRefresh={loadReceipts}
        />
      )}

      {/* Create Receipt Modal */}
      {createModalOpen && (
        <CreateReceiptModal
          open={createModalOpen}
          onClose={() => setCreateModalOpen(false)}
          onSuccess={handleCreateSuccess}
        />
      )}

      {/* Upload & Process Modal */}
      {uploadModalOpen && (
        <UploadReceiptModal
          open={uploadModalOpen}
          onClose={() => setUploadModalOpen(false)}
          onSuccess={handleCreateSuccess}
        />
      )}
    </>
  );
}

/**
 * UploadReceiptModal - Modal for uploading and processing receipt images with AI
 */
function UploadReceiptModal({ open, onClose, onSuccess }) {
  const { addToast } = useToast();
  const [processing, setProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      addToast('Please select an image file', 'error');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      addToast('Image size must be less than 10MB', 'error');
      return;
    }

    setSelectedFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      addToast('Please select an image', 'error');
      return;
    }

    const openaiKey = getSecret(SECRET_KEYS.OPENAI_API_KEY);
    if (!openaiKey) {
      addToast('OpenAI API key required for AI processing. Please add it in Settings > Secrets.', 'error');
      return;
    }

    setProcessing(true);
    try {
      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64Image = e.target.result;

        try {
          // Process image with AI
          addToast('Processing image with AI...', 'info');
          const extractedData = await processImageWithAI(base64Image, openaiKey);

          // Create receipt
          addToast('Creating receipt...', 'info');
          const receipt = await createReceipt(extractedData);

          onSuccess(receipt);
          onClose();
        } catch (error) {
          console.error('Error processing image:', error);
          addToast(`Failed to process image: ${error.message}`, 'error');
          setProcessing(false);
        }
      };
      reader.readAsDataURL(selectedFile);
    } catch (error) {
      console.error('Error uploading receipt:', error);
      addToast(`Failed to upload receipt: ${error.message}`, 'error');
      setProcessing(false);
    }
  };

  return (
    <WidgetModal
      isOpen={open}
      onClose={onClose}
      title="Upload & Process Receipt"
    >
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Select Receipt Image
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            disabled={processing}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
          />
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            Supported formats: JPEG, PNG, WebP, GIF (max 10MB)
          </p>
        </div>

        {preview && (
          <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Preview:</p>
            <img
              src={preview}
              alt="Receipt preview"
              className="max-w-full h-auto max-h-64 mx-auto rounded"
            />
          </div>
        )}

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <p className="text-xs text-blue-800 dark:text-blue-200">
            <strong>AI Processing:</strong> The image will be analyzed using OpenAI to extract transaction details automatically.
          </p>
        </div>
      </div>

      <WidgetModalFooter>
        <Button
          onClick={onClose}
          variant="outline"
          disabled={processing}
        >
          Cancel
        </Button>
        <Button
          onClick={handleUpload}
          disabled={!selectedFile || processing}
        >
          {processing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload & Process
            </>
          )}
        </Button>
      </WidgetModalFooter>
    </WidgetModal>
  );
}
