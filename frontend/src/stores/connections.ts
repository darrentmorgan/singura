/**
 * Connections Store using Zustand
 * Manages platform connections, OAuth flows, and connection status
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { 
  PlatformConnection, 
  PlatformType, 
  ConnectionStatus, 
  ConnectionsListResponse,
  OAuthInitiateResponse,
  OAuthCallbackResponse,
  ConnectionStatsResponse
} from '@/types/api';
import { connectionsApi, oauthApi } from '@/services/api';

interface ConnectionsState {
  connections: PlatformConnection[];
  connectionStats: {
    total: number;
    active: number;
    inactive: number;
    error: number;
    byPlatform: Record<PlatformType, number>;
  } | null;
  selectedConnection: PlatformConnection | null;
  isLoading: boolean;
  isConnecting: boolean;
  error: string | null;
  filters: {
    platform?: PlatformType;
    status?: ConnectionStatus;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ConnectionsActions {
  // Data fetching
  fetchConnections: (filters?: { platform?: PlatformType; status?: ConnectionStatus }) => Promise<boolean>;
  fetchConnectionStats: () => Promise<boolean>;
  refreshConnection: (connectionId: string) => Promise<boolean>;
  
  // OAuth flows
  initiateOAuth: (platform: PlatformType, organizationId?: string) => Promise<string | null>;
  handleOAuthCallback: (code: string, state: string) => Promise<boolean>;
  
  // Connection management
  disconnectPlatform: (connectionId: string) => Promise<boolean>;
  retryConnection: (connectionId: string) => Promise<boolean>;
  
  // Selection and filtering
  selectConnection: (connection: PlatformConnection | null) => void;
  setFilters: (filters: Partial<ConnectionsState['filters']>) => void;
  clearFilters: () => void;
  
  // Pagination
  setPage: (page: number) => void;
  setLimit: (limit: number) => void;
  
  // Real-time updates
  updateConnectionStatus: (connectionId: string, status: ConnectionStatus, error?: string) => void;
  addConnection: (connection: PlatformConnection) => void;
  removeConnection: (connectionId: string) => void;
  
  // State management
  setLoading: (isLoading: boolean) => void;
  setConnecting: (isConnecting: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  reset: () => void;
}

type ConnectionsStore = ConnectionsState & ConnectionsActions;

const initialState: ConnectionsState = {
  connections: [],
  connectionStats: null,
  selectedConnection: null,
  isLoading: false,
  isConnecting: false,
  error: null,
  filters: {},
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },
};

export const useConnectionsStore = create<ConnectionsStore>()(
  subscribeWithSelector((set, get) => ({
    ...initialState,

    // Data fetching actions
    fetchConnections: async (filters) => {
      set({ isLoading: true, error: null });
      
      try {
        const { pagination } = get();
        const queryFilters = { ...get().filters, ...filters };
        
        const response = await connectionsApi.getConnections({
          ...queryFilters,
          page: pagination.page,
          limit: pagination.limit,
        });

        if (response.success && response.connections) {
          set({
            connections: response.connections,
            pagination: {
              ...pagination,
              total: response.pagination.total,
              totalPages: response.pagination.totalPages,
            },
            isLoading: false,
            error: null,
          });
          return true;
        } else {
          set({
            isLoading: false,
            error: 'Failed to fetch connections',
          });
          return false;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to fetch connections';
        set({
          isLoading: false,
          error: errorMessage,
        });
        return false;
      }
    },

    fetchConnectionStats: async () => {
      try {
        const response = await connectionsApi.getConnectionStats();
        
        if (response.success && response.stats) {
          set({
            connectionStats: response.stats,
          });
          return true;
        }
        return false;
      } catch (error) {
        console.error('Failed to fetch connection stats:', error);
        return false;
      }
    },

    refreshConnection: async (connectionId: string) => {
      set({ isLoading: true, error: null });
      
      try {
        const success = await connectionsApi.refreshConnection(connectionId);
        
        if (success) {
          // Refresh the connections list
          await get().fetchConnections();
          return true;
        } else {
          set({
            isLoading: false,
            error: 'Failed to refresh connection',
          });
          return false;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to refresh connection';
        set({
          isLoading: false,
          error: errorMessage,
        });
        return false;
      }
    },

    // OAuth flow actions
    initiateOAuth: async (platform: PlatformType, organizationId?: string) => {
      set({ isConnecting: true, error: null });

      try {
        const response = await oauthApi.initiate(platform, organizationId);

        if (response.success && response.authorizationUrl) {
          // Store the OAuth state for callback verification
          localStorage.setItem(`oauth-state-${platform}`, response.state);
          return response.authorizationUrl;
        } else {
          set({
            isConnecting: false,
            error: 'Failed to initiate OAuth flow',
          });
          return null;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to initiate OAuth';
        set({
          isConnecting: false,
          error: errorMessage,
        });
        return null;
      }
    },

    handleOAuthCallback: async (code: string, state: string) => {
      set({ isConnecting: true, error: null });
      
      try {
        // Determine platform from stored state
        const platforms: PlatformType[] = ['slack', 'google', 'microsoft', 'hubspot', 'salesforce', 'notion', 'asana', 'jira'];
        let platform: PlatformType | null = null;
        
        for (const p of platforms) {
          const storedState = localStorage.getItem(`oauth-state-${p}`);
          if (storedState === state) {
            platform = p;
            localStorage.removeItem(`oauth-state-${p}`);
            break;
          }
        }
        
        if (!platform) {
          set({
            isConnecting: false,
            error: 'Invalid OAuth state',
          });
          return false;
        }

        const response = await oauthApi.callback(platform, code, state);
        
        if (response.success && response.connection) {
          // Add the new connection to the store
          get().addConnection(response.connection);
          
          // Also refresh the connection stats
          await get().fetchConnectionStats();
          
          set({
            isConnecting: false,
            error: null,
          });
          return true;
        } else {
          set({
            isConnecting: false,
            error: 'Failed to complete OAuth flow',
          });
          return false;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'OAuth callback failed';
        set({
          isConnecting: false,
          error: errorMessage,
        });
        return false;
      }
    },

    // Connection management actions
    disconnectPlatform: async (connectionId: string) => {
      set({ isLoading: true, error: null });
      
      try {
        const success = await connectionsApi.disconnectConnection(connectionId);
        
        if (success) {
          get().removeConnection(connectionId);
          set({
            isLoading: false,
            error: null,
          });
          return true;
        } else {
          set({
            isLoading: false,
            error: 'Failed to disconnect platform',
          });
          return false;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to disconnect platform';
        set({
          isLoading: false,
          error: errorMessage,
        });
        return false;
      }
    },

    retryConnection: async (connectionId: string) => {
      set({ isLoading: true, error: null });
      
      try {
        const success = await connectionsApi.retryConnection(connectionId);
        
        if (success) {
          // Update the connection status
          get().updateConnectionStatus(connectionId, 'pending');
          set({
            isLoading: false,
            error: null,
          });
          return true;
        } else {
          set({
            isLoading: false,
            error: 'Failed to retry connection',
          });
          return false;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to retry connection';
        set({
          isLoading: false,
          error: errorMessage,
        });
        return false;
      }
    },

    // Selection and filtering actions
    selectConnection: (connection: PlatformConnection | null) => {
      set({ selectedConnection: connection });
    },

    setFilters: (newFilters: Partial<ConnectionsState['filters']>) => {
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

    // Pagination actions
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

    // Real-time update actions
    updateConnectionStatus: (connectionId: string, status: ConnectionStatus, error?: string) => {
      set(state => ({
        connections: state.connections.map(conn =>
          conn.id === connectionId
            ? {
                ...conn,
                status,
                error_message: error || undefined,
                updated_at: new Date().toISOString(),
                last_sync_at: status === 'active' ? new Date().toISOString() : conn.last_sync_at,
              }
            : conn
        ),
      }));
    },

    addConnection: (connection: PlatformConnection) => {
      set(state => ({
        connections: [connection, ...state.connections],
        pagination: {
          ...state.pagination,
          total: state.pagination.total + 1,
        },
      }));
    },

    removeConnection: (connectionId: string) => {
      set(state => ({
        connections: state.connections.filter(conn => conn.id !== connectionId),
        selectedConnection: state.selectedConnection?.id === connectionId ? null : state.selectedConnection,
        pagination: {
          ...state.pagination,
          total: Math.max(0, state.pagination.total - 1),
        },
      }));
    },

    // State management actions
    setLoading: (isLoading: boolean) => {
      set({ isLoading });
    },

    setConnecting: (isConnecting: boolean) => {
      set({ isConnecting });
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
export const useConnections = () => useConnectionsStore(state => state.connections);
export const useConnectionStats = () => useConnectionsStore(state => state.connectionStats);
export const useSelectedConnection = () => useConnectionsStore(state => state.selectedConnection);
export const useConnectionsLoading = () => useConnectionsStore(state => state.isLoading);
export const useConnectionsConnecting = () => useConnectionsStore(state => state.isConnecting);
export const useConnectionsError = () => useConnectionsStore(state => state.error);
export const useConnectionsFilters = () => useConnectionsStore(state => state.filters);
export const useConnectionsPagination = () => useConnectionsStore(state => state.pagination);

// Action selectors
export const useConnectionsActions = () => useConnectionsStore(state => ({
  fetchConnections: state.fetchConnections,
  fetchConnectionStats: state.fetchConnectionStats,
  refreshConnection: state.refreshConnection,
  initiateOAuth: state.initiateOAuth,
  handleOAuthCallback: state.handleOAuthCallback,
  disconnectPlatform: state.disconnectPlatform,
  retryConnection: state.retryConnection,
  selectConnection: state.selectConnection,
  setFilters: state.setFilters,
  clearFilters: state.clearFilters,
  setPage: state.setPage,
  setLimit: state.setLimit,
  updateConnectionStatus: state.updateConnectionStatus,
  addConnection: state.addConnection,
  removeConnection: state.removeConnection,
  setLoading: state.setLoading,
  setConnecting: state.setConnecting,
  setError: state.setError,
  clearError: state.clearError,
  reset: state.reset,
}));

// Computed selectors
export const useActiveConnections = () => useConnectionsStore(state => 
  state.connections.filter(conn => conn.status === 'active')
);

export const useConnectionsByPlatform = (platform: PlatformType) => useConnectionsStore(state =>
  state.connections.filter(conn => conn.platform_type === platform)
);

export const useHasActiveConnection = (platform: PlatformType) => useConnectionsStore(state =>
  state.connections.some(conn => conn.platform_type === platform && conn.status === 'active')
);