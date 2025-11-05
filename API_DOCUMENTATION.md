# Haalkhata API Documentation

Complete guide for integrating with the Haalkhata Receipt Management API.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [Receipt Submission Methods](#receipt-submission-methods)
5. [Integration Examples](#integration-examples)
6. [Error Handling](#error-handling)
7. [Rate Limits & Best Practices](#rate-limits--best-practices)

---

## Getting Started

### Base URL

```
Production: https://your-domain.com/api/v1
Development: http://localhost:9002/api/v1
```

### Prerequisites

1. **Create an Account** - Sign up at [your-domain.com](https://your-domain.com)
2. **Generate API Token** - Navigate to Settings → API Tokens → Create Token
3. **Save Your Token** - You'll only see the full token once during creation

---

## Authentication

All API requests require authentication using Bearer tokens.

### Header Format

```http
Authorization: Bearer YOUR_API_TOKEN
Content-Type: application/json
```

### Example

```bash
curl -X GET "https://your-domain.com/api/v1/receipts" \
  -H "Authorization: Bearer hk_live_abc123..." \
  -H "Content-Type: application/json"
```

### Token Scopes

Tokens can have the following scopes:

- `receipts:read` - Read receipt data
- `receipts:write` - Create and update receipts

---

## API Endpoints

### 1. Create Receipt

**Endpoint:** `POST /api/v1/receipts`

**Description:** Submit a receipt using one of three methods: image, text, or structured data.

**Request Body:**

```json
{
  "type": "structured|text|image",
  "data": { ... },      // For structured type
  "text": "...",        // For text type
  "image": "...",       // For image type (base64)
  "filename": "..."     // Optional
}
```

**Response (201 Created):**

```json
{
  "success": true,
  "receipt": {
    "id": 123,
    "invoice_code": "ABC123XYZ",
    "amount": 150.50,
    "currency": "USD",
    "sender": "John Doe",
    "receiver": "Acme Corp",
    "purpose": "Office Supplies",
    "platform": "Stripe",
    "transaction_date": "2025-01-05T10:30:00Z",
    "transaction_type": "Expense",
    "transaction_id": "TXN-12345",
    "details": "Purchased office supplies",
    "to_account": "ACC-001",
    "from_account": "ACC-002",
    "is_complete": true,
    "created_at": "2025-01-05T10:35:00Z",
    "processing_method": "manual"
  }
}
```

---

### 2. Get Receipts

**Endpoint:** `GET /api/v1/receipts`

**Description:** Retrieve all receipts for the authenticated user with pagination and filtering.

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number |
| `limit` | integer | 50 | Results per page (max: 100) |
| `sort` | string | created_at:desc | Sort field and order (e.g., `amount:asc`) |
| `start_date` | string | - | Filter by transaction date (YYYY-MM-DD) |
| `end_date` | string | - | Filter by transaction date (YYYY-MM-DD) |

**Example Request:**

```bash
curl -X GET "https://your-domain.com/api/v1/receipts?page=1&limit=20&sort=amount:desc" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Response (200 OK):**

```json
{
  "success": true,
  "data": [
    {
      "id": 123,
      "invoice_code": "ABC123XYZ",
      "amount": 150.50,
      "currency": "USD",
      "sender": "John Doe",
      "receiver": "Acme Corp",
      "purpose": "Office Supplies",
      "platform": "Stripe",
      "transaction_date": "2025-01-05T10:30:00Z",
      "transaction_type": "Expense",
      "transaction_id": "TXN-12345",
      "details": "Purchased office supplies",
      "to_account": "ACC-001",
      "from_account": "ACC-002",
      "is_complete": true,
      "created_at": "2025-01-05T10:35:00Z",
      "updated_at": "2025-01-05T10:35:00Z",
      "has_image": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "total_pages": 8
  }
}
```

---

### 3. Get Single Receipt

**Endpoint:** `GET /api/v1/receipts/{invoice_code}`

**Description:** Retrieve a specific receipt by its invoice code.

**Example Request:**

```bash
curl -X GET "https://your-domain.com/api/v1/receipts/ABC123XYZ" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 4. Get Receipt Image

**Endpoint:** `GET /api/v1/receipts/{invoice_code}/image`

**Description:** Download the original receipt image (if available).

**Example Request:**

```bash
curl -X GET "https://your-domain.com/api/v1/receipts/ABC123XYZ/image" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o receipt.jpg
```

---

## Receipt Submission Methods

### Method 1: Structured Data (Recommended)

**Use Case:** You have already processed the receipt data and want to store it directly.

**When to Use:**
- ✅ You've already extracted data using your own AI/OCR
- ✅ You're integrating with accounting software
- ✅ You have structured transaction data from APIs
- ✅ You want the fastest, most cost-effective option

**Required Fields:**
- `amount` (number) - Transaction amount
- `purpose` (string) - Purpose of transaction

**Optional Fields:**
- `currency` (string) - Currency code (default: "USD")
- `sender` (string) - Sender name
- `receiver` (string) - Receiver name
- `platform` (string) - Payment platform
- `transaction_date` (string) - ISO 8601 date
- `transaction_type` (string) - "Income", "Expense", or "Savings"
- `transaction_id` (string) - Transaction identifier
- `details` (string) - Additional details
- `to_account` (string) - Destination account
- `from_account` (string) - Source account

**Example:**

```bash
curl -X POST "https://your-domain.com/api/v1/receipts" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "structured",
    "data": {
      "amount": 150.50,
      "currency": "USD",
      "purpose": "Office Supplies",
      "platform": "Stripe",
      "transaction_type": "expense",
      "sender": "John Doe",
      "receiver": "Acme Corp",
      "transaction_date": "2025-01-05T10:30:00Z",
      "transaction_id": "TXN-12345",
      "details": "Purchased pens, paper, and folders"
    }
  }'
```

**JavaScript Example:**

```javascript
const response = await fetch('https://your-domain.com/api/v1/receipts', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'structured',
    data: {
      amount: 150.50,
      currency: 'USD',
      purpose: 'Office Supplies',
      platform: 'Stripe',
      transaction_type: 'expense',
      sender: 'John Doe',
      receiver: 'Acme Corp',
      details: 'Purchased office supplies'
    }
  })
});

const result = await response.json();
console.log('Receipt created:', result.receipt);
```

**Python Example:**

```python
import requests

url = "https://your-domain.com/api/v1/receipts"
headers = {
    "Authorization": "Bearer YOUR_TOKEN",
    "Content-Type": "application/json"
}
data = {
    "type": "structured",
    "data": {
        "amount": 150.50,
        "currency": "USD",
        "purpose": "Office Supplies",
        "platform": "Stripe",
        "transaction_type": "expense",
        "sender": "John Doe",
        "receiver": "Acme Corp",
        "details": "Purchased office supplies"
    }
}

response = requests.post(url, json=data, headers=headers)
receipt = response.json()
print(f"Receipt created: {receipt['receipt']['invoice_code']}")
```

---

### Method 2: Text Processing

**Use Case:** You have raw text and want to submit it for future processing.

**When to Use:**
- ✅ You have receipt text but haven't processed it yet
- ✅ You want to store raw data for later analysis
- ✅ You're building a text-based receipt capture system

**Note:** Currently creates a basic receipt with the text in the `details` field. Full text parsing coming soon.

**Example:**

```bash
curl -X POST "https://your-domain.com/api/v1/receipts" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "text",
    "text": "Paid $50.00 to Coffee Shop on 2025-01-05 for team meeting refreshments via Stripe"
  }'
```

**JavaScript Example:**

```javascript
const response = await fetch('https://your-domain.com/api/v1/receipts', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'text',
    text: 'Paid $50.00 to Coffee Shop on 2025-01-05 for team meeting refreshments'
  })
});

const result = await response.json();
```

---

### Method 3: Image Processing (AI-Powered)

**Use Case:** You have a receipt image and want Haalkhata to extract the data using AI.

**When to Use:**
- ✅ You have receipt images (photos, scans, screenshots)
- ✅ You want automatic data extraction
- ✅ You don't have your own OCR/AI processing
- ✅ You want high accuracy with minimal effort

**Image Requirements:**
- Format: JPEG, PNG, WebP, GIF
- Encoding: Base64
- Max size: 10MB (recommended)
- Quality: Clear, readable text

**Example:**

```bash
# First, convert image to base64
IMAGE_BASE64=$(base64 -w 0 receipt.jpg)

curl -X POST "https://your-domain.com/api/v1/receipts" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{
    \"type\": \"image\",
    \"image\": \"data:image/jpeg;base64,$IMAGE_BASE64\",
    \"filename\": \"receipt.jpg\"
  }"
```

**JavaScript Example (Browser):**

```javascript
// From file input
const fileInput = document.getElementById('receipt-upload');
const file = fileInput.files[0];

// Convert to base64
const reader = new FileReader();
reader.onload = async (e) => {
  const base64Image = e.target.result; // Already includes data:image/...;base64,
  
  const response = await fetch('https://your-domain.com/api/v1/receipts', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer YOUR_TOKEN',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type: 'image',
      image: base64Image,
      filename: file.name
    })
  });
  
  const result = await response.json();
  console.log('Extracted data:', result.receipt);
};
reader.readAsDataURL(file);
```

**Python Example:**

```python
import requests
import base64

# Read and encode image
with open('receipt.jpg', 'rb') as image_file:
    encoded_image = base64.b64encode(image_file.read()).decode('utf-8')
    base64_image = f"data:image/jpeg;base64,{encoded_image}"

url = "https://your-domain.com/api/v1/receipts"
headers = {
    "Authorization": "Bearer YOUR_TOKEN",
    "Content-Type": "application/json"
}
data = {
    "type": "image",
    "image": base64_image,
    "filename": "receipt.jpg"
}

response = requests.post(url, json=data, headers=headers)
receipt = response.json()
print(f"Extracted receipt: {receipt['receipt']}")
```

**Node.js Example:**

```javascript
const fs = require('fs');
const fetch = require('node-fetch');

// Read and encode image
const imageBuffer = fs.readFileSync('receipt.jpg');
const base64Image = `data:image/jpeg;base64,${imageBuffer.toString('base64')}`;

const response = await fetch('https://your-domain.com/api/v1/receipts', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer YOUR_TOKEN',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    type: 'image',
    image: base64Image,
    filename: 'receipt.jpg'
  })
});

const result = await response.json();
console.log('Receipt created:', result.receipt);
```

---

## Integration Examples

### Example 1: E-commerce Platform Integration

**Scenario:** Automatically create receipts when orders are completed.

```javascript
// Webhook handler for order completion
app.post('/webhooks/order-completed', async (req, res) => {
  const order = req.body;
  
  // Create receipt in Haalkhata
  const receipt = await fetch('https://your-domain.com/api/v1/receipts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.HAALKHATA_API_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type: 'structured',
      data: {
        amount: order.total,
        currency: order.currency,
        purpose: 'Product Purchase',
        platform: 'Shopify',
        transaction_type: 'income',
        sender: order.customer.name,
        receiver: 'Your Store',
        transaction_date: order.created_at,
        transaction_id: order.id,
        details: `Order #${order.order_number}: ${order.line_items.map(i => i.name).join(', ')}`
      }
    })
  });
  
  const result = await receipt.json();
  console.log('Receipt created:', result.receipt.invoice_code);
  
  res.status(200).send('OK');
});
```

---

### Example 2: Expense Tracking App

**Scenario:** Users upload receipt photos for automatic processing.

```javascript
import { useState } from 'react';

function ReceiptUploader() {
  const [processing, setProcessing] = useState(false);
  
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setProcessing(true);
    
    // Convert to base64
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const response = await fetch('/api/v1/receipts', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('api_token')}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: 'image',
            image: e.target.result,
            filename: file.name
          })
        });
        
        const result = await response.json();
        
        if (result.success) {
          alert(`Receipt processed! Amount: ${result.receipt.amount} ${result.receipt.currency}`);
        }
      } catch (error) {
        console.error('Upload failed:', error);
      } finally {
        setProcessing(false);
      }
    };
    
    reader.readAsDataURL(file);
  };
  
  return (
    <div>
      <input 
        type="file" 
        accept="image/*" 
        onChange={handleFileUpload}
        disabled={processing}
      />
      {processing && <p>Processing receipt...</p>}
    </div>
  );
}
```

---

### Example 3: Accounting Software Integration

**Scenario:** Sync transactions from accounting software to Haalkhata.

```python
import requests
from datetime import datetime

class HaalkhataSync:
    def __init__(self, api_token):
        self.api_token = api_token
        self.base_url = "https://your-domain.com/api/v1"
        self.headers = {
            "Authorization": f"Bearer {api_token}",
            "Content-Type": "application/json"
        }
    
    def sync_transaction(self, transaction):
        """Sync a single transaction to Haalkhata"""
        data = {
            "type": "structured",
            "data": {
                "amount": float(transaction['amount']),
                "currency": transaction['currency'],
                "purpose": transaction['category'],
                "platform": transaction['payment_method'],
                "transaction_type": "expense" if transaction['amount'] < 0 else "income",
                "sender": transaction['from_account'],
                "receiver": transaction['to_account'],
                "transaction_date": transaction['date'],
                "transaction_id": transaction['id'],
                "details": transaction['description']
            }
        }
        
        response = requests.post(
            f"{self.base_url}/receipts",
            json=data,
            headers=self.headers
        )
        
        return response.json()
    
    def sync_all_transactions(self, transactions):
        """Sync multiple transactions"""
        results = []
        for transaction in transactions:
            try:
                result = self.sync_transaction(transaction)
                results.append({
                    'transaction_id': transaction['id'],
                    'receipt_code': result['receipt']['invoice_code'],
                    'status': 'success'
                })
            except Exception as e:
                results.append({
                    'transaction_id': transaction['id'],
                    'status': 'failed',
                    'error': str(e)
                })
        
        return results

# Usage
syncer = HaalkhataSync(api_token="YOUR_TOKEN")
transactions = get_transactions_from_accounting_software()
results = syncer.sync_all_transactions(transactions)

print(f"Synced {len([r for r in results if r['status'] == 'success'])} transactions")
```

---

### Example 4: AI-Powered Email Receipt Parser

**Scenario:** Parse receipts from email and submit to Haalkhata.

```python
import imaplib
import email
import re
import openai
import requests

class EmailReceiptParser:
    def __init__(self, haalkhata_token, openai_key):
        self.haalkhata_token = haalkhata_token
        openai.api_key = openai_key
    
    def parse_email_with_ai(self, email_body):
        """Use OpenAI to extract receipt data from email"""
        prompt = f"""
        Extract receipt information from this email and return JSON:
        
        {email_body}
        
        Return JSON with: amount, currency, purpose, sender, receiver, date, transaction_id
        """
        
        response = openai.ChatCompletion.create(
            model="gpt-4",
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )
        
        return response.choices[0].message.content
    
    def submit_to_haalkhata(self, receipt_data):
        """Submit parsed data to Haalkhata"""
        response = requests.post(
            "https://your-domain.com/api/v1/receipts",
            headers={
                "Authorization": f"Bearer {self.haalkhata_token}",
                "Content-Type": "application/json"
            },
            json={
                "type": "structured",
                "data": receipt_data
            }
        )
        
        return response.json()
    
    def process_receipt_emails(self, email_server, username, password):
        """Connect to email and process receipt emails"""
        mail = imaplib.IMAP4_SSL(email_server)
        mail.login(username, password)
        mail.select('inbox')
        
        # Search for receipt emails
        _, messages = mail.search(None, '(SUBJECT "receipt")')
        
        for num in messages[0].split():
            _, msg = mail.fetch(num, '(RFC822)')
            email_body = email.message_from_bytes(msg[0][1])
            
            # Parse with AI
            receipt_data = self.parse_email_with_ai(email_body.get_payload())
            
            # Submit to Haalkhata
            result = self.submit_to_haalkhata(receipt_data)
            print(f"Created receipt: {result['receipt']['invoice_code']}")

# Usage
parser = EmailReceiptParser(
    haalkhata_token="YOUR_HAALKHATA_TOKEN",
    openai_key="YOUR_OPENAI_KEY"
)
parser.process_receipt_emails("imap.gmail.com", "you@gmail.com", "password")
```

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": "Additional error details (optional)"
  }
}
```

### Common Error Codes

| Code | Status | Description | Solution |
|------|--------|-------------|----------|
| `UNAUTHORIZED` | 401 | Invalid or expired token | Check your API token |
| `INVALID_REQUEST` | 400 | Missing or invalid parameters | Review request body |
| `PROCESSING_ERROR` | 500 | Failed to process image/text | Try again or use structured data |
| `INTERNAL_ERROR` | 500 | Server error | Contact support if persists |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests | Slow down requests |

### Error Handling Example

```javascript
async function createReceipt(receiptData) {
  try {
    const response = await fetch('https://your-domain.com/api/v1/receipts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(receiptData)
    });
    
    const result = await response.json();
    
    if (!result.success) {
      // Handle API errors
      switch (result.error.code) {
        case 'UNAUTHORIZED':
          console.error('Invalid API token');
          // Redirect to login or refresh token
          break;
        case 'INVALID_REQUEST':
          console.error('Invalid data:', result.error.details);
          // Show validation errors to user
          break;
        case 'PROCESSING_ERROR':
          console.error('Processing failed:', result.error.message);
          // Retry or fallback to manual entry
          break;
        default:
          console.error('Unknown error:', result.error);
      }
      return null;
    }
    
    return result.receipt;
  } catch (error) {
    console.error('Network error:', error);
    return null;
  }
}
```

---

## Rate Limits & Best Practices

### Rate Limits

- **Default:** 100 requests per minute per token
- **Burst:** Up to 10 concurrent requests
- **Image Processing:** 20 images per minute (AI processing is resource-intensive)

### Best Practices

#### 1. **Choose the Right Method**

```
Image Processing (AI) > Text Processing > Structured Data
     (Slowest)                                  (Fastest)
     (Most expensive)                           (Free)
```

- Use **structured data** when you already have the information
- Use **image processing** only when you need AI extraction
- Use **text processing** for raw text storage

#### 2. **Batch Operations**

Instead of creating receipts one by one:

```javascript
// ❌ Bad: Sequential requests
for (const receipt of receipts) {
  await createReceipt(receipt);
}

// ✅ Good: Parallel requests with limit
const chunks = chunkArray(receipts, 5); // 5 at a time
for (const chunk of chunks) {
  await Promise.all(chunk.map(receipt => createReceipt(receipt)));
}
```

#### 3. **Error Retry Logic**

```javascript
async function createReceiptWithRetry(data, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await createReceipt(data);
      return result;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000));
    }
  }
}
```

#### 4. **Caching**

Cache frequently accessed receipts to reduce API calls:

```javascript
const receiptCache = new Map();

async function getReceipt(invoiceCode) {
  if (receiptCache.has(invoiceCode)) {
    return receiptCache.get(invoiceCode);
  }
  
  const receipt = await fetchReceipt(invoiceCode);
  receiptCache.set(invoiceCode, receipt);
  
  return receipt;
}
```

#### 5. **Webhook Alternative**

For real-time updates, consider using webhooks instead of polling:

```javascript
// Instead of polling every minute
setInterval(async () => {
  const receipts = await fetchReceipts();
  // Process new receipts
}, 60000);

// Use webhooks (coming soon)
app.post('/webhooks/receipt-created', (req, res) => {
  const receipt = req.body;
  // Process immediately
});
```

---

## SDK & Libraries

### Official SDKs (Coming Soon)

- JavaScript/TypeScript
- Python
- PHP
- Ruby
- Go

### Community Libraries

Check our [GitHub repository](https://github.com/your-org/haalkhata) for community-contributed libraries.

---

## Support

### Documentation

- **API Reference:** [your-domain.com/docs/api](https://your-domain.com/docs/api)
- **Integration Guides:** [your-domain.com/docs/guides](https://your-domain.com/docs/guides)
- **FAQ:** [your-domain.com/docs/faq](https://your-domain.com/docs/faq)

### Contact

- **Email:** support@your-domain.com
- **Discord:** [discord.gg/haalkhata](https://discord.gg/haalkhata)
- **GitHub Issues:** [github.com/your-org/haalkhata/issues](https://github.com/your-org/haalkhata/issues)

---

## Changelog

### v1.0.0 (2025-01-05)

- Initial API release
- Support for structured, text, and image receipt submission
- Pagination and filtering for receipt retrieval
- Token-based authentication

---

**Last Updated:** January 5, 2025  
**API Version:** 1.0.0
