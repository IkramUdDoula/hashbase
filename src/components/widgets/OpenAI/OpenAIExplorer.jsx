import React from 'react';
import { 
  Explorer, 
  ExplorerHeader, 
  ExplorerBody, 
  ExplorerSection,
  ExplorerField 
} from '@/components/ui/explorer';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  RefreshCw,
  TrendingUp,
  DollarSign,
  Zap,
  Activity,
  Calendar,
  BarChart3,
  PieChart
} from 'lucide-react';
import { formatCurrency, formatNumber } from '@/services/openaiService';

export function OpenAIExplorer({ 
  open, 
  onOpenChange, 
  data,
  settings,
  onRefresh
}) {
  if (!data || !data.usage) {
    return (
      <Explorer
        open={open}
        onOpenChange={onOpenChange}
        title="OpenAI Usage Details"
        showNavigation={false}
      >
        <div className="flex flex-col items-center justify-center h-64">
          <p className="text-sm text-gray-600 dark:text-gray-400">No data available</p>
        </div>
      </Explorer>
    );
  }

  const { usage, costs } = data;
  
  const totalCost = costs?.totalCost || 0;

  // Get top models by token usage
  const topModels = Object.entries(usage.modelBreakdown || {})
    .sort((a, b) => b[1].totalTokens - a[1].totalTokens)
    .slice(0, 5);

  return (
    <Explorer
      open={open}
      onOpenChange={onOpenChange}
      title="OpenAI Usage Details"
      showNavigation={false}
      buttons={[
        {
          label: 'Refresh Data',
          icon: RefreshCw,
          onClick: onRefresh,
          variant: 'outline'
        }
      ]}
    >
      <ExplorerHeader>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          Usage Statistics
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Last 30 days of OpenAI API usage
        </p>
      </ExplorerHeader>

      <ExplorerBody>
        {/* Summary Section */}
        <ExplorerSection title="Summary">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-xs font-medium text-blue-700 dark:text-blue-300">Total Tokens</span>
              </div>
              <p className="text-xl font-bold text-blue-900 dark:text-blue-100">
                {formatNumber(usage.totalTokens)}
              </p>
            </div>
            
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="h-4 w-4 text-green-600 dark:text-green-400" />
                <span className="text-xs font-medium text-green-700 dark:text-green-300">Total Cost</span>
              </div>
              <p className="text-xl font-bold text-green-900 dark:text-green-100">
                {formatCurrency(totalCost)}
              </p>
            </div>
            
            <div className="p-3 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-2 mb-1">
                <Activity className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                <span className="text-xs font-medium text-orange-700 dark:text-orange-300">API Requests</span>
              </div>
              <p className="text-xl font-bold text-orange-900 dark:text-orange-100">
                {formatNumber(usage.summary?.requests || 0)}
              </p>
            </div>
          </div>
        </ExplorerSection>

        {/* Token Breakdown */}
        <ExplorerSection title="Token Breakdown">
          <div className="space-y-2">
            <ExplorerField 
              label="Prompt Tokens" 
              value={formatNumber(usage.summary?.promptTokens || 0)} 
            />
            <ExplorerField 
              label="Completion Tokens" 
              value={formatNumber(usage.summary?.completionTokens || 0)} 
            />
            <ExplorerField 
              label="Total Tokens" 
              value={formatNumber(usage.summary?.totalTokens || 0)} 
            />
          </div>
        </ExplorerSection>

        {/* Model Breakdown */}
        {settings.showCostBreakdown && topModels.length > 0 && (
          <ExplorerSection title="Usage by Model">
            <div className="space-y-3">
              {topModels.map(([model, stats]) => (
                <div 
                  key={model}
                  className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-gray-100 truncate">
                        {model}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {formatNumber(stats.requests)} requests
                      </p>
                    </div>
                    <Badge variant="secondary" className="ml-2">
                      {formatNumber(stats.totalTokens)} tokens
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">
                      Prompt: {formatNumber(stats.promptTokens)} | Completion: {formatNumber(stats.completionTokens)}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300 font-mono">
                      {((stats.totalTokens / usage.totalTokens) * 100).toFixed(1)}% of total
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ExplorerSection>
        )}

        {/* Daily Usage */}
        {settings.showUsageChart && usage.dailyUsage && usage.dailyUsage.length > 0 && (
          <ExplorerSection title="Daily Usage (Last 30 Days)">
            <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
              {usage.dailyUsage.map((day, index) => {
                const dayCost = costs?.dailyCosts?.find(c => c.date === day.date)?.cost || 0;
                return (
                  <div 
                    key={index}
                    className="p-3 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {new Date(day.date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </span>
                      </div>
                      <Badge variant="secondary">
                        {formatCurrency(dayCost)}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 dark:text-gray-400">
                        {formatNumber(day.totalTokens)} tokens
                      </span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {day.requests} requests
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </ExplorerSection>
        )}

        {/* Admin Key Notice */}
        <ExplorerSection title="Note">
          <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <p className="text-xs text-blue-800 dark:text-blue-200 mb-2">
              <strong>Admin API Key Required:</strong> Usage and cost data requires an Admin API key from your OpenAI organization.
            </p>
            <a
              href="https://platform.openai.com/settings/organization/admin-keys"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-blue-700 dark:text-blue-300 hover:text-blue-900 dark:hover:text-blue-100 transition-colors"
            >
              <span>Get Admin API Key</span>
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          </div>
        </ExplorerSection>

        {/* Last Updated */}
        <ExplorerSection>
          <div className="text-center">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Last updated: {new Date(data.lastUpdated).toLocaleString()}
            </p>
          </div>
        </ExplorerSection>
      </ExplorerBody>
    </Explorer>
  );
}
