/**
 * API Service Layer
 * Provides typed API client with JWT authentication, error handling, and request/response interceptors
 */

import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios';
import {
  LoginRequest,
  LoginResponse,
  RefreshTokenRequest,
  RefreshTokenResponse,
  ExportRequest,
  AutomationFeedback,
  CreateFeedbackInput,
  UpdateFeedbackInput,
  FeedbackFilters,
  FeedbackStatistics,
  FeedbackTrend,
  MLTrainingBatch,
  FeedbackResolution
} from '@singura/shared-types';
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
    // Request interceptor to add Clerk auth headers
    this.client.interceptors.request.use(
      async (config: InternalAxiosRequestConfig) => {
        // Add Clerk context headers for backend middleware
        const clerkHeaders = await getClerkAuthHeaders();
        if (clerkHeaders && config.headers) {
          Object.assign(config.headers, clerkHeaders);
          console.log('🔐 Adding Clerk headers to request:', {
            path: config.url,
            hasOrgId: !!clerkHeaders['x-clerk-organization-id'],
            orgId: clerkHeaders['x-clerk-organization-id'],
            hasAuth: !!clerkHeaders['Authorization']
          });
        }

        return config;
      },
      (error: AxiosError) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    // Note: Auth is handled by Clerk, not by manual token refresh
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      async (error: AxiosError) => {
        // Just handle the error - Clerk handles authentication
        return Promise.reject(this.handleError(error));
      }
    );
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
    const errorData = data as Record<string, unknown>;

    // Extract error details from response
    const apiError: ApiError = {
      error: (typeof errorData?.error === 'string' ? errorData.error : null) || error.message,
      code: (typeof errorData?.code === 'string' ? errorData.code : null) || `HTTP_${status}`,
      message: (typeof errorData?.message === 'string' ? errorData.message : null) || this.getStatusMessage(status),
      details: typeof errorData?.details === 'object' && errorData.details !== null ? errorData.details as Record<string, unknown> : undefined,
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

  // Generic request method
  private async request<T>(method: string, url: string, data?: unknown, config?: Record<string, unknown>): Promise<T> {
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

  async getAutomations(filters: Record<string, unknown> = {}): Promise<{
    success: boolean,
    automations?: AutomationDiscovery[],
    vendorGroups?: import('@/types/api').VendorGroup[],
    pagination: Record<string, unknown>
  }> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });

    return this.request<{
      success: boolean,
      automations?: AutomationDiscovery[],
      vendorGroups?: import('@/types/api').VendorGroup[],
      pagination: Record<string, unknown>
    }>('GET', `/automations?${params.toString()}`);
  }

  async getAutomationStats(): Promise<ApiResponse<Record<string, unknown>>> {
    return this.request<ApiResponse<Record<string, unknown>>>('GET', '/automations/stats');
  }

  async getAutomation(automationId: string): Promise<ApiResponse<AutomationDiscovery>> {
    return this.request<ApiResponse<AutomationDiscovery>>('GET', `/automations/${automationId}`);
  }

  async getAutomationDetails(automationId: string): Promise<ApiResponse<Record<string, unknown>>> {
    return this.request<ApiResponse<Record<string, unknown>>>('GET', `/automations/${automationId}/details`);
  }

  // Export API methods
  async exportAutomationsCSV(request: ExportRequest): Promise<Blob> {
    try {
      const response = await this.client.post('/automations/export/csv', request, {
        responseType: 'blob',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      throw error instanceof AxiosError ? this.handleError(error) : error;
    }
  }

  async exportAutomationsPDF(request: ExportRequest): Promise<Blob> {
    try {
      const response = await this.client.post('/automations/export/pdf', request, {
        responseType: 'blob',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      throw error instanceof AxiosError ? this.handleError(error) : error;
    }
  }

  // Health check
  async healthCheck(): Promise<ApiResponse<{ status: string, timestamp: string }>> {
    return this.request<ApiResponse<{ status: string, timestamp: string }>>('GET', '/health');
  }

  // Feedback API methods
  async createFeedback(input: CreateFeedbackInput): Promise<ApiResponse<AutomationFeedback>> {
    return this.request<ApiResponse<AutomationFeedback>>('POST', '/feedback', input);
  }

  async getFeedback(id: string): Promise<ApiResponse<AutomationFeedback>> {
    return this.request<ApiResponse<AutomationFeedback>>('GET', `/feedback/${id}`);
  }

  async getFeedbackList(filters?: FeedbackFilters): Promise<ApiResponse<AutomationFeedback[]>> {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (value instanceof Date) {
            params.append(key, value.toISOString());
          } else {
            params.append(key, String(value));
          }
        }
      });
    }

    const url = params.toString() ? `/feedback?${params.toString()}` : '/feedback';
    return this.request<ApiResponse<AutomationFeedback[]>>('GET', url);
  }

  async getFeedbackByAutomation(automationId: string): Promise<ApiResponse<AutomationFeedback[]>> {
    return this.request<ApiResponse<AutomationFeedback[]>>('GET', `/feedback/automation/${automationId}`);
  }

  async getRecentFeedback(organizationId: string, limit = 10): Promise<ApiResponse<AutomationFeedback[]>> {
    return this.request<ApiResponse<AutomationFeedback[]>>('GET', `/feedback/recent/${organizationId}?limit=${limit}`);
  }

  async updateFeedback(id: string, input: UpdateFeedbackInput): Promise<ApiResponse<AutomationFeedback>> {
    return this.request<ApiResponse<AutomationFeedback>>('PUT', `/feedback/${id}`, input);
  }

  async acknowledgeFeedback(id: string): Promise<ApiResponse<AutomationFeedback>> {
    return this.request<ApiResponse<AutomationFeedback>>('PUT', `/feedback/${id}/acknowledge`);
  }

  async resolveFeedback(id: string, resolution: FeedbackResolution): Promise<ApiResponse<AutomationFeedback>> {
    return this.request<ApiResponse<AutomationFeedback>>('PUT', `/feedback/${id}/resolve`, { resolution });
  }

  async getFeedbackStatistics(organizationId: string): Promise<ApiResponse<FeedbackStatistics>> {
    return this.request<ApiResponse<FeedbackStatistics>>('GET', `/feedback/statistics/${organizationId}`);
  }

  async getFeedbackTrends(organizationId: string, days = 30): Promise<ApiResponse<FeedbackTrend[]>> {
    return this.request<ApiResponse<FeedbackTrend[]>>('GET', `/feedback/trends/${organizationId}?days=${days}`);
  }

  async exportMLTrainingBatch(organizationId?: string, limit?: number): Promise<ApiResponse<MLTrainingBatch>> {
    const params = new URLSearchParams();
    if (organizationId) params.append('organizationId', organizationId);
    if (limit) params.append('limit', limit.toString());

    const url = params.toString() ? `/feedback/ml/export?${params.toString()}` : '/feedback/ml/export';
    return this.request<ApiResponse<MLTrainingBatch>>('GET', url);
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
  getAutomations: (filters?: Record<string, unknown>) => apiService.getAutomations(filters),
  getAutomationStats: () => apiService.getAutomationStats(),
  getAutomation: (automationId: string) => apiService.getAutomation(automationId),
  getAutomationDetails: (automationId: string) => apiService.getAutomationDetails(automationId),
  exportCSV: (request: ExportRequest) => apiService.exportAutomationsCSV(request),
  exportPDF: (request: ExportRequest) => apiService.exportAutomationsPDF(request),
};

export const feedbackApi = {
  createFeedback: (input: CreateFeedbackInput) => apiService.createFeedback(input),
  getFeedback: (id: string) => apiService.getFeedback(id),
  getFeedbackList: (filters?: FeedbackFilters) => apiService.getFeedbackList(filters),
  getFeedbackByAutomation: (automationId: string) => apiService.getFeedbackByAutomation(automationId),
  getRecentFeedback: (organizationId: string, limit?: number) => apiService.getRecentFeedback(organizationId, limit),
  updateFeedback: (id: string, input: UpdateFeedbackInput) => apiService.updateFeedback(id, input),
  acknowledgeFeedback: (id: string) => apiService.acknowledgeFeedback(id),
  resolveFeedback: (id: string, resolution: FeedbackResolution) => apiService.resolveFeedback(id, resolution),
  getStatistics: (organizationId: string) => apiService.getFeedbackStatistics(organizationId),
  getTrends: (organizationId: string, days?: number) => apiService.getFeedbackTrends(organizationId, days),
  exportMLTrainingBatch: (organizationId?: string, limit?: number) => apiService.exportMLTrainingBatch(organizationId, limit),
};

// Export convenience API object
export const api = {
  ...authApi,
  ...connectionsApi,
  ...oauthApi,
  ...automationsApi,
  ...feedbackApi,
  exportAutomationsCSV: apiService.exportAutomationsCSV.bind(apiService),
  exportAutomationsPDF: apiService.exportAutomationsPDF.bind(apiService),
};

// Export the main service for advanced usage
export default apiService;