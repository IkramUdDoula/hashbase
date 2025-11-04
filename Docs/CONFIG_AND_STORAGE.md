# Configuration and Storage Guide

Complete guide to Hashbase's configuration export/import and storage systems.

## Table of Contents

1. [Overview](#overview)
2. [Configuration File Structure](#configuration-file-structure)
3. [What Gets Exported](#what-gets-exported)
4. [Encryption](#encryption)
5. [Storage Methods](#storage-methods)
6. [Local Storage Keys](#local-storage-keys)
7. [Multi-Canvas Support](#multi-canvas-support)
8. [Usage Guide](#usage-guide)
9. [API Reference](#api-reference)
10. [Troubleshooting](#troubleshooting)

---

## Overview

Hashbase provides two complementary systems for data persistence:

1. **Config Export/Import** - Download/upload configuration as JSON files
2. **Folder Sync** - Automatic synchronization with a local folder

Both systems use the same data structure and support encryption for sensitive data.

### Key Features

- ✅ **Complete State Preservation** - All canvases, widgets, and settings
- ✅ **AES-256-GCM Encryption** - Secrets encrypted with environment key
- ✅ **Multi-Canvas Support** - Each canvas layout preserved independently
- ✅ **Auto-Sync** - Configurable automatic folder synchronization
- ✅ **Version History** - Optional timestamped backups
- ✅ **Cross-Device** - Transfer settings between browsers/devices

---

## Configuration File Structure

### Basic Structure

```json
{
  "version": "1.0.0",
  "exportDate": "2025-11-04T08:52:52.000Z",
  "encrypted": true,
  "data": {
    // Configuration data here
  }
}
```

### Fields

| Field | Type | Description |
|-------|------|-------------|
| `version` | string | Config format version (currently "1.0.0") |
| `exportDate` | string | ISO 8601 timestamp of export |
| `encrypted` | boolean | Whether secrets are encrypted |
| `data` | object | All configuration data |

### Example Complete Config

```json
{
  "version": "1.0.0",
  "exportDate": "2025-11-04T08:52:52.000Z",
  "encrypted": true,
  "data": {
    "encrypted_secrets": {
      "encrypted": "base64_encrypted_data...",
      "iv": "base64_initialization_vector..."
    },
    "hashbase_canvases": [
      { "id": "canvas-1", "name": "Canvas 1", "createdAt": 1730707972000 },
      { "id": "canvas-2", "name": "Work", "createdAt": 1730708123000 }
    ],
    "hashbase_active_canvas": "canvas-1",
    "widgetLayout_canvas-1": [
      [
        { "id": "timer-widget", "rowSpan": 2, "startRow": 0 },
        { "id": "news-widget", "rowSpan": 3, "startRow": 2 }
      ],
      [
        { "id": "ai-chat-widget", "rowSpan": 4, "startRow": 0 }
      ]
    ],
    "widgetLayout_canvas-2": [
      [
        { "id": "github-widget", "rowSpan": 2, "startRow": 0 }
      ]
    ],
    "hashbase_widget_preferences": {
      "timer-widget": true,
      "news-widget": true,
      "ai-chat-widget": true,
      "github-widget": true
    },
    "hashbase-theme": "dark",
    "hashbase_ai_conversations": [...],
    "news_country": "us",
    "news_category": "technology"
  }
}
```

---

## What Gets Exported

### Core Configuration

| Key | Description | Example |
|-----|-------------|---------|
| `hashbase_secrets` | API keys and tokens (encrypted) | `{ "OPENAI_API_KEY": "sk-..." }` |
| `hashbase_widget_preferences` | Enabled/disabled widgets | `{ "timer-widget": true }` |
| `hashbase-theme` | Light/dark mode | `"dark"` |

### Canvas Management

| Key | Description | Example |
|-----|-------------|---------|
| `hashbase_canvases` | Array of canvas objects | `[{ id, name, createdAt }]` |
| `hashbase_active_canvas` | Currently active canvas ID | `"canvas-1"` |
| `widgetLayout_${canvasId}` | Per-canvas widget layout | See structure below |
| `widgetRowSpans_${canvasId}` | Per-canvas row spans | `{ "widget-id": 2 }` |

### Legacy Keys (Backward Compatibility)

| Key | Description |
|-----|-------------|
| `widgetLayout` | Old single-canvas layout |
| `widgetRowSpans` | Old single-canvas row spans |
| `widgetLayoutConfig` | Old layout configuration |

### Widget-Specific Data

#### AI Chat Widget
- `hashbase_ai_conversations` - All conversation history
- `hashbase_ai_current_conversation` - Current conversation ID and messages
- `hashbase_ai_chat_settings` - Selected provider and model
- `hashbase_ai_llm_settings` - Temperature, max tokens, etc.

#### News Widget
- `news_country` - Selected country code
- `news_category` - Selected news category

#### GitHub Widget
- `github_widget_owner` - Repository owner
- `github_widget_repo` - Repository name

#### Checklist Widget
- `checklistItems` - Array of checklist items
- `checklistSettings` - Checklist preferences

#### Timer Widget
- `timerMode` - Current mode (stopwatch/countdown)
- `stopwatchTime` - Stopwatch elapsed time
- `stopwatchLaps` - Array of lap times
- `countdownInitial` - Countdown initial duration

### Excluded Data

| Key | Reason |
|-----|--------|
| `gmail_tokens` | Managed by OAuth flow in `.env` file |
| `hashbase_storage_settings` | Storage configuration (not user data) |

---

## Encryption

### Overview

Secrets (API keys, tokens) are encrypted using **AES-256-GCM** with a key from your `.env` file.

### Setup

1. **Generate Encryption Key**

```bash
node generate-encryption-key.js
```

2. **Add to `.env`**

```env
VITE_CONFIG_ENCRYPTION_KEY=your_64_character_hex_key_here
```

3. **Restart Dev Server**

```bash
npm run dev
```

### How It Works

#### Encryption Process

```javascript
// 1. Separate secrets from regular data
const secretsData = { hashbase_secrets: {...} };
const regularData = { /* all other data */ };

// 2. Encrypt secrets with AES-256-GCM
const encrypted = await crypto.subtle.encrypt(
  { name: 'AES-GCM', iv: randomIV },
  key,
  JSON.stringify(secretsData)
);

// 3. Store encrypted data in config
config.data.encrypted_secrets = {
  encrypted: base64(encrypted),
  iv: base64(randomIV)
};

// 4. Add regular data unencrypted
Object.assign(config.data, regularData);
```

#### Decryption Process

```javascript
// 1. Check if config is encrypted
if (config.encrypted && config.data.encrypted_secrets) {
  // 2. Decrypt using same key
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64Decode(iv) },
    key,
    base64Decode(encrypted)
  );
  
  // 3. Parse and restore secrets
  const secrets = JSON.parse(decrypted);
  localStorage.setItem('hashbase_secrets', JSON.stringify(secrets));
}
```

### Security Notes

- ⚠️ **Never commit** `.env` file to version control
- ⚠️ **Keep encryption key secure** - losing it means you can't decrypt old configs
- ⚠️ **Same key required** - Import requires the same key used for export
- ✅ **Unencrypted fallback** - If no key configured, secrets stored unencrypted (with warning)

---

## Storage Methods

### 1. Config Download/Upload

**Location:** Settings → Storage Tab → Configuration Backup & Restore

#### Download Config

```javascript
import { downloadConfig } from '@/services/configService';

// Download with default filename
await downloadConfig();
// Creates: hashbase-config-2025-11-04.json

// Download with custom filename
await downloadConfig('my-backup.json');
```

**File Format:** JSON file with all configuration data

**Use Cases:**
- Manual backups before major changes
- Transferring settings to another device
- Sharing configuration with team members
- Version control of dashboard setup

#### Upload Config

```javascript
import { uploadConfig } from '@/services/configService';

const result = await uploadConfig();
// Opens file picker, imports selected config
// Returns: { success, message, imported, errors, encrypted }
```

**Process:**
1. Click "Upload Config" button
2. Select JSON config file
3. System validates and imports data
4. Page refreshes to apply changes

### 2. Folder Sync

**Location:** Settings → Storage Tab → Local Folder Sync

#### Features

- **Auto-Sync** - Automatic periodic synchronization
- **Manual Sync** - On-demand save/load
- **Version History** - Timestamped backup files
- **Encryption** - Optional file encryption

#### Setup

1. **Select Folder**

```javascript
import { requestFolderAccess } from '@/services/storageService';

const dirHandle = await requestFolderAccess();
// Browser shows folder picker
// User must grant read/write permission
```

2. **Configure Auto-Sync**

- **Intervals:** 1m, 5m, 10m, 15m, 30m, 1h, 6h, 1d, 7d, 30d
- **Default:** 30 minutes
- **Toggle:** Enable/disable auto-sync

3. **File Structure**

```
your-selected-folder/
├── hashbase-data.json          # Current data
└── history/                    # Version history (if enabled)
    ├── hashbase-data-2025-11-04T08-52-52.json
    ├── hashbase-data-2025-11-04T09-22-52.json
    └── ...
```

#### API Usage

```javascript
import { 
  syncToFile,      // Save to file
  syncFromFile,    // Load from file
  startAutoSync,   // Start auto-sync
  stopAutoSync     // Stop auto-sync
} from '@/services/storageService';

// Manual sync to file
const result = await syncToFile(folderHandle);
// Returns: { success, message, itemCount }

// Manual sync from file
const result = await syncFromFile(folderHandle);
// Returns: { success, message }

// Start auto-sync (30 minute interval)
startAutoSync(folderHandle, 30, (result) => {
  console.log('Auto-sync completed:', result);
});

// Stop auto-sync
stopAutoSync();
```

#### Version History

**Settings:**
- **Save History:** Toggle on/off
- **Max Versions:** 1-1000 (default: 50)
- **Estimated Size:** ~7.5 KB per version

**Restore from History:**
1. Click "View History"
2. Browse timestamped backups
3. Click "Restore" on desired version
4. Page refreshes with restored data

#### Browser Support

**Supported:**
- ✅ Chrome 86+
- ✅ Edge 86+
- ✅ Opera 72+
- ✅ Other Chromium-based browsers

**Not Supported:**
- ❌ Firefox (File System Access API not available)
- ❌ Safari (File System Access API not available)

**Fallback:** Use Config Download/Upload instead

---

## Local Storage Keys

### Complete Key Reference

```javascript
// Core configuration
'hashbase_secrets'                    // API keys (encrypted in export)
'hashbase_widget_preferences'         // Widget enable/disable
'hashbase-theme'                      // Light/dark mode

// Canvas management
'hashbase_canvases'                   // Array of canvas objects
'hashbase_active_canvas'              // Active canvas ID
'widgetLayout_${canvasId}'            // Per-canvas layout
'widgetRowSpans_${canvasId}'          // Per-canvas row spans

// Legacy (backward compatibility)
'widgetLayout'                        // Old single-canvas layout
'widgetRowSpans'                      // Old single-canvas row spans
'widgetLayoutConfig'                  // Old layout config

// AI Chat widget
'hashbase_ai_conversations'           // All conversations
'hashbase_ai_current_conversation'    // Current conversation
'hashbase_ai_chat_settings'           // Provider/model
'hashbase_ai_llm_settings'            // Temperature, max tokens

// News widget
'news_country'                        // Country code
'news_category'                       // News category

// GitHub widget
'github_widget_owner'                 // Repo owner
'github_widget_repo'                  // Repo name

// Checklist widget
'checklistItems'                      // Items array
'checklistSettings'                   // Settings

// Timer widget
'timerMode'                           // Mode (stopwatch/countdown)
'stopwatchTime'                       // Elapsed time
'stopwatchLaps'                       // Lap times array
'countdownInitial'                    // Initial duration

// Storage settings (not exported)
'hashbase_storage_settings'           // Folder sync config

// OAuth tokens (not exported)
'gmail_tokens'                        // Gmail OAuth tokens
```

### Widget Layout Structure

```javascript
// Per-canvas layout: widgetLayout_${canvasId}
[
  // Column 0
  [
    { id: "widget-1", rowSpan: 2, startRow: 0 },
    { id: "widget-2", rowSpan: 1, startRow: 2 }
  ],
  // Column 1
  [
    { id: "widget-3", rowSpan: 3, startRow: 0 }
  ],
  // Column 2
  []
]
```

**Fields:**
- `id` - Widget identifier
- `rowSpan` - Number of rows widget occupies
- `startRow` - Starting row position (0-indexed)

---

## Multi-Canvas Support

### How It Works

1. **Canvas Discovery**

```javascript
// Export function reads all canvases
const canvases = JSON.parse(localStorage.getItem('hashbase_canvases'));

// For each canvas, export its layout
canvases.forEach(canvas => {
  const layout = localStorage.getItem(`widgetLayout_${canvas.id}`);
  const rowSpans = localStorage.getItem(`widgetRowSpans_${canvas.id}`);
  // Add to export
});
```

2. **Layout Preservation**

Each canvas maintains:
- **Independent layout** - Widgets can be on different canvases
- **Unique keys** - `widgetLayout_canvas-1`, `widgetLayout_canvas-2`, etc.
- **Metadata** - Canvas name, creation time, active state

3. **Import Process**

```javascript
// 1. Restore canvas metadata
localStorage.setItem('hashbase_canvases', JSON.stringify(canvases));
localStorage.setItem('hashbase_active_canvas', activeCanvasId);

// 2. Restore each canvas layout
canvases.forEach(canvas => {
  localStorage.setItem(`widgetLayout_${canvas.id}`, layout);
  localStorage.setItem(`widgetRowSpans_${canvas.id}`, rowSpans);
});

// 3. Reload page to apply
window.location.reload();
```

### Example: 6 Widgets Across 2 Canvases

**Setup:**
- Canvas 1 "Home": Timer, News, AI Chat
- Canvas 2 "Work": GitHub, Checklist, Weather

**Export:**
```json
{
  "hashbase_canvases": [
    { "id": "canvas-1", "name": "Home", "createdAt": 1730707972000 },
    { "id": "canvas-2", "name": "Work", "createdAt": 1730708123000 }
  ],
  "hashbase_active_canvas": "canvas-1",
  "widgetLayout_canvas-1": [
    [{ "id": "timer-widget", "rowSpan": 2, "startRow": 0 }],
    [{ "id": "news-widget", "rowSpan": 3, "startRow": 0 }],
    [{ "id": "ai-chat-widget", "rowSpan": 4, "startRow": 0 }]
  ],
  "widgetLayout_canvas-2": [
    [{ "id": "github-widget", "rowSpan": 2, "startRow": 0 }],
    [{ "id": "checklist-widget", "rowSpan": 3, "startRow": 0 }],
    [{ "id": "weather-widget", "rowSpan": 2, "startRow": 0 }]
  ]
}
```

**Result After Import:**
- ✅ Both canvases recreated
- ✅ All 6 widgets in correct positions
- ✅ Canvas names preserved
- ✅ Active canvas restored
- ✅ Widget settings preserved

---

## Usage Guide

### Basic Workflow

#### 1. Initial Setup

```bash
# Generate encryption key
node generate-encryption-key.js

# Add to .env
echo "VITE_CONFIG_ENCRYPTION_KEY=your_key_here" >> .env

# Restart dev server
npm run dev
```

#### 2. Configure Dashboard

- Add widgets
- Create canvases
- Arrange layout
- Configure widget settings
- Add API keys

#### 3. Create Backup

**Option A: Download Config**
1. Open Settings (gear icon)
2. Go to Storage tab
3. Click "Download Config"
4. Save `hashbase-config-YYYY-MM-DD.json`

**Option B: Setup Folder Sync**
1. Open Settings → Storage tab
2. Click "Select Folder"
3. Choose/create a folder (e.g., `hashbase-sync`)
4. Grant permissions (click "Allow" twice)
5. Enable auto-sync
6. Set sync interval

#### 4. Transfer to New Device

**Using Downloaded Config:**
1. Copy config file to new device
2. Open Hashbase on new device
3. Settings → Storage → Upload Config
4. Select config file
5. Page refreshes with all settings

**Using Folder Sync:**
1. Copy sync folder to new device (or use cloud sync)
2. Open Hashbase on new device
3. Settings → Storage → Select Folder
4. Choose the synced folder
5. Click "Load from File"
6. Page refreshes with all settings

### Advanced Usage

#### Programmatic Export

```javascript
import { exportConfig } from '@/services/configService';

// Get config object
const config = await exportConfig();

// Send to server
await fetch('/api/backup', {
  method: 'POST',
  body: JSON.stringify(config)
});
```

#### Programmatic Import

```javascript
import { importConfig } from '@/services/configService';

// Fetch config from server
const response = await fetch('/api/backup/latest');
const config = await response.json();

// Import config
const result = await importConfig(config);

if (result.success) {
  console.log(`Imported ${result.imported} settings`);
  window.location.reload();
} else {
  console.error(result.message);
}
```

#### Custom Sync Logic

```javascript
import { getAllDashboardData } from '@/services/storageService';

// Get all data
const data = await getAllDashboardData(true); // true = encrypt secrets

// Custom processing
const compressed = compressData(data);

// Save to custom location
await saveToCustomStorage(compressed);
```

---

## API Reference

### configService.js

#### `exportConfig()`

Export all configuration data.

```javascript
const config = await exportConfig();
```

**Returns:** `Promise<Object>`
```javascript
{
  version: "1.0.0",
  exportDate: "2025-11-04T08:52:52.000Z",
  encrypted: true,
  data: { /* all config data */ }
}
```

#### `importConfig(config)`

Import configuration data.

```javascript
const result = await importConfig(config);
```

**Parameters:**
- `config` (Object) - Configuration object to import

**Returns:** `Promise<Object>`
```javascript
{
  success: true,
  message: "Successfully imported 42 settings",
  imported: 42,
  errors: []
}
```

#### `downloadConfig(filename?)`

Download configuration as JSON file.

```javascript
await downloadConfig();                    // Default: hashbase-config-YYYY-MM-DD.json
await downloadConfig('my-backup.json');    // Custom filename
```

**Parameters:**
- `filename` (string, optional) - Custom filename

**Returns:** `Promise<void>`

#### `uploadConfig()`

Upload and import configuration from file picker.

```javascript
const result = await uploadConfig();
```

**Returns:** `Promise<Object>`
```javascript
{
  success: true,
  message: "Successfully imported 42 settings",
  imported: 42,
  errors: [],
  encrypted: true
}
```

#### `getConfigSummary()`

Get summary of current configuration.

```javascript
const summary = getConfigSummary();
```

**Returns:** `Object`
```javascript
{
  secretsCount: 3,
  widgetPrefsCount: 12,
  hasLayout: true,
  aiConversationsCount: 5
}
```

### storageService.js

#### `getStorageSettings()`

Get current storage settings.

```javascript
const settings = getStorageSettings();
```

**Returns:** `Object`
```javascript
{
  mode: 'folder',              // 'browser' or 'folder'
  folderName: 'hashbase-sync',
  lastSync: '2025-11-04T08:52:52.000Z',
  autoSync: true,
  syncInterval: 30,            // minutes
  saveHistory: true,
  encryptData: true,
  maxHistoryVersions: 50
}
```

#### `saveStorageSettings(settings)`

Save storage settings.

```javascript
saveStorageSettings({
  mode: 'folder',
  autoSync: true,
  syncInterval: 60
});
```

#### `requestFolderAccess()`

Request folder access from user.

```javascript
const dirHandle = await requestFolderAccess();
```

**Returns:** `Promise<FileSystemDirectoryHandle>`

**Throws:** Error if user cancels or permission denied

#### `syncToFile(folderHandle)`

Save data to file in folder.

```javascript
const result = await syncToFile(folderHandle);
```

**Returns:** `Promise<Object>`
```javascript
{
  success: true,
  message: "Data synced to file",
  itemCount: 42
}
```

#### `syncFromFile(folderHandle)`

Load data from file in folder.

```javascript
const result = await syncFromFile(folderHandle);
```

**Returns:** `Promise<Object>`
```javascript
{
  success: true,
  message: "Data loaded from file"
}
```

#### `startAutoSync(folderHandle, intervalMinutes, callback)`

Start automatic synchronization.

```javascript
startAutoSync(folderHandle, 30, (result) => {
  console.log('Auto-sync completed:', result);
});
```

**Parameters:**
- `folderHandle` (FileSystemDirectoryHandle) - Folder handle
- `intervalMinutes` (number) - Sync interval in minutes
- `callback` (function, optional) - Called after each sync

#### `stopAutoSync()`

Stop automatic synchronization.

```javascript
stopAutoSync();
```

#### `listHistoryFiles(folderHandle)`

List version history files.

```javascript
const files = await listHistoryFiles(folderHandle);
```

**Returns:** `Promise<Array>`
```javascript
[
  {
    name: "hashbase-data-2025-11-04T08-52-52.json",
    lastModified: Date,
    size: 7542,
    handle: FileSystemFileHandle
  }
]
```

#### `readHistoryFile(fileHandle)`

Read a history file.

```javascript
const data = await readHistoryFile(fileHandle);
```

**Returns:** `Promise<Object>` - Configuration data

---

## Troubleshooting

### Common Issues

#### 1. Encryption Key Not Configured

**Symptom:** Warning in console: "VITE_CONFIG_ENCRYPTION_KEY not configured"

**Solution:**
```bash
node generate-encryption-key.js
# Copy key to .env
npm run dev  # Restart server
```

#### 2. Import Fails - Encryption Key Mismatch

**Symptom:** "Failed to decrypt secrets. Encryption key mismatch?"

**Cause:** Config was encrypted with different key

**Solution:**
- Use same `.env` key on all devices
- Or export new config with current key

#### 3. Folder Access Denied

**Symptom:** "Folder access denied" or "Permission request failed"

**Solution:**
- Choose a regular folder (not system folders)
- Click "Allow" when browser asks for permission
- Avoid Desktop, Documents root, C:\ drive root

#### 4. Auto-Sync Not Working

**Symptom:** Last sync time not updating

**Check:**
```javascript
import { isAutoSyncRunning } from '@/services/storageService';
console.log('Auto-sync running:', isAutoSyncRunning());
```

**Solution:**
- Verify folder still accessible
- Check browser hasn't revoked permissions
- Re-select folder if needed

#### 5. Missing Widget Data After Import

**Symptom:** Widgets appear but settings are default

**Cause:** Widget localStorage keys not in export

**Solution:**
- Check `configService.js` includes widget keys
- Verify widget uses correct localStorage key names
- Re-export config after adding keys

#### 6. Layout Not Preserved

**Symptom:** Widgets in wrong positions after import

**Check:**
- Canvas IDs match: `hashbase_canvases`
- Layout keys exist: `widgetLayout_${canvasId}`
- Active canvas set: `hashbase_active_canvas`

**Solution:**
- Ensure all canvases exported
- Check for layout key naming issues

### Debug Mode

Enable detailed logging:

```javascript
// In browser console
localStorage.setItem('debug_config', 'true');

// Export/import will log detailed info
await downloadConfig();
```

### Validation

Validate config file structure:

```javascript
function validateConfig(config) {
  if (!config.version) return 'Missing version';
  if (!config.data) return 'Missing data';
  if (config.encrypted && !config.data.encrypted_secrets) {
    return 'Marked encrypted but no encrypted_secrets';
  }
  return 'Valid';
}

const config = JSON.parse(configFileContents);
console.log(validateConfig(config));
```

---

## Best Practices

### 1. Regular Backups

- **Before major changes** - Download config before enabling/disabling widgets
- **Weekly backups** - Set up folder sync with auto-sync
- **Version control** - Keep multiple dated backups

### 2. Encryption

- ✅ **Always use encryption** for production
- ✅ **Secure the key** - Never commit `.env` to git
- ✅ **Same key everywhere** - Use same key on all devices
- ✅ **Backup the key** - Store encryption key securely

### 3. Folder Sync

- **Dedicated folder** - Create `hashbase-sync` folder
- **Cloud sync** - Use Dropbox/OneDrive for cross-device sync
- **Reasonable intervals** - 30 minutes to 1 hour for most users
- **Enable history** - Keep 50-100 versions for safety

### 4. Multi-Device Setup

**Option 1: Folder Sync (Recommended)**
1. Setup folder sync on Device A
2. Use cloud storage (Dropbox, OneDrive)
3. On Device B, select same cloud folder
4. Auto-sync keeps both devices in sync

**Option 2: Manual Transfer**
1. Download config on Device A
2. Transfer file to Device B
3. Upload config on Device B
4. Repeat when changes made

### 5. Widget Development

When creating new widgets that use localStorage:

```javascript
// 1. Use consistent naming
const WIDGET_SETTINGS_KEY = 'my_widget_settings';

// 2. Add to configService.js
function getDashboardKeys() {
  const baseKeys = [
    // ... existing keys
    'my_widget_settings',  // Add your key
  ];
}

// 3. Document in widget README
// localStorage keys:
// - my_widget_settings: Widget configuration
```

---

## Migration Guide

### From Single Canvas to Multi-Canvas

Old configs with single canvas are automatically migrated:

```javascript
// Old format
{
  "widgetLayout": [...],
  "widgetRowSpans": {...}
}

// Automatically becomes
{
  "hashbase_canvases": [{ "id": "canvas-1", "name": "Canvas 1" }],
  "hashbase_active_canvas": "canvas-1",
  "widgetLayout_canvas-1": [...],
  "widgetRowSpans_canvas-1": {...}
}
```

### From Unencrypted to Encrypted

1. Export current config (unencrypted)
2. Generate encryption key
3. Add to `.env` and restart
4. Import old config (will be encrypted on next export)
5. Download new encrypted config

---

## Security Considerations

### What's Encrypted

- ✅ API keys (`hashbase_secrets`)
- ✅ OAuth tokens (if included)
- ✅ Any sensitive credentials

### What's NOT Encrypted

- ❌ Widget layouts
- ❌ Canvas names
- ❌ Widget preferences
- ❌ Non-sensitive settings (country, category, etc.)

### Recommendations

1. **Use encryption** - Always configure `VITE_CONFIG_ENCRYPTION_KEY`
2. **Secure storage** - Don't store config files in public locations
3. **Access control** - Limit who can access config files
4. **Key management** - Backup encryption key securely
5. **Regular rotation** - Consider rotating API keys periodically

---

## Performance

### File Sizes

| Data Type | Approximate Size |
|-----------|-----------------|
| Empty config | ~200 bytes |
| Basic setup (5 widgets, 1 canvas) | ~2-3 KB |
| Full setup (15 widgets, 3 canvases) | ~5-10 KB |
| With AI conversations (100 messages) | ~50-100 KB |
| With version history (50 versions) | ~375 KB |

### Optimization Tips

1. **Limit history versions** - 50 is usually sufficient
2. **Clean old conversations** - Archive/delete old AI chats
3. **Compress if needed** - Use gzip for large configs
4. **Selective export** - Export only what you need (future feature)

---

## Future Enhancements

Planned features:

- [ ] Selective export (choose what to include)
- [ ] Cloud backup integration
- [ ] Automatic conflict resolution
- [ ] Config diff/merge tools
- [ ] Import from URL
- [ ] Scheduled backups
- [ ] Compression support
- [ ] Multi-user sync

---

## Related Documentation

- [Development Guide](./DEVELOPMENT_GUIDE.md) - Widget development
- [README](../README.md) - Project overview
- [.env.example](../.env.example) - Environment variables

---

**Last Updated:** 2025-11-04  
**Version:** 1.0.0
