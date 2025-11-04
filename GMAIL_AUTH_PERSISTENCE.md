# Gmail Authentication Persistence

## Overview

Gmail authentication tokens are now **automatically persisted** across browser sessions, page reloads, and devices through the config export/import system. Users no longer need to re-authenticate frequently.

## What Changed

### 1. Token Storage & Encryption

**Before:**
- Gmail tokens stored only in browser `localStorage`
- Lost on browser cache clear or new device
- Not included in config exports

**After:**
- Gmail tokens stored in browser `localStorage` ✅
- **Encrypted and included in config exports** ✅
- **Synced to local folder** (if folder sync enabled) ✅
- **Restored on config import** ✅

### 2. Security

Gmail OAuth tokens are now treated as sensitive data:

- ✅ **Encrypted with AES-256-GCM** using `VITE_CONFIG_ENCRYPTION_KEY`
- ✅ **Same encryption** as API keys in `hashbase_secrets`
- ✅ **Never transmitted unencrypted** in config files
- ✅ **Automatically decrypted** on import

### 3. Persistence Methods

Gmail authentication persists through:

1. **Browser localStorage** - Immediate persistence
2. **Config Download/Upload** - Manual backup/restore
3. **Folder Sync** - Automatic sync to local folder
4. **Cloud Sync** - If folder is in Dropbox/OneDrive

## How It Works

### Authentication Flow

```
1. User clicks "Authenticate with Gmail"
   ↓
2. OAuth flow completes → tokens saved to localStorage
   ↓
3. Tokens automatically included in next config export
   ↓
4. Config export encrypts tokens with .env key
   ↓
5. Encrypted config saved to:
   - Downloaded JSON file (manual)
   - Local sync folder (automatic)
```

### Restore Flow

```
1. User imports config or loads from sync folder
   ↓
2. Config service detects encrypted gmail_tokens
   ↓
3. Tokens decrypted using .env key
   ↓
4. Tokens restored to localStorage
   ↓
5. Gmail widget automatically authenticated ✅
```

## Usage

### For Users

**No action required!** Authentication now persists automatically.

#### Manual Backup
1. Authenticate with Gmail
2. Settings → Storage → Download Config
3. Config file includes encrypted tokens

#### Restore on New Device
1. Settings → Storage → Upload Config
2. Select your config file
3. Gmail authentication restored automatically

#### Automatic Sync
1. Settings → Storage → Enable Folder Sync
2. Tokens sync automatically every interval
3. Use cloud folder (Dropbox/OneDrive) for cross-device sync

### For Developers

#### Modified Files

**`src/services/configService.js`**
- Added `gmail_tokens` to `getDashboardKeys()`
- Included `gmail_tokens` in encryption logic
- Tokens encrypted alongside `hashbase_secrets`

**`src/services/gmailService.js`**
- Added `saveGmailToken()` helper function
- Added `clearGmailToken()` helper function
- Updated comments to reflect persistence

**`Docs/CONFIG_AND_STORAGE.md`**
- Updated to show `gmail_tokens` is now included
- Added to encrypted data section
- Removed from excluded data section

**`README.md`**
- Updated security notes
- Added persistence information
- Updated troubleshooting guide

#### Code Example

```javascript
// Save Gmail token (automatically persisted)
import { saveGmailToken } from '@/services/gmailService';

const tokens = { access_token: '...', refresh_token: '...' };
saveGmailToken(JSON.stringify(tokens));
// ✅ Saved to localStorage
// ✅ Will be encrypted in next config export
// ✅ Will sync to folder if enabled

// Clear Gmail token
import { clearGmailToken } from '@/services/gmailService';
clearGmailToken();
// 🗑️ Removed from localStorage
// 🗑️ Will be removed from next config export
```

## Benefits

### For Users
- ✅ **No frequent re-authentication** - Tokens persist across sessions
- ✅ **Cross-device sync** - Authenticate once, use everywhere
- ✅ **Backup & restore** - Never lose authentication state
- ✅ **Automatic sync** - Tokens sync with folder sync

### For Developers
- ✅ **Consistent with other secrets** - Same encryption/storage pattern
- ✅ **No breaking changes** - Existing auth flow unchanged
- ✅ **Secure by default** - Encrypted with environment key
- ✅ **Easy to extend** - Pattern works for other OAuth tokens

## Security Considerations

### Encryption Key Required

**Important:** You must have `VITE_CONFIG_ENCRYPTION_KEY` configured in `.env` for token encryption.

```bash
# Generate encryption key
node generate-encryption-key.js

# Add to .env
VITE_CONFIG_ENCRYPTION_KEY=your_64_character_hex_key_here

# Restart dev server
npm run dev
```

### Same Key Required

- ✅ Use **same encryption key** on all devices
- ✅ Keep `.env` file **secure and backed up**
- ⚠️ **Different key = cannot decrypt** tokens from other devices

### Token Expiration

- Gmail tokens have **refresh tokens** that auto-renew
- Google API client handles token refresh automatically
- Tokens remain valid indefinitely (unless revoked)

## Migration

### Existing Users

No migration needed! Next time you:
1. Download config → tokens included
2. Enable folder sync → tokens synced
3. Import config → tokens restored

### New Users

1. Set up encryption key (see above)
2. Authenticate with Gmail
3. Tokens automatically persist

## Troubleshooting

### "Failed to decrypt secrets" Error

**Cause:** Config encrypted with different key

**Solution:**
- Use same `.env` key on all devices
- Or re-authenticate and export new config

### Tokens Not Persisting

**Check:**
1. Encryption key configured in `.env`
2. Config export includes `gmail_tokens` key
3. Folder sync enabled and working
4. No localStorage quota exceeded

**Debug:**
```javascript
// Check if tokens exist
console.log(localStorage.getItem('gmail_tokens'));

// Check config export
import { exportConfig } from '@/services/configService';
const config = await exportConfig();
console.log('Encrypted:', config.encrypted);
console.log('Has gmail_tokens:', 'encrypted_secrets' in config.data);
```

### Re-authentication Needed

If tokens become invalid:
1. Click "Authenticate with Gmail" button
2. Complete OAuth flow
3. New tokens automatically saved and encrypted

## Future Enhancements

Potential improvements:
- [ ] Token expiration warnings
- [ ] Manual token refresh button
- [ ] Multiple Gmail account support
- [ ] Token health check on startup

## Related Documentation

- [Configuration & Storage Guide](./Docs/CONFIG_AND_STORAGE.md)
- [Development Guide](./Docs/DEVELOPMENT_GUIDE.md)
- [README](./README.md)

---

**Last Updated:** 2025-11-05  
**Version:** 1.0.0
</CodeContent>
</invoke>
