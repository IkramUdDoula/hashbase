#!/usr/bin/env node

/**
 * Generate a random 32-byte encryption key for config export/import
 * 
 * Usage:
 *   node generate-encryption-key.js
 * 
 * This will output a 64-character hexadecimal string that should be
 * added to your .env file as VITE_CONFIG_ENCRYPTION_KEY
 */

import crypto from 'crypto';

// Generate 32 random bytes (256 bits for AES-256)
const key = crypto.randomBytes(32).toString('hex');

console.log('\n🔑 Generated Encryption Key for Config Export/Import\n');
console.log('Add this to your .env file:\n');
console.log(`VITE_CONFIG_ENCRYPTION_KEY=${key}\n`);
console.log('⚠️  IMPORTANT: Keep this key secure and backed up!');
console.log('   You will need the same key to decrypt configs on other devices.\n');
