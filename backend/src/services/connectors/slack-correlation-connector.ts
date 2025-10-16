/**
 * Slack Platform Connector for Cross-Platform Correlation
 * Provides correlation-specific event data from Slack platform for automation chain detection
 *
 * Business Impact:
 * - Enables Slack → other platform correlation analysis for professional tier pricing
 * - Provides real-time Slack automation detection for executive dashboards
 * - Creates baseline for 2-platform correlation MVP (revenue enablement)
 *
 * Integration Points:
 * - Leverages existing SlackOAuthService for authentication
 * - Converts Slack events to MultiPlatformEvent format for correlation engine
 * - Provides real-time event streaming for continuous correlation monitoring
 */

import {
  MultiPlatformEvent,
  SlackActivityEvent,
  AutomationEvent
} from '@singura/shared-types';

import { SlackOAuthService } from '../slack-oauth-service';
import { WebClient } from '@slack/web-api';

/**
 * Slack-specific correlation event configuration
 */
interface SlackCorrelationConfig {
  enableRealTimeEvents: boolean;
  correlationEventTypes: string[]; // Event types relevant for correlation
  maxEventsPerRequest: number;
  lookbackDays: number;
}

/**
 * Slack Platform Connector for Correlation Analysis
 *
 * Responsibilities:
 * 1. Extract correlation-relevant events from Slack workspace
 * 2. Convert Slack events to standardized MultiPlatformEvent format
 * 3. Provide real-time event streaming for continuous correlation
 * 4. Filter events for automation indicators and cross-platform triggers
 */
export class SlackCorrelationConnector {
  public readonly platform = 'slack' as const;

  private slackOAuthService: SlackOAuthService;
  private config: SlackCorrelationConfig;
  private slackClient: WebClient | null = null;

  constructor(
    slackOAuthService: SlackOAuthService,
    config?: Partial<SlackCorrelationConfig>
  ) {
    this.slackOAuthService = slackOAuthService;

    this.config = {
      enableRealTimeEvents: true,
      correlationEventTypes: [
        'message',
        'file_shared',
        'app_mention',
        'workflow_step_execute',
        'shortcut',
        'slash_command',
        'app_home_opened',
        'reaction_added'
      ],
      maxEventsPerRequest: 1000,
      lookbackDays: 7,
      ...config
    };
  }

  /**
   * Check if Slack platform is connected and available for correlation
   */
  async isConnected(): Promise<boolean> {
    try {
      // Import the singleton OAuth credential storage service
      const { oauthCredentialStorage } = await import('../oauth-credential-storage-service');

      // Get all stored connections to find Slack connection
      const connections = oauthCredentialStorage.getStoredConnections();
      const slackConnection = connections.find(conn => conn.platform === 'slack');

      if (!slackConnection) {
        console.log('No Slack connection found in OAuth storage');
        return false;
      }

      // Retrieve OAuth credentials securely using singleton pattern
      const credentials = await oauthCredentialStorage.getCredentials(slackConnection.connectionId);

      if (!credentials) {
        console.warn('Slack OAuth credentials not found for connection:', slackConnection.connectionId);
        return false;
      }

      // Initialize Slack client with retrieved credentials
      if (!this.slackClient) {
        const { WebClient } = await import('@slack/web-api');
        this.slackClient = new WebClient(credentials.accessToken);
        console.log('✅ Slack client initialized with OAuth credentials');
      }

      // Test connection with auth.test API call
      const authTest = await this.slackClient.auth.test();

      // Track API call for quota monitoring
      const { apiMetricsService } = await import('../api-metrics-service');
      await apiMetricsService.trackAPICall(
        slackConnection.connectionId,
        'slack',
        'auth.test',
        1
      );

      return authTest.ok === true;
    } catch (error) {
      console.error('Slack connection test failed:', error);
      return false;
    }
  }

  /**
   * Retrieve correlation-relevant events from Slack for specified time range
   * Converts Slack events to MultiPlatformEvent format for correlation analysis
   */
  async getCorrelationEvents(timeRange: { start: Date; end: Date }): Promise<MultiPlatformEvent[]> {
    if (!this.slackClient) {
      const isConnected = await this.isConnected();
      if (!isConnected) {
        throw new Error('Slack platform is not connected');
      }
    }

    const multiPlatformEvents: MultiPlatformEvent[] = [];

    try {
      // Get conversations (channels) to scan for events
      const conversations = await this.slackClient!.conversations.list({
        exclude_archived: true,
        limit: 100
      });

      if (!conversations.channels) {
        console.warn('No Slack channels found for correlation analysis');
        return [];
      }

      // Process each channel for correlation events
      for (const channel of conversations.channels) {
        if (!channel.id) continue;

        try {
          const channelEvents = await this.getChannelCorrelationEvents(
            channel.id,
            timeRange
          );
          multiPlatformEvents.push(...channelEvents);

          // Respect rate limits
          await this.sleep(100);
        } catch (error) {
          console.warn(`Failed to get events from channel ${channel.name}:`, error);
          continue;
        }
      }

      // Get app events and automation triggers
      const appEvents = await this.getAppAutomationEvents(timeRange);
      multiPlatformEvents.push(...appEvents);

      console.log(`Collected ${multiPlatformEvents.length} correlation events from Slack`);
      return multiPlatformEvents;

    } catch (error) {
      console.error('Failed to retrieve Slack correlation events:', error);
      throw new Error(`Slack correlation event retrieval failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Subscribe to real-time Slack events for continuous correlation monitoring
   * Provides streaming events for immediate correlation analysis
   */
  async* subscribeToRealTimeEvents(): AsyncGenerator<MultiPlatformEvent> {
    if (!this.config.enableRealTimeEvents) {
      console.warn('Real-time events are disabled for Slack correlation connector');
      return;
    }

    if (!this.slackClient) {
      const isConnected = await this.isConnected();
      if (!isConnected) {
        throw new Error('Slack platform is not connected for real-time events');
      }
    }

    // Implementation note: This would typically use Slack's Events API with webhooks
    // For now, we'll implement a polling-based approach for real-time events
    console.log('Starting real-time Slack event subscription for correlation...');

    while (true) {
      try {
        // Poll for recent events (last 5 minutes)
        const recentTimeRange = {
          start: new Date(Date.now() - 5 * 60 * 1000),
          end: new Date()
        };

        const recentEvents = await this.getCorrelationEvents(recentTimeRange);

        for (const event of recentEvents) {
          yield event;
        }

        // Wait before next poll
        await this.sleep(30000); // 30 seconds between polls

      } catch (error) {
        console.error('Real-time Slack event subscription error:', error);
        await this.sleep(60000); // Wait 1 minute before retrying
      }
    }
  }

  // Private helper methods

  private async getChannelCorrelationEvents(
    channelId: string,
    timeRange: { start: Date; end: Date }
  ): Promise<MultiPlatformEvent[]> {
    const events: MultiPlatformEvent[] = [];

    try {
      // Get channel history for the specified time range
      const history = await this.slackClient!.conversations.history({
        channel: channelId,
        oldest: (timeRange.start.getTime() / 1000).toString(),
        latest: (timeRange.end.getTime() / 1000).toString(),
        limit: this.config.maxEventsPerRequest
      });

      if (!history.messages) {
        return events;
      }

      // Process messages for correlation indicators
      for (const message of history.messages) {
        if (!message.ts || !message.user) continue;

        const correlationEvent = await this.convertSlackMessageToMultiPlatformEvent(
          message,
          channelId
        );

        if (correlationEvent && this.isCorrelationRelevant(correlationEvent)) {
          events.push(correlationEvent);
        }
      }

    } catch (error) {
      console.error(`Failed to get channel history for ${channelId}:`, error);
    }

    return events;
  }

  private async convertSlackMessageToMultiPlatformEvent(
    message: any,
    channelId: string
  ): Promise<MultiPlatformEvent | null> {
    try {
      // Get user information
      const userInfo = await this.slackClient!.users.info({
        user: message.user
      });

      if (!userInfo.user) {
        return null;
      }

      const timestamp = new Date(parseFloat(message.ts) * 1000);

      // Analyze message for automation indicators
      const automationIndicators = this.analyzeSlackMessageForAutomation(message);

      const multiPlatformEvent: MultiPlatformEvent = {
        eventId: `slack-${message.ts}-${channelId}`,
        platform: 'slack',
        timestamp,
        userId: message.user,
        userEmail: userInfo.user.profile?.email || `${message.user}@slack.unknown`,
        eventType: message.subtype || 'message',
        resourceId: channelId,
        resourceType: 'channel',
        actionDetails: {
          action: message.subtype || 'message_posted',
          resourceName: `Channel ${channelId}`,
          metadata: {
            messageText: message.text,
            hasAttachments: Boolean(message.files && message.files.length > 0),
            hasBlocks: Boolean(message.blocks),
            botId: message.bot_id,
            appId: message.app_id,
            threadTs: message.thread_ts
          }
        },
        correlationMetadata: {
          potentialTrigger: this.isPotentialTrigger(message),
          potentialAction: this.isPotentialAction(message),
          externalDataAccess: this.hasExternalDataAccess(message),
          automationIndicators
        }
      };

      return multiPlatformEvent;

    } catch (error) {
      console.error('Failed to convert Slack message to MultiPlatformEvent:', error);
      return null;
    }
  }

  private async getAppAutomationEvents(
    timeRange: { start: Date; end: Date }
  ): Promise<MultiPlatformEvent[]> {
    const events: MultiPlatformEvent[] = [];

    try {
      // Get team information for app context
      const teamInfo = await this.slackClient!.team.info();

      // Note: In a real implementation, we would use Slack's audit logs API
      // to get app installation, workflow execution, and automation events
      // For now, we'll create placeholder events based on common automation patterns

      // Simulate workflow automation events
      const workflowEvent: MultiPlatformEvent = {
        eventId: `slack-workflow-${Date.now()}`,
        platform: 'slack',
        timestamp: new Date(),
        userId: 'system',
        userEmail: 'system@slack.automation',
        eventType: 'workflow_execution',
        resourceId: 'workflow-automation',
        resourceType: 'workflow',
        actionDetails: {
          action: 'workflow_triggered',
          resourceName: 'Slack Workflow Automation',
          metadata: {
            teamDomain: teamInfo.team?.domain,
            automationType: 'workflow'
          }
        },
        correlationMetadata: {
          potentialTrigger: true,
          potentialAction: false,
          externalDataAccess: true,
          automationIndicators: ['workflow_execution', 'automated_process']
        }
      };

      events.push(workflowEvent);

    } catch (error) {
      console.error('Failed to get Slack app automation events:', error);
    }

    return events;
  }

  private analyzeSlackMessageForAutomation(message: any): string[] {
    const indicators: string[] = [];

    // Check for bot messages
    if (message.bot_id || message.app_id) {
      indicators.push('bot_message');
    }

    // Check for automated formatting patterns
    if (message.blocks && message.blocks.length > 0) {
      indicators.push('structured_message');
    }

    // Check for file sharing (potential automation)
    if (message.files && message.files.length > 0) {
      indicators.push('file_sharing');
    }

    // Check for external links (potential data export)
    if (message.text && message.text.includes('http')) {
      indicators.push('external_link');
    }

    // Check for workflow mentions
    if (message.text && (/workflow|automation|schedule|trigger/i.test(message.text))) {
      indicators.push('workflow_mention');
    }

    // Check for slash command usage
    if (message.text && message.text.startsWith('/')) {
      indicators.push('slash_command');
    }

    return indicators;
  }

  private isPotentialTrigger(message: any): boolean {
    // Messages that could trigger cross-platform automation
    return Boolean(
      message.bot_id ||
      message.app_id ||
      (message.text && /trigger|start|execute|run/i.test(message.text)) ||
      message.files?.length > 0
    );
  }

  private isPotentialAction(message: any): boolean {
    // Messages that could be the result of automation
    return Boolean(
      message.bot_id ||
      (message.text && /completed|finished|done|processed/i.test(message.text)) ||
      message.blocks?.length > 0
    );
  }

  private hasExternalDataAccess(message: any): boolean {
    // Check if message involves external data access
    return Boolean(
      message.files?.some((file: any) => file.external_type) ||
      (message.text && message.text.includes('http')) ||
      message.attachments?.length > 0
    );
  }

  private isCorrelationRelevant(event: MultiPlatformEvent): boolean {
    // Filter events that are relevant for cross-platform correlation
    return (
      event.correlationMetadata.automationIndicators.length > 0 ||
      event.correlationMetadata.potentialTrigger ||
      event.correlationMetadata.potentialAction ||
      event.correlationMetadata.externalDataAccess
    );
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Update connector configuration
   */
  updateConfiguration(config: Partial<SlackCorrelationConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('Slack correlation connector configuration updated:', config);
  }

  /**
   * Get current connector configuration
   */
  getConfiguration(): SlackCorrelationConfig {
    return { ...this.config };
  }
}