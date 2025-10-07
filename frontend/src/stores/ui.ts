/**
 * UI Store using Zustand
 * Manages global UI state, notifications, modals, and user preferences
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { NotificationState, ModalState, LoadingState, ErrorState, Theme } from '@/types/ui';

interface UIState {
  // Theme and appearance
  theme: Theme;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  
  // Notifications
  notifications: NotificationState[];
  maxNotifications: number;
  
  // Modal system
  modal: ModalState;
  
  // Global loading states
  loading: Record<string, LoadingState>;
  
  // Global error states
  errors: Record<string, ErrorState>;
  
  // Page-specific UI state
  pageState: Record<string, any>;
  
  // User preferences
  preferences: {
    language: string;
    timezone: string;
    dateFormat: string;
    timeFormat: '12h' | '24h';
    compactMode: boolean;
    animationsEnabled: boolean;
    soundEnabled: boolean;
    autoRefresh: boolean;
    refreshInterval: number;
  };
  
  // Search and filters (global state)
  globalSearch: {
    query: string;
    isOpen: boolean;
    results: any[];
    isSearching: boolean;
  };
  
  // Layout state
  layout: {
    headerHeight: number;
    sidebarWidth: number;
    footerHeight: number;
    contentPadding: number;
  };
  
  // Connection state for real-time features
  isOnline: boolean;
  websocketConnected: boolean;
  lastSyncTime: string | null;
}

interface UIActions {
  // Theme and appearance
  setTheme: (theme: Partial<Theme>) => void;
  toggleTheme: () => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebarCollapse: () => void;
  
  // Notifications
  addNotification: (notification: Omit<NotificationState, 'id'>) => string;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  updateNotification: (id: string, updates: Partial<NotificationState>) => void;
  
  // Modal system
  openModal: (modalState: Omit<ModalState, 'isOpen'>) => void;
  closeModal: () => void;
  updateModal: (updates: Partial<ModalState>) => void;
  
  // Loading states
  setLoading: (key: string, state: LoadingState) => void;
  clearLoading: (key: string) => void;
  clearAllLoading: () => void;
  
  // Error states
  setError: (key: string, state: ErrorState) => void;
  clearError: (key: string) => void;
  clearAllErrors: () => void;
  
  // Page state management
  setPageState: (page: string, state: any) => void;
  getPageState: (page: string) => any;
  clearPageState: (page: string) => void;
  
  // User preferences
  updatePreferences: (preferences: Partial<UIState['preferences']>) => void;
  resetPreferences: () => void;
  
  // Global search
  setGlobalSearch: (updates: Partial<UIState['globalSearch']>) => void;
  openGlobalSearch: () => void;
  closeGlobalSearch: () => void;
  
  // Layout
  updateLayout: (layout: Partial<UIState['layout']>) => void;
  
  // Connection state
  setOnlineStatus: (isOnline: boolean) => void;
  setWebsocketStatus: (connected: boolean) => void;
  updateSyncTime: () => void;
  
  // Utility actions
  showSuccess: (message: string, title?: string, options?: { action?: { label: string; onClick: () => void }; duration?: number }) => void;
  showError: (message: string, title?: string, options?: { action?: { label: string; onClick: () => void }; duration?: number }) => void;
  showWarning: (message: string, title?: string, options?: { action?: { label: string; onClick: () => void }; duration?: number }) => void;
  showInfo: (message: string, title?: string, options?: { action?: { label: string; onClick: () => void }; duration?: number }) => void;
  
  // Reset
  reset: () => void;
}

type UIStore = UIState & UIActions;

const defaultPreferences: UIState['preferences'] = {
  language: 'en',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  dateFormat: 'MM/DD/YYYY',
  timeFormat: '12h',
  compactMode: false,
  animationsEnabled: true,
  soundEnabled: false,
  autoRefresh: true,
  refreshInterval: 30000, // 30 seconds
};

const defaultLayout: UIState['layout'] = {
  headerHeight: 64,
  sidebarWidth: 256,
  footerHeight: 0,
  contentPadding: 24,
};

const initialState: UIState = {
  theme: {
    mode: 'light',
    primaryColor: '#5B8FC7', // Muted shadow blue to match index.css
    accentColor: '#5B8FC7', // Muted shadow blue to match index.css
  },
  sidebarOpen: true,
  sidebarCollapsed: false,
  notifications: [],
  maxNotifications: 5,
  modal: {
    isOpen: false,
  },
  loading: {},
  errors: {},
  pageState: {},
  preferences: defaultPreferences,
  globalSearch: {
    query: '',
    isOpen: false,
    results: [],
    isSearching: false,
  },
  layout: defaultLayout,
  isOnline: navigator.onLine,
  websocketConnected: false,
  lastSyncTime: null,
};

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Theme and appearance actions
      setTheme: (themeUpdates: Partial<Theme>) => {
        set(state => ({
          theme: { ...state.theme, ...themeUpdates },
        }));
      },

      toggleTheme: () => {
        set(state => ({
          theme: {
            ...state.theme,
            mode: state.theme.mode === 'light' ? 'dark' : 'light',
          },
        }));
      },

      setSidebarOpen: (open: boolean) => {
        set({ sidebarOpen: open });
      },

      toggleSidebar: () => {
        set(state => ({ sidebarOpen: !state.sidebarOpen }));
      },

      setSidebarCollapsed: (collapsed: boolean) => {
        set({ sidebarCollapsed: collapsed });
      },

      toggleSidebarCollapse: () => {
        set(state => ({ sidebarCollapsed: !state.sidebarCollapsed }));
      },

      // Notification actions
      addNotification: (notification: Omit<NotificationState, 'id'>) => {
        const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const newNotification: NotificationState = {
          ...notification,
          id,
          duration: notification.duration ?? 5000, // Default 5 seconds
        };

        set(state => {
          let notifications = [newNotification, ...state.notifications];
          
          // Limit notifications to maxNotifications
          if (notifications.length > state.maxNotifications) {
            notifications = notifications.slice(0, state.maxNotifications);
          }
          
          return { notifications };
        });

        // Auto-remove notification after duration
        if (newNotification.duration > 0) {
          setTimeout(() => {
            get().removeNotification(id);
          }, newNotification.duration);
        }

        return id;
      },

      removeNotification: (id: string) => {
        set(state => ({
          notifications: state.notifications.filter(n => n.id !== id),
        }));
      },

      clearNotifications: () => {
        set({ notifications: [] });
      },

      updateNotification: (id: string, updates: Partial<NotificationState>) => {
        set(state => ({
          notifications: state.notifications.map(n => 
            n.id === id ? { ...n, ...updates } : n
          ),
        }));
      },

      // Modal actions
      openModal: (modalState: Omit<ModalState, 'isOpen'>) => {
        set({
          modal: {
            ...modalState,
            isOpen: true,
          },
        });
      },

      closeModal: () => {
        set({
          modal: { isOpen: false },
        });
      },

      updateModal: (updates: Partial<ModalState>) => {
        set(state => ({
          modal: { ...state.modal, ...updates },
        }));
      },

      // Loading state actions
      setLoading: (key: string, state: LoadingState) => {
        set(prevState => ({
          loading: {
            ...prevState.loading,
            [key]: state,
          },
        }));
      },

      clearLoading: (key: string) => {
        set(state => {
          const { [key]: _, ...rest } = state.loading;
          return { loading: rest };
        });
      },

      clearAllLoading: () => {
        set({ loading: {} });
      },

      // Error state actions
      setError: (key: string, state: ErrorState) => {
        set(prevState => ({
          errors: {
            ...prevState.errors,
            [key]: state,
          },
        }));
      },

      clearError: (key: string) => {
        set(state => {
          const { [key]: _, ...rest } = state.errors;
          return { errors: rest };
        });
      },

      clearAllErrors: () => {
        set({ errors: {} });
      },

      // Page state management
      setPageState: (page: string, state: any) => {
        set(prevState => ({
          pageState: {
            ...prevState.pageState,
            [page]: state,
          },
        }));
      },

      getPageState: (page: string) => {
        return get().pageState[page];
      },

      clearPageState: (page: string) => {
        set(state => {
          const { [page]: _, ...rest } = state.pageState;
          return { pageState: rest };
        });
      },

      // User preferences
      updatePreferences: (preferences: Partial<UIState['preferences']>) => {
        set(state => ({
          preferences: { ...state.preferences, ...preferences },
        }));
      },

      resetPreferences: () => {
        set({ preferences: defaultPreferences });
      },

      // Global search
      setGlobalSearch: (updates: Partial<UIState['globalSearch']>) => {
        set(state => ({
          globalSearch: { ...state.globalSearch, ...updates },
        }));
      },

      openGlobalSearch: () => {
        set(state => ({
          globalSearch: { ...state.globalSearch, isOpen: true },
        }));
      },

      closeGlobalSearch: () => {
        set(state => ({
          globalSearch: { 
            ...state.globalSearch, 
            isOpen: false,
            query: '',
            results: [],
          },
        }));
      },

      // Layout
      updateLayout: (layout: Partial<UIState['layout']>) => {
        set(state => ({
          layout: { ...state.layout, ...layout },
        }));
      },

      // Connection state
      setOnlineStatus: (isOnline: boolean) => {
        set({ isOnline });
      },

      setWebsocketStatus: (connected: boolean) => {
        set({ 
          websocketConnected: connected,
          lastSyncTime: connected ? new Date().toISOString() : get().lastSyncTime,
        });
      },

      updateSyncTime: () => {
        set({ lastSyncTime: new Date().toISOString() });
      },

      // Utility actions
      showSuccess: (message: string, title = 'Success', options) => {
        get().addNotification({
          type: 'success',
          title,
          message,
          duration: options?.duration ?? 4000,
          action: options?.action,
        });
      },

      showError: (message: string, title = 'Error', options) => {
        get().addNotification({
          type: 'error',
          title,
          message,
          duration: options?.duration ?? 6000,
          action: options?.action,
        });
      },

      showWarning: (message: string, title = 'Warning', options) => {
        get().addNotification({
          type: 'warning',
          title,
          message,
          duration: options?.duration ?? 5000,
          action: options?.action,
        });
      },

      showInfo: (message: string, title = 'Information', options) => {
        get().addNotification({
          type: 'info',
          title,
          message,
          duration: options?.duration ?? 4000,
          action: options?.action,
        });
      },

      // Reset
      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'saas-xray-ui',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        preferences: state.preferences,
        layout: state.layout,
      }),
      onRehydrateStorage: () => (state) => {
        // Update online status after rehydration
        if (state) {
          state.setOnlineStatus(navigator.onLine);
        }
      },
    }
  )
);

// Selectors for optimized re-renders
export const useTheme = () => useUIStore(state => state.theme);
export const useSidebarState = () => useUIStore(state => ({ 
  isOpen: state.sidebarOpen, 
  isCollapsed: state.sidebarCollapsed 
}));
export const useNotifications = () => useUIStore(state => state.notifications);
export const useModal = () => useUIStore(state => state.modal);
export const useLoadingState = (key: string) => useUIStore(state => state.loading[key]);
export const useErrorState = (key: string) => useUIStore(state => state.errors[key]);
export const usePreferences = () => useUIStore(state => state.preferences);
export const useGlobalSearch = () => useUIStore(state => state.globalSearch);
export const useLayout = () => useUIStore(state => state.layout);
export const useConnectionStatus = () => useUIStore(state => ({ 
  isOnline: state.isOnline, 
  websocketConnected: state.websocketConnected,
  lastSyncTime: state.lastSyncTime
}));

// Action selectors
export const useUIActions = () => useUIStore(state => ({
  setTheme: state.setTheme,
  toggleTheme: state.toggleTheme,
  setSidebarOpen: state.setSidebarOpen,
  toggleSidebar: state.toggleSidebar,
  setSidebarCollapsed: state.setSidebarCollapsed,
  toggleSidebarCollapse: state.toggleSidebarCollapse,
  addNotification: state.addNotification,
  removeNotification: state.removeNotification,
  clearNotifications: state.clearNotifications,
  updateNotification: state.updateNotification,
  openModal: state.openModal,
  closeModal: state.closeModal,
  updateModal: state.updateModal,
  setLoading: state.setLoading,
  clearLoading: state.clearLoading,
  clearAllLoading: state.clearAllLoading,
  setError: state.setError,
  clearError: state.clearError,
  clearAllErrors: state.clearAllErrors,
  setPageState: state.setPageState,
  getPageState: state.getPageState,
  clearPageState: state.clearPageState,
  updatePreferences: state.updatePreferences,
  resetPreferences: state.resetPreferences,
  setGlobalSearch: state.setGlobalSearch,
  openGlobalSearch: state.openGlobalSearch,
  closeGlobalSearch: state.closeGlobalSearch,
  updateLayout: state.updateLayout,
  setOnlineStatus: state.setOnlineStatus,
  setWebsocketStatus: state.setWebsocketStatus,
  updateSyncTime: state.updateSyncTime,
  showSuccess: state.showSuccess,
  showError: state.showError,
  showWarning: state.showWarning,
  showInfo: state.showInfo,
  reset: state.reset,
}));

// Computed selectors
export const useIsLoading = (keys?: string[]) => useUIStore(state => {
  if (!keys) {
    return Object.values(state.loading).some(loading => loading.isLoading);
  }
  return keys.some(key => state.loading[key]?.isLoading);
});

export const useHasErrors = (keys?: string[]) => useUIStore(state => {
  if (!keys) {
    return Object.values(state.errors).some(error => error.hasError);
  }
  return keys.some(key => state.errors[key]?.hasError);
});

export const useIsDarkMode = () => useUIStore(state => state.theme.mode === 'dark');

// Browser event listeners setup
if (typeof window !== 'undefined') {
  // Online/offline status
  window.addEventListener('online', () => {
    useUIStore.getState().setOnlineStatus(true);
    useUIStore.getState().showInfo('Connection restored');
  });
  
  window.addEventListener('offline', () => {
    useUIStore.getState().setOnlineStatus(false);
    useUIStore.getState().showWarning('Connection lost');
  });
}