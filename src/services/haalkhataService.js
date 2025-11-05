// Haalkhata API service for receipt management
// API Documentation: https://your-domain.com/api/v1

import { getSecret, SECRET_KEYS } from './secretsService';

// API Configuration
// Default to localhost:9002 in development, or use environment variable
const API_BASE_URL = import.meta.env.VITE_HAALKHATA_API_URL || 'http://localhost:9002/api/v1';

console.log('🔧 Haalkhata Service Initialized');
console.log('   - API Base URL:', API_BASE_URL);

/**
 * Get authorization headers for Haalkhata API
 * @returns {Object} Headers object with Authorization
 * @throws {Error} If access token is not configured
 */
function getAuthHeaders() {
  const token = getSecret(SECRET_KEYS.HAALKHATA_ACCESS_TOKEN);
  
  console.log('🔑 Getting auth headers...');
  console.log('   - Token retrieved:', token ? `${token.substring(0, 10)}...` : 'null');
  console.log('   - Token length:', token ? token.length : 0);
  
  if (!token) {
    console.log('❌ No token found in secrets');
    throw new Error('Haalkhata access token not configured. Please add it in Settings > Secrets.');
  }
  
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  console.log('   - Authorization header:', `Bearer ${token.substring(0, 10)}...`);
  console.log('   - Headers:', Object.keys(headers));
  
  return headers;
}

/**
 * Create a receipt using structured data
 * @param {Object} data - Receipt data
 * @param {number} data.amount - Transaction amount (required)
 * @param {string} data.purpose - Purpose of transaction (required)
 * @param {string} data.transaction_type - "income", "expense", or "savings" (required)
 * @param {string} data.transaction_date - ISO 8601 date (required)
 * @param {string} [data.currency] - Currency code (default: "USD")
 * @param {string} [data.sender] - Sender name
 * @param {string} [data.receiver] - Receiver name
 * @param {string} [data.platform] - Payment platform
 * @param {string} [data.transaction_id] - Transaction identifier
 * @param {string} [data.details] - Additional details
 * @param {string} [data.to_account] - Destination account
 * @param {string} [data.from_account] - Source account
 * @returns {Promise<Object>} Created receipt
 */
export async function createReceipt(data) {
  console.log('🔧 createReceipt() called');
  console.log('   - API URL:', `${API_BASE_URL}/receipts`);
  console.log('   - Receipt data:', JSON.stringify(data, null, 2));
  
  try {
    // Remove null values from data
    const cleanedData = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== null && value !== undefined)
    );
    
    console.log('🧹 Cleaned data (null values removed):', JSON.stringify(cleanedData, null, 2));
    
    const requestBody = {
      type: 'structured',
      data: cleanedData
    };
    
    const fullUrl = `${API_BASE_URL}/receipts`;
    console.log('📡 Making request to Haalkhata API...');
    console.log('   - Method: POST');
    console.log('   - Full URL:', fullUrl);
    console.log('   - Request body:', JSON.stringify(requestBody, null, 2));
    
    // Add timeout to detect hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('⏱️  Request timeout after 30 seconds');
      controller.abort();
    }, 30000);
    
    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(requestBody),
      signal: controller.signal
    }).catch(error => {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.log('❌ Request aborted due to timeout');
        throw new Error('Request timeout - Haalkhata API server not responding');
      }
      console.log('❌ Network error:', error);
      throw new Error(`Network error: ${error.message}`);
    });
    
    clearTimeout(timeoutId);
    console.log('📥 Haalkhata API response received');
    console.log('   - Status:', response.status, response.statusText);

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      console.log('❌ Haalkhata API error:', error);
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    const result = await response.json();
    console.log('✅ Receipt created successfully');
    console.log('   - Response:', JSON.stringify(result, null, 2));
    
    return result.receipt;
  } catch (error) {
    console.error('❌ Error in createReceipt:', error);
    throw error;
  }
}

/**
 * Create a receipt from raw text (for future AI processing)
 * @param {string} text - Raw text to process
 * @returns {Promise<Object>} Created receipt
 */
export async function createReceiptFromText(text) {
  try {
    const response = await fetch(`${API_BASE_URL}/receipts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        type: 'text',
        text: text
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    const result = await response.json();
    return result.receipt;
  } catch (error) {
    console.error('Error creating receipt from text:', error);
    throw error;
  }
}

/**
 * Create a receipt from an image (base64 encoded)
 * @param {string} imageBase64 - Base64 encoded image (with data:image/...;base64, prefix)
 * @param {string} [filename] - Optional filename
 * @returns {Promise<Object>} Created receipt with AI-extracted data
 */
export async function createReceiptFromImage(imageBase64, filename = 'receipt.jpg') {
  try {
    const response = await fetch(`${API_BASE_URL}/receipts`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        type: 'image',
        image: imageBase64,
        filename: filename
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    const result = await response.json();
    return result.receipt;
  } catch (error) {
    console.error('Error creating receipt from image:', error);
    throw error;
  }
}

/**
 * Get all receipts with pagination and filtering
 * @param {Object} options - Query options
 * @param {number} [options.page=1] - Page number
 * @param {number} [options.limit=50] - Results per page (max: 100)
 * @param {string} [options.sort='created_at:desc'] - Sort field and order
 * @param {string} [options.start_date] - Filter by transaction date (YYYY-MM-DD)
 * @param {string} [options.end_date] - Filter by transaction date (YYYY-MM-DD)
 * @returns {Promise<Object>} Receipts data with pagination
 */
export async function getReceipts(options = {}) {
  try {
    const params = new URLSearchParams({
      page: options.page || 1,
      limit: options.limit || 50,
      sort: options.sort || 'created_at:desc'
    });

    if (options.start_date) params.append('start_date', options.start_date);
    if (options.end_date) params.append('end_date', options.end_date);

    const response = await fetch(`${API_BASE_URL}/receipts?${params}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching receipts:', error);
    throw error;
  }
}

/**
 * Get a single receipt by invoice code
 * @param {string} invoiceCode - Receipt invoice code
 * @returns {Promise<Object>} Receipt data
 */
export async function getReceipt(invoiceCode) {
  try {
    const response = await fetch(`${API_BASE_URL}/receipts/${invoiceCode}`, {
      headers: getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(error.error?.message || `API error: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error fetching receipt:', error);
    throw error;
  }
}

/**
 * Get receipt image URL
 * @param {string} invoiceCode - Receipt invoice code
 * @returns {string} Image URL
 */
export function getReceiptImageUrl(invoiceCode) {
  const token = getSecret(SECRET_KEYS.HAALKHATA_ACCESS_TOKEN);
  return `${API_BASE_URL}/receipts/${invoiceCode}/image?token=${token}`;
}

/**
 * Check if Haalkhata access token is configured
 * @returns {boolean} True if token is configured
 */
export function isHaalkhataConfigured() {
  const token = getSecret(SECRET_KEYS.HAALKHATA_ACCESS_TOKEN);
  return !!token && token.trim() !== '';
}

/**
 * Test connection to Haalkhata API server
 * @returns {Promise<boolean>} True if server is reachable
 */
export async function testHaalkhataConnection() {
  console.log('🔍 Testing Haalkhata API connection...');
  console.log('   - Target URL:', `${API_BASE_URL}/receipts`);
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${API_BASE_URL}/receipts?limit=1`, {
      method: 'GET',
      headers: getAuthHeaders(),
      signal: controller.signal
    }).catch(error => {
      clearTimeout(timeoutId);
      if (error.name === 'AbortError') {
        console.log('❌ Connection test timeout');
        return null;
      }
      console.log('❌ Connection test failed:', error);
      return null;
    });
    
    clearTimeout(timeoutId);
    
    if (!response) {
      console.log('❌ Haalkhata API server not responding');
      return false;
    }
    
    console.log('✅ Haalkhata API server is reachable');
    console.log('   - Status:', response.status);
    return true;
  } catch (error) {
    console.log('❌ Connection test error:', error);
    return false;
  }
}

/**
 * Process email HTML content with AI to extract receipt data
 * This uses OpenAI to extract structured data from email HTML
 * @param {string} htmlContent - Email HTML content
 * @param {string} openaiApiKey - OpenAI API key
 * @returns {Promise<Object>} Extracted receipt data
 */
export async function processEmailWithAI(htmlContent, openaiApiKey) {
  console.log('🔧 processEmailWithAI() called');
  console.log('   - Content length:', htmlContent.length, 'characters');
  console.log('   - API Key present:', !!openaiApiKey);
  
  if (!openaiApiKey) {
    console.log('❌ OpenAI API key not configured');
    throw new Error('OpenAI API key not configured. Please add it in Settings > Secrets.');
  }

  const AI_PROMPT = `You are an intelligent financial document analyzer. Extract structured receipt/transaction data from this email HTML.

The email may contain: receipts, invoices, payment confirmations, transaction notifications from services like Stripe, PayPal, bKash, Nagad, etc.

EXTRACT THESE FIELDS (return as JSON):

REQUIRED:
- amount: Transaction amount as number (NOT balance/fees/charges)
- purpose: Transaction category or description
- transaction_type: "income" (credits/received) or "expense" (debits/payments) or "savings"
- transaction_date: ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)

OPTIONAL:
- sender: Person/entity who sent money
- from_account: Sender's account number (may be masked)
- to_account: Recipient's account number
- receiver: Person/entity who received money
- currency: Infer from symbols/text (৳/Tk/BDT → BDT, $ → USD, € → EUR)
- platform: Service used (bKash, Nagad, Stripe, PayPal, bank name)
- transaction_id: Reference/tracking number
- details: Additional info (fees, merchant address, notes)

PURPOSE CATEGORIES (choose best fit):
Food, Clothing, Essentials, Accommodation, Fuel, Transportation, Electricity, Gas, Water, Phone, Internet, Subscription, Education, Salary, Tax, Gift, or "Any Other Expenses"

EXTRACTION RULES:
1. Return ONLY valid JSON, no commentary
2. amount must be a number (extract from "Amount:", "Total:", currency symbols)
3. Ignore service charges, VAT, balance - only extract transaction amount
4. Use context clues: green/plus = income, red/minus = expense
5. Handle various date formats and convert to ISO 8601
6. Extract transaction IDs from any reference/confirmation numbers
7. Use null for fields that cannot be determined
8. Verify amount is transaction value, not account balance

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
  "details": "Purchased office supplies"
}

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
      console.log('❌ Validation failed: Missing transaction_date');
      throw new Error('Failed to extract transaction_date from email');
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
 * Process image with AI to extract receipt data
 * This uses OpenAI Vision to extract structured data from receipt images
 * @param {string} imageBase64 - Base64 encoded image (with data:image/...;base64, prefix)
 * @param {string} openaiApiKey - OpenAI API key
 * @returns {Promise<Object>} Extracted receipt data
 */
export async function processImageWithAI(imageBase64, openaiApiKey) {
  if (!openaiApiKey) {
    throw new Error('OpenAI API key not configured. Please add it in Settings > Secrets.');
  }

  const AI_PROMPT = `You are an intelligent receipt analyzer. Extract structured data from this receipt image.

EXTRACT THESE FIELDS (return as JSON):

REQUIRED:
- amount: Transaction amount as number (NOT balance/fees/charges)
- purpose: Transaction category or description
- transaction_type: "income" (credits/received) or "expense" (debits/payments) or "savings"
- transaction_date: ISO 8601 format (YYYY-MM-DDTHH:mm:ssZ)

OPTIONAL:
- sender: Person/entity who sent money
- from_account: Sender's account number (may be masked)
- to_account: Recipient's account number
- receiver: Person/entity who received money
- currency: Infer from symbols/text (৳/Tk/BDT → BDT, $ → USD, € → EUR)
- platform: Service used (bKash, Nagad, Stripe, PayPal, bank name)
- transaction_id: Reference/tracking number
- details: Additional info (fees, merchant address, notes)

PURPOSE CATEGORIES (choose best fit):
Food, Clothing, Essentials, Accommodation, Fuel, Transportation, Electricity, Gas, Water, Phone, Internet, Subscription, Education, Salary, Tax, Gift, or "Any Other Expenses"

Return ONLY valid JSON, no commentary.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: AI_PROMPT },
              { type: 'image_url', image_url: { url: imageBase64 } }
            ]
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: { message: 'Unknown error' } }));
      throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
    }

    const result = await response.json();
    const extracted = JSON.parse(result.choices[0].message.content);

    // Post-process: ensure amount is number
    if (typeof extracted.amount === 'string') {
      extracted.amount = parseFloat(extracted.amount.replace(/[^0-9.-]/g, ''));
    }

    // Validate required fields
    if (!extracted.amount || typeof extracted.amount !== 'number') {
      throw new Error('Failed to extract amount from image');
    }
    if (!extracted.purpose || typeof extracted.purpose !== 'string') {
      throw new Error('Failed to extract purpose from image');
    }
    if (!extracted.transaction_type || !['income', 'expense', 'savings'].includes(extracted.transaction_type.toLowerCase())) {
      throw new Error('Failed to extract valid transaction_type from image');
    }
    if (!extracted.transaction_date) {
      throw new Error('Failed to extract transaction_date from image');
    }

    return extracted;
  } catch (error) {
    console.error('Error processing image with AI:', error);
    throw error;
  }
}
