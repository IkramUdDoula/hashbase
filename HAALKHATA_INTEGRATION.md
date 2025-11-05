# Haalkhata Integration Guide

Complete integration of Haalkhata receipt management system into Hashbase.

## Overview

The Haalkhata integration allows users to:
- **Send emails to Haalkhata** from Gmail Explorer with AI processing
- **View latest receipts** in a dedicated widget
- **Create receipts manually** using a form
- **Upload and process receipt images** with AI
- **Configure widget settings** (number of receipts, sorting)

---

## Features Implemented

### 1. Settings > Secrets Integration ✅

**File:** `src/services/secretsService.js`, `src/components/SettingsModal.jsx`

- Added `HAALKHATA_ACCESS_TOKEN` to secret keys
- Added input field in Settings > Secrets tab
- Token is encrypted and stored securely in localStorage

**Usage:**
1. Go to Settings > Secrets
2. Add your Haalkhata Access Token (get from Haalkhata Settings > API Tokens)
3. Format: `hk_live_xxxxxxxxxxxxx`

---

### 2. Gmail Explorer Integration ✅

**File:** `src/components/widgets/Gmail/GmailExplorer.jsx`

**Features:**
- **Conditional Button Display:** "Send to Haalkhata" button only shows if access token is configured
- **AI Processing:** Uses OpenAI to extract receipt data from email HTML
- **Error Handling:** Shows toast notifications for missing tokens or processing errors
- **Loading States:** Shows "Processing..." while AI extracts data

**How it works:**
1. User opens an email in Gmail Explorer
2. If Haalkhata token is configured, "Send to Haalkhata" button appears
3. User clicks button
4. System checks for OpenAI API key (required for AI processing)
5. Email HTML is sent to OpenAI for extraction
6. Extracted data is sent to Haalkhata API
7. Success/error toast is shown

**Requirements:**
- Haalkhata Access Token (in Settings > Secrets)
- OpenAI API Key (in Settings > Secrets) - for AI processing

---

### 3. Haalkhata Service ✅

**File:** `src/services/haalkhataService.js`

**API Methods:**
- `createReceipt(data)` - Create receipt with structured data
- `createReceiptFromText(text)` - Create receipt from raw text
- `createReceiptFromImage(imageBase64, filename)` - Create receipt from image
- `getReceipts(options)` - Get receipts with pagination/filtering
- `getReceipt(invoiceCode)` - Get single receipt
- `getReceiptImageUrl(invoiceCode)` - Get receipt image URL
- `isHaalkhataConfigured()` - Check if token is configured
- `processEmailWithAI(htmlContent, openaiApiKey)` - Extract receipt data from email HTML
- `processImageWithAI(imageBase64, openaiApiKey)` - Extract receipt data from image

**AI Processing:**
- Uses OpenAI GPT-4o-mini for extraction
- Validates required fields (amount, purpose, transaction_type, transaction_date)
- Handles currency conversion (symbols to ISO codes)
- Returns structured JSON data

---

### 4. Haalkhata Widget ✅

**Files:**
- `src/components/widgets/Haalkhata/HaalkhataWidget.jsx`
- `src/components/widgets/Haalkhata/CreateReceiptModal.jsx`
- `src/components/widgets/Haalkhata/HaalkhataExplorer.jsx`
- `src/components/widgets/Haalkhata/index.js`

**Widget Features:**

#### A. Receipt List View
- Shows latest receipts (configurable: 5, 10, 20, 50)
- Summary stats: Total Income, Expense, Savings
- Color-coded badges (green=income, red=expense, blue=savings)
- Click to view full details in Explorer
- Refresh button to reload receipts

#### B. Create Receipt (Manual Form)
**Required Fields:**
- Amount (number)
- Currency (USD, EUR, GBP, BDT, INR, JPY, CNY, AUD, CAD)
- Purpose (with suggestions: Food, Clothing, Transportation, etc.)
- Transaction Type (Income, Expense, Savings)
- Transaction Date

**Optional Fields:**
- Sender
- Receiver
- Platform (Stripe, PayPal, bKash, etc.)
- Transaction ID
- From Account
- To Account
- Additional Details

#### C. Upload & Process (AI-Powered)
- Upload receipt image (JPEG, PNG, WebP, GIF)
- Max size: 10MB
- AI extracts all data automatically
- Shows preview before processing
- Requires OpenAI API key

#### D. Receipt Explorer
- Full receipt details view
- Transaction information
- Account details
- Metadata (created date, processing method, completion status)
- Navigation between receipts

#### E. Widget Settings
- Number of receipts to display (5, 10, 20, 50)
- Sort by: Newest First, Oldest First, Highest Amount, Lowest Amount
- Settings saved to localStorage

---

## Configuration

### Environment Variables

**Development (default):**
- Uses direct connection: `http://localhost:9002/api/v1`
- No environment variable needed (defaults to localhost:9002)
- Make sure Haalkhata API server is running on port 9002

**Custom Port/Host:**
Add to `.env`:
```env
VITE_HAALKHATA_API_URL=http://localhost:3000/api/v1
```

**Production:**
Add to `.env`:
```env
VITE_HAALKHATA_API_URL=https://your-domain.com/api/v1
```

### Vite Proxy Configuration

The `vite.config.js` includes a proxy to avoid CORS issues in development:

```javascript
server: {
  port: 5000,
  proxy: {
    '/api/v1': {
      target: 'http://localhost:9002',
      changeOrigin: true,
      secure: false,
      rewrite: (path) => path
    }
  }
}
```

This forwards all `/api/v1/*` requests to `http://localhost:9002/api/v1/*`

### User Secrets (Settings > Secrets)

**Required:**
- `HAALKHATA_ACCESS_TOKEN` - Get from Haalkhata Settings > API Tokens

**Optional (for AI features):**
- `OPENAI_API_KEY` - Required for:
  - Gmail → Haalkhata (email processing)
  - Upload & Process (image processing)
  - Manual form creation works without AI

---

## Usage Guide

### Enable the Widget

1. Go to Settings > Apps
2. Find "Haalkhata Receipts"
3. Toggle it ON
4. Assign to a canvas
5. Save and refresh page

### Add Access Token

1. Go to Settings > Secrets
2. Find "Haalkhata Access Token"
3. Paste your token (format: `hk_live_xxxxxxxxxxxxx`)
4. Click "Save Secrets"

### Send Email to Haalkhata

1. Open Gmail widget
2. Click on an email with receipt/transaction
3. Click "Send to Haalkhata" button (appears if token configured)
4. Wait for AI processing
5. Receipt created automatically

**Note:** Requires OpenAI API key for AI processing

### Create Receipt Manually

1. Open Haalkhata widget
2. Click "Create Receipt" button
3. Fill in required fields:
   - Amount
   - Currency
   - Purpose
   - Transaction Type
   - Date
4. Optionally fill additional fields
5. Click "Create Receipt"

**Note:** Works without OpenAI API key

### Upload Receipt Image

1. Open Haalkhata widget
2. Click "Upload & Process" button
3. Select image file (JPEG, PNG, etc.)
4. Preview shows
5. Click "Upload & Process"
6. AI extracts data automatically
7. Receipt created

**Note:** Requires OpenAI API key for AI processing

### View Receipt Details

1. Click on any receipt in the list
2. Explorer opens with full details
3. Navigate between receipts using arrows
4. Click "Refresh Receipts" to reload list

---

## API Integration Details

### Base URL
- Development: `http://localhost:9002/api/v1`
- Production: `https://your-domain.com/api/v1`

### Authentication
All requests include:
```
Authorization: Bearer YOUR_HAALKHATA_TOKEN
Content-Type: application/json
```

### Create Receipt Endpoint
```
POST /api/v1/receipts
```

**Request Body (Structured):**
```json
{
  "type": "structured",
  "data": {
    "amount": 150.50,
    "currency": "USD",
    "purpose": "Office Supplies",
    "transaction_type": "expense",
    "transaction_date": "2025-01-05T10:30:00Z",
    "sender": "John Doe",
    "receiver": "Acme Corp",
    "platform": "Stripe",
    "transaction_id": "TXN-12345",
    "details": "Purchased office supplies",
    "to_account": "ACC-001",
    "from_account": "ACC-002"
  }
}
```

**Response:**
```json
{
  "success": true,
  "receipt": {
    "id": 123,
    "invoice_code": "ABC123XYZ",
    "amount": 150.50,
    "currency": "USD",
    "purpose": "Office Supplies",
    "transaction_type": "Expense",
    "created_at": "2025-01-05T10:35:00Z",
    ...
  }
}
```

### Get Receipts Endpoint
```
GET /api/v1/receipts?page=1&limit=10&sort=created_at:desc
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "invoice_code": "ABC123XYZ",
      "amount": 150.50,
      "currency": "USD",
      ...
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 150,
    "total_pages": 15
  }
}
```

---

## AI Processing Details

### Email Processing (Gmail → Haalkhata)

**Model:** OpenAI GPT-4o-mini  
**Temperature:** 0.1 (for consistency)  
**Response Format:** JSON object

**Extraction Logic:**
1. Analyzes email HTML content
2. Identifies transaction information
3. Extracts amount, purpose, date, etc.
4. Validates required fields
5. Returns structured JSON

**Validated Fields:**
- `amount` - Must be a number
- `purpose` - Must be non-empty string
- `transaction_type` - Must be "income", "expense", or "savings"
- `transaction_date` - Must be valid ISO 8601 date

### Image Processing (Upload & Process)

**Model:** OpenAI GPT-4o-mini (Vision)  
**Temperature:** 0.1 (for consistency)  
**Response Format:** JSON object

**Extraction Logic:**
1. Analyzes receipt image
2. Performs OCR and data extraction
3. Identifies transaction details
4. Validates required fields
5. Returns structured JSON

**Supported Formats:**
- JPEG
- PNG
- WebP
- GIF

**Max Size:** 10MB

---

## Error Handling

### Common Errors

**1. "Haalkhata access token not configured"**
- **Cause:** Token not added in Settings > Secrets
- **Solution:** Add token in Settings > Secrets

**2. "OpenAI API key required for AI processing"**
- **Cause:** AI processing attempted without OpenAI key
- **Solution:** Add OpenAI API key in Settings > Secrets
- **Alternative:** Use manual form creation (no AI needed)

**3. "Failed to extract amount from email"**
- **Cause:** AI couldn't find transaction amount in email
- **Solution:** Email may not contain receipt/transaction data

**4. "API error: 401"**
- **Cause:** Invalid or expired Haalkhata token
- **Solution:** Regenerate token in Haalkhata and update in Settings

**5. "Image size must be less than 10MB"**
- **Cause:** Uploaded image too large
- **Solution:** Compress image before uploading

**6. CORS Error / 503 Service Unavailable**
- **Cause:** Haalkhata API server not running or CORS not configured
- **Solutions:**
  1. **Start Haalkhata API server** on `http://localhost:9002`
  2. **Restart Vite dev server** after starting API server:
     ```bash
     npm run dev
     ```
  3. **Check API server is running:**
     ```bash
     curl http://localhost:9002/api/v1/receipts
     ```
  4. **Verify proxy is working:** Check browser Network tab - requests should go to `http://localhost:5000/api/v1/*` (not `localhost:9002`)

**7. "Failed to load receipts"**
- **Cause:** API server not responding or authentication failed
- **Solutions:**
  1. Verify Haalkhata API server is running
  2. Check access token is correct
  3. Check browser console for detailed error
  4. Try manual refresh in widget

---

## Files Created/Modified

### New Files
- `src/services/haalkhataService.js` - API service
- `src/components/widgets/Haalkhata/HaalkhataWidget.jsx` - Main widget
- `src/components/widgets/Haalkhata/CreateReceiptModal.jsx` - Manual form
- `src/components/widgets/Haalkhata/HaalkhataExplorer.jsx` - Receipt details viewer
- `src/components/widgets/Haalkhata/index.js` - Export file

### Modified Files
- `src/services/secretsService.js` - Added HAALKHATA_ACCESS_TOKEN
- `src/components/SettingsModal.jsx` - Added token input field
- `src/components/widgets/Gmail/GmailExplorer.jsx` - Added "Send to Haalkhata" button
- `src/App.jsx` - Registered HaalkhataWidget

---

## Testing Checklist

### Setup
- [ ] Add Haalkhata Access Token in Settings > Secrets
- [ ] Add OpenAI API Key in Settings > Secrets (for AI features)
- [ ] Enable Haalkhata widget in Settings > Apps
- [ ] Assign widget to a canvas

### Gmail Integration
- [ ] Open Gmail widget
- [ ] Click on an email
- [ ] Verify "Send to Haalkhata" button appears (if token configured)
- [ ] Click button and verify AI processing
- [ ] Check toast notifications
- [ ] Verify receipt created in Haalkhata

### Manual Receipt Creation
- [ ] Click "Create Receipt" in widget
- [ ] Fill required fields
- [ ] Submit form
- [ ] Verify receipt created
- [ ] Check receipt appears in list

### Image Upload
- [ ] Click "Upload & Process" in widget
- [ ] Select image file
- [ ] Verify preview shows
- [ ] Submit and verify AI processing
- [ ] Check receipt created with extracted data

### Widget Features
- [ ] View receipt list
- [ ] Check summary stats (Income, Expense, Savings)
- [ ] Click on receipt to view details
- [ ] Navigate between receipts
- [ ] Refresh receipts
- [ ] Change widget settings (limit, sort)

### Error Handling
- [ ] Try without Haalkhata token (should show error)
- [ ] Try AI features without OpenAI key (should show error)
- [ ] Try invalid image format (should show error)
- [ ] Try image > 10MB (should show error)

---

## Future Enhancements

Potential improvements:
- [ ] Edit existing receipts
- [ ] Delete receipts
- [ ] Filter receipts by date range
- [ ] Filter by transaction type
- [ ] Export receipts to CSV
- [ ] Receipt categories/tags
- [ ] Bulk upload
- [ ] Receipt templates
- [ ] Recurring receipts
- [ ] Analytics dashboard

---

## Support

For issues or questions:
1. Check Haalkhata API documentation
2. Verify token configuration
3. Check browser console for errors
4. Review toast notifications for error messages

---

**Last Updated:** 2025-11-05  
**Version:** 1.0.0  
**Integration Status:** ✅ Complete
