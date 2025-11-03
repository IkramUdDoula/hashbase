import * as React from "react"
import { ChevronLeft, ChevronRight, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

/**
 * Explorer Component - Side sheet for detailed content viewing
 * 
 * Opens from the right with a backdrop overlay to show detailed content
 * of widget items (e.g., email details, task details, etc.)
 * 
 * Features:
 * - Navigation between items (prev/next)
 * - Wizard/App name display
 * - Close button
 * - Dynamic content body
 * - Backdrop overlay
 * - Custom footer buttons
 * 
 * @param {Object} props
 * @param {boolean} props.open - Controls visibility
 * @param {function} props.onOpenChange - Callback when open state changes
 * @param {string} props.title - Explorer title (e.g., "Gmail")
 * @param {boolean} props.showNavigation - Show prev/next navigation buttons
 * @param {function} props.onPrevious - Previous item handler
 * @param {function} props.onNext - Next item handler
 * @param {boolean} props.hasPrevious - Whether previous item exists
 * @param {boolean} props.hasNext - Whether next item exists
 * @param {Array} props.buttons - Optional array of button configs for footer
 * @param {React.ReactNode} props.children - Explorer body content
 * @param {string} props.className - Additional CSS classes
 */
const Explorer = ({ 
  open, 
  onOpenChange, 
  title,
  showNavigation = true,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  buttons = [],
  children,
  className 
}) => {
  React.useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [open])

  if (!open) return null

  return (
    <>
      {/* Backdrop Overlay */}
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm animate-in fade-in-0"
        onClick={() => onOpenChange(false)}
      />
      
      {/* Explorer Sheet */}
      <div
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-full sm:w-[600px] bg-white dark:bg-gray-900 shadow-2xl",
          "flex flex-col",
          "animate-in slide-in-from-right duration-300",
          className
        )}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center gap-2">
            {/* Navigation Buttons */}
            {showNavigation && (
              <div className="flex items-center gap-1 mr-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onPrevious}
                  disabled={!hasPrevious}
                  title="Previous item"
                  className="h-8 w-8"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onNext}
                  disabled={!hasNext}
                  title="Next item"
                  className="h-8 w-8"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
            
            {/* Title */}
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h2>
          </div>
          
          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            title="Close"
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Body - Dynamic Content Zone - Scrollable with custom scrollbar */}
        <div className="flex-1 overflow-y-auto min-h-0 explorer-scrollbar">
          {children}
        </div>
        
        {/* Auto-render footer if buttons are provided */}
        {buttons && buttons.length > 0 && (
          <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
            <div className="flex gap-2">
              {buttons.map((button, index) => {
                const Icon = button.icon;
                return (
                  <Button
                    key={index}
                    onClick={button.onClick}
                    variant={button.variant || "outline"}
                    size={button.size || "sm"}
                    className={cn(
                      "flex-1 bg-transparent border-white/30 hover:bg-white/10 hover:border-white dark:border-white/30 dark:hover:bg-white/10 dark:hover:border-white",
                      button.className
                    )}
                  >
                    {Icon && <Icon className="h-4 w-4 mr-2" />}
                    {button.label}
                  </Button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

/**
 * ExplorerHeader - Optional header section for explorer body
 */
const ExplorerHeader = ({ className, children, ...props }) => (
  <div
    className={cn(
      "px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/30",
      className
    )}
    {...props}
  >
    {children}
  </div>
)

/**
 * ExplorerBody - Main content section
 */
const ExplorerBody = ({ className, children, ...props }) => (
  <div
    className={cn("px-4 py-4", className)}
    {...props}
  >
    {children}
  </div>
)

/**
 * ExplorerFooter - Sticky footer section for actions
 */
const ExplorerFooter = ({ className, children, ...props }) => (
  <div
    className={cn(
      "flex-shrink-0 px-4 py-3 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900",
      className
    )}
    {...props}
  >
    {children}
  </div>
)

/**
 * ExplorerSection - Reusable section component for organizing content
 */
const ExplorerSection = ({ title, className, children, ...props }) => (
  <div className={cn("mb-4", className)} {...props}>
    {title && (
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
        {title}
      </h3>
    )}
    {children}
  </div>
)

/**
 * ExplorerField - Label-value pair for displaying information
 */
const ExplorerField = ({ label, value, className, children, ...props }) => (
  <div className={cn("mb-3", className)} {...props}>
    <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
      {label}
    </label>
    <div className="mt-1 text-sm text-gray-900 dark:text-gray-100">
      {children || value}
    </div>
  </div>
)

export { 
  Explorer, 
  ExplorerHeader, 
  ExplorerBody, 
  ExplorerFooter, 
  ExplorerSection,
  ExplorerField 
}
