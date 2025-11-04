import React, { useState, useEffect } from 'react';
import { 
  Explorer, 
  ExplorerHeader, 
  ExplorerBody,
  ExplorerFooter,
  ExplorerSection,
  ExplorerField 
} from '@/components/ui/explorer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Archive, ArchiveRestore, Loader2 } from 'lucide-react';
import { formatRelativeDate } from '@/lib/dateUtils';
import { 
  fetchSurveyDetails,
  fetchSurveyResponses,
  getSurveyStatus,
  updateSurvey
} from '@/services/posthogService';

export function PostHogSurveysExplorer({ 
  open, 
  onOpenChange, 
  surveyId,
  surveyList = [],
  onSurveyChange,
  projectUrl,
  projectId,
  onUpdate
}) {
  const currentIndex = surveyList.findIndex(s => s.id === surveyId);
  const survey = surveyList[currentIndex] || null;
  const hasPrevious = currentIndex > 0;
  const hasNext = currentIndex < surveyList.length - 1;
  
  const [detailedSurvey, setDetailedSurvey] = useState(null);
  const [responses, setResponses] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  useEffect(() => {
    async function loadDetails() {
      if (!survey || !projectId || !open) {
        setDetailedSurvey(null);
        setResponses(null);
        return;
      }
      
      setLoading(true);
      try {
        const [details, responsesData] = await Promise.all([
          fetchSurveyDetails(projectId, survey.id),
          fetchSurveyResponses(projectId, survey.id, 100)
        ]);
        setDetailedSurvey(details);
        setResponses(responsesData);
      } catch (err) {
        console.error('Failed to load survey details:', err);
      } finally {
        setLoading(false);
      }
    }
    
    loadDetails();
  }, [survey?.id, projectId, open]);

  const handlePrevious = () => {
    if (hasPrevious) {
      onSurveyChange(surveyList[currentIndex - 1].id);
    }
  };

  const handleNext = () => {
    if (hasNext) {
      onSurveyChange(surveyList[currentIndex + 1].id);
    }
  };

  const handleOpenExternal = () => {
    if (projectUrl && projectId && survey) {
      let url = projectUrl;
      if (!url.startsWith('http://') && !url.startsWith('https://')) {
        url = `https://${url}`;
      }
      url = url.replace(/\/$/, '');
      window.open(`${url}/project/${projectId}/surveys/${survey.id}`, '_blank');
    }
  };

  const handleCopyId = () => {
    if (survey) {
      navigator.clipboard.writeText(survey.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleToggleArchive = async () => {
    if (!survey || !projectId) return;
    
    setUpdating(true);
    try {
      await updateSurvey(projectId, survey.id, {
        archived: !survey.archived
      });
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error('Failed to update survey:', err);
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status) => {
    const colors = {
      running: 'bg-green-100 hover:bg-green-200 text-green-800 dark:bg-green-900/30 hover:dark:bg-green-900/50 dark:text-green-300',
      draft: 'bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900/30 hover:dark:bg-blue-900/50 dark:text-blue-300',
      completed: 'bg-gray-100 hover:bg-gray-200 text-gray-800 dark:bg-gray-900/30 hover:dark:bg-gray-900/50 dark:text-gray-300',
      archived: 'bg-gray-200 hover:bg-gray-300 text-gray-600 dark:bg-gray-800/50 hover:dark:bg-gray-800/60 dark:text-gray-400'
    };
    
    return (
      <Badge className={`text-xs ${colors[status] || colors.draft}`}>
        {status}
      </Badge>
    );
  };

  const displaySurvey = detailedSurvey || survey;

  return (
    <Explorer
      open={open}
      onOpenChange={onOpenChange}
      title="PostHog"
      showNavigation={surveyList.length > 1}
      onPrevious={handlePrevious}
      onNext={handleNext}
      hasPrevious={hasPrevious}
      hasNext={hasNext}
    >
      {!displaySurvey ? (
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-sm text-gray-600">Survey not found</p>
        </div>
      ) : (
        <>
          <ExplorerHeader>
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {displaySurvey.name}
                  </h3>
                  {getStatusBadge(getSurveyStatus(displaySurvey))}
                  {displaySurvey.type && (
                    <Badge variant="outline" className="text-xs">
                      {displaySurvey.type}
                    </Badge>
                  )}
                </div>
                {displaySurvey.description && (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                    {displaySurvey.description}
                  </p>
                )}
              </div>
            </div>
          </ExplorerHeader>

          <ExplorerBody>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Loading details...</span>
              </div>
            ) : (
              <>
                <ExplorerSection title="Survey Details">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                          <td className="py-2.5 pr-4 text-gray-600 dark:text-gray-400 font-medium w-32">Created</td>
                          <td className="py-2.5 text-gray-900 dark:text-gray-100">
                            {formatRelativeDate(displaySurvey.created_at)}
                          </td>
                        </tr>
                        
                        {displaySurvey.created_by && (
                          <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                            <td className="py-2.5 pr-4 text-gray-600 dark:text-gray-400 font-medium">Created By</td>
                            <td className="py-2.5 text-gray-900 dark:text-gray-100">
                              {displaySurvey.created_by.first_name} {displaySurvey.created_by.last_name}
                              {displaySurvey.created_by.email && ` (${displaySurvey.created_by.email})`}
                            </td>
                          </tr>
                        )}

                        {displaySurvey.start_date && (
                          <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                            <td className="py-2.5 pr-4 text-gray-600 dark:text-gray-400 font-medium">Started</td>
                            <td className="py-2.5 text-gray-900 dark:text-gray-100">
                              {formatRelativeDate(displaySurvey.start_date)}
                            </td>
                          </tr>
                        )}

                        {displaySurvey.end_date && (
                          <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                            <td className="py-2.5 pr-4 text-gray-600 dark:text-gray-400 font-medium">Ends</td>
                            <td className="py-2.5 text-gray-900 dark:text-gray-100">
                              {formatRelativeDate(displaySurvey.end_date)}
                            </td>
                          </tr>
                        )}

                        {displaySurvey.responses_limit && (
                          <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/30">
                            <td className="py-2.5 pr-4 text-gray-600 dark:text-gray-400 font-medium">Response Limit</td>
                            <td className="py-2.5 text-gray-900 dark:text-gray-100">
                              {displaySurvey.responses_limit}
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </ExplorerSection>

                {displaySurvey.questions && displaySurvey.questions.length > 0 && (
                  <ExplorerSection title="Questions">
                    <div className="space-y-3">
                      {displaySurvey.questions.map((question, index) => (
                        <div
                          key={question.id || index}
                          className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/30"
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                              Question {index + 1}
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {question.type}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-700 dark:text-gray-300">
                            {question.question}
                          </p>
                          {question.description && (
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
                              {question.description}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </ExplorerSection>
                )}

                {displaySurvey.linked_flag && (
                  <ExplorerSection title="Feature Flags">
                    <div className="space-y-2">
                      {displaySurvey.linked_flag && (
                        <ExplorerField 
                          label="Linked Flag" 
                          value={displaySurvey.linked_flag.name || displaySurvey.linked_flag.key} 
                        />
                      )}
                      {displaySurvey.targeting_flag && (
                        <ExplorerField 
                          label="Targeting Flag" 
                          value={displaySurvey.targeting_flag.name || displaySurvey.targeting_flag.key} 
                        />
                      )}
                    </div>
                  </ExplorerSection>
                )}

                <ExplorerSection title="Statistics">
                  <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">Survey Received by</p>
                    <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                      {responses?.count || 0}
                    </p>
                  </div>
                </ExplorerSection>

              </>
            )}
          </ExplorerBody>

          {/* Actions Footer - Sticky at bottom */}
          <ExplorerFooter>
            <div className="flex gap-2">
              <Button
                onClick={handleOpenExternal}
                variant="outline"
                size="sm"
                className="flex-1 bg-transparent border-white/30 hover:bg-white/10 hover:border-white dark:border-white/30 dark:hover:bg-white/10 dark:hover:border-white"
              >
                <ExternalLink className="h-4 w-4 mr-2" />
                Open in PostHog
              </Button>
              <Button
                onClick={handleToggleArchive}
                variant="outline"
                size="sm"
                disabled={updating}
                className="flex-1 bg-transparent border-white/30 hover:bg-white/10 hover:border-white dark:border-white/30 dark:hover:bg-white/10 dark:hover:border-white"
              >
                {survey?.archived ? (
                  <>
                    <ArchiveRestore className="h-4 w-4 mr-2" />
                    Unarchive
                  </>
                ) : (
                  <>
                    <Archive className="h-4 w-4 mr-2" />
                    Archive
                  </>
                )}
              </Button>
            </div>
          </ExplorerFooter>
        </>
      )}
    </Explorer>
  );
}
