import React, { useMemo, useEffect } from 'react';
import { SiGmail, SiNetlify, SiGithub } from 'react-icons/si';
import { TestTube, Sparkles } from 'lucide-react';
import { UnreadEmailWidget } from './components/widgets/Gmail/UnreadEmailWidget';
import { DeploymentWidget } from './components/widgets/Netlify/DeploymentWidget';
import { TestSizingWidget } from './components/widgets/RnD/TestSizingWidget';
import { AIChatWidget } from './components/widgets/AI/AIChatWidget';
import { CommitLogWidget } from './components/widgets/GitHub/CommitLogWidget';
import { SettingsButton } from './components/SettingsButton';
import { Canvas } from './components/Canvas';
import { ScreenSizeGuard } from './components/ScreenSizeGuard';
import { ToastProvider, useToast } from './components/ui/toast';
import { isWidgetEnabled, ensureWidgetsEnabled } from './services/widgetRegistry';

function AppContent() {
  const { addToast } = useToast();

  // Define all available widgets with metadata
  // rowSpan: 1-4 (number of rows the widget occupies in a column)
  // The widget size determines how many cards are shown (without scrolling):
  // 1 row = 1 card, 2 rows = 3 cards, 3 rows = 5 cards, 4 rows = 7 cards
  const allWidgets = [
    { 
      id: 'gmail-unread', 
      component: UnreadEmailWidget, 
      rowSpan: 2,
      name: 'Gmail Unread',
      description: 'View your latest unread emails from Gmail',
      icon: SiGmail
    },
    { 
      id: 'netlify-deploys', 
      component: DeploymentWidget, 
      rowSpan: 3,
      name: 'Netlify Deploys',
      description: 'Monitor your Netlify deployment status',
      icon: SiNetlify
    },
    { 
      id: 'rnd-sizing-test', 
      component: TestSizingWidget, 
      rowSpan: 2,
      name: 'Test Widget (R&D)',
      description: 'Test widget for sizing and layout experiments',
      icon: TestTube
    },
    { 
      id: 'ai-chat', 
      component: AIChatWidget, 
      rowSpan: 3,
      name: 'AI Chat',
      description: 'Chat with AI assistants (OpenAI GPT-4 & Claude)',
      icon: Sparkles
    },
    { 
      id: 'github-commits', 
      component: CommitLogWidget, 
      rowSpan: 3,
      name: 'GitHub Commits',
      description: 'View recent commits from your GitHub repository',
      icon: SiGithub
    },
  ];

  // Ensure all widgets are enabled by default on first load
  useEffect(() => {
    console.log('🔧 All widgets defined:', allWidgets.map(w => ({ id: w.id, name: w.name })));
    const widgetIds = allWidgets.map(w => w.id);
    console.log('🔧 Ensuring widgets enabled:', widgetIds);
    ensureWidgetsEnabled(widgetIds);
  }, []);

  // Check for auth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const authStatus = params.get('auth');
    
    if (authStatus === 'success') {
      addToast('Gmail authentication successful!', 'success');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (authStatus === 'error') {
      const message = params.get('message') || 'Authentication failed';
      addToast(`Gmail authentication failed: ${message}`, 'error');
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [addToast]);

  // Filter widgets based on user preferences
  const enabledWidgets = useMemo(() => {
    console.log('🔍 Filtering widgets...');
    const filtered = allWidgets.filter(widget => {
      const enabled = isWidgetEnabled(widget.id);
      console.log(`  - ${widget.id} (${widget.name}): ${enabled ? '✅ ENABLED' : '❌ DISABLED'}`);
      return enabled;
    });
    console.log('✅ Enabled widgets count:', filtered.length, filtered.map(w => w.id));
    return filtered;
  }, [allWidgets]);

  return (
    <ScreenSizeGuard>
      <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:bg-[#000000] dark:from-black dark:via-black dark:to-black p-4 transition-colors duration-200">
        {/* Canvas with drag-and-drop widget rearrangement */}
        <Canvas widgets={enabledWidgets} />

        {/* Floating Settings Button */}
        <SettingsButton availableWidgets={allWidgets} />
      </div>
    </ScreenSizeGuard>
  );
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  );
}

export default App;
