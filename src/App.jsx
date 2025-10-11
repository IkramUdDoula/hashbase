import React from 'react';
import { UnreadEmailWidget } from './components/widgets/Gmail/UnreadEmailWidget';
import { DeploymentWidget } from './components/widgets/Netlify/DeploymentWidget';
import { TestSizingWidget } from './components/widgets/RnD/TestSizingWidget';
import { SettingsButton } from './components/SettingsButton';
import { Canvas } from './components/Canvas';

function App() {
  // Array of widgets to display - easily add more widgets here
  // rowSpan: 1-4 (number of rows the widget occupies in a column)
  // The widget size determines how many cards are shown (without scrolling):
  // 1 row = 1 card, 2 rows = 3 cards, 3 rows = 5 cards, 4 rows = 7 cards
  const widgets = [
    { id: 'gmail-unread', component: UnreadEmailWidget, rowSpan: 2 },
    { id: 'netlify-deploys', component: DeploymentWidget, rowSpan: 3 },
    { id: 'rnd-sizing-test', component: TestSizingWidget, rowSpan: 2 },
    // Add more widgets here in the future:
    // { id: 'github-prs', component: GitHubPRWidget, rowSpan: 2 },
  ];

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 dark:bg-[#000000] dark:from-black dark:via-black dark:to-black p-8 transition-colors duration-200">
      {/* Canvas with drag-and-drop widget rearrangement */}
      <Canvas widgets={widgets} />

      {/* Floating Settings Button */}
      <SettingsButton />
    </div>
  );
}

export default App;
