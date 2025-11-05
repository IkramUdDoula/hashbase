import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { WidgetModal, WidgetModalFooter } from '@/components/ui/widget-modal';
import { useToast } from '@/components/ui/toast';
import { createReceipt } from '@/services/haalkhataService';

/**
 * CreateReceiptModal - Modal for manually creating receipts
 */
export function CreateReceiptModal({ open, onClose, onSuccess }) {
  const { addToast } = useToast();
  const [creating, setCreating] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    amount: '',
    currency: 'USD',
    purpose: '',
    transaction_type: 'expense',
    transaction_date: new Date().toISOString().split('T')[0], // YYYY-MM-DD
    sender: '',
    receiver: '',
    platform: '',
    transaction_id: '',
    details: '',
    to_account: '',
    from_account: ''
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      addToast('Please enter a valid amount', 'error');
      return;
    }
    if (!formData.purpose.trim()) {
      addToast('Please enter a purpose', 'error');
      return;
    }

    setCreating(true);
    try {
      // Prepare data for API
      const receiptData = {
        amount: parseFloat(formData.amount),
        currency: formData.currency,
        purpose: formData.purpose.trim(),
        transaction_type: formData.transaction_type,
        transaction_date: new Date(formData.transaction_date).toISOString(),
      };

      // Add optional fields if provided
      if (formData.sender.trim()) receiptData.sender = formData.sender.trim();
      if (formData.receiver.trim()) receiptData.receiver = formData.receiver.trim();
      if (formData.platform.trim()) receiptData.platform = formData.platform.trim();
      if (formData.transaction_id.trim()) receiptData.transaction_id = formData.transaction_id.trim();
      if (formData.details.trim()) receiptData.details = formData.details.trim();
      if (formData.to_account.trim()) receiptData.to_account = formData.to_account.trim();
      if (formData.from_account.trim()) receiptData.from_account = formData.from_account.trim();

      const receipt = await createReceipt(receiptData);
      onSuccess(receipt);
    } catch (error) {
      console.error('Error creating receipt:', error);
      addToast(`Failed to create receipt: ${error.message}`, 'error');
    } finally {
      setCreating(false);
    }
  };

  const purposeCategories = [
    'Food',
    'Clothing',
    'Essentials',
    'Accommodation',
    'Fuel',
    'Transportation',
    'Electricity',
    'Gas',
    'Water',
    'Phone',
    'Internet',
    'Subscription',
    'Education',
    'Salary',
    'Tax',
    'Gift',
    'Any Other Expenses'
  ];

  const currencies = ['USD', 'EUR', 'GBP', 'BDT', 'INR', 'JPY', 'CNY', 'AUD', 'CAD'];

  return (
    <WidgetModal
      isOpen={open}
      onClose={onClose}
      title="Create Receipt"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Required Fields */}
        <div className="space-y-4 pb-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Required Information</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={(e) => handleChange('amount', e.target.value)}
                placeholder="150.50"
                required
                disabled={creating}
              />
            </div>
            <div>
              <Label htmlFor="currency">Currency *</Label>
              <select
                id="currency"
                value={formData.currency}
                onChange={(e) => handleChange('currency', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                disabled={creating}
              >
                {currencies.map(curr => (
                  <option key={curr} value={curr}>{curr}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="purpose">Purpose *</Label>
            <input
              id="purpose"
              list="purpose-categories"
              value={formData.purpose}
              onChange={(e) => handleChange('purpose', e.target.value)}
              placeholder="Office Supplies"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              required
              disabled={creating}
            />
            <datalist id="purpose-categories">
              {purposeCategories.map(cat => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="transaction_type">Transaction Type *</Label>
              <select
                id="transaction_type"
                value={formData.transaction_type}
                onChange={(e) => handleChange('transaction_type', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                disabled={creating}
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
                <option value="savings">Savings</option>
              </select>
            </div>
            <div>
              <Label htmlFor="transaction_date">Date *</Label>
              <Input
                id="transaction_date"
                type="date"
                value={formData.transaction_date}
                onChange={(e) => handleChange('transaction_date', e.target.value)}
                required
                disabled={creating}
              />
            </div>
          </div>
        </div>

        {/* Optional Fields */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Optional Information</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sender">Sender</Label>
              <Input
                id="sender"
                value={formData.sender}
                onChange={(e) => handleChange('sender', e.target.value)}
                placeholder="John Doe"
                disabled={creating}
              />
            </div>
            <div>
              <Label htmlFor="receiver">Receiver</Label>
              <Input
                id="receiver"
                value={formData.receiver}
                onChange={(e) => handleChange('receiver', e.target.value)}
                placeholder="Acme Corp"
                disabled={creating}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="platform">Platform</Label>
              <Input
                id="platform"
                value={formData.platform}
                onChange={(e) => handleChange('platform', e.target.value)}
                placeholder="Stripe, PayPal, bKash, etc."
                disabled={creating}
              />
            </div>
            <div>
              <Label htmlFor="transaction_id">Transaction ID</Label>
              <Input
                id="transaction_id"
                value={formData.transaction_id}
                onChange={(e) => handleChange('transaction_id', e.target.value)}
                placeholder="TXN-12345"
                disabled={creating}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="from_account">From Account</Label>
              <Input
                id="from_account"
                value={formData.from_account}
                onChange={(e) => handleChange('from_account', e.target.value)}
                placeholder="****1234"
                disabled={creating}
              />
            </div>
            <div>
              <Label htmlFor="to_account">To Account</Label>
              <Input
                id="to_account"
                value={formData.to_account}
                onChange={(e) => handleChange('to_account', e.target.value)}
                placeholder="****5678"
                disabled={creating}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="details">Additional Details</Label>
            <textarea
              id="details"
              value={formData.details}
              onChange={(e) => handleChange('details', e.target.value)}
              placeholder="Any additional information..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              disabled={creating}
            />
          </div>
        </div>
      </form>

      <WidgetModalFooter>
        <Button
          onClick={onClose}
          variant="outline"
          disabled={creating}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          disabled={creating}
        >
          {creating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Creating...
            </>
          ) : (
            'Create Receipt'
          )}
        </Button>
      </WidgetModalFooter>
    </WidgetModal>
  );
}
