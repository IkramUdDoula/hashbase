import React from 'react';
import { 
  Explorer, 
  ExplorerHeader, 
  ExplorerBody, 
  ExplorerSection,
  ExplorerField 
} from '@/components/ui/explorer';
import { Badge } from '@/components/ui/badge';
import { 
  ExternalLink,
  Calendar,
  Clock,
  FileText
} from 'lucide-react';
import { formatRelativeDate } from '@/lib/dateUtils';

/**
 * BD24LiveExplorer - Detailed article viewer for BD24 Live news
 * 
 * Displays full article information with:
 * - Article title and image
 * - Publication date
 * - Full description/content
 * - Action: Open in BD24 Live
 * 
 * @param {Object} props
 * @param {boolean} props.open - Controls visibility
 * @param {function} props.onOpenChange - Callback when open state changes
 * @param {string} props.articleId - Current article ID to display
 * @param {Array} props.articleList - List of all articles for navigation
 * @param {function} props.onArticleChange - Callback when navigating to different article
 */
export function BD24LiveExplorer({ 
  open, 
  onOpenChange, 
  articleId,
  articleList = [],
  onArticleChange
}) {
  // Find current article from the list
  const currentIndex = articleList.findIndex(a => a.id === articleId);
  const article = articleList[currentIndex] || null;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < articleList.length - 1;

  const handlePrevious = () => {
    if (hasPrevious) {
      const prevArticle = articleList[currentIndex - 1];
      onArticleChange(prevArticle.id);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      const nextArticle = articleList[currentIndex + 1];
      onArticleChange(nextArticle.id);
    }
  };

  const handleOpenInBD24Live = () => {
    if (article?.url) {
      window.open(article.url, '_blank');
    }
  };

  // Keyboard navigation
  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e) => {
      if (e.key === 'ArrowLeft' && hasPrevious) {
        e.preventDefault();
        handlePrevious();
      } else if (e.key === 'ArrowRight' && hasNext) {
        e.preventDefault();
        handleNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, hasPrevious, hasNext]);

  return (
    <Explorer
      open={open}
      onOpenChange={onOpenChange}
      title="BD24 Live"
      showNavigation={articleList.length > 1}
      onPrevious={handlePrevious}
      onNext={handleNext}
      hasPrevious={hasPrevious}
      hasNext={hasNext}
      buttons={article ? [
        {
          label: 'Open in BD24 Live',
          icon: ExternalLink,
          onClick: handleOpenInBD24Live,
          variant: 'outline'
        }
      ] : []}
    >
      {!article ? (
        <div className="flex flex-col items-center justify-center h-64 text-center p-4">
          <FileText className="h-12 w-12 text-gray-400 mb-2" />
          <p className="text-sm text-gray-600 dark:text-gray-400">Article not found</p>
        </div>
      ) : (
        <>
          {/* Article Header Info */}
          <ExplorerHeader>
            <div className="space-y-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                {article.title}
              </h3>
              <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 flex-wrap">
                {article.publishedAt && (
                  <>
                    <Calendar className="h-3 w-3" />
                    <span>{formatRelativeDate(article.publishedAt)}</span>
                  </>
                )}
              </div>
              
              {/* Article Image */}
              {article.image && (
                <div className="w-full rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800">
                  <img 
                    src={article.image} 
                    alt={article.title}
                    className="w-full h-auto object-cover"
                    loading="lazy"
                    onError={(e) => {
                      e.target.parentElement.style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>
          </ExplorerHeader>

          <ExplorerBody>
            {/* Description/Content */}
            {article.description && (
              <ExplorerSection>
                <div className="text-base text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words leading-relaxed">
                  {article.description}
                </div>
              </ExplorerSection>
            )}

            {/* Publication Time */}
            {article.publishedAt && (
              <ExplorerSection title="Publication Details">
                <ExplorerField label="Published">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-400 flex-shrink-0" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {new Date(article.publishedAt).toLocaleString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </ExplorerField>
              </ExplorerSection>
            )}

            {/* Note about BD24 Live */}
            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                💡 <strong>Note:</strong> Click "Open in BD24 Live" below to read the full article on the BD24 Live website.
              </p>
            </div>
          </ExplorerBody>
        </>
      )}
    </Explorer>
  );
}
