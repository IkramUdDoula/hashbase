import React, { useState, useEffect } from 'react';
import { Download } from 'lucide-react';
import { Button } from './ui/button';
import { isPWA } from '../utils/pwa';

export const PWAInstallButton = () => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    setIsInstalled(isPWA());

    // Listen for install prompt
    const handleInstallPrompt = (e) => {
      setInstallPrompt(e.detail.prompt);
    };

    window.addEventListener('pwa-install-available', handleInstallPrompt);

    // Listen for app installed
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('pwa-install-available', handleInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPrompt) return;

    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    }
    
    setInstallPrompt(null);
  };

  // Don't show button if already installed or prompt not available
  if (isInstalled || !installPrompt) {
    return null;
  }

  return (
    <Button
      onClick={handleInstallClick}
      variant="outline"
      size="sm"
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      Install App
    </Button>
  );
};
