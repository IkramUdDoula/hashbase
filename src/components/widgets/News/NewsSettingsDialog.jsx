import React, { useState, useEffect } from 'react';
import { Newspaper } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { NEWS_COUNTRIES, NEWS_CATEGORIES } from '@/services/newsService';
import { WidgetModal, WidgetModalFooter } from '@/components/ui/widget-modal';

export function NewsSettingsDialog({ open, onOpenChange, currentCountry, currentCategory, onSave }) {
  const [selectedCountry, setSelectedCountry] = useState(currentCountry);
  const [selectedCategory, setSelectedCategory] = useState(currentCategory);

  // Update state when props change
  useEffect(() => {
    if (open) {
      setSelectedCountry(currentCountry);
      setSelectedCategory(currentCategory);
    }
  }, [open, currentCountry, currentCategory]);

  const handleSave = () => {
    onSave(selectedCountry, selectedCategory);
  };

  const handleCancel = () => {
    // Reset to current values
    setSelectedCountry(currentCountry);
    setSelectedCategory(currentCategory);
    onOpenChange(false);
  };

  return (
    <WidgetModal
      open={open}
      onOpenChange={onOpenChange}
      title="News Widget Settings"
      description="Configure your news feed preferences. Choose a country and topic to see relevant headlines."
      icon={Newspaper}
      footer={
        <WidgetModalFooter
          onCancel={handleCancel}
          onSave={handleSave}
        />
      }
    >
      <div className="space-y-4">
        {/* Country Selection */}
        <div className="space-y-2">
          <Label htmlFor="country" className="text-sm font-medium">
            Country
          </Label>
          <select
            id="country"
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 custom-scrollbar"
          >
            {NEWS_COUNTRIES.map((country) => (
              <option key={country.code} value={country.code}>
                {country.name}
              </option>
            ))}
          </select>
        </div>

        {/* Category Selection */}
        <div className="space-y-2">
          <Label htmlFor="category" className="text-sm font-medium">
            Topic
          </Label>
          <select
            id="category"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:focus:ring-gray-600 custom-scrollbar"
          >
            {NEWS_CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </WidgetModal>
  );
}
