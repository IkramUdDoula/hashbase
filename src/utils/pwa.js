// PWA Service Worker Registration
export const registerServiceWorker = () => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('SW registered:', registration);
          
          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60000); // Check every minute
        })
        .catch((error) => {
          console.log('SW registration failed:', error);
        });
    });
  }
};

// PWA Install Prompt Handler
export const setupInstallPrompt = () => {
  let deferredPrompt;

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the mini-infobar from appearing on mobile
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    
    // Dispatch custom event that components can listen to
    window.dispatchEvent(new CustomEvent('pwa-install-available', { 
      detail: { prompt: deferredPrompt } 
    }));
  });

  window.addEventListener('appinstalled', () => {
    console.log('PWA was installed');
    deferredPrompt = null;
  });

  return {
    showInstallPrompt: async () => {
      if (!deferredPrompt) {
        return false;
      }
      
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User response to install prompt: ${outcome}`);
      deferredPrompt = null;
      return outcome === 'accepted';
    }
  };
};

// Check if app is running as PWA
export const isPWA = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
};
