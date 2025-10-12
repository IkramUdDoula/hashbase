import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollbarStyles } from '@/components/ui/scrollbar-styles';

/**
 * Reusable modal component for widgets
 * Matches the LLM Settings modal design and behavior
 * 
 * @param {Object} props
 * @param {boolean} props.open - Whether the modal is open
 * @param {function} props.onOpenChange - Callback when modal open state changes
 * @param {string} props.title - Modal title
 * @param {string} props.description - Optional description text
 * @param {React.ReactNode} props.icon - Optional icon component (Lucide icon)
 * @param {React.ReactNode} props.children - Modal content
 * @param {React.ReactNode} props.footer - Optional custom footer content
 * @param {string} props.maxWidth - Max width class (default: 'max-w-md')
 * @param {boolean} props.showScrollbar - Whether to show custom scrollbar (default: true)
 */
export function WidgetModal({
  open,
  onOpenChange,
  title,
  description,
  icon: Icon,
  children,
  footer,
  maxWidth = 'max-w-md',
  showScrollbar = true,
}) {
  const modalRef = useRef(null);

  // Handle clicking outside the modal
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (modalRef.current && !modalRef.current.contains(event.target)) {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open, onOpenChange]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape' && open) {
        onOpenChange(false);
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div 
        ref={modalRef} 
        className={`bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[90vh] flex flex-col border-2 border-gray-200 dark:border-gray-800`}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-5 w-5 text-gray-700 dark:text-gray-300" />}
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">{title}</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="rounded-full"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className={`flex-1 overflow-y-auto p-6 ${showScrollbar ? 'custom-scrollbar' : ''}`}>
          {showScrollbar && <ScrollbarStyles />}
          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              {description}
            </p>
          )}
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-800">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Pre-configured footer with Cancel and Save buttons
 * 
 * @param {Object} props
 * @param {function} props.onCancel - Cancel button callback
 * @param {function} props.onSave - Save button callback
 * @param {string} props.cancelText - Cancel button text (default: 'Cancel')
 * @param {string} props.saveText - Save button text (default: 'Save Changes')
 * @param {boolean} props.saveDisabled - Whether save button is disabled
 */
export function WidgetModalFooter({
  onCancel,
  onSave,
  cancelText = 'Cancel',
  saveText = 'Save Changes',
  saveDisabled = false,
}) {
  return (
    <div className="flex gap-2">
      <button
        onClick={onCancel}
        className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
      >
        {cancelText}
      </button>
      <Button
        onClick={onSave}
        className="flex-1"
        disabled={saveDisabled}
      >
        {saveText}
      </Button>
    </div>
  );
}
