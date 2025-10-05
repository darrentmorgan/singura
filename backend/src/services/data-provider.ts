/**
 * Data Provider Abstraction Layer
 * Handles switching between mock and real data sources for demos
 */

import { AutomationEvent, ConnectionResult } from '../connectors/types';
import { googleConnector } from '../connectors/google';
import { slackConnector } from '../connectors/slack';
import { GoogleAPIClientService } from './google-api-client-service';
import { oauthCredentialStorage } from './oauth-credential-storage-service';
import { hybridStorage } from './hybrid-storage';

export interface Connection {
  id: string;
  platform: string;
  displayName: string;
  status: string;
  permissions: string[];
  createdAt: string;
  lastSyncAt: string;
}

export interface DiscoveryResult {
  success: boolean;
  discovery: {
    automations: AutomationEvent[];
    metadata: {
      executionTimeMs: number;
      automationsFound: number;
      riskScore: number;
      platform?: string;
      discoveryMethods?: string[];
      coverage?: Record<string, number>;
    };
  };
}

/**
 * Abstract interface for data providers
 */
export interface DataProvider {
  getConnections(): Connection[];
  discoverAutomations(connectionId: string, organizationId: string): Promise<DiscoveryResult>;
}

/**
 * Mock data provider for demos and development
 */
export class MockDataProvider implements DataProvider {
  getConnections(): Connection[] {
    return [
      {
        id: 'conn-1',
        platform: 'slack',
        displayName: 'Slack - Demo Workspace',
        status: 'active',
        permissions: ['channels:read', 'users:read', 'team:read'],
        createdAt: new Date().toISOString(),
        lastSyncAt: new Date().toISOString()
      },
      {
        id: 'conn-2',
        platform: 'google',
        displayName: 'Google Workspace - Demo Org',
        status: 'active',
        permissions: [
          'https://www.googleapis.com/auth/userinfo.email',
          'https://www.googleapis.com/auth/userinfo.profile', 
          'https://www.googleapis.com/auth/drive.readonly',
          'https://www.googleapis.com/auth/script.projects.readonly'
        ],
        createdAt: new Date().toISOString(),
        lastSyncAt: new Date().toISOString()
      }
    ];
  }

  async discoverAutomations(connectionId: string, organizationId: string): Promise<DiscoveryResult> {
    // AI-focused mock data for demos (organizationId not used for mock data)
    if (connectionId === 'conn-2' || connectionId.includes('google')) {
      return {
        success: true,
        discovery: {
          automations: [
            {
              id: 'google-script-ai-processor',
              name: 'ChatGPT Data Processor',
              type: 'workflow',
              platform: 'google',
              status: 'active',
              trigger: 'event',
              actions: ['data_processing', 'ai_analysis', 'external_api'],
              createdAt: new Date('2024-09-15T10:30:00Z'),
              lastTriggered: new Date('2024-12-30T15:45:00Z'),
              lastModified: new Date('2024-12-28T14:30:00Z'),
              riskLevel: 'high',
              metadata: {
                scriptId: 'AKfycbwAI_chatgpt_proc',
                description: 'Processes spreadsheet data and sends to OpenAI API for analysis',
                parentType: 'SHEETS',
                triggers: ['ON_FORM_SUBMIT', 'TIME_DRIVEN'],
                functions: ['processCustomerData', 'sendToOpenAI', 'logResults'],
                permissions: ['SHEETS', 'EXTERNAL_URL', 'DRIVE'],
                aiEndpoints: ['https://api.openai.com/v1/chat/completions'],
                riskFactors: [
                  'Has access to spreadsheet data (potential PII)',
                  'Configured to call OpenAI API endpoints',
                  'Automated triggers process data without human oversight',
                  'No audit trail for data sent to external AI service'
                ]
              }
            },
            {
              id: 'google-script-claude-analyzer',
              name: 'Claude Document Analyzer',
              type: 'workflow',
              platform: 'google',
              status: 'active',
              trigger: 'event',
              actions: ['document_analysis', 'ai_processing', 'email_notification'],
              createdAt: new Date('2024-08-22T14:20:00Z'),
              lastTriggered: new Date('2024-12-29T11:30:00Z'),
              lastModified: new Date('2024-12-29T11:30:00Z'),
              riskLevel: 'high',
              metadata: {
                scriptId: 'AKfycbwAI_claude_doc',
                description: 'Analyzes HR documents using Claude API and generates summaries',
                parentType: 'DOCS',
                triggers: ['ON_EDIT', 'TIME_DRIVEN'],
                functions: ['analyzeDocument', 'callClaudeAPI', 'generateSummary'],
                permissions: ['DOCS', 'DRIVE', 'EXTERNAL_URL', 'GMAIL'],
                aiEndpoints: ['https://api.anthropic.com/v1/messages'],
                riskFactors: [
                  'Processes documents that may contain employee PII',
                  'Sends document content to Anthropic Claude API',
                  'Has email permissions for automated notifications',
                  'Recent activity indicates active data processing'
                ]
              }
            },
            {
              id: 'google-sa-ai-integration',
              name: 'AI Integration Service Account',
              type: 'integration',
              platform: 'google',
              status: 'active',
              trigger: 'api_key',
              actions: ['data_access', 'api_calls', 'file_operations'],
              createdAt: new Date('2024-07-10T09:00:00Z'),
              lastTriggered: new Date('2025-01-01T08:15:00Z'),
              riskLevel: 'medium',
              metadata: {
                email: 'ai-integration-bot@demo-project-12345.iam.gserviceaccount.com',
                description: 'Service account used by third-party AI automation tools',
                keyCount: 3,
                roles: ['roles/sheets.editor', 'roles/drive.file', 'roles/storage.objectViewer'],
                projectId: 'demo-project-12345',
                thirdPartyIntegration: true,
                detectedPattern: 'AI automation service',
                riskFactors: [
                  'Multiple active API keys increase attack surface',
                  'Third-party integration detected (AI automation platform)',
                  'Has broad data access across Sheets and Drive',
                  'Recently active - processed data within last 24 hours'
                ]
              }
            }
          ],
          metadata: {
            executionTimeMs: 2845,
            automationsFound: 3,
            riskScore: 66,
            platform: 'google',
            discoveryMethods: ['Apps Script API', 'Drive API', 'Service Account Detection'],
            coverage: {
              aiAutomations: 2,
              serviceAccounts: 1,
              highRiskFindings: 2
            }
          }
        }
      };
    } else {
      // Default Slack mock data
      return {
        success: true,
        discovery: {
          automations: [
            {
              id: 'slack-ai-bot-1',
              name: 'AI Customer Support Bot',
              type: 'bot',
              platform: 'slack',
              status: 'active',
              trigger: 'message',
              actions: ['chat:write', 'ai_response', 'data_collection'],
              createdAt: new Date('2024-11-01T10:00:00Z'),
              lastTriggered: new Date('2024-12-30T16:30:00Z'),
              riskLevel: 'medium',
              metadata: {
                botId: 'B01ABC123DEF',
                description: 'AI-powered bot that responds to customer queries',
                permissions: ['channels:read', 'chat:write', 'users:read'],
                aiProvider: 'OpenAI GPT-4',
                riskFactors: [
                  'Accesses customer conversations for AI training',
                  'May inadvertently expose sensitive information',
                  'No data retention policy configured'
                ]
              }
            }
          ],
          metadata: {
            executionTimeMs: 1234,
            automationsFound: 1,
            riskScore: 45
          }
        }
      };
    }
  }
}

/**
 * Real data provider using actual connectors
 * BMAD P0 Priority: Revenue-enabling production API integration
 */
export class RealDataProvider implements DataProvider {
  private oauthStorage = oauthCredentialStorage;

  constructor() {
    // Use singleton instance of OAuth credential storage
  }

  getConnections(): Connection[] {
    // Get stored connections from OAuth credential storage
    const storedConnections = this.oauthStorage.getStoredConnections();

    return storedConnections.map(stored => ({
      id: stored.connectionId,
      platform: stored.platform,
      displayName: `${stored.platform === 'google' ? 'Google Workspace' : 'Slack'} - ${stored.organizationDomain || stored.userEmail}`,
      status: stored.tokenStatus === 'active' ? 'active' : 'inactive',
      permissions: stored.scopes,
      createdAt: stored.connectedAt.toISOString(),
      lastSyncAt: stored.lastUsed.toISOString()
    }));
  }

  async discoverAutomations(connectionId: string, organizationId: string): Promise<DiscoveryResult> {
    // Get connection from hybrid storage using Clerk organization ID
    console.log('🔍 RealDataProvider.discoverAutomations called with:', { connectionId, organizationId });
    const connectionsResult = await hybridStorage.getConnections(organizationId);

    if (!connectionsResult.success) {
      throw new Error(`Failed to get connections: ${connectionsResult.error}`);
    }

    const connections = connectionsResult.data || [];
    const connection = connections.find(c => c.id === connectionId);

    if (!connection) {
      throw new Error(`Connection not found: ${connectionId}. Available connections: ${connections.map(c => c.id).join(', ')}`);
    }

    if (connection.platform_type === 'google') {
      try {
        console.log('🚀 Starting real Google Workspace automation discovery...');
        const startTime = Date.now();

        // Get stored OAuth credentials
        const credentials = await this.oauthStorage.getCredentials(connectionId);
        if (!credentials) {
          throw new Error(`No OAuth credentials found for connection: ${connectionId}`);
        }

        // Initialize Google API client with real credentials
        const googleAPIClient = new GoogleAPIClientService();
        const initialized = await googleAPIClient.initialize(credentials);

        if (!initialized) {
          throw new Error('Failed to initialize Google API client with stored credentials');
        }

        console.log('✅ Google API client authenticated, starting automation discovery...');

        // Use the comprehensive discovery method we just added
        const automations = await googleAPIClient.discoverAutomations({
          dateRange: {
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
            endDate: new Date()
          },
          includeAppsScript: true,
          includeServiceAccounts: true,
          includeEmailAutomation: true,
          includeDriveActivity: false // Start conservative to avoid rate limits
        });

        const executionTimeMs = Date.now() - startTime;
        const riskScore = this.calculateOverallRisk(automations);

        console.log('🎉 Real Google Workspace discovery completed:', {
          connectionId,
          domain: credentials.domain,
          automationsFound: automations.length,
          executionTimeMs,
          riskScore
        });

        return {
          success: true,
          discovery: {
            automations,
            metadata: {
              executionTimeMs,
              automationsFound: automations.length,
              riskScore,
              platform: 'google',
              discoveryMethods: ['Apps Script API', 'Service Account API', 'Admin Reports API'],
              coverage: {
                appsScriptProjects: automations.filter(a => a.id.startsWith('apps-script')).length,
                serviceAccounts: automations.filter(a => a.id.startsWith('service-account')).length,
                emailAutomations: automations.filter(a => a.id.startsWith('email-automation')).length,
                totalRiskFindings: automations.filter(a => a.riskLevel === 'high').length
              }
            }
          }
        };

      } catch (error) {
        console.error('Real Google Workspace discovery failed:', error);

        // Provide helpful error information for debugging
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const isAuthError = errorMessage.includes('authenticate') || errorMessage.includes('credential');

        if (isAuthError) {
          throw new Error(`Google OAuth authentication failed: ${errorMessage}. Please reconnect your Google Workspace account.`);
        } else {
          throw new Error(`Google API discovery failed: ${errorMessage}`);
        }
      }
    } else if (connection.platform_type === 'slack') {
      try {
        console.log('🚀 Starting real Slack automation discovery...');
        const startTime = Date.now();

        // Get stored OAuth credentials
        const credentials = await this.oauthStorage.getCredentials(connectionId);
        if (!credentials) {
          throw new Error(`No OAuth credentials found for connection: ${connectionId}`);
        }

        // Initialize Slack client with real credentials
        const slackAuthResult = await slackConnector.authenticate({
          accessToken: credentials.accessToken,
          refreshToken: credentials.refreshToken || undefined,
          expiresAt: credentials.expiresAt,
          scopes: credentials.scope,
          platform: 'slack'
        } as any);

        if (!slackAuthResult.success) {
          throw new Error(`Failed to authenticate Slack client: ${slackAuthResult.error}`);
        }

        console.log('✅ Slack API client authenticated, starting automation discovery...');

        // Discover automations using authenticated client
        const automations = await slackConnector.discoverAutomations();

        const executionTimeMs = Date.now() - startTime;
        const riskScore = this.calculateOverallRisk(automations);

        console.log(`✅ Slack discovery completed: ${automations.length} automations found in ${executionTimeMs}ms`);

        return {
          success: true,
          discovery: {
            automations,
            metadata: {
              executionTimeMs,
              automationsFound: automations.length,
              riskScore,
              platform: 'slack',
              discoveryMethods: ['Bots API', 'Apps API', 'Workflows API', 'Team Integrations']
            }
          }
        };
      } catch (error) {
        console.error('Real Slack discovery failed:', error);

        // Provide helpful error information for debugging
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const isAuthError = errorMessage.includes('authenticate') || errorMessage.includes('credential');

        if (isAuthError) {
          throw new Error(`Slack OAuth authentication failed: ${errorMessage}. Please reconnect your Slack workspace.`);
        } else {
          throw new Error(`Slack API discovery failed: ${errorMessage}`);
        }
      }
    } else {
      throw new Error(`Unknown connection platform for ID: ${connectionId}`);
    }
  }

  private calculateOverallRisk(automations: AutomationEvent[]): number {
    if (automations.length === 0) return 0;
    
    // Calculate risk based on risk levels since we don't have numeric scores
    const riskScores = automations.map(automation => {
      switch (automation.riskLevel) {
        case 'high': return 75;
        case 'medium': return 45;
        case 'low': return 15;
        default: return 30;
      }
    });
    
    const totalRisk = riskScores.reduce((sum, score) => sum + score, 0);
    
    return Math.round(totalRisk / automations.length);
  }
}

/**
 * Enhanced factory function to get the appropriate data provider
 * Now supports runtime toggle state checking
 */
export function getDataProvider(useMockData?: boolean): DataProvider {
  // Check runtime toggle state if available (development only)
  let runtimeToggleState = false;
  try {
    // Only attempt to get runtime state in development
    if (process.env.NODE_ENV === 'development') {
      const { isMockDataEnabledRuntime } = require('../routes/dev-routes');
      runtimeToggleState = isMockDataEnabledRuntime();
    }
  } catch (error) {
    // Fallback to environment variable if runtime state unavailable
    console.warn('Runtime toggle state unavailable, falling back to environment variable:', error instanceof Error ? error.message : 'Unknown error');
  }

  // Priority order: explicit parameter > runtime toggle > environment variable
  const shouldUseMock = useMockData !== undefined 
    ? useMockData 
    : (process.env.NODE_ENV === 'development' ? runtimeToggleState : false) || process.env.USE_MOCK_DATA === 'true';
  
  // SECURITY: Never use mock data in production regardless of any toggle state
  if (process.env.NODE_ENV === 'production' && shouldUseMock) {
    console.error('SECURITY WARNING: Mock data requested in production environment - blocking');
    return new RealDataProvider();
  }

  console.log('Data Provider Selection:', {
    environment: process.env.NODE_ENV,
    runtimeToggle: process.env.NODE_ENV === 'development' ? runtimeToggleState : 'disabled',
    environmentVariable: process.env.USE_MOCK_DATA,
    explicitParameter: useMockData,
    finalDecision: shouldUseMock ? 'MockDataProvider' : 'RealDataProvider'
  });
  
  if (shouldUseMock) {
    return new MockDataProvider();
  } else {
    return new RealDataProvider();
  }
}

/**
 * Check if data toggle is enabled in environment
 */
export function isDataToggleEnabled(): boolean {
  return process.env.ENABLE_DATA_TOGGLE === 'true';
}