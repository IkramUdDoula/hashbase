import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { BaseWidgetV2 } from '../../BaseWidgetV2';
import { Badge } from '@/components/ui/badge';
import { Coins, TrendingUp, TrendingDown, AlertCircle, DollarSign } from 'lucide-react';
import { 
  fetchCryptoPrices, 
  formatCurrency,
  formatLargeNumber,
  checkCryptoApiStatus
} from '@/services/cryptoService';
import { CryptoSettingsDialog } from './CryptoSettingsDialog';

/**
 * CryptoWidgetV2 - Cryptocurrency price tracker with portfolio management
 * 
 * Features:
 * - Real-time crypto price tracking
 * - Portfolio value calculation with live updates
 * - Multi-currency support (USD, BDT, EUR, etc.)
 * - Customizable crypto selection
 * - Auto-refresh every 2 minutes
 */
export function CryptoWidgetV2({ rowSpan = 2, dragRef }) {
  // Widget state management
  const [prices, setPrices] = useState({});
  const [currentState, setCurrentState] = useState('loading');
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [errorActionLoading, setErrorActionLoading] = useState(false);
  
  // Settings stored in localStorage
  // Holdings: { bitcoin: 0.5, ethereum: 2.3, ... }
  const [holdings, setHoldings] = useState(() => {
    const saved = localStorage.getItem('crypto_holdings');
    return saved ? JSON.parse(saved) : {};
  });

  // Get list of cryptos from holdings - memoize to prevent unnecessary re-renders
  const selectedCryptos = useMemo(() => Object.keys(holdings), [holdings]);
  
  console.log('🔧 [Crypto] Component render:', {
    holdingsCount: Object.keys(holdings).length,
    selectedCryptos,
    pricesCount: Object.keys(prices).length,
    currentState
  });

  // Load crypto prices (always in USD)
  const loadCryptoPrices = useCallback(async () => {
    const cryptoIds = Object.keys(holdings);
    
    console.log('🔄 [Crypto] Loading prices...', {
      cryptoIds,
      count: cryptoIds.length,
      currentState
    });
    
    try {
      setErrorMessage('');
      
      if (cryptoIds.length === 0) {
        console.log('⚠️ [Crypto] No cryptos selected, setting empty state');
        setPrices({});
        setCurrentState('empty');
        setRefreshing(false);
        return;
      }

      // Check API status
      console.log('🔍 [Crypto] Checking API status...');
      const apiOk = await checkCryptoApiStatus();
      if (!apiOk) {
        console.error('❌ [Crypto] API check failed');
        setErrorMessage('Unable to connect to CoinGecko API. Please check your internet connection.');
        setCurrentState('error');
        setRefreshing(false);
        return;
      }
      console.log('✅ [Crypto] API status OK');
      
      // Always fetch in USD
      console.log('📡 [Crypto] Fetching prices for:', cryptoIds);
      const priceData = await fetchCryptoPrices(cryptoIds, 'usd');
      console.log('📊 [Crypto] Received price data:', {
        cryptoCount: Object.keys(priceData).length,
        cryptos: Object.keys(priceData)
      });
      
      if (Object.keys(priceData).length === 0) {
        console.warn('⚠️ [Crypto] No price data received, setting empty state');
        setPrices({});
        setCurrentState('empty');
      } else {
        console.log('✅ [Crypto] Setting positive state with prices');
        setPrices(priceData);
        setCurrentState('positive');
      }
    } catch (err) {
      console.error('❌ [Crypto] Error loading prices:', err);
      setErrorMessage(err.message || 'Failed to load crypto prices. Please try again.');
      setCurrentState('error');
    } finally {
      setRefreshing(false);
      console.log('🏁 [Crypto] Load complete, state:', currentState);
    }
  }, [holdings]);

  // Initial load
  useEffect(() => {
    loadCryptoPrices();
  }, [loadCryptoPrices]);

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (currentState === 'positive') {
        setRefreshing(true);
        loadCryptoPrices();
      }
    }, 120000); // 2 minutes

    const handleVisibilityChange = () => {
      if (!document.hidden && currentState === 'positive') {
        setRefreshing(true);
        loadCryptoPrices();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentState, loadCryptoPrices]);

  // Calculate total portfolio value in USD
  const calculateTotalPortfolioValue = () => {
    if (Object.keys(prices).length === 0 || Object.keys(holdings).length === 0) {
      return 0;
    }

    let total = 0;
    Object.entries(holdings).forEach(([cryptoId, amount]) => {
      const price = prices[cryptoId]?.usd || 0;
      total += price * amount;
    });

    return total;
  };

  const portfolioValue = calculateTotalPortfolioValue();

  // Handlers
  const handleRefresh = () => {
    setRefreshing(true);
    setCurrentState('loading');
    loadCryptoPrices();
  };

  const handleSettingsOpen = () => {
    setSettingsOpen(true);
  };

  const handleSettingsSave = (newHoldings) => {
    setHoldings(newHoldings);
    localStorage.setItem('crypto_holdings', JSON.stringify(newHoldings));
    
    setSettingsOpen(false);
    setRefreshing(true);
    setCurrentState('loading');
    setTimeout(() => loadCryptoPrices(), 100);
  };

  const handleErrorAction = async () => {
    setErrorActionLoading(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    setErrorActionLoading(false);
    setCurrentState('loading');
    loadCryptoPrices();
  };

  // Filter cryptos based on search - include all cryptos with holdings, even if no price data
  const filteredCryptos = selectedCryptos
    .filter(cryptoId => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return cryptoId.toLowerCase().includes(query);
    })
    .map(cryptoId => {
      const priceData = prices[cryptoId];
      return { id: cryptoId, data: priceData };
    });

  // Badge showing number of tracked cryptos
  const badge = selectedCryptos.length > 0 ? (
    <Badge variant="secondary" className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
      {selectedCryptos.length}
    </Badge>
  ) : null;

  return (
    <>
      <BaseWidgetV2
        // Header Zone
        logo={Coins}
        appName="Crypto"
        widgetName="USD"
        tooltip="Track cryptocurrency prices and portfolio value in USD"
        badge={badge}
        
        // Action Buttons
        showSettings={true}
        onSettingsClick={handleSettingsOpen}
        showRefresh={true}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        
        // Content State
        state={currentState}
        
        // Loading State
        loadingMessage="Loading crypto prices..."
        
        // Error State
        errorIcon={AlertCircle}
        errorMessage={errorMessage}
        errorActionLabel="Try Again"
        onErrorAction={handleErrorAction}
        errorActionLoading={errorActionLoading}
        
        // Empty State
        emptyIcon={Coins}
        emptyMessage="No cryptocurrencies selected"
        emptySubmessage="Open settings to select cryptos to track."
        
        // Positive State (Content)
        searchEnabled={true}
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search cryptos..."
        
        // Layout
        rowSpan={rowSpan}
        dragRef={dragRef}
      >
        {/* Portfolio Summary */}
        {portfolioValue > 0 && (
          <div className="mb-3 p-4 rounded-lg bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-700">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-4 w-4 text-purple-600 dark:text-purple-400" />
              <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
                Total Portfolio Value
              </span>
            </div>
            
            <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">
              {formatCurrency(portfolioValue, 'usd')}
            </div>
            
            <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
              Based on your crypto holdings × current prices
            </p>
          </div>
        )}

        {/* Crypto Price Cards */}
        {filteredCryptos.length === 0 && searchQuery ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <Coins className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">No cryptos match your search</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredCryptos.map(({ id, data }) => {
              console.log('🔍 [Crypto] Rendering card for:', id, {
                data,
                hasData: !!data,
                hasUsd: !!(data && data.usd),
                usdValue: data?.usd,
                holdings: holdings[id]
              });
              
              const price = data?.usd || 0;
              const change24h = data?.usd_24h_change || 0;
              const marketCap = data?.usd_market_cap;
              const volume24h = data?.usd_24h_vol;
              const isPositive = change24h >= 0;
              
              // Get user's holdings for this crypto
              const userHolding = holdings[id] || 0;
              const holdingValue = price * userHolding;

              return (
                <div
                  key={id}
                  className={`p-3 rounded-lg bg-gradient-to-br border transition-all ${
                    data && data.usd 
                      ? 'from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-purple-200 dark:border-purple-700 hover:shadow-md hover:border-purple-300 dark:hover:border-purple-600' 
                      : 'from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 border-gray-200 dark:border-gray-600'
                  }`}
                >
                  {/* Header: Name, Symbol, Price */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-purple-900 dark:text-purple-100">
                          {id.toUpperCase()}
                        </span>
                        <span className="text-xs text-purple-700 dark:text-purple-300">
                          Custom Crypto
                        </span>
                      </div>
                      <div className={`text-lg font-bold ${data && data.usd ? 'text-purple-900 dark:text-purple-100' : 'text-gray-500 dark:text-gray-400'}`}>
                        {data && data.usd ? formatCurrency(price, 'usd') : 'Invalid ID'}
                      </div>
                      {userHolding > 0 && (
                        <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                          {userHolding.toFixed(8)} {id} = {data && data.usd ? formatCurrency(holdingValue, 'usd') : 'Check ID'}
                        </div>
                      )}
                    </div>
                    
                    {/* 24h Change Badge - only show if data available */}
                    {data && data.usd && data.usd_24h_change !== undefined && (
                      <div className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium ${
                        isPositive 
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300' 
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      }`}>
                        {isPositive ? (
                          <TrendingUp className="h-3 w-3" />
                        ) : (
                          <TrendingDown className="h-3 w-3" />
                        )}
                        {Math.abs(change24h).toFixed(2)}%
                      </div>
                    )}
                  </div>
                  
                  {/* Market Stats - only show if data available */}
                  {(data && data.usd && (data.usd_market_cap || data.usd_24h_vol)) && (
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {marketCap && (
                        <div>
                          <span className="text-purple-600 dark:text-purple-400 font-medium">
                            Market Cap:
                          </span>
                          <span className="ml-1 text-purple-900 dark:text-purple-100">
                            {formatLargeNumber(marketCap, 'usd')}
                          </span>
                        </div>
                      )}
                      {volume24h && (
                        <div>
                          <span className="text-purple-600 dark:text-purple-400 font-medium">
                            24h Vol:
                          </span>
                          <span className="ml-1 text-purple-900 dark:text-purple-100">
                            {formatLargeNumber(volume24h, 'usd')}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </BaseWidgetV2>

      <CryptoSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        currentHoldings={holdings}
        onSave={handleSettingsSave}
      />
    </>
  );
}
