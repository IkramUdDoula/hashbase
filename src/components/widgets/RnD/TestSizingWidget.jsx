import React from 'react';
import { BaseWidget } from '@/components/BaseWidget';
import { FlaskConical } from 'lucide-react';

export function TestSizingWidget({ rowSpan = 1 }) {
  // Generate 10 dummy cards
  const dummyCards = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    title: `Test Card ${i + 1}`,
    description: `This is dummy card number ${i + 1} for testing sizing behavior`
  }));

  return (
    <BaseWidget
      icon={FlaskConical}
      title="R&D Sizing Test"
      description="Testing vertical sizing with 10 dummy cards"
      rowSpan={rowSpan}
    >
      {/* Scrollable container for cards */}
      <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar pr-1">
        {dummyCards.map((card) => (
          <div
            key={card.id}
            className="p-4 rounded-lg bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border border-purple-200 dark:border-purple-800 hover:shadow-md transition-shadow"
          >
            <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-1">
              {card.title}
            </h3>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              {card.description}
            </p>
          </div>
        ))}
      </div>
    </BaseWidget>
  );
}
