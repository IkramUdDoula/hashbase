import React from 'react';
import { GmailWidget } from './components/widgets/GmailWidget';
import { SettingsButton } from './components/SettingsButton';

function App() {
  // Array of widgets to display - easily add more widgets here
  const widgets = [
    { id: 'gmail', component: GmailWidget },
    // Add more widgets here in the future:
    // { id: 'github', component: GitHubWidget },
    // { id: 'netlify', component: NetlifyWidget },
  ];

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:bg-[#000000] dark:from-black dark:via-black dark:to-black p-4 transition-colors duration-200">
      {/* Canvas container with grid layout for multiple widgets */}
      <div className="w-full h-screen flex items-start justify-start gap-4 flex-wrap">
        {widgets.map(({ id, component: WidgetComponent }) => (
          <div key={id} className="w-[20%] min-w-[320px] max-w-[480px]">
            <WidgetComponent />
          </div>
        ))}
      </div>

      {/* Floating Settings Button */}
      <SettingsButton />
    </div>
  );
}

export default App;
