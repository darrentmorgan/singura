/**
 * Authentication Store using Zustand
 * Manages user authentication state, JWT tokens, and auth operations
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User, LoginRequest } from '@saas-xray/shared-types';
import { authApi } from '@/services/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  tokenType: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (credentials: LoginRequest) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
  clearError: () => void;
  setLoading: (isLoading: boolean) => void;
  updateUser: (user: Partial<User>) => void;
  checkAuthStatus: () => void;
  clearAuth: () => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      accessToken: null,
      refreshToken: null,
      tokenType: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (credentials: LoginRequest) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await authApi.login(credentials);
          
          if (response.accessToken && response.user) {
            set({
              user: response.user,
              accessToken: response.accessToken,
              refreshToken: response.refreshToken,
              tokenType: 'Bearer', // shared-types doesn't include tokenType
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });
            return true;
          } else {
            set({
              isLoading: false,
              error: 'Login failed: Invalid response format',
            });
            return false;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Login failed';
          set({
            isLoading: false,
            error: errorMessage,
          });
          return false;
        }
      },

      logout: async () => {
        set({ isLoading: true });
        
        try {
          // For now, just clear the tokens locally
          // TODO: Call backend logout endpoint when implemented
        } catch (error) {
          console.error('Logout API call failed:', error);
        } finally {
          // Clear auth state regardless of API call result
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            tokenType: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
          });
        }
      },

      refreshAccessToken: async () => {
        const { refreshToken } = get();
        
        if (!refreshToken) {
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            tokenType: null,
            isAuthenticated: false,
            error: 'No refresh token available',
          });
          return false;
        }

        try {
          const response = await authApi.refreshToken({ refreshToken });
          
          if (response.success && response.accessToken) {
            set({
              accessToken: response.accessToken,
              refreshToken: response.refreshToken,
              tokenType: response.tokenType || 'Bearer',
              error: null,
            });
            return true;
          } else {
            // Refresh failed, clear auth
            set({
              user: null,
              accessToken: null,
              refreshToken: null,
              tokenType: null,
              isAuthenticated: false,
              error: 'Session expired',
            });
            return false;
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Token refresh failed';
          set({
            user: null,
            accessToken: null,
            refreshToken: null,
            tokenType: null,
            isAuthenticated: false,
            error: errorMessage,
          });
          return false;
        }
      },

      clearError: () => {
        set({ error: null });
      },

      setLoading: (isLoading: boolean) => {
        set({ isLoading });
      },

      updateUser: (userData: Partial<User>) => {
        const { user } = get();
        if (user) {
          set({ user: { ...user, ...userData } });
        }
      },

      checkAuthStatus: () => {
        const { accessToken, user } = get();
        const isAuthenticated = !!(accessToken && user);
        set({ isAuthenticated });
      },

      clearAuth: () => {
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          tokenType: null,
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },
    }),
    {
      name: 'saas-xray-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        tokenType: state.tokenType,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Check auth status after rehydration
        if (state) {
          state.checkAuthStatus();
        }
      },
    }
  )
);

// Selectors for optimized re-renders
export const useAuthUser = () => useAuthStore(state => state.user);
export const useIsAuthenticated = () => useAuthStore(state => state.isAuthenticated);
export const useAuthLoading = () => useAuthStore(state => state.isLoading);
export const useAuthError = () => useAuthStore(state => state.error);
export const useAccessToken = () => useAuthStore(state => state.accessToken);

// Auth actions
export const useAuthActions = () => useAuthStore(state => ({
  login: state.login,
  logout: state.logout,
  refreshAccessToken: state.refreshAccessToken,
  clearError: state.clearError,
  setLoading: state.setLoading,
  updateUser: state.updateUser,
  checkAuthStatus: state.checkAuthStatus,
  clearAuth: state.clearAuth,
}));