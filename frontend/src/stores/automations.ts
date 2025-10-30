/**
 * Automations Store using Zustand
 * Manages automation discovery, analysis, and real-time updates
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
  AutomationDiscovery, 
  DiscoveryResult, 
  PlatformType, 
  RiskLevel,
  AutomationStatus,
  DiscoveryProgress 
} from '@/types/api';
import { automationsApi } from '@/services/api';

interface AutomationsState {
  // Discovery results by connection
  discoveries: Record<string, DiscoveryResult>;

  // Flattened list of all automations for easy access
  automations: AutomationDiscovery[];

  // Vendor grouped automations
  vendorGroups: Array<{
    vendorName: string;
    platform: PlatformType;
    applicationCount: number;
    highestRiskLevel: RiskLevel;
    lastSeen: string;
    applications: AutomationDiscovery[];
  }>;

  // Vendor grouping toggle state
  groupByVendor: boolean;

  // Discovery progress tracking
  discoveryProgress: Record<string, DiscoveryProgress>;

  // Selected automation for details view
  selectedAutomation: AutomationDiscovery | null;

  // Loading and error states
  isDiscovering: boolean;
  isAnalyzing: boolean;
  error: string | null;

  // Filters and search
  filters: {
    platform?: PlatformType;
    riskLevel?: RiskLevel;
    status?: AutomationStatus;
    type?: string;
    search?: string;
  };

  // Pagination for automations list
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };

  // Sort options
  sorting: {
    sortBy: 'name' | 'type' | 'riskLevel' | 'lastTriggered' | 'createdAt';
    sortOrder: 'ASC' | 'DESC';
  };

  // Statistics
  stats: {
    totalAutomations: number;
    byPlatform: Record<PlatformType, number>;
    byRiskLevel: Record<RiskLevel, number>;
    byStatus: Record<AutomationStatus, number>;
    byType: Record<string, number>;
    averageRiskScore?: number;
  } | null;
}

interface AutomationsActions {
  // Discovery operations
  startDiscovery: (connectionId: string) => Promise<boolean>;
  getDiscoveryResult: (connectionId: string) => Promise<DiscoveryResult | null>;
  refreshDiscovery: (connectionId: string) => Promise<boolean>;

  // Automation management
  fetchAutomations: (filters?: Partial<AutomationsState['filters']>) => Promise<boolean>;
  fetchAutomationStats: () => Promise<boolean>;

  // Vendor grouping
  setGroupByVendor: (enabled: boolean) => void;

  // Real-time updates
  updateDiscoveryProgress: (connectionId: string, progress: DiscoveryProgress) => void;
  updateDiscoveryResult: (connectionId: string, result: DiscoveryResult) => void;
  addAutomation: (automation: AutomationDiscovery) => void;
  updateAutomation: (automationId: string, updates: Partial<AutomationDiscovery>) => void;
  removeAutomation: (automationId: string) => void;

  // Selection and filtering
  selectAutomation: (automation: AutomationDiscovery | null) => void;
  setFilters: (filters: Partial<AutomationsState['filters']>) => void;
  clearFilters: () => void;
  setSearch: (search: string) => void;

  // Pagination and sorting
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  setSorting: (sortBy: AutomationsState['sorting']['sortBy'], sortOrder: AutomationsState['sorting']['sortOrder']) => void;

  // State management
  setDiscovering: (isDiscovering: boolean) => void;
  setAnalyzing: (isAnalyzing: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

type AutomationsStore = AutomationsState & AutomationsActions;

// Load persisted groupBy state from localStorage
const loadGroupByVendor = (): boolean => {
  try {
    const stored = localStorage.getItem('automations:groupByVendor');
    return stored ? JSON.parse(stored) : false;
  } catch {
    return false;
  }
};

const initialState: AutomationsState = {
  discoveries: {},
  automations: [],
  vendorGroups: [],
  groupByVendor: loadGroupByVendor(),
  discoveryProgress: {},
  selectedAutomation: null,
  isDiscovering: false,
  isAnalyzing: false,
  error: null,
  filters: {},
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },
  sorting: {
    sortBy: 'name',
    sortOrder: 'ASC',
  },
  stats: null,
};

export const useAutomationsStore = create<AutomationsStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Discovery operations
    startDiscovery: async (connectionId: string) => {
      set({ 
        isDiscovering: true, 
        error: null,
        discoveryProgress: {
          ...get().discoveryProgress,
          [connectionId]: {
            connectionId,
            stage: 'started',
            progress: 0,
            message: 'Initiating discovery...',
          },
        },
      });
      
      try {
        const response = await automationsApi.startDiscovery(connectionId);
        
        if (response.success && response.discovery) {
          get().updateDiscoveryResult(connectionId, response.discovery);
          
          set({
            isDiscovering: false,
            error: null,
          });
          return true;
        } else {
          set({
            isDiscovering: false,
            error: 'Failed to start discovery',
          });
          return false;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Discovery failed';
        set({
          isDiscovering: false,
          error: errorMessage,
        });
        return false;
      }
    },

    getDiscoveryResult: async (connectionId: string) => {
      try {
        const response = await automationsApi.getDiscoveryResult(connectionId);
        
        if (response.success && response.discovery) {
          get().updateDiscoveryResult(connectionId, response.discovery);
          return response.discovery;
        }
        return null;
      } catch (error) {
        console.error('Failed to fetch discovery result:', error);
        return null;
      }
    },

    refreshDiscovery: async (connectionId: string) => {
      set({ isDiscovering: true, error: null });
      
      try {
        const response = await automationsApi.refreshDiscovery(connectionId);
        
        if (response.success && response.discovery) {
          get().updateDiscoveryResult(connectionId, response.discovery);
          
          set({
            isDiscovering: false,
            error: null,
          });
          return true;
        } else {
          set({
            isDiscovering: false,
            error: 'Failed to refresh discovery',
          });
          return false;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to refresh discovery';
        set({
          isDiscovering: false,
          error: errorMessage,
        });
        return false;
      }
    },

    // Automation management
    fetchAutomations: async (filters) => {
      set({ isAnalyzing: true, error: null });

      try {
        const { pagination, sorting, groupByVendor } = get();
        const queryFilters = { ...get().filters, ...filters };

        const response = await automationsApi.getAutomations({
          ...queryFilters,
          page: pagination.page,
          limit: pagination.limit,
          sort_by: sorting.sortBy,
          sort_order: sorting.sortOrder,
          ...(groupByVendor && { groupBy: 'vendor' }),
        });

        if (response.success) {
          const paginationData = response.pagination as { total?: number; totalPages?: number } | undefined;

          if (groupByVendor && response.vendorGroups) {
            // Update vendor groups
            set({
              vendorGroups: response.vendorGroups,
              pagination: {
                ...pagination,
                total: paginationData?.total || 0,
                totalPages: paginationData?.totalPages || 0,
              },
              isAnalyzing: false,
              error: null,
            });
          } else if (response.automations) {
            // Update regular automations list
            set({
              automations: response.automations,
              pagination: {
                ...pagination,
                total: paginationData?.total || 0,
                totalPages: paginationData?.totalPages || 0,
              },
              isAnalyzing: false,
              error: null,
            });
          }
          return true;
        } else {
          set({
            isAnalyzing: false,
            error: 'Failed to fetch automations',
          });
          return false;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch automations';
        set({
          isAnalyzing: false,
          error: errorMessage,
        });
        return false;
      }
    },

    fetchAutomationStats: async () => {
      try {
        const response = await automationsApi.getAutomationStats();

        if (response.success && response.data) {
          set({
            stats: response.data as AutomationsState['stats'],
          });
          return true;
        }
        return false;
      } catch (error) {
        console.error('Failed to fetch automation stats:', error);
        return false;
      }
    },

    // Real-time updates
    updateDiscoveryProgress: (connectionId: string, progress: DiscoveryProgress) => {
      set(state => ({
        discoveryProgress: {
          ...state.discoveryProgress,
          [connectionId]: progress,
        },
      }));
    },

    updateDiscoveryResult: (connectionId: string, result: DiscoveryResult) => {
      set(state => ({
        discoveries: {
          ...state.discoveries,
          [connectionId]: result,
        },
        // Add new automations to the flattened list
        automations: [
          ...state.automations.filter(auto => !result.automations.find(newAuto => newAuto.id === auto.id)),
          ...result.automations,
        ],
      }));
    },

    addAutomation: (automation: AutomationDiscovery) => {
      set(state => ({
        automations: [automation, ...state.automations],
        pagination: {
          ...state.pagination,
          total: state.pagination.total + 1,
        },
      }));
    },

    updateAutomation: (automationId: string, updates: Partial<AutomationDiscovery>) => {
      set(state => ({
        automations: state.automations.map(auto => 
          auto.id === automationId 
            ? { ...auto, ...updates }
            : auto
        ),
      }));
    },

    removeAutomation: (automationId: string) => {
      set(state => ({
        automations: state.automations.filter(auto => auto.id !== automationId),
        selectedAutomation: state.selectedAutomation?.id === automationId ? null : state.selectedAutomation,
        pagination: {
          ...state.pagination,
          total: Math.max(0, state.pagination.total - 1),
        },
      }));
    },

    // Selection and filtering
    selectAutomation: (automation: AutomationDiscovery | null) => {
      set({ selectedAutomation: automation });
    },

    setFilters: (newFilters: Partial<AutomationsState['filters']>) => {
      set(state => ({
        filters: { ...state.filters, ...newFilters },
        pagination: { ...state.pagination, page: 1 }, // Reset to first page when filtering
      }));
    },

    clearFilters: () => {
      set({
        filters: {},
        pagination: { ...get().pagination, page: 1 },
      });
    },

    setSearch: (search: string) => {
      set(state => ({
        filters: { ...state.filters, search },
        pagination: { ...state.pagination, page: 1 },
      }));
    },

    // Pagination and sorting
    setPage: (page: number) => {
      set(state => ({
        pagination: { ...state.pagination, page },
      }));
    },

    setLimit: (limit: number) => {
      set(state => ({
        pagination: { ...state.pagination, limit, page: 1 },
      }));
    },

    setSorting: (sortBy: AutomationsState['sorting']['sortBy'], sortOrder: AutomationsState['sorting']['sortOrder']) => {
      set({
        sorting: { sortBy, sortOrder },
        pagination: { ...get().pagination, page: 1 },
      });
    },

    // Vendor grouping
    setGroupByVendor: (enabled: boolean) => {
      set({ groupByVendor: enabled });
      // Persist to localStorage
      try {
        localStorage.setItem('automations:groupByVendor', JSON.stringify(enabled));
      } catch (error) {
        console.error('Failed to persist groupByVendor state:', error);
      }
      // Re-fetch automations with new grouping
      get().fetchAutomations();
    },

    // State management
    setDiscovering: (isDiscovering: boolean) => {
      set({ isDiscovering });
    },

    setAnalyzing: (isAnalyzing: boolean) => {
      set({ isAnalyzing });
    },

    setError: (error: string | null) => {
      set({ error });
    },

    clearError: () => {
      set({ error: null });
    },

    reset: () => {
      set(initialState);
    },
  }))
);

// Selectors for optimized re-renders
export const useAutomations = () => useAutomationsStore(state => state.automations);
export const useVendorGroups = () => useAutomationsStore(state => state.vendorGroups);
export const useGroupByVendor = () => useAutomationsStore(state => state.groupByVendor);
export const useDiscoveries = () => useAutomationsStore(state => state.discoveries);
export const useDiscoveryProgress = () => useAutomationsStore(state => state.discoveryProgress);
export const useSelectedAutomation = () => useAutomationsStore(state => state.selectedAutomation);
export const useAutomationsLoading = () => useAutomationsStore(state => state.isDiscovering);
export const useAutomationsAnalyzing = () => useAutomationsStore(state => state.isAnalyzing);
export const useAutomationsError = () => useAutomationsStore(state => state.error);
export const useAutomationsFilters = () => useAutomationsStore(state => state.filters);
export const useAutomationsPagination = () => useAutomationsStore(state => state.pagination);
export const useAutomationsSorting = () => useAutomationsStore(state => state.sorting);
export const useAutomationsStats = () => useAutomationsStore(state => state.stats);

// Action selectors
export const useAutomationsActions = () => useAutomationsStore(state => ({
  startDiscovery: state.startDiscovery,
  getDiscoveryResult: state.getDiscoveryResult,
  refreshDiscovery: state.refreshDiscovery,
  fetchAutomations: state.fetchAutomations,
  fetchAutomationStats: state.fetchAutomationStats,
  setGroupByVendor: state.setGroupByVendor,
  updateDiscoveryProgress: state.updateDiscoveryProgress,
  updateDiscoveryResult: state.updateDiscoveryResult,
  addAutomation: state.addAutomation,
  updateAutomation: state.updateAutomation,
  removeAutomation: state.removeAutomation,
  selectAutomation: state.selectAutomation,
  setFilters: state.setFilters,
  clearFilters: state.clearFilters,
  setSearch: state.setSearch,
  setPage: state.setPage,
  setLimit: state.setLimit,
  setSorting: state.setSorting,
  setDiscovering: state.setDiscovering,
  setAnalyzing: state.setAnalyzing,
  setError: state.setError,
  clearError: state.clearError,
  reset: state.reset,
}));

// Computed selectors
export const useAutomationsByPlatform = (platform: PlatformType) => useAutomationsStore(state =>
  state.automations.filter(auto => auto.platform === platform)
);

export const useAutomationsByRisk = (riskLevel: RiskLevel) => useAutomationsStore(state =>
  state.automations.filter(auto => auto.riskLevel === riskLevel)
);

export const useHighRiskAutomations = () => useAutomationsStore(state =>
  state.automations.filter(auto => auto.riskLevel === 'high')
);

export const useDiscoveryByConnectionId = (connectionId: string) => useAutomationsStore(state =>
  state.discoveries[connectionId]
);

export const useDiscoveryProgressByConnectionId = (connectionId: string) => useAutomationsStore(state =>
  state.discoveryProgress[connectionId]
);

// Filtered and sorted automations
export const useFilteredAutomations = () => useAutomationsStore(state => {
  let filtered = state.automations;
  const { filters, sorting } = state;
  
  // Apply filters
  if (filters.platform) {
    filtered = filtered.filter(auto => auto.platform === filters.platform);
  }
  
  if (filters.riskLevel) {
    filtered = filtered.filter(auto => auto.riskLevel === filters.riskLevel);
  }
  
  if (filters.status) {
    filtered = filtered.filter(auto => auto.status === filters.status);
  }
  
  if (filters.type) {
    filtered = filtered.filter(auto => auto.type === filters.type);
  }
  
  if (filters.search) {
    const searchLower = filters.search.toLowerCase();
    filtered = filtered.filter(auto => 
      auto.name.toLowerCase().includes(searchLower) ||
      auto.description?.toLowerCase().includes(searchLower)
    );
  }
  
  // Apply sorting
  filtered.sort((a, b) => {
    const aVal: string | number | Date | undefined = a[sorting.sortBy];
    const bVal: string | number | Date | undefined = b[sorting.sortBy];

    // Handle date sorting
    if (sorting.sortBy === 'lastTriggered' || sorting.sortBy === 'createdAt') {
      const aTime = aVal ? new Date(aVal as string | Date).getTime() : 0;
      const bTime = bVal ? new Date(bVal as string | Date).getTime() : 0;
      return sorting.sortOrder === 'ASC' ? aTime - bTime : bTime - aTime;
    }

    // Handle string sorting
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      const aLower = aVal.toLowerCase();
      const bLower = bVal.toLowerCase();
      if (aLower < bLower) return sorting.sortOrder === 'ASC' ? -1 : 1;
      if (aLower > bLower) return sorting.sortOrder === 'ASC' ? 1 : -1;
      return 0;
    }

    // Default comparison
    if (aVal === undefined || bVal === undefined) return 0;
    if (aVal < bVal) return sorting.sortOrder === 'ASC' ? -1 : 1;
    if (aVal > bVal) return sorting.sortOrder === 'ASC' ? 1 : -1;
    return 0;
  });
  
  return filtered;
});