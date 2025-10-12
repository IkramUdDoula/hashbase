import React, { useState, useEffect } from 'react';
import { Coins } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { AVAILABLE_CRYPTOS } from '@/services/cryptoService';
import { WidgetModal, WidgetModalFooter } from '@/components/ui/widget-modal';

export function CryptoSettingsDialog({ 
  open, 
  onOpenChange, 
  currentHoldings,
  onSave 
}) {
  // Holdings is an object: { bitcoin: 0.5, ethereum: 2.3, ... }
  const [holdings, setHoldings] = useState(currentHoldings || {});
  const [customCryptoId, setCustomCryptoId] = useState('');
  const [customAmount, setCustomAmount] = useState('');

  // Update state when props change
  useEffect(() => {
    if (open) {
      setHoldings(currentHoldings || {});
      setCustomCryptoId('');
      setCustomAmount('');
    }
  }, [open, currentHoldings]);

  const handleHoldingChange = (cryptoId, value) => {
    const amount = parseFloat(value);
    setHoldings(prev => {
      const newHoldings = { ...prev };
      if (isNaN(amount) || amount <= 0) {
        // Remove if invalid or zero
        delete newHoldings[cryptoId];
      } else {
        newHoldings[cryptoId] = amount;
      }
      return newHoldings;
    });
  };

  const handleSave = () => {
    onSave(holdings);
  };

  const handleCancel = () => {
    setHoldings(currentHoldings || {});
    onOpenChange(false);
  };

  const handleClearAll = () => {
    setHoldings({});
  };

  const handleAddCustomCrypto = () => {
    if (!customCryptoId.trim() || !customAmount) {
      return;
    }
    
    const amount = parseFloat(customAmount);
    if (isNaN(amount) || amount <= 0) {
      return;
    }

    const cryptoId = customCryptoId.toLowerCase().trim();
    setHoldings(prev => ({
      ...prev,
      [cryptoId]: amount
    }));
    
    setCustomCryptoId('');
    setCustomAmount('');
  };

  // Get list of cryptos with holdings
  const selectedCount = Object.keys(holdings).length;
  
  // Separate custom cryptos from predefined ones
  const predefinedCryptoIds = AVAILABLE_CRYPTOS.map(c => c.id);
  const customCryptos = Object.keys(holdings).filter(id => !predefinedCryptoIds.includes(id));

  return (
    <WidgetModal
      open={open}
      onOpenChange={onOpenChange}
      title="Crypto Portfolio Settings"
      description="Enter how much of each cryptocurrency you own. Portfolio value will be calculated in USD."
      icon={Coins}
      footer={
        <WidgetModalFooter
          onCancel={handleCancel}
          onSave={handleSave}
        />
      }
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">
            Your Crypto Holdings ({selectedCount} selected)
          </Label>
          <button
            type="button"
            onClick={handleClearAll}
            className="text-xs text-purple-600 dark:text-purple-400 hover:underline"
          >
            Clear All
          </button>
        </div>

        <p className="text-xs text-gray-600 dark:text-gray-400">
          Enter the amount of each cryptocurrency you own. Leave blank or 0 to exclude.
        </p>

        {/* Crypto Holdings List */}
        <div className="space-y-2 max-h-[400px] overflow-y-auto custom-scrollbar p-2 rounded-lg border border-gray-200 dark:border-gray-700">
          {AVAILABLE_CRYPTOS.map((crypto) => {
            const hasHolding = holdings[crypto.id] > 0;
            return (
              <div
                key={crypto.id}
                className={`p-3 rounded-lg border transition-colors ${
                  hasHolding
                    ? 'bg-purple-50 dark:bg-purple-900/20 border-purple-300 dark:border-purple-700'
                    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Crypto Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {crypto.symbol}
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                      {crypto.name}
                    </p>
                  </div>
                  
                  {/* Amount Input */}
                  <div className="w-32">
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0.00"
                      value={holdings[crypto.id] || ''}
                      onChange={(e) => handleHoldingChange(crypto.id, e.target.value)}
                      className="w-full px-2 py-1.5 text-sm rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-purple-400 dark:focus:ring-purple-600"
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Custom Crypto Section */}
        <div className="space-y-3 p-3 rounded-lg bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
              Add Custom Crypto
            </h3>
            {customCryptos.length > 0 && (
              <span className="text-xs text-blue-700 dark:text-blue-300">
                {customCryptos.length} custom
              </span>
            )}
          </div>
          
          {/* Custom Crypto Input */}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="ID (e.g., shiba-inu)"
              value={customCryptoId}
              onChange={(e) => setCustomCryptoId(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddCustomCrypto()}
              className="flex-1 px-2.5 py-1.5 text-sm rounded-md border border-blue-300 dark:border-blue-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-600 placeholder:text-xs"
            />
            <input
              type="number"
              step="any"
              min="0"
              placeholder="Amount"
              value={customAmount}
              onChange={(e) => setCustomAmount(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddCustomCrypto()}
              className="w-24 px-2.5 py-1.5 text-sm rounded-md border border-blue-300 dark:border-blue-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-600 placeholder:text-xs"
            />
            <button
              type="button"
              onClick={handleAddCustomCrypto}
              disabled={!customCryptoId.trim() || !customAmount}
              className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>

          {/* Display Custom Cryptos */}
          {customCryptos.length > 0 && (
            <div className="space-y-1.5 pt-2 border-t border-blue-200 dark:border-blue-700">
              {customCryptos.map(cryptoId => (
                <div
                  key={cryptoId}
                  className="flex items-center justify-between gap-2 p-2 rounded-md bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-700"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100 truncate">
                      {cryptoId}
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      {holdings[cryptoId]}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleHoldingChange(cryptoId, '0')}
                    className="text-xs font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <p className="text-xs text-blue-600 dark:text-blue-400">
            Find IDs at <a href="https://www.coingecko.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-700 dark:hover:text-blue-300">coingecko.com</a>
          </p>
        </div>

        {/* Info Note */}
        <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <p className="text-xs text-gray-700 dark:text-gray-300">
            💡 <strong>Tip:</strong> All prices and portfolio values are displayed in USD. Your holdings are automatically saved and included in config exports.
          </p>
        </div>
      </div>
    </WidgetModal>
  );
}
