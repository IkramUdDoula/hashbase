# Crypto Widget

A cryptocurrency price tracker with portfolio management and real-time updates.

## Features

- **Real-time Price Tracking** - Track prices of 15 popular cryptocurrencies
- **Portfolio Management** - Set your portfolio value and watch it update in real-time based on price changes
- **Multi-Currency Support** - View prices in USD, BDT, EUR, GBP, JPY, or INR
- **Price Metrics** - Current price, 24h change percentage, market cap, and 24h volume
- **Auto-refresh** - Prices update every 2 minutes automatically
- **Search Functionality** - Search through your selected cryptocurrencies
- **Settings Modal** - Easy configuration with modern UI
- **Persistent Settings** - All settings saved to localStorage

## Available Cryptocurrencies

- Bitcoin (BTC)
- Ethereum (ETH)
- BNB (BNB)
- XRP (XRP)
- Cardano (ADA)
- Solana (SOL)
- Polkadot (DOT)
- Dogecoin (DOGE)
- Polygon (MATIC)
- Litecoin (LTC)
- Avalanche (AVAX)
- Chainlink (LINK)
- Uniswap (UNI)
- Stellar (XLM)
- Cosmos (ATOM)

## Supported Currencies

- US Dollar (USD) - $
- Bangladeshi Taka (BDT) - ৳
- Euro (EUR) - €
- British Pound (GBP) - £
- Japanese Yen (JPY) - ¥
- Indian Rupee (INR) - ₹

## APIs Used

### CoinGecko API
Cryptocurrency price data:
- **Free tier**: 50 calls per minute (no API key required)
- **Optional API key**: For higher rate limits, add `VITE_COINGECKO_API_KEY` to `.env`
- **Documentation**: https://www.coingecko.com/en/api
- **Optimization**: Always fetches prices in USD only to minimize API calls

### Exchange Rate API
Currency conversion (open.er-api.com):
- **Free tier**: 1500 requests per month (no API key required)
- **Caching**: Exchange rates cached for 1 hour
- **Fallback**: Built-in fallback rates if API is unavailable
- **Base currency**: USD

### How It Works
1. Fetch crypto prices in USD from CoinGecko (once per refresh)
2. Fetch exchange rates from USD to other currencies (cached for 1 hour)
3. Convert prices locally to selected currency
4. **Benefit**: Reduces API calls and provides consistent data

## Configuration

### Settings Dialog

Click the settings icon (⚙️) in the widget to configure:

1. **Select Cryptocurrencies** - Choose which cryptos to track
   - Select individual cryptos or use "Select All"
   - Minimum: 0 cryptos (widget shows empty state)
   - Maximum: All 15 cryptos

2. **Choose Currency** - Select your preferred display currency
   - USD, BDT, EUR, GBP, JPY, or INR

3. **Set Portfolio Value** (Optional)
   - Enter your total crypto portfolio worth in the selected currency
   - Portfolio value updates in real-time based on average 24h price changes
   - Leave empty (0) to hide portfolio tracking

### Portfolio Calculation

The portfolio value updates automatically based on:
- **Initial Value**: The amount you set in settings
- **Price Changes**: Average 24h percentage change of all selected cryptos
- **Real-time Updates**: Recalculated every time prices refresh (2 minutes)

**Example:**
- You set portfolio value: $10,000
- Selected cryptos have average 24h change: +5%
- Your portfolio shows: $10,500 (+$500, +5%)

## Components

### CryptoWidgetV2.jsx
Main widget component using BaseWidgetV2 architecture:
- State management (loading, error, empty, positive)
- Price data fetching and auto-refresh
- Portfolio calculations
- Search functionality
- Settings integration

### CryptoSettingsDialog.jsx
Settings modal component:
- Cryptocurrency selection with checkboxes
- Currency dropdown
- Portfolio amount input
- Select All / Clear All buttons
- Form validation

### index.js
Export file for clean imports

## Services

### cryptoService.js
API integration service:
- `fetchCryptoPrices()` - Fetch prices for selected cryptos
- `calculatePortfolioValue()` - Calculate portfolio metrics
- `formatCurrency()` - Format currency values with symbols
- `formatLargeNumber()` - Format large numbers (K, M, B suffixes)
- `checkCryptoApiStatus()` - Check API availability

## Storage

All settings stored in localStorage:
- `crypto_holdings` - Object with crypto holdings: `{ bitcoin: 0.5, ethereum: 2.3, ... }`

**Config Export/Import:**
- Your crypto holdings are automatically included in config exports
- Download your config via Settings > Secrets > Download Config
- Import on another device to sync your portfolio
- Holdings are saved as regular data (not encrypted)

## Usage in App

```javascript
import { CryptoWidgetV2 } from './components/widgets/Crypto/CryptoWidgetV2';

const allWidgets = [
  { 
    id: 'crypto-tracker', 
    component: CryptoWidgetV2, 
    rowSpan: 2,
    name: 'Crypto Tracker',
    description: 'Track cryptocurrency prices and portfolio value',
    icon: Coins
  },
];
```

## Error Handling

The widget handles various error states:
- **API Unavailable** - Shows error with retry button
- **Rate Limit Exceeded** - Shows specific error message
- **No Cryptos Selected** - Shows empty state with instructions
- **Network Errors** - Graceful fallback with error message

## Auto-refresh Behavior

- **Interval**: Every 2 minutes (120 seconds)
- **Tab Visibility**: Refreshes when tab becomes visible
- **Manual Refresh**: Click refresh button anytime
- **Loading State**: Shows spinner during refresh

## UI/UX Features

- **Color-coded Changes**: Green for positive, red for negative
- **Gradient Cards**: Purple/blue gradient background
- **Hover Effects**: Cards highlight on hover
- **Responsive Layout**: Adapts to widget size (1-4 rows)
- **Search Integration**: Filter cryptos by name or symbol
- **Badge Display**: Shows count of tracked cryptos

## Best Practices

1. **Select Relevant Cryptos** - Only track cryptos you're interested in
2. **Update Portfolio Value** - Keep it current for accurate tracking
3. **Choose Appropriate Currency** - Match your local currency
4. **Monitor Rate Limits** - Free tier is sufficient for most users
5. **Use Search** - Quickly find specific cryptos when tracking many
