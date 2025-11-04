import React, { useMemo, useEffect } from 'react';
import { SiGmail, SiNetlify, SiGithub, SiPosthog } from 'react-icons/si';
import { Sparkles, Newspaper, CheckSquare, Timer, AlertTriangle, ClipboardList } from 'lucide-react';
import { UnreadEmailWidgetV2 } from './components/widgets/Gmail/UnreadEmailWidgetV2';
import { DeploymentWidgetV2 } from './components/widgets/Netlify/DeploymentWidgetV2';
import { AIChatWidget } from './components/widgets/AI/AIChatWidget';
import { GitHubCommitsWidget, GitHubIssuesWidget } from './components/widgets/GitHub';
import { NewsWidgetV2 } from './components/widgets/News/NewsWidgetV2';
import { BD24LiveWidgetV2 } from './components/widgets/BD24Live/BD24LiveWidgetV2';
import { ChecklistWidget } from './components/widgets/Checklist/ChecklistWidget';
import { TimerWidget } from './components/widgets/Timer/TimerWidget';
import { PostHogErrorsWidget, PostHogSurveysWidget } from './components/widgets/PostHog';
import { LandingPage } from './components/LandingPage';
import { SettingsButton } from './components/SettingsButton';
import { Canvas } from './components/Canvas';
import { ScreenSizeGuard } from './components/ScreenSizeGuard';
import { ToastProvider, useToast } from './components/ui/toast';
import { CanvasProvider } from './contexts/CanvasContext';
import { isWidgetEnabled, setWidgetPreferences } from './services/widgetRegistry';

function AppContent() {
  const { addToast } = useToast();
  
  // Check if we should show the landing page
  const isProduction = import.meta.env.VITE_ENV === 'prod';
  
  // If production mode, show landing page
  if (isProduction) {
    return <LandingPage />;
  }

  // Define all available widgets with metadata
  const allWidgets = [
    { 
      id: 'gmail-unread', 
      component: UnreadEmailWidgetV2, 
      rowSpan: 2,
      name: 'Gmail Unread',
      description: 'View your latest unread emails from Gmail with OAuth2 authentication',
      icon: SiGmail
    },
    { 
      id: 'netlify-deploys', 
      component: DeploymentWidgetV2, 
      rowSpan: 2,
      name: 'Netlify Deploys',
      description: 'Monitor your Netlify deployment status with real-time updates',
      icon: SiNetlify
    },
    { 
      id: 'ai-chat', 
      component: AIChatWidget, 
      rowSpan: 2,
      name: 'AI Chat',
      description: 'Chat with AI assistants (OpenAI GPT-4)',
      icon: Sparkles
    },
    { 
      id: 'github-commits', 
      component: GitHubCommitsWidget, 
      rowSpan: 2,
      name: 'GitHub Commits',
      description: 'View recent commits from your GitHub repositories with advanced features',
      icon: SiGithub
    },
    { 
      id: 'github-issues', 
      component: GitHubIssuesWidget, 
      rowSpan: 2,
      name: 'GitHub Issues',
      description: 'View and create issues from your GitHub repositories with realtime updates',
      icon: SiGithub
    },
    { 
      id: 'news-headlines', 
      component: NewsWidgetV2, 
      rowSpan: 2,
      name: 'News Headlines',
      description: 'Latest news from around the world with country and topic filtering',
      icon: Newspaper
    },
    { 
      id: 'bd24live-news', 
      component: BD24LiveWidgetV2, 
      rowSpan: 2,
      name: 'BD24 Live',
      description: 'Latest news from BD24 Live (Bangladesh) via RSS feed - Auto-refreshes every 30 minutes',
      icon: Newspaper
    },
    { 
      id: 'checklist', 
      component: ChecklistWidget, 
      rowSpan: 2,
      name: 'Checklist',
      description: 'Simple checklist with automatic reordering - checked items move to bottom',
      icon: CheckSquare
    },
    { 
      id: 'timer', 
      component: TimerWidget, 
      rowSpan: 2,
      name: 'Timer',
      description: 'Stopwatch with lap system and countdown timer with notifications',
      icon: Timer
    },
    { 
      id: 'posthog-errors', 
      component: PostHogErrorsWidget, 
      rowSpan: 2,
      name: 'PostHog Error Tracking',
      description: 'Monitor and track errors from PostHog error tracking with real-time updates',
      icon: SiPosthog
    },
    { 
      id: 'posthog-surveys', 
      component: PostHogSurveysWidget, 
      rowSpan: 2,
      name: 'PostHog Surveys',
      description: 'Manage and view PostHog surveys with response statistics and controls',
      icon: ClipboardList
    },
  ];

  // Set default widget preferences and layout - MUST run before first render
  // This is why we use useMemo instead of useEffect to ensure synchronous execution
  useMemo(() => {
    const hasPreferences = localStorage.getItem('hashbase_widget_preferences');
    const layoutVersion = localStorage.getItem('hashbase_layout_version');
    
    // Migration: Reset layout if version doesn't match
    if (layoutVersion !== '2.0') {
      localStorage.removeItem('widgetLayout');
      localStorage.removeItem('widgetRowSpans');
      localStorage.setItem('hashbase_layout_version', '2.0');
    }
    
    if (!hasPreferences) {
      // First time user - enable News and Checklist widgets
      const defaultPreferences = {
        'news-headlines': true,
        'gmail-unread': false,
        'netlify-deploys': false,
        'ai-chat': false,
        'github-commits': false,
        'github-issues': false,
        'bd24live-news': false,
        'checklist': true,
        'timer': false,
        'posthog-errors': false,
        'posthog-surveys': false
      };
      setWidgetPreferences(defaultPreferences);
    }
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
    return allWidgets.filter(widget => isWidgetEnabled(widget.id));
  }, [allWidgets]);

  return (
    <ScreenSizeGuard>
      <div className="h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:bg-[#000000] dark:from-black dark:via-black dark:to-black p-4 transition-colors duration-200">
        {/* Canvas with drag-and-drop widget rearrangement - fills remaining space */}
        <div className="w-full h-full">
          <Canvas widgets={enabledWidgets} />
        </div>

        {/* Floating Settings Button with Canvas Navigator (Right) */}
        <SettingsButton availableWidgets={allWidgets} />
      </div>
    </ScreenSizeGuard>
  );
}

function App() {
  return (
    <ToastProvider>
      <CanvasProvider>
        <AppContent />
      </CanvasProvider>
    </ToastProvider>
  );
}

export default App;
