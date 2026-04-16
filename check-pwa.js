// PWA Setup Verification Script
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking PWA Setup...\n');

const checks = {
  manifest: false,
  serviceWorker: false,
  icons192: false,
  icons512: false,
  offline: false,
  htmlManifest: false,
  mainJsRegistration: false
};

// Check manifest.json
const manifestPath = path.join(__dirname, 'public', 'manifest.json');
if (fs.existsSync(manifestPath)) {
  checks.manifest = true;
  console.log('✅ manifest.json exists');
  
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  console.log(`   - App name: ${manifest.name}`);
  console.log(`   - Icons: ${manifest.icons.length} defined`);
} else {
  console.log('❌ manifest.json not found');
}

// Check service worker
const swPath = path.join(__dirname, 'public', 'sw.js');
if (fs.existsSync(swPath)) {
  checks.serviceWorker = true;
  console.log('✅ sw.js exists');
} else {
  console.log('❌ sw.js not found');
}

// Check icons
const icon192Path = path.join(__dirname, 'public', 'icon-192x192-en.png');
if (fs.existsSync(icon192Path)) {
  checks.icons192 = true;
  console.log('✅ 192x192 icon exists');
} else {
  console.log('❌ 192x192 icon not found');
}

const icon512Path = path.join(__dirname, 'public', 'image.png');
if (fs.existsSync(icon512Path)) {
  checks.icons512 = true;
  console.log('✅ 512x512 icon exists');
} else {
  console.log('❌ 512x512 icon not found');
}

// Check offline page
const offlinePath = path.join(__dirname, 'public', 'offline.html');
if (fs.existsSync(offlinePath)) {
  checks.offline = true;
  console.log('✅ offline.html exists');
} else {
  console.log('❌ offline.html not found');
}

// Check index.html for manifest link
const indexPath = path.join(__dirname, 'index.html');
if (fs.existsSync(indexPath)) {
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  if (indexContent.includes('manifest.json')) {
    checks.htmlManifest = true;
    console.log('✅ index.html links to manifest');
  } else {
    console.log('❌ index.html missing manifest link');
  }
}

// Check main.jsx for service worker registration
const mainJsPath = path.join(__dirname, 'src', 'main.jsx');
if (fs.existsSync(mainJsPath)) {
  const mainContent = fs.readFileSync(mainJsPath, 'utf8');
  if (mainContent.includes('registerServiceWorker')) {
    checks.mainJsRegistration = true;
    console.log('✅ main.jsx registers service worker');
  } else {
    console.log('❌ main.jsx missing service worker registration');
  }
}

// Summary
console.log('\n📊 Summary:');
const passed = Object.values(checks).filter(Boolean).length;
const total = Object.keys(checks).length;
console.log(`${passed}/${total} checks passed`);

if (passed === total) {
  console.log('\n🎉 Your PWA is ready! Build and deploy to test.');
  console.log('\nNext steps:');
  console.log('1. Run: npm run build');
  console.log('2. Run: npm run preview');
  console.log('3. Open in browser and check DevTools > Application > Service Workers');
} else {
  console.log('\n⚠️  Some checks failed. Review the output above.');
}
