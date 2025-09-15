/**
 * Automations List Component
 * Displays list of discovered automations with filtering and search
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  BarChart3,
  Bot,
  AlertTriangle,
  Grid3x3,
  List,
  SortAsc,
  SortDesc
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import AutomationCard from './AutomationCard';
import AutomationDetailsModal from './AutomationDetailsModal';
import { 
  AutomationDiscovery, 
  PlatformType, 
  RiskLevel, 
  AutomationStatus 
} from '@/types/api';
import { 
  useAutomations,
  useAutomationsActions,
  useAutomationsLoading,
  useAutomationsFilters,
  useAutomationsSorting,
  useAutomationsStats,
  useFilteredAutomations
} from '@/stores/automations';
import { useUIActions } from '@/stores/ui';
import { cn } from '@/lib/utils';

type ViewMode = 'grid' | 'list';

interface AutomationsListProps {
  connectionId?: string;
  showPlatformFilter?: boolean;
  showHeader?: boolean;
  maxItems?: number;
  viewMode?: ViewMode;
  className?: string;
}

export const AutomationsList: React.FC<AutomationsListProps> = ({
  connectionId,
  showPlatformFilter = true,
  showHeader = true,
  maxItems,
  viewMode: initialViewMode = 'grid',
  className,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAutomation, setSelectedAutomation] = useState<AutomationDiscovery | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  
  // Store state
  const automations = useAutomations();
  const filteredAutomations = useFilteredAutomations();
  const isLoading = useAutomationsLoading();
  const filters = useAutomationsFilters();
  const sorting = useAutomationsSorting();
  const stats = useAutomationsStats();
  
  // Actions
  const {
    fetchAutomations,
    fetchAutomationStats,
    setFilters,
    setSearch,
    setSorting,
    selectAutomation
  } = useAutomationsActions();
  const { showError, showSuccess, openModal } = useUIActions();

  // Load data on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        await Promise.all([
          fetchAutomations(),
          fetchAutomationStats()
        ]);
      } catch (error) {
        showError('Failed to load automations data');
      }
    };

    loadData();
  }, [fetchAutomations, fetchAutomationStats, showError]);

  // Update search filter
  useEffect(() => {
    setSearch(searchQuery);
  }, [searchQuery, setSearch]);

  // Filter automations by connection if specified
  const displayAutomations = connectionId 
    ? filteredAutomations.filter(auto => 
        // TODO: Add connectionId field to automations
        true // For now, show all
      )
    : filteredAutomations;

  // Apply max items limit
  const finalAutomations = maxItems 
    ? displayAutomations.slice(0, maxItems)
    : displayAutomations;

  const handleRefresh = async () => {
    try {
      showSuccess('Refreshing automations...', 'Sync');
      await Promise.all([
        fetchAutomations(),
        fetchAutomationStats()
      ]);
      showSuccess('Automations refreshed', 'Sync Complete');
    } catch (error) {
      showError('Failed to refresh automations');
    }
  };

  const handleViewDetails = (automation: AutomationDiscovery) => {
    selectAutomation(automation);
    setSelectedAutomation(automation);
    setIsDetailsModalOpen(true);
  };

  const handleToggleStatus = (automationId: string) => {
    // TODO: Implement status toggle
    showError('Status toggle functionality coming soon');
  };

  const handleFilterChange = (key: string, value: any) => {
    setFilters({ [key]: value });
  };

  const handleSortChange = (sortBy: typeof sorting.sortBy) => {
    const sortOrder = sorting.sortBy === sortBy && sorting.sortOrder === 'ASC' ? 'DESC' : 'ASC';
    setSorting(sortBy, sortOrder);
  };

  const handleAssessRisk = async (automationId: string) => {
    try {
      showSuccess('Assessing automation risk...', 'Risk Assessment');
      
      // Call the risk assessment API endpoint
      const response = await fetch(`/api/automations/${automationId}/assess-risk`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('access_token')}`,
        },
      });

      if (response.ok) {
        showSuccess('Risk assessment completed', 'Assessment Complete');
        await fetchAutomations(); // Refresh the automations list
      } else {
        throw new Error('Risk assessment failed');
      }
    } catch (error) {
      console.error('Risk assessment error:', error);
      showError('Failed to assess automation risk');
    }
  };

  const handleCloseDetailsModal = () => {
    setIsDetailsModalOpen(false);
    setSelectedAutomation(null);
  };

  const riskCounts = {
    low: filteredAutomations.filter(a => a.riskLevel === 'low').length,
    medium: filteredAutomations.filter(a => a.riskLevel === 'medium').length,
    high: filteredAutomations.filter(a => a.riskLevel === 'high').length,
  };

  const statusCounts = {
    active: filteredAutomations.filter(a => a.status === 'active').length,
    inactive: filteredAutomations.filter(a => a.status === 'inactive').length,
    error: filteredAutomations.filter(a => a.status === 'error').length,
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      {showHeader && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-foreground">Discovered Automations</h2>
              <p className="text-sm text-muted-foreground">
                {filteredAutomations.length} automation{filteredAutomations.length !== 1 ? 's' : ''} found
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
                className="border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                Refresh
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={() => showError('Bulk actions coming soon')}
                className="border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Analyze
              </Button>
            </div>
          </div>

          {/* Stats Summary */}
          {stats && (
            <div className="grid gap-4 md:grid-cols-4">
              <div className="bg-card border rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <Bot className="h-5 w-5 text-blue-500" />
                  <p className="text-sm font-medium text-muted-foreground">Total</p>
                </div>
                <p className="text-2xl font-bold text-foreground mt-2">
                  {stats.totalAutomations}
                </p>
              </div>

              <div className="bg-card border rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  <p className="text-sm font-medium text-muted-foreground">High Risk</p>
                </div>
                <p className="text-2xl font-bold text-foreground mt-2">
                  {riskCounts.high}
                </p>
              </div>

              <div className="bg-card border rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 bg-green-500 rounded-full" />
                  <p className="text-sm font-medium text-muted-foreground">Active</p>
                </div>
                <p className="text-2xl font-bold text-foreground mt-2">
                  {statusCounts.active}
                </p>
              </div>

              <div className="bg-card border rounded-lg p-4">
                <div className="flex items-center space-x-2">
                  <div className="w-5 h-5 bg-red-500 rounded-full" />
                  <p className="text-sm font-medium text-muted-foreground">Errors</p>
                </div>
                <p className="text-2xl font-bold text-foreground mt-2">
                  {statusCounts.error}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search automations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-2 flex-wrap gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          
          {/* Platform Filter */}
          {showPlatformFilter && (
            <select
              value={filters.platform || ''}
              onChange={(e) => handleFilterChange('platform', e.target.value || undefined)}
              className="px-3 py-2 border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">All Platforms</option>
              <option value="slack">Slack</option>
              <option value="google">Google</option>
              <option value="microsoft">Microsoft</option>
              <option value="hubspot">HubSpot</option>
            </select>
          )}

          {/* Risk Level Filter */}
          <select
            value={filters.riskLevel || ''}
            onChange={(e) => handleFilterChange('riskLevel', e.target.value || undefined)}
            className="px-3 py-2 border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Risk Levels</option>
            <option value="high">High Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="low">Low Risk</option>
          </select>

          {/* Status Filter */}
          <select
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
            className="px-3 py-2 border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="error">Error</option>
          </select>

          {/* Type Filter */}
          <select
            value={filters.type || ''}
            onChange={(e) => handleFilterChange('type', e.target.value || undefined)}
            className="px-3 py-2 border rounded-md bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Types</option>
            <option value="bot">Bots</option>
            <option value="workflow">Workflows</option>
            <option value="integration">Integrations</option>
            <option value="webhook">Webhooks</option>
          </select>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center space-x-1 bg-muted rounded-md p-1">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Sort Controls */}
      <div className="flex items-center space-x-4 text-sm">
        <span className="text-muted-foreground">Sort by:</span>
        
        {['name', 'type', 'riskLevel', 'lastTriggered'].map((sortKey) => (
          <Button
            key={sortKey}
            variant="ghost"
            size="sm"
            onClick={() => handleSortChange(sortKey as typeof sorting.sortBy)}
            className={cn(
              "h-8 px-2",
              sorting.sortBy === sortKey && "bg-accent text-accent-foreground"
            )}
          >
            <span className="capitalize">{sortKey.replace(/([A-Z])/g, ' $1')}</span>
            {sorting.sortBy === sortKey && (
              sorting.sortOrder === 'ASC' ? 
                <SortAsc className="h-3 w-3 ml-1" /> : 
                <SortDesc className="h-3 w-3 ml-1" />
            )}
          </Button>
        ))}
      </div>

      {/* Automations Grid/List */}
      {finalAutomations.length > 0 ? (
        <div className={cn(
          viewMode === 'grid' 
            ? "grid gap-6 md:grid-cols-2 xl:grid-cols-3"
            : "space-y-4"
        )}>
          {finalAutomations.map((automation) => (
            <AutomationCard
              key={automation.id}
              automation={automation}
              onViewDetails={handleViewDetails}
              onToggleStatus={handleToggleStatus}
              showPlatform={showPlatformFilter}
              compact={viewMode === 'list'}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 space-y-4">
          <div className="mx-auto w-16 h-16 bg-muted rounded-full flex items-center justify-center">
            <Bot className="h-8 w-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-xl font-semibold text-foreground">No automations found</h3>
            <p className="text-muted-foreground mt-2 max-w-md mx-auto">
              {automations.length === 0 
                ? "Connect platforms and run discovery scans to find automations."
                : "Try adjusting your search or filter criteria."
              }
            </p>
          </div>
          {automations.length === 0 && (
            <Button onClick={() => window.location.href = '/connections'} className="bg-blue-600 text-white hover:bg-blue-700">
              Connect Platforms
            </Button>
          )}
        </div>
      )}

      {/* Show more link for limited view */}
      {maxItems && displayAutomations.length > maxItems && (
        <div className="text-center pt-4">
          <Button
            variant="outline"
            onClick={() => window.location.href = '/automations'}
            className="border-gray-300 hover:bg-gray-50 dark:border-gray-600 dark:hover:bg-gray-800"
          >
            View all {displayAutomations.length} automations
          </Button>
        </div>
      )}

      {/* Loading State */}
      {isLoading && automations.length === 0 && (
        <div className="text-center py-12">
          <RefreshCw className="h-8 w-8 text-muted-foreground animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-medium text-foreground">Loading automations...</h3>
          <p className="text-muted-foreground">Please wait while we fetch your automation data.</p>
        </div>
      )}

      {/* Automation Details Modal */}
      {selectedAutomation && (
        <AutomationDetailsModal
          automation={selectedAutomation}
          isOpen={isDetailsModalOpen}
          onClose={handleCloseDetailsModal}
          onAssessRisk={handleAssessRisk}
        />
      )}
    </div>
  );
};

export default AutomationsList;