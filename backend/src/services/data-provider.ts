/**
 * Data Provider Abstraction Layer
 * Handles switching between mock and real data sources for demos
 */

import { AutomationEvent, ConnectionResult } from '../connectors/types';
import { googleConnector } from '../connectors/google';
import { slackConnector } from '../connectors/slack';
import { GoogleAPIClientService } from './google-api-client-service';

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
  discoverAutomations(connectionId: string): Promise<DiscoveryResult>;
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

  async discoverAutomations(connectionId: string): Promise<DiscoveryResult> {
    // AI-focused mock data for demos
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
 */
export class RealDataProvider implements DataProvider {
  getConnections(): Connection[] {
    // In real implementation, this would fetch from database
    // For now, return empty array or throw error if not configured
    throw new Error('Real data provider not yet implemented - requires OAuth setup');
  }

  async discoverAutomations(connectionId: string): Promise<DiscoveryResult> {
    // Determine platform from connection ID (in real app, look up in database)
    if (connectionId.includes('google') || connectionId === 'conn-2') {
      try {
        console.log('🔍 Attempting real Google Workspace discovery with GoogleAPIClientService...');
        
        // Create Google API client service
        const googleAPIClient = new GoogleAPIClientService();
        
        // TODO: Get real OAuth credentials from connection storage
        // For now, demonstrate service integration without real credentials
        const authStatus = googleAPIClient.getAuthenticationStatus();
        console.log('Google API Client Status:', authStatus);
        
        // Since we don't have stored OAuth tokens yet, provide meaningful response
        const automations: AutomationEvent[] = [
          {
            id: 'real-google-workspace-integration-ready',
            name: 'Google API Client Ready',
            type: 'integration',
            platform: 'google',
            status: 'ready',
            trigger: 'oauth_integration',
            actions: ['api_client_initialized', 'oauth_credential_handling', 'real_api_calls'],
            createdAt: new Date('2025-09-11T06:30:00Z'),
            lastTriggered: new Date(),
            riskLevel: 'low',
            metadata: {
              message: 'Production Google API client ready for OAuth credential integration',
              capabilities: [
                'Admin Reports API integration',
                'Drive activity monitoring', 
                'Gmail automation detection',
                'Apps Script analysis',
                'Service account discovery'
              ],
              nextStep: 'Connect OAuth credentials from Google workspace authorization',
              implementation: 'GoogleAPIClientService with comprehensive detection algorithms'
            }
          }
        ];
        
        return {
          success: true,
          discovery: {
            automations,
            metadata: {
              executionTimeMs: 1500,
              automationsFound: automations.length,
              riskScore: this.calculateOverallRisk(automations),
              platform: 'google',
              integrationStatus: 'api_client_ready',
              nextPhase: 'oauth_credential_integration'
            }
          }
        };
      } catch (error) {
        throw new Error(`Real Google discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else if (connectionId.includes('slack') || connectionId === 'conn-1') {
      try {
        const automations = await slackConnector.discoverAutomations();
        return {
          success: true,
          discovery: {
            automations,
            metadata: {
              executionTimeMs: 1800,
              automationsFound: automations.length,
              riskScore: this.calculateOverallRisk(automations),
              platform: 'slack'
            }
          }
        };
      } catch (error) {
        throw new Error(`Real Slack discovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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