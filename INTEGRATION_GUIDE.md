# Haalkhata Integration Guide

Step-by-step guide for integrating Haalkhata API into your application.

## Quick Start (5 Minutes)

### Step 1: Get Your API Token

1. Sign up at [your-domain.com](https://your-domain.com)
2. Navigate to **Settings** → **API Tokens**
3. Click **Create Token**
4. Name your token (e.g., "Production App")
5. Select scopes: `receipts:read`, `receipts:write`
6. **Save the token immediately** - you won't see it again!

### Step 2: Test Your Token

```bash
curl -X GET "http://localhost:9002/api/v1/receipts" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

Expected response:
```json
{
  "success": true,
  "data": [...],
  "pagination": {...}
}
```

### Step 3: Create Your First Receipt

```bash
curl -X POST "http://localhost:9002/api/v1/receipts" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "structured",
    "data": {
      "amount": 99.99,
      "currency": "USD",
      "purpose": "Test Receipt",
      "platform": "API Test"
    }
  }'
```

✅ **You're ready to integrate!**

---

## Integration Scenarios

### Scenario 1: I Have Structured Data

**Use Case:** Syncing from accounting software, payment gateways, or databases.

**Best Method:** Structured Data Submission

**Implementation:**

```javascript
// config.js
export const HAALKHATA_CONFIG = {
  apiUrl: process.env.HAALKHATA_API_URL || 'https://your-domain.com/api/v1',
  apiToken: process.env.HAALKHATA_API_TOKEN
};

// haalkhata-client.js
import { HAALKHATA_CONFIG } from './config';

export class HaalkhataClient {
  constructor() {
    this.baseUrl = HAALKHATA_CONFIG.apiUrl;
    this.token = HAALKHATA_CONFIG.apiToken;
  }

  async createReceipt(data) {
    const response = await fetch(`${this.baseUrl}/receipts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'structured',
        data: {
          amount: data.amount,
          currency: data.currency || 'USD',
          purpose: data.purpose,
          platform: data.platform,
          transaction_type: data.type || 'expense',
          sender: data.sender,
          receiver: data.receiver,
          transaction_date: data.date,
          transaction_id: data.id,
          details: data.description
        }
      })
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }

    return response.json();
  }

  async getReceipts(options = {}) {
    const params = new URLSearchParams({
      page: options.page || 1,
      limit: options.limit || 50,
      sort: options.sort || 'created_at:desc'
    });

    if (options.startDate) params.append('start_date', options.startDate);
    if (options.endDate) params.append('end_date', options.endDate);

    const response = await fetch(`${this.baseUrl}/receipts?${params}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    return response.json();
  }
}

// Usage
const client = new HaalkhataClient();

// Sync a transaction
const receipt = await client.createReceipt({
  amount: 150.50,
  currency: 'USD',
  purpose: 'Office Supplies',
  platform: 'Stripe',
  type: 'expense',
  sender: 'Company',
  receiver: 'Vendor',
  date: new Date().toISOString(),
  id: 'TXN-12345',
  description: 'Monthly office supplies purchase'
});

console.log('Receipt created:', receipt.receipt.invoice_code);
```

---

### Scenario 2: I Have Receipt Images

**Use Case:** Mobile apps, document scanners, email attachments.

**Best Method:** Image Processing (AI)

**Implementation:**

```javascript
// receipt-uploader.js
import { HaalkhataClient } from './haalkhata-client';

export class ReceiptUploader {
  constructor() {
    this.client = new HaalkhataClient();
  }

  async uploadImage(file) {
    // Convert file to base64
    const base64 = await this.fileToBase64(file);
    
    // Submit to Haalkhata for AI processing
    const response = await fetch(`${this.client.baseUrl}/receipts`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.client.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'image',
        image: base64,
        filename: file.name
      })
    });

    return response.json();
  }

  fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
}

// React Component Example
import React, { useState } from 'react';
import { ReceiptUploader } from './receipt-uploader';

function ReceiptUploadForm() {
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const uploader = new ReceiptUploader();

  const handleUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const receipt = await uploader.uploadImage(file);
      setResult(receipt.receipt);
      alert(`Receipt processed! Amount: ${receipt.receipt.amount} ${receipt.receipt.currency}`);
    } catch (error) {
      alert('Upload failed: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <input 
        type="file" 
        accept="image/*" 
        onChange={handleUpload}
        disabled={uploading}
      />
      {uploading && <p>Processing receipt with AI...</p>}
      {result && (
        <div>
          <h3>Receipt Details:</h3>
          <p>Amount: {result.amount} {result.currency}</p>
          <p>Purpose: {result.purpose}</p>
          <p>Platform: {result.platform}</p>
        </div>
      )}
    </div>
  );
}
```

---

### Scenario 3: I Want to Use My Own AI

**Use Case:** You have your own AI/LLM for processing but want to store in Haalkhata.

**Best Method:** Process with your AI → Submit structured data

---

#### AI Output Format Specification

Your AI should extract and format data according to this schema:

**Required Fields:**
```json
{
  "amount": 150.50,        // number - Transaction amount (required)
  "purpose": "Office Supplies",  // string - Purpose/description (required)
  "transaction_type": "expense",  // string - "income", "expense", or "savings" (required)
  "transaction_date": "2025-01-05T10:30:00Z"  // string - ISO 8601 date (required)
}
```

**Optional Fields (Recommended):**
```json
{
  "currency": "USD",           // string - ISO 4217 currency code (default: "USD")
  "sender": "John Doe",        // string - Person/entity sending money
  "receiver": "Acme Corp",     // string - Person/entity receiving money
  "platform": "Stripe",        // string - Payment platform/method
  "transaction_id": "TXN-12345", // string - Unique transaction identifier
  "details": "Purchased office supplies", // string - Additional details
  "to_account": "ACC-001",     // string - Destination account number
  "from_account": "ACC-002"    // string - Source account number
}
```

**Complete Example:**
```json
{
  "amount": 150.50,
  "currency": "USD",
  "purpose": "Office Supplies",
  "platform": "Stripe",
  "transaction_type": "expense",
  "sender": "John Doe",
  "receiver": "Acme Corp",
  "transaction_date": "2025-01-05T10:30:00Z",
  "transaction_id": "TXN-12345",
  "details": "Purchased pens, paper, and folders for office use",
  "to_account": "ACC-001",
  "from_account": "ACC-002"
}
```

---

#### AI Prompt Template

Use this prompt template with your AI to ensure consistent output:

**Simple Version (Quick Start):**

```javascript
const AI_EXTRACTION_PROMPT_SIMPLE = `
Extract financial transaction data from this image or raw text and return JSON.

REQUIRED: amount (number), purpose (string), transaction_type (string), transaction_date (string)
OPTIONAL: currency, sender, receiver, platform, transaction_id, details, to_account, from_account

Rules:
- Return valid JSON only
- amount must be a number, not string
- transaction_type must be one of: "income", "expense", or "savings"
- transaction_date must be in ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)
- Convert currency symbols to ISO codes ($ → USD, € → EUR, £ → GBP, ৳ → BDT)

Example output:
{
  "amount": 150.50,
  "currency": "USD",
  "purpose": "Office Supplies",
  "platform": "Stripe",
  "transaction_type": "expense",
  "sender": "John Doe",
  "receiver": "Acme Corp",
  "transaction_date": "2025-01-05T10:30:00Z",
  "transaction_id": "TXN-12345",
  "details": "Purchased office supplies"
}
`;
```

**Advanced Version (Production-Ready):**

```javascript
const AI_EXTRACTION_PROMPT_ADVANCED = `
You are an intelligent financial document analyzer. Extract structured data from this transaction document.

The image may contain: receipts, invoices, bank statements, mobile payment screenshots (bKash, Nagad, Stripe, PayPal), SMS confirmations, or handwritten notes.

VISUAL ANALYSIS:
- Examine entire layout (headers, footers, logos, branding)
- Use visual hierarchy (bold text, larger fonts, positioning)
- Handle rotated text, watermarks, and poor quality
- Recognize both printed and handwritten text

EXTRACT THESE FIELDS (return as JSON):

REQUIRED:
- amount: Transaction amount as number (NOT balance/fees/charges)
- purpose: Transaction category or description
- transaction_type: "income" (credits/received) or "expense" (debits/payments)
- transaction_date: ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)

OPTIONAL:
- sender: Person/entity who sent money (look for "FROM", "Sender", "A/C Holder")
- from_account: Sender's account number (may be masked: "****1234")
- to_account: Recipient's account number (look for "To A/C", "Beneficiary")
- receiver: Person/entity who received money (look for "To", "Paid to")
- currency: Infer from symbols/text (৳/Tk/BDT → BDT, $ → USD, € → EUR)
- platform: Service used (bKash, Nagad, Stripe, PayPal, bank name)
- transaction_id: Reference/tracking number (look for "Ref:", "TxnID:", "Receipt #")
- details: Additional info (fees, merchant address, notes)

PURPOSE CATEGORIES (choose best fit):
Food, Clothing, Essentials, Accommodation, Fuel, Transportation, Electricity, Gas, Water, Phone, Internet, Subscription, Education, Salary, Tax, Gift, or "Any Other Expenses"

EXTRACTION RULES:
1. Return ONLY valid JSON, no commentary
2. amount must be a number (extract from "Amount:", "Total:", currency symbols)
3. Ignore service charges, VAT, balance - only extract transaction amount
4. Use visual cues: green/plus = income, red/minus = expense
5. Handle date formats: "03-Jun-2025 06:44 PM" → "2025-06-03T18:44:00Z"
6. Extract transaction IDs from any reference/confirmation numbers
7. Use null for fields that cannot be determined
8. Verify amount is transaction value, not account balance

QUALITY CHECKS:
- Ensure amount is the actual transaction, not balance or fees
- Cross-check extracted data against visual layout
- Use surrounding context if text is unclear

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
  "details": "Purchased pens, paper, folders. Service charge: $2.50"
}

Now analyze the image and return extracted data as JSON:
`;
```

---

#### Implementation Examples

**JavaScript/OpenAI:**

```javascript
// ai-processor.js
import OpenAI from 'openai';
import { HaalkhataClient } from './haalkhata-client';

export class AIReceiptProcessor {
  constructor(openaiKey) {
    this.openai = new OpenAI({ apiKey: openaiKey });
    this.haalkhata = new HaalkhataClient();
  }

  async processReceiptImage(imageBase64) {
    // Step 1: Extract data with your AI
    const extractedData = await this.extractWithAI(imageBase64);
    
    // Step 2: Validate extracted data
    this.validateExtractedData(extractedData);
    
    // Step 3: Submit to Haalkhata
    const receipt = await this.haalkhata.createReceipt(extractedData);
    
    return receipt;
  }

  async extractWithAI(imageBase64) {
    const AI_PROMPT = `
You are a receipt data extraction assistant. Extract information from this receipt and return JSON.

REQUIRED: amount (number), purpose (string)
OPTIONAL: currency, sender, receiver, platform, transaction_type, transaction_date, transaction_id, details, to_account, from_account

Rules:
- Return valid JSON only
- amount must be a number, not string
- Convert currency symbols to ISO codes ($ → USD, € → EUR, £ → GBP, ৳ → BDT)
- Use ISO 8601 for dates
- transaction_type: "income", "expense", or "savings"

Example:
{
  "amount": 150.50,
  "currency": "USD",
  "purpose": "Office Supplies",
  "platform": "Stripe",
  "transaction_type": "expense",
  "sender": "John Doe",
  "receiver": "Acme Corp",
  "transaction_date": "2025-01-05T10:30:00Z",
  "transaction_id": "TXN-12345",
  "details": "Office supplies purchase"
}
`;

    const response = await this.openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: AI_PROMPT },
            { type: "image_url", image_url: { url: imageBase64 } }
          ]
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1 // Lower temperature for more consistent extraction
    });

    const extracted = JSON.parse(response.choices[0].message.content);
    
    // Post-process: ensure amount is number
    if (typeof extracted.amount === 'string') {
      extracted.amount = parseFloat(extracted.amount.replace(/[^0-9.-]/g, ''));
    }
    
    return extracted;
  }

  validateExtractedData(data) {
    // Validate required fields
    if (!data.amount || typeof data.amount !== 'number') {
      throw new Error('Invalid amount: must be a number');
    }
    
    if (!data.purpose || typeof data.purpose !== 'string' || !data.purpose.trim()) {
      throw new Error('Invalid purpose: must be a non-empty string');
    }
    
    if (!data.transaction_type || !['income', 'expense', 'savings'].includes(data.transaction_type.toLowerCase())) {
      throw new Error('Invalid transaction_type: must be "income", "expense", or "savings"');
    }
    
    if (!data.transaction_date) {
      throw new Error('Invalid transaction_date: required field');
    }
    
    // Validate date format
    const date = new Date(data.transaction_date);
    if (isNaN(date.getTime())) {
      throw new Error('Invalid transaction_date format: must be ISO 8601 (YYYY-MM-DDTHH:mm:ssZ)');
    }
    
    return true;
  }
}

// Usage
const processor = new AIReceiptProcessor(process.env.OPENAI_API_KEY);

// Process receipt image
const receipt = await processor.processReceiptImage(imageBase64);
console.log('Receipt created:', receipt.receipt.invoice_code);
```

**Python Example:**

```python
import openai
import requests
import base64
import json
from datetime import datetime

class AIReceiptProcessor:
    def __init__(self, openai_key, haalkhata_token):
        self.openai_key = openai_key
        self.haalkhata_token = haalkhata_token
        openai.api_key = openai_key
        
        self.AI_PROMPT = """
You are a receipt data extraction assistant. Extract information from this receipt and return JSON.

REQUIRED: amount (number), purpose (string), transaction_type (string), transaction_date (string)
OPTIONAL: currency, sender, receiver, platform, transaction_id, details, to_account, from_account

Rules:
- Return valid JSON only
- amount must be a number, not string
- transaction_type must be one of: "income", "expense", or "savings"
- transaction_date must be in ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)
- Convert currency symbols to ISO codes ($ → USD, € → EUR, £ → GBP, ৳ → BDT)

Example:
{
  "amount": 150.50,
  "currency": "USD",
  "purpose": "Office Supplies",
  "platform": "Stripe",
  "transaction_type": "expense",
  "sender": "John Doe",
  "receiver": "Acme Corp",
  "transaction_date": "2025-01-05T10:30:00Z",
  "transaction_id": "TXN-12345",
  "details": "Office supplies purchase"
}
"""
    
    def process_receipt_image(self, image_path):
        # Step 1: Extract with your AI
        extracted_data = self.extract_with_ai(image_path)
        
        # Step 2: Validate extracted data
        self.validate_extracted_data(extracted_data)
        
        # Step 3: Submit to Haalkhata
        receipt = self.submit_to_haalkhata(extracted_data)
        
        return receipt
    
    def extract_with_ai(self, image_path):
        with open(image_path, 'rb') as image_file:
            base64_image = base64.b64encode(image_file.read()).decode('utf-8')
        
        response = openai.ChatCompletion.create(
            model="gpt-4-vision-preview",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": self.AI_PROMPT
                        },
                        {
                            "type": "image_url",
                            "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}
                        }
                    ]
                }
            ],
            response_format={"type": "json_object"},
            temperature=0.1  # Lower temperature for consistent extraction
        )
        
        extracted = json.loads(response.choices[0].message.content)
        
        # Post-process: ensure amount is number
        if isinstance(extracted.get('amount'), str):
            # Remove currency symbols and convert to float
            amount_str = extracted['amount'].replace('$', '').replace(',', '').strip()
            extracted['amount'] = float(amount_str)
        
        return extracted
    
    def validate_extracted_data(self, data):
        # Validate required fields
        if 'amount' not in data or not isinstance(data['amount'], (int, float)):
            raise ValueError('Invalid amount: must be a number')
        
        if 'purpose' not in data or not isinstance(data['purpose'], str) or not data['purpose'].strip():
            raise ValueError('Invalid purpose: must be a non-empty string')
        
        if 'transaction_type' not in data:
            raise ValueError('Invalid transaction_type: required field')
        
        valid_types = ['income', 'expense', 'savings']
        if data['transaction_type'].lower() not in valid_types:
            raise ValueError('Invalid transaction_type: must be "income", "expense", or "savings"')
        
        if 'transaction_date' not in data:
            raise ValueError('Invalid transaction_date: required field')
        
        # Validate date format
        try:
            datetime.fromisoformat(data['transaction_date'].replace('Z', '+00:00'))
        except ValueError:
            raise ValueError('Invalid transaction_date format: must be ISO 8601 (YYYY-MM-DDTHH:mm:ssZ)')
        
        return True
    
    def submit_to_haalkhata(self, data):
        response = requests.post(
            "https://your-domain.com/api/v1/receipts",
            headers={
                "Authorization": f"Bearer {self.haalkhata_token}",
                "Content-Type": "application/json"
            },
            json={
                "type": "structured",
                "data": data
            }
        )
        
        if not response.ok:
            raise Exception(f"API error: {response.status_code} - {response.text}")
        
        return response.json()

# Usage
processor = AIReceiptProcessor(
    openai_key="YOUR_OPENAI_KEY",
    haalkhata_token="YOUR_HAALKHATA_TOKEN"
)

receipt = processor.process_receipt_image("receipt.jpg")
print(f"Receipt created: {receipt['receipt']['invoice_code']}")
print(f"Amount: {receipt['receipt']['amount']} {receipt['receipt']['currency']}")
print(f"Purpose: {receipt['receipt']['purpose']}")
```

---

### Scenario 4: Webhook Integration

**Use Case:** Real-time receipt creation from external events.

**Implementation:**

```javascript
// webhook-handler.js
import express from 'express';
import { HaalkhataClient } from './haalkhata-client';

const app = express();
app.use(express.json());

const haalkhata = new HaalkhataClient();

// Stripe webhook
app.post('/webhooks/stripe', async (req, res) => {
  const event = req.body;
  
  if (event.type === 'payment_intent.succeeded') {
    const payment = event.data.object;
    
    try {
      await haalkhata.createReceipt({
        amount: payment.amount / 100, // Stripe uses cents
        currency: payment.currency.toUpperCase(),
        purpose: payment.description || 'Payment',
        platform: 'Stripe',
        type: 'income',
        sender: payment.customer,
        receiver: 'Your Company',
        date: new Date(payment.created * 1000).toISOString(),
        id: payment.id,
        description: `Stripe payment: ${payment.id}`
      });
      
      console.log('Receipt created for Stripe payment:', payment.id);
    } catch (error) {
      console.error('Failed to create receipt:', error);
    }
  }
  
  res.status(200).send('OK');
});

// PayPal webhook
app.post('/webhooks/paypal', async (req, res) => {
  const event = req.body;
  
  if (event.event_type === 'PAYMENT.CAPTURE.COMPLETED') {
    const payment = event.resource;
    
    try {
      await haalkhata.createReceipt({
        amount: parseFloat(payment.amount.value),
        currency: payment.amount.currency_code,
        purpose: 'PayPal Payment',
        platform: 'PayPal',
        type: 'income',
        sender: payment.payer.email_address,
        receiver: 'Your Company',
        date: payment.create_time,
        id: payment.id,
        description: `PayPal payment: ${payment.id}`
      });
      
      console.log('Receipt created for PayPal payment:', payment.id);
    } catch (error) {
      console.error('Failed to create receipt:', error);
    }
  }
  
  res.status(200).send('OK');
});

app.listen(3000, () => {
  console.log('Webhook server running on port 3000');
});
```

---

### Scenario 5: Batch Import

**Use Case:** Importing historical data or bulk uploads.

**Implementation:**

```javascript
// batch-importer.js
import { HaalkhataClient } from './haalkhata-client';
import pLimit from 'p-limit';

export class BatchImporter {
  constructor() {
    this.client = new HaalkhataClient();
    this.limit = pLimit(5); // 5 concurrent requests
  }

  async importReceipts(receipts) {
    const results = {
      success: [],
      failed: []
    };

    // Process in batches of 5
    const promises = receipts.map(receipt => 
      this.limit(async () => {
        try {
          const result = await this.client.createReceipt(receipt);
          results.success.push({
            original: receipt,
            receipt: result.receipt
          });
          console.log(`✓ Imported: ${receipt.purpose}`);
        } catch (error) {
          results.failed.push({
            original: receipt,
            error: error.message
          });
          console.error(`✗ Failed: ${receipt.purpose} - ${error.message}`);
        }
      })
    );

    await Promise.all(promises);

    return results;
  }

  async importFromCSV(csvPath) {
    const fs = require('fs');
    const csv = require('csv-parser');
    const receipts = [];

    return new Promise((resolve, reject) => {
      fs.createReadStream(csvPath)
        .pipe(csv())
        .on('data', (row) => {
          receipts.push({
            amount: parseFloat(row.amount),
            currency: row.currency || 'USD',
            purpose: row.purpose,
            platform: row.platform,
            type: row.type || 'expense',
            sender: row.sender,
            receiver: row.receiver,
            date: row.date,
            id: row.transaction_id,
            description: row.description
          });
        })
        .on('end', async () => {
          const results = await this.importReceipts(receipts);
          resolve(results);
        })
        .on('error', reject);
    });
  }
}

// Usage
const importer = new BatchImporter();

// Import from array
const receipts = [
  { amount: 100, currency: 'USD', purpose: 'Office Supplies' },
  { amount: 50, currency: 'USD', purpose: 'Lunch' },
  // ... more receipts
];

const results = await importer.importReceipts(receipts);
console.log(`Imported: ${results.success.length}`);
console.log(`Failed: ${results.failed.length}`);

// Import from CSV
const csvResults = await importer.importFromCSV('receipts.csv');
console.log('CSV import complete:', csvResults);
```

---

## Testing Your Integration

### Unit Tests

```javascript
// haalkhata-client.test.js
import { HaalkhataClient } from './haalkhata-client';

describe('HaalkhataClient', () => {
  let client;

  beforeEach(() => {
    client = new HaalkhataClient();
  });

  test('creates receipt with structured data', async () => {
    const receipt = await client.createReceipt({
      amount: 99.99,
      currency: 'USD',
      purpose: 'Test Receipt',
      platform: 'Test'
    });

    expect(receipt.success).toBe(true);
    expect(receipt.receipt).toHaveProperty('invoice_code');
    expect(receipt.receipt.amount).toBe(99.99);
  });

  test('retrieves receipts with pagination', async () => {
    const result = await client.getReceipts({
      page: 1,
      limit: 10
    });

    expect(result.success).toBe(true);
    expect(result.data).toBeInstanceOf(Array);
    expect(result.pagination).toHaveProperty('total');
  });

  test('handles errors gracefully', async () => {
    // Test with invalid data
    await expect(
      client.createReceipt({ amount: 'invalid' })
    ).rejects.toThrow();
  });
});
```

### Integration Tests

```javascript
// integration.test.js
import { HaalkhataClient } from './haalkhata-client';

describe('Haalkhata Integration', () => {
  let client;
  let testReceiptCode;

  beforeAll(() => {
    client = new HaalkhataClient();
  });

  test('full receipt lifecycle', async () => {
    // Create receipt
    const created = await client.createReceipt({
      amount: 150.50,
      currency: 'USD',
      purpose: 'Integration Test',
      platform: 'Test Suite'
    });

    expect(created.success).toBe(true);
    testReceiptCode = created.receipt.invoice_code;

    // Retrieve receipt
    const receipts = await client.getReceipts({ limit: 1 });
    expect(receipts.data[0].invoice_code).toBe(testReceiptCode);

    // Verify data
    expect(receipts.data[0].amount).toBe(150.50);
    expect(receipts.data[0].purpose).toBe('Integration Test');
  });
});
```

---

## Deployment Checklist

### Before Going Live

- [ ] **Security**
  - [ ] API token stored in environment variables (not hardcoded)
  - [ ] HTTPS enabled for all API calls
  - [ ] Token rotation strategy in place
  - [ ] Rate limiting implemented

- [ ] **Error Handling**
  - [ ] Retry logic for failed requests
  - [ ] Proper error logging
  - [ ] User-friendly error messages
  - [ ] Fallback mechanisms

- [ ] **Performance**
  - [ ] Request batching implemented
  - [ ] Caching strategy in place
  - [ ] Async processing for large uploads
  - [ ] Connection pooling configured

- [ ] **Monitoring**
  - [ ] API usage tracking
  - [ ] Error rate monitoring
  - [ ] Performance metrics
  - [ ] Alert system for failures

- [ ] **Testing**
  - [ ] Unit tests passing
  - [ ] Integration tests passing
  - [ ] Load testing completed
  - [ ] Edge cases covered

### Environment Variables

```bash
# .env.production
HAALKHATA_API_URL=https://your-domain.com/api/v1
HAALKHATA_API_TOKEN=hk_live_your_production_token_here

# Optional
HAALKHATA_TIMEOUT=30000
HAALKHATA_RETRY_ATTEMPTS=3
HAALKHATA_MAX_CONCURRENT=5
```

---

## Common Issues & Solutions

### Issue 1: 401 Unauthorized

**Cause:** Invalid or expired API token

**Solution:**
```javascript
// Check token is set correctly
console.log('Token:', process.env.HAALKHATA_API_TOKEN?.substring(0, 10) + '...');

// Verify token format
if (!process.env.HAALKHATA_API_TOKEN?.startsWith('hk_')) {
  throw new Error('Invalid token format');
}
```

### Issue 2: 500 Internal Server Error

**Cause:** Invalid data format or missing required fields

**Solution:**
```javascript
// Validate data before sending
function validateReceiptData(data) {
  if (typeof data.amount !== 'number') {
    throw new Error('Amount must be a number');
  }
  if (!data.purpose || data.purpose.trim() === '') {
    throw new Error('Purpose is required');
  }
  return true;
}

// Use validation
validateReceiptData(receiptData);
const receipt = await client.createReceipt(receiptData);
```

### Issue 3: Slow Image Processing

**Cause:** Large image files or high resolution

**Solution:**
```javascript
// Compress images before upload
async function compressImage(file, maxWidth = 1920) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ratio = maxWidth / img.width;
        canvas.width = maxWidth;
        canvas.height = img.height * ratio;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        canvas.toBlob((blob) => {
          resolve(new File([blob], file.name, { type: 'image/jpeg' }));
        }, 'image/jpeg', 0.8);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}
```

### Issue 4: Rate Limiting

**Cause:** Too many requests in short time

**Solution:**
```javascript
// Implement rate limiter
import pLimit from 'p-limit';

const limit = pLimit(5); // Max 5 concurrent requests

async function createReceiptsWithRateLimit(receipts) {
  return Promise.all(
    receipts.map(receipt => 
      limit(() => client.createReceipt(receipt))
    )
  );
}
```

---

## Next Steps

1. **Read the [API Documentation](./API_DOCUMENTATION.md)** for detailed endpoint reference
2. **Join our [Discord Community](https://discord.gg/haalkhata)** for support
3. **Check out [Example Projects](https://github.com/your-org/haalkhata-examples)** for inspiration
4. **Subscribe to our [Newsletter](https://your-domain.com/newsletter)** for updates

---

**Need Help?** Contact us at support@your-domain.com

**Last Updated:** January 5, 2025
