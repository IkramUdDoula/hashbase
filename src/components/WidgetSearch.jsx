import React from 'react';
import { Input } from '@/components/ui/input';
import { Search, X } from 'lucide-react';

/**
 * Reusable search component for widgets
 * 
 * @param {Object} props
 * @param {string} props.value - Current search query
 * @param {function} props.onChange - Callback when search value changes
 * @param {string} props.placeholder - Placeholder text (default: "Search...")
 * @param {string} props.className - Additional CSS classes
 */
export function WidgetSearch({ 
  value, 
  onChange, 
  placeholder = "Search...",
  className = "" 
}) {
  const handleClear = () => {
    onChange('');
  };

  return (
    <div className={`relative mb-1.5 ${className}`}>
      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pl-7 pr-7 h-8 text-sm rounded-lg border-gray-300 dark:border-gray-700 bg-transparent"
      />
      {value && (
        <button
          onClick={handleClear}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          aria-label="Clear search"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
