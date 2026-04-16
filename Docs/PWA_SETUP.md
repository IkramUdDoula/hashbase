# PWA Setup Guide

This app is now configured as a Progressive Web App (PWA), allowing users to install it on their devices and use it offline.

## What's Been Added

### 1. Service Worker (`public/sw.js`)
- Caches essential resources for offline use
- Network-first strategy with cache fallback
- Automatic cache updates

### 2. Web App Manifest (`public/manifest.json`)
- Defines app metadata (name, icons, colors)
- Configures standalone display mode
- Sets app orientation and categories

### 3. PWA Utilities (`src/utils/pwa.js`)
- Service worker registration
- Install prompt handling
- PWA detection utilities

### 4. Install Button Component (`src/components/PWAInstallButton.jsx`)
- Optional component to show install prompt
- Automatically hides when app is installed
- Can be added to any page/component

## How to Use

### Basic Setup (Already Done)
The PWA is automatically registered in `src/main.jsx`. No additional setup needed.

### Adding Install Button (Optional)
To add an install button to your app, import and use the component:

```jsx
import { PWAInstallButton } from './components/PWAInstallButton';

function YourComponent() {
  return (
    <div>
      <PWAInstallButton />
      {/* Your other content */}
    </div>
  );
}
```

### Icons Required
You need two icon sizes in the `public` folder:
- `icon-192x192-en.png` (192x192 pixels) ✓ Already exists
- `icon-512x512-en.png` (512x512 pixels) ⚠️ Needs to be created

To create the 512x512 icon:
1. Use your existing 192x192 icon as a base
2. Upscale or recreate it at 512x512 pixels
3. Save as `public/icon-512x512-en.png`

## Testing PWA

### Local Development
1. Build the app: `npm run build`
2. Preview the build: `npm run preview`
3. Open in browser (PWA features only work on HTTPS or localhost)
4. Check DevTools > Application > Service Workers

### Production
1. Deploy to a server with HTTPS
2. Open the app in a browser
3. Look for the install prompt or use the install button
4. Install and test offline functionality

## Browser Support

PWA features are supported in:
- Chrome/Edge (Desktop & Mobile)
- Safari (iOS 11.3+, macOS)
- Firefox (Desktop & Android)
- Samsung Internet

## Customization

### Update Cache Strategy
Edit `public/sw.js` to change caching behavior:
- Network-first (current): Always tries network, falls back to cache
- Cache-first: Serves from cache if available, faster but less fresh
- Stale-while-revalidate: Serves cache immediately, updates in background

### Update App Metadata
Edit `public/manifest.json` to change:
- App name and description
- Theme colors
- Display mode
- Orientation

### Update Cached Resources
Edit the `urlsToCache` array in `public/sw.js` to add/remove cached files.

## Troubleshooting

### Service Worker Not Updating
1. Increment `CACHE_NAME` in `public/sw.js` (e.g., 'hashbase-v2')
2. Clear browser cache
3. Unregister old service worker in DevTools

### Install Prompt Not Showing
- Ensure HTTPS is enabled (or using localhost)
- Check that manifest.json is valid
- Verify all required icons exist
- Some browsers have specific criteria (e.g., user engagement)

### Offline Mode Not Working
- Check that service worker is registered
- Verify cached resources in DevTools > Application > Cache Storage
- Ensure network requests are being intercepted

## Additional Features to Consider

1. **Push Notifications**: Add push notification support for updates
2. **Background Sync**: Sync data when connection is restored
3. **Offline Page**: Create a custom offline fallback page
4. **Update Notifications**: Notify users when new version is available
5. **Share Target**: Allow sharing content to your app

## Resources

- [MDN PWA Guide](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web.dev PWA](https://web.dev/progressive-web-apps/)
- [PWA Builder](https://www.pwabuilder.com/)
