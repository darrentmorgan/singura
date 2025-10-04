/**
 * API Service Layer
 * Provides typed API client with JWT authentication, error handling, and request/response interceptors
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import {
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse
} from '@saas-xray/shared-types';
import {
  PlatformConnection,
  ConnectionsListResponse,
  ConnectionStatsResponse,
  OAuthInitiateResponse,
  OAuthCallbackResponse,
  DiscoveryResponse,
  AutomationDiscovery,
  PlatformType,
  ConnectionFilters,
  ApiError,
  ApiResponse
} from '@/types/api';
import { getClerkAuthHeaders } from '@/utils/clerk-headers';

// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4201/api';
const API_TIMEOUT = 30000; // 30 seconds

class ApiService {
  private client: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: any) => void;
  }> = [];

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: API_TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token and Clerk headers
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = this.getAccessToken();
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add Clerk context headers for backend middleware
        const clerkHeaders = getClerkAuthHeaders();
        if (clerkHeaders && config.headers) {
          Object.assign(config.headers, clerkHeaders);
          console.log('🔐 Adding Clerk headers to request:', {
            path: config.url,
            hasOrgId: !!clerkHeaders['x-clerk-organization-id'],
            orgId: clerkHeaders['x-clerk-organization-id']
          });
        }

        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling and token refresh
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            // If we're already refreshing, queue this request
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            }).then(token => {
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${token}`;
              }
              return this.client(originalRequest);
            }).catch(err => {
              return Promise.reject(err);
            });
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          try {
            const newToken = await this.refreshToken();
            if (newToken) {
              // Process all queued requests with the new token
              this.processQueue(null, newToken);
              
              if (originalRequest.headers) {
                originalRequest.headers.Authorization = `Bearer ${newToken}`;
              }
              return this.client(originalRequest);
            }
          } catch (refreshError) {
            this.processQueue(refreshError, null);
            this.handleAuthFailure();
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(this.handleError(error));
      }
    );
  }

  private processQueue(error: any, token: string | null) {
    this.failedQueue.forEach(({ resolve, reject }) => {
      if (error) {
        reject(error);
      } else {
        resolve(token!);
      }
    });
    
    this.failedQueue = [];
  }

  private handleError(error: AxiosError): ApiError {
    // Network error
    if (!error.response) {
      return {
        error: 'Network Error',
        code: 'NETWORK_ERROR',
        message: 'Unable to connect to the server. Please check your internet connection.',
      };
    }

    // HTTP error with response
    const { status, data } = error.response;
    const errorData = data as any;

    // Extract error details from response
    const apiError: ApiError = {
      error: errorData?.error || error.message,
      code: errorData?.code || `HTTP_${status}`,
      message: errorData?.message || this.getStatusMessage(status),
      details: errorData?.details,
    };

    return apiError;
  }

  private getStatusMessage(status: number): string {
    switch (status) {
      case 400: return 'Bad Request - Please check your input';
      case 401: return 'Unauthorized - Please log in again';
      case 403: return 'Forbidden - You do not have permission to perform this action';
      case 404: return 'Not Found - The requested resource was not found';
      case 409: return 'Conflict - The request conflicts with the current state';
      case 422: return 'Validation Error - Please check your input';
      case 429: return 'Too Many Requests - Please try again later';
      case 500: return 'Internal Server Error - Please try again later';
      case 502: return 'Bad Gateway - Server is temporarily unavailable';
      case 503: return 'Service Unavailable - Server is temporarily unavailable';
      case 504: return 'Gateway Timeout - Request took too long to complete';
      default: return 'An unexpected error occurred';
    }
  }

  private getAccessToken(): string | null {
    try {
      const authData = localStorage.getItem('saas-xray-auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed.state?.accessToken || null;
      }
    } catch (error) {
      console.error('Failed to get access token from localStorage:', error);
    }
    return null;
  }

  private getRefreshToken(): string | null {
    try {
      const authData = localStorage.getItem('saas-xray-auth');
      if (authData) {
        const parsed = JSON.parse(authData);
        return parsed.state?.refreshToken || null;
      }
    } catch (error) {
      console.error('Failed to get refresh token from localStorage:', error);
    }
    return null;
  }

  private async refreshToken(): Promise<string | null> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
        refreshToken,
      });

      if (response.data.success && response.data.accessToken) {
        // Update tokens in localStorage
        const authData = localStorage.getItem('saas-xray-auth');
        if (authData) {
          const parsed = JSON.parse(authData);
          parsed.state.accessToken = response.data.accessToken;
          parsed.state.refreshToken = response.data.refreshToken;
          localStorage.setItem('saas-xray-auth', JSON.stringify(parsed));
        }
        
        return response.data.accessToken;
      }
      
      throw new Error('Token refresh failed');
    } catch (error) {
      console.error('Token refresh failed:', error);
      throw error;
    }
  }

  private handleAuthFailure() {
    // Clear auth data and redirect to login
    localStorage.removeItem('saas-xray-auth');
    
    // Only redirect if we're not already on the login page
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }

  // Generic request method
  private async request<T>(method: string, url: string, data?: any, config?: any): Promise<T> {
    try {
      const response = await this.client.request({
        method,
        url,
        data,
        ...config,
      });
      return response.data;
    } catch (error) {
      throw error instanceof AxiosError ? this.handleError(error) : error;
    }
  }

  // Auth API methods
  async login(credentials: LoginRequest): Promise<LoginResponse> {
    return this.request<LoginResponse>('POST', '/auth/login', credentials);
  }

  async logout(data: { sessionId: string }): Promise<ApiResponse<null>> {
    return this.request<ApiResponse<null>>('POST', '/auth/logout', data);
  }

  async refreshAccessToken(data: RefreshTokenRequest): Promise<RefreshTokenResponse> {
    return this.request<RefreshTokenResponse>('POST', '/auth/refresh', data);
  }

  // Connections API methods
  async getConnections(filters: ConnectionFilters = {}): Promise<ConnectionsListResponse> {
    const params = new URLSearchParams();
    
    if (filters.platform) params.append('platform', filters.platform);
    if (filters.status) params.append('status', filters.status);
    if (filters.page) params.append('page', filters.page.toString());
    if (filters.limit) params.append('limit', filters.limit.toString());

    return this.request<ConnectionsListResponse>('GET', `/connections?${params.toString()}`);
  }

  async getConnection(connectionId: string): Promise<ApiResponse<PlatformConnection>> {
    return this.request<ApiResponse<PlatformConnection>>('GET', `/connections/${connectionId}`);
  }

  async getConnectionStats(): Promise<ConnectionStatsResponse> {
    return this.request<ConnectionStatsResponse>('GET', '/connections/stats');
  }

  async refreshConnection(connectionId: string): Promise<boolean> {
    const response = await this.request<ApiResponse<null>>('POST', `/connections/${connectionId}/refresh`);
    return response.success;
  }

  async disconnectConnection(connectionId: string): Promise<boolean> {
    const response = await this.request<ApiResponse<null>>('DELETE', `/connections/${connectionId}`);
    return response.success;
  }

  async retryConnection(connectionId: string): Promise<boolean> {
    const response = await this.request<ApiResponse<null>>('POST', `/connections/${connectionId}/retry`);
    return response.success;
  }

  // OAuth API methods
  async initiateOAuth(platform: PlatformType, organizationId?: string): Promise<OAuthInitiateResponse> {
    // Include organization ID in query parameter for OAuth flow
    const params = organizationId ? `?orgId=${organizationId}` : '';
    return this.request<OAuthInitiateResponse>('GET', `/auth/oauth/${platform}/authorize${params}`);
  }

  async handleOAuthCallback(platform: PlatformType, code: string, state: string): Promise<OAuthCallbackResponse> {
    return this.request<OAuthCallbackResponse>('GET', `/auth/oauth/${platform}/callback?code=${code}&state=${state}`);
  }

  // Automation Discovery API methods
  async startDiscovery(connectionId: string): Promise<DiscoveryResponse> {
    return this.request<DiscoveryResponse>('POST', `/connections/${connectionId}/discover`);
  }

  async getDiscoveryResult(connectionId: string): Promise<DiscoveryResponse> {
    return this.request<DiscoveryResponse>('GET', `/connections/${connectionId}/discovery`);
  }

  async refreshDiscovery(connectionId: string): Promise<DiscoveryResponse> {
    return this.request<DiscoveryResponse>('POST', `/connections/${connectionId}/discover/refresh`);
  }

  async getAutomations(filters: any = {}): Promise<ApiResponse<{ automations: AutomationDiscovery[], pagination: any }>> {
    const params = new URLSearchParams();
    
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, value.toString());
      }
    });

    return this.request<ApiResponse<{ automations: AutomationDiscovery[], pagination: any }>>('GET', `/automations?${params.toString()}`);
  }

  async getAutomationStats(): Promise<ApiResponse<any>> {
    return this.request<ApiResponse<any>>('GET', '/automations/stats');
  }

  async getAutomation(automationId: string): Promise<ApiResponse<AutomationDiscovery>> {
    return this.request<ApiResponse<AutomationDiscovery>>('GET', `/automations/${automationId}`);
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string, timestamp: string }>> {
    return this.request<ApiResponse<{ status: string, timestamp: string }>>('GET', '/health');
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Export specific API modules for better organization
export const authApi = {
  login: (credentials: LoginRequest) => apiService.login(credentials),
  logout: (data: { sessionId: string }) => apiService.logout(data),
  refreshToken: (data: RefreshTokenRequest) => apiService.refreshAccessToken(data),
};

export const connectionsApi = {
  getConnections: (filters?: ConnectionFilters) => apiService.getConnections(filters),
  getConnection: (connectionId: string) => apiService.getConnection(connectionId),
  getConnectionStats: () => apiService.getConnectionStats(),
  refreshConnection: (connectionId: string) => apiService.refreshConnection(connectionId),
  disconnectConnection: (connectionId: string) => apiService.disconnectConnection(connectionId),
  retryConnection: (connectionId: string) => apiService.retryConnection(connectionId),
};

export const oauthApi = {
  initiate: (platform: PlatformType, organizationId?: string) =>
    apiService.initiateOAuth(platform, organizationId),
  callback: (platform: PlatformType, code: string, state: string) =>
    apiService.handleOAuthCallback(platform, code, state),
};

export const automationsApi = {
  startDiscovery: (connectionId: string) => apiService.startDiscovery(connectionId),
  getDiscoveryResult: (connectionId: string) => apiService.getDiscoveryResult(connectionId),
  refreshDiscovery: (connectionId: string) => apiService.refreshDiscovery(connectionId),
  getAutomations: (filters?: any) => apiService.getAutomations(filters),
  getAutomationStats: () => apiService.getAutomationStats(),
  getAutomation: (automationId: string) => apiService.getAutomation(automationId),
};

// Export the main service for advanced usage
export default apiService;