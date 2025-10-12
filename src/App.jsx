import React, { useMemo, useEffect } from 'react';
import { SiGmail, SiNetlify, SiGithub } from 'react-icons/si';
import { TestTube, Sparkles, Newspaper } from 'lucide-react';
import { UnreadEmailWidgetV2 } from './components/widgets/Gmail/UnreadEmailWidgetV2';
import { DeploymentWidgetV2 } from './components/widgets/Netlify/DeploymentWidgetV2';
import { AIChatWidget } from './components/widgets/AI/AIChatWidget';
import { GitHubCommitsWidget } from './components/widgets/GitHub/GitHubCommitsWidget';
import { NewsWidgetV2 } from './components/widgets/News/NewsWidgetV2';
import { BD24LiveWidgetV2 } from './components/widgets/BD24Live/BD24LiveWidgetV2';
import { DemoWidget } from './components/widgets/Demo/DemoWidget';
import { SettingsButton } from './components/SettingsButton';
import { Canvas } from './components/Canvas';
import { ScreenSizeGuard } from './components/ScreenSizeGuard';
import { ToastProvider, useToast } from './components/ui/toast';
import { isWidgetEnabled, ensureWidgetsEnabled } from './services/widgetRegistry';

function AppContent() {
  const { addToast } = useToast();

  // Define all available widgets with metadata
  // rowSpan: 1 (all widgets now occupy 1 row for uniform layout)
  const allWidgets = [
    { 
      id: 'demo-widget', 
      component: DemoWidget, 
      rowSpan: 1,
      name: 'Demo Widget',
      description: 'Comprehensive demonstration of BaseWidgetV2 features - All states, settings modal, search, and more',
      icon: TestTube
    },
    { 
      id: 'gmail-unread', 
      component: UnreadEmailWidgetV2, 
      rowSpan: 1,
      name: 'Gmail Unread',
      description: 'View your latest unread emails from Gmail with OAuth2 authentication',
      icon: SiGmail
    },
    { 
      id: 'netlify-deploys', 
      component: DeploymentWidgetV2, 
      rowSpan: 1,
      name: 'Netlify Deploys',
      description: 'Monitor your Netlify deployment status with real-time updates',
      icon: SiNetlify
    },
    { 
      id: 'ai-chat', 
      component: AIChatWidget, 
      rowSpan: 1,
      name: 'AI Chat',
      description: 'Chat with AI assistants (OpenAI GPT-4 & Claude)',
      icon: Sparkles
    },
    { 
      id: 'github-commits', 
      component: GitHubCommitsWidget, 
      rowSpan: 1,
      name: 'GitHub Commits',
      description: 'View recent commits from your GitHub repositories with advanced features',
      icon: SiGithub
    },
    { 
      id: 'news-headlines', 
      component: NewsWidgetV2, 
      rowSpan: 1,
      name: 'News Headlines',
      description: 'Latest news from around the world with country and topic filtering',
      icon: Newspaper
    },
    { 
      id: 'bd24live-news', 
      component: BD24LiveWidgetV2, 
      rowSpan: 1,
      name: 'BD24 Live',
      description: 'Latest news from BD24 Live (Bangladesh) via RSS feed - Auto-refreshes every 30 minutes',
      icon: Newspaper
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
