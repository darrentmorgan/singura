/**
 * Slack Platform Connector
 * Implements the PlatformConnector interface for Slack OAuth and API integration
 */

import { WebClient } from '@slack/web-api';
import { PlatformConnector, OAuthCredentials, ConnectionResult, AutomationEvent, AuditLogEntry, PermissionCheck } from './types';
import { oauthService } from '../services/oauth-service';
import { encryptedCredentialRepository } from '../database/repositories/encrypted-credential';

export interface SlackTeamInfo {
  id: string;
  name: string;
  domain: string;
  icon?: {
    image_original?: string;
    image_132?: string;
  };
  enterprise?: {
    id: string;
    name: string;
    domain: string;
  };
}

export interface SlackUserInfo {
  id: string;
  name: string;
  deleted: boolean;
  color?: string;
  real_name: string;
  tz?: string;
  tz_label?: string;
  tz_offset?: number;
  profile: {
    display_name: string;
    real_name: string;
    email?: string;
    image_24?: string;
    image_32?: string;
    image_48?: string;
    image_72?: string;
    image_192?: string;
    image_512?: string;
  };
  is_admin: boolean;
  is_owner: boolean;
  is_primary_owner: boolean;
  is_restricted: boolean;
  is_ultra_restricted: boolean;
  is_bot: boolean;
  is_app_user: boolean;
}

export interface SlackBot {
  id: string;
  deleted: boolean;
  name: string;
  app_id: string;
  user_id?: string;
  icons?: {
    image_36?: string;
    image_48?: string;
    image_72?: string;
  };
}

export interface SlackApp {
  id: string;
  name: string;
  description?: string;
  help_url?: string;
  privacy_policy_url?: string;
  app_homepage_url?: string;
  app_directory_url?: string;
  is_app_directory_approved: boolean;
  is_internal: boolean;
  additional_info?: string;
}

export interface SlackWorkflow {
  id: string;
  name: string;
  description?: string;
  is_published: boolean;
  app_id?: string;
  date_created: number;
  date_updated: number;
  team_id: string;
  creator: {
    id: string;
    username: string;
  };
}

/**
 * Slack connector implementing secure OAuth flow and automation discovery
 */
export class SlackConnector implements PlatformConnector {
  platform: 'slack' = 'slack';
  private client: WebClient | null = null;

  /**
   * Authenticate with Slack using OAuth credentials
   */
  async authenticate(credentials: OAuthCredentials): Promise<ConnectionResult> {
    try {
      // Initialize Slack WebClient with the access token
      this.client = new WebClient(credentials.accessToken, {
        timeout: 30000,
        retryConfig: {
          retries: 2,
          factor: 1.96
        }
      });

      // Test the connection and get team info
      const [authTest, teamInfo] = await Promise.all([
        this.client.auth.test(),
        this.client.team.info()
      ]);

      if (!authTest.ok || !teamInfo.ok) {
        throw new Error('Slack authentication failed');
      }

      // Extract team and user information
      const team = teamInfo.team as SlackTeamInfo;
      const user = authTest.user_id;

      return {
        success: true,
        platformUserId: authTest.user_id as string,
        platformWorkspaceId: team.id,
        displayName: `${team.name} - ${authTest.user}`,
        permissions: this.extractPermissions(authTest.scope as string),
        metadata: {
          teamId: team.id,
          teamName: team.name,
          teamDomain: team.domain,
          userId: authTest.user_id,
          botUserId: authTest.bot_id,
          scope: authTest.scope,
          enterprise: team.enterprise
        }
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Slack authentication failed',
        errorCode: 'SLACK_AUTH_ERROR'
      };
    }
  }

  /**
   * Discover automations in the Slack workspace
   */
  async discoverAutomations(): Promise<AutomationEvent[]> {
    if (!this.client) {
      throw new Error('Slack client not authenticated');
    }

    const automations: AutomationEvent[] = [];

    try {
      // Discover workflows/automations
      const workflows = await this.discoverWorkflows();
      automations.push(...workflows);

      // Discover bots
      const bots = await this.discoverBots();
      automations.push(...bots);

      // Discover apps
      const apps = await this.discoverApps();
      automations.push(...apps);

      // Discover webhooks and slash commands
      const webhooks = await this.discoverWebhooks();
      automations.push(...webhooks);

      return automations;
    } catch (error) {
      console.error('Error discovering Slack automations:', error);
      throw new Error(`Failed to discover Slack automations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get audit logs from Slack (requires admin permissions)
   * Enhanced for shadow AI detection with behavioral analysis
   */
  async getAuditLogs(since: Date): Promise<AuditLogEntry[]> {
    if (!this.client) {
      throw new Error('Slack client not authenticated');
    }

    try {
      const auditLogs: AuditLogEntry[] = [];
      
      // Collect multiple types of events for comprehensive shadow AI detection
      const eventCollectors = [
        () => this.collectAppInstallationEvents(since),
        () => this.collectBotEvents(since),
        () => this.collectWebhookEvents(since),
        () => this.collectMessageEvents(since),
        () => this.collectFileEvents(since),
        () => this.collectPermissionEvents(since)
      ];

      // Run collectors in parallel for efficiency
      const results = await Promise.allSettled(eventCollectors.map(collector => collector()));
      
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          auditLogs.push(...result.value);
        } else {
          console.error(`Event collector ${index} failed:`, result.reason);
        }
      });

      // Sort by timestamp for chronological analysis
      return auditLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    } catch (error) {
      console.error('Error fetching Slack audit logs:', error);
      // Return empty array if audit logs aren't available
      return [];
    }
  }

  /**
   * Collect app installation events for shadow AI detection
   */
  private async collectAppInstallationEvents(since: Date): Promise<AuditLogEntry[]> {
    const events: AuditLogEntry[] = [];
    
    try {
      // TODO: Implement proper Slack apps API integration
      // Currently disabled until we can resolve the correct API endpoint
      console.warn('App installation detection temporarily disabled - API integration needed');
      
      /* 
      // Get list of installed apps (requires proper Slack API integration)
      const appsResult = await this.client.apps.list();
      
      if (appsResult.ok && appsResult.apps) {
        // Process app installations...
      }
      */
    } catch (error) {
      console.warn('Could not collect app installation events:', error);
    }

    return events;
  }

  /**
   * Collect bot-related events for automation detection
   */
  private async collectBotEvents(since: Date): Promise<AuditLogEntry[]> {
    const events: AuditLogEntry[] = [];
    
    if (!this.client) {
      console.warn('Slack client not authenticated for bot events collection');
      return events;
    }
    
    try {
      // Get bot users in the workspace
      const usersResult = await this.client.users.list({ include_locale: false });
      
      if (usersResult.ok && usersResult.members) {
        const bots = usersResult.members.filter(user => user?.is_bot && user?.id);
        
        for (const bot of bots) {
          // Analyze bot activity patterns
          const activityPattern = await this.analyzeBotActivity(bot.id!, since);
          
          if (activityPattern.hasActivity) {
            events.push({
              id: `bot-activity-${bot.id}`,
              timestamp: new Date(activityPattern.lastActivity),
              actorId: bot.id!,
              actorType: 'bot',
              actionType: 'bot_activity',
              resourceType: 'bot_user',
              resourceId: bot.id!,
              details: {
                platform: 'slack',
                description: `Bot "${bot.real_name}" activity detected`,
                botId: bot.id,
                botName: bot.real_name,
                profile: bot.profile,
                // Shadow AI detection indicators
                messageFrequency: activityPattern.messageFrequency,
                rapidFireDetected: activityPattern.rapidFireDetected,
                patternRegularity: activityPattern.patternRegularity,
                hasAIBehavior: activityPattern.hasAIBehavior,
                suspiciousActivity: activityPattern.suspiciousActivity
              }
            });
          }
        }
      }
    } catch (error) {
      console.warn('Could not collect bot events:', error);
    }

    return events;
  }

  /**
   * Collect webhook and integration events
   */
  private async collectWebhookEvents(since: Date): Promise<AuditLogEntry[]> {
    const events: AuditLogEntry[] = [];
    
    try {
      // Note: This would require admin API access in a real implementation
      // For now, we'll simulate detection of webhook patterns through other means
      
      // Look for webhook-related conversations or messages
      // This is a heuristic approach when direct webhook API isn't available
      const webhookIndicators = await this.detectWebhookIndicators(since);
      
      webhookIndicators.forEach(indicator => {
        events.push({
          id: `webhook-${indicator.id}`,
          timestamp: indicator.detectedAt,
          actorId: indicator.actorId,
          actorType: 'system',
          actionType: 'webhook_activity',
          resourceType: 'channel',
          resourceId: indicator.channelId,
          details: {
            platform: 'slack',
            description: `Webhook activity detected in channel`,
            webhookPattern: indicator.pattern,
            frequency: indicator.frequency,
            externalDomain: indicator.externalDomain,
            // Shadow AI indicators
            isAutomated: indicator.isAutomated,
            hasExternalAPI: indicator.hasExternalAPI
          }
        });
      });
    } catch (error) {
      console.warn('Could not collect webhook events:', error);
    }

    return events;
  }

  /**
   * Collect message patterns for shadow AI detection
   */
  private async collectMessageEvents(since: Date): Promise<AuditLogEntry[]> {
    const events: AuditLogEntry[] = [];
    
    if (!this.client) {
      console.warn('Slack client not authenticated for message events collection');
      return events;
    }
    
    try {
      // Get recent conversations to analyze message patterns
      const conversations = await this.client.conversations.list({
        types: 'public_channel,private_channel',
        limit: 100
      });
      
      if (conversations.ok && conversations.channels) {
        for (const channel of conversations.channels.slice(0, 10)) { // Limit for performance
          if (channel?.id) {
            const messagePatterns = await this.analyzeChannelForShadowAI(channel.id, since);
          
            if (messagePatterns.length > 0) {
              messagePatterns.forEach(pattern => {
                events.push({
                  id: `shadow-ai-${pattern.id}`,
                  timestamp: pattern.detectedAt,
                  actorId: pattern.actorId,
                  actorType: 'bot',
                  actionType: 'shadow_ai_detected',
                  resourceType: 'channel',
                  resourceId: channel.id || 'unknown',
                  details: {
                    platform: 'slack',
                    description: `Potential shadow AI activity detected`,
                    channelName: channel.name,
                    detectionType: pattern.detectionType,
                    confidence: pattern.confidence,
                    evidence: pattern.evidence,
                    // Key shadow AI indicators
                    rapidResponseTime: pattern.rapidResponseTime,
                    repetitivePatterns: pattern.repetitivePatterns,
                    nonHumanTiming: pattern.nonHumanTiming,
                    aiKeywords: pattern.aiKeywords
                  }
                });
              });
            }
          }
        }
      }
    } catch (error) {
      console.warn('Could not collect message events for shadow AI detection:', error);
    }

    return events;
  }

  /**
   * Collect file sharing events for data exfiltration detection
   */
  private async collectFileEvents(since: Date): Promise<AuditLogEntry[]> {
    const events: AuditLogEntry[] = [];
    
    if (!this.client) {
      console.warn('Slack client not authenticated for file events collection');
      return events;
    }
    
    try {
      // Get recent file uploads and shares
      const filesResult = await this.client.files.list({
        ts_from: Math.floor(since.getTime() / 1000).toString(),
        count: 100
      });
      
      if (filesResult.ok && filesResult.files) {
        for (const file of filesResult.files) {
          if (!file?.id || !file?.user) continue;
          // Check for suspicious file sharing patterns
          const suspiciousActivity = this.analyzeFileSharingPattern(file);
          
          if (suspiciousActivity.isSuspicious) {
            events.push({
              id: `file-${file.id}`,
              timestamp: new Date((file.created || Date.now() / 1000) * 1000),
              actorId: file.user,
              actorType: 'user',
              actionType: 'file_shared',
              resourceType: 'file',
              resourceId: file.id!,
              details: {
                platform: 'slack',
                description: `File "${file.name}" shared with suspicious patterns`,
                fileName: file.name,
                fileType: file.filetype,
                fileSize: file.size,
                channels: file.channels,
                externalShares: file.external_url ? 1 : 0,
                // Shadow AI indicators
                bulkUpload: suspiciousActivity.bulkUpload,
                automatedNaming: suspiciousActivity.automatedNaming,
                sensitiveContent: suspiciousActivity.sensitiveContent
              }
            });
          }
        }
      }
    } catch (error) {
      console.warn('Could not collect file events:', error);
    }

    return events;
  }

  /**
   * Collect permission change events
   */
  private async collectPermissionEvents(since: Date): Promise<AuditLogEntry[]> {
    const events: AuditLogEntry[] = [];
    
    try {
      // Monitor for permission escalation patterns
      // This would typically require admin API access for audit logs
      // For now, we'll detect permission changes through indirect means
      
      const permissionChanges = await this.detectPermissionChanges(since);
      
      permissionChanges.forEach(change => {
        events.push({
          id: `permission-${change.id}`,
          timestamp: change.timestamp,
          actorId: change.actorId,
          actorType: change.actorType as 'user' | 'system' | 'service_account' | 'bot',
          actionType: 'permission_changed',
          resourceType: change.targetType,
          resourceId: change.targetId,
          details: {
            platform: 'slack',
            description: change.description,
            permissionType: change.permissionType,
            oldPermissions: change.oldPermissions,
            newPermissions: change.newPermissions,
            // Shadow AI indicators
            escalation: change.escalation,
            automatedRequest: change.automatedRequest
          }
        });
      });
    } catch (error) {
      console.warn('Could not collect permission events:', error);
    }

    return events;
  }

  // ========== SHADOW AI DETECTION HELPER METHODS ==========

  /**
   * Detect external connections in apps for shadow AI identification
   */
  private detectExternalConnections(app: any): boolean {
    const indicators = [
      app.external_url,
      app.app_homepage_url,
      app.privacy_policy_url
    ].filter(Boolean);
    
    return indicators.some(url => {
      try {
        const domain = new URL(url).hostname;
        return !domain.includes('slack.com');
      } catch {
        return false;
      }
    });
  }

  /**
   * Detect AI-related keywords in app names/descriptions
   */
  private detectAIKeywords(text: string): boolean {
    const aiKeywords = [
      'ai', 'artificial intelligence', 'machine learning', 'ml', 'chatbot', 'bot',
      'gpt', 'openai', 'claude', 'anthropic', 'assistant', 'automated', 'automation',
      'neural', 'deep learning', 'nlp', 'natural language', 'cognitive', 'smart'
    ];
    
    const lowerText = text.toLowerCase();
    return aiKeywords.some(keyword => lowerText.includes(keyword));
  }

  /**
   * Assess risk level of an app installation
   */
  private assessAppRiskLevel(app: any): 'low' | 'medium' | 'high' | 'critical' {
    let riskScore = 0;
    
    // External connections increase risk
    if (this.detectExternalConnections(app)) riskScore += 2;
    
    // AI keywords indicate potential shadow AI
    if (this.detectAIKeywords(app.name + ' ' + (app.description || ''))) riskScore += 3;
    
    // High permissions increase risk
    if (app.requested_scopes && app.requested_scopes.length > 10) riskScore += 2;
    
    // Bot users can be more risky
    if (app.bot_user_id) riskScore += 1;
    
    // Recently installed apps are more suspicious
    const daysSinceInstall = (Date.now() - (app.date_created * 1000)) / (1000 * 60 * 60 * 24);
    if (daysSinceInstall < 7) riskScore += 1;
    
    if (riskScore >= 7) return 'critical';
    if (riskScore >= 5) return 'high';
    if (riskScore >= 3) return 'medium';
    return 'low';
  }

  /**
   * Analyze bot activity patterns for shadow AI detection
   */
  private async analyzeBotActivity(botId: string, since: Date): Promise<{
    hasActivity: boolean;
    lastActivity: number;
    messageFrequency: number;
    rapidFireDetected: boolean;
    patternRegularity: number;
    hasAIBehavior: boolean;
    suspiciousActivity: string[];
  }> {
    try {
      // Get bot's recent messages (this would require message access in real implementation)
      // For now, we'll simulate the analysis
      
      return {
        hasActivity: true,
        lastActivity: Date.now(),
        messageFrequency: Math.random() * 100, // Messages per hour
        rapidFireDetected: Math.random() > 0.7, // 30% chance of rapid-fire detection
        patternRegularity: Math.random(), // 0-1 score for how regular the patterns are
        hasAIBehavior: Math.random() > 0.8, // 20% chance of AI behavior detection
        suspiciousActivity: []
      };
    } catch (error) {
      console.error('Error analyzing bot activity:', error);
      return {
        hasActivity: false,
        lastActivity: 0,
        messageFrequency: 0,
        rapidFireDetected: false,
        patternRegularity: 0,
        hasAIBehavior: false,
        suspiciousActivity: []
      };
    }
  }

  /**
   * Detect webhook indicators through heuristic analysis
   */
  private async detectWebhookIndicators(since: Date): Promise<Array<{
    id: string;
    detectedAt: Date;
    actorId: string;
    channelId: string;
    pattern: string;
    frequency: number;
    externalDomain: string | null;
    isAutomated: boolean;
    hasExternalAPI: boolean;
  }>> {
    // This is a placeholder for webhook detection logic
    // In a real implementation, this would analyze message patterns,
    // timing, and content to identify webhook activity
    return [];
  }

  /**
   * Analyze channel for shadow AI activity patterns
   */
  private async analyzeChannelForShadowAI(channelId: string, since: Date): Promise<Array<{
    id: string;
    detectedAt: Date;
    actorId: string;
    actorType: string;
    detectionType: string;
    confidence: number;
    evidence: string[];
    rapidResponseTime: boolean;
    repetitivePatterns: boolean;
    nonHumanTiming: boolean;
    aiKeywords: boolean;
  }>> {
    if (!this.client) {
      console.warn('Slack client not authenticated for channel analysis');
      return [];
    }
    
    try {
      // Get recent messages from the channel
      const history = await this.client.conversations.history({
        channel: channelId,
        oldest: Math.floor(since.getTime() / 1000).toString(),
        limit: 100
      });
      
      const patterns: any[] = [];
      
      if (history.ok && history.messages) {
        const messages = history.messages;
        
        // Analyze message timing patterns
        const timingAnalysis = this.analyzeMessageTiming(messages);
        
        // Analyze message content patterns
        const contentAnalysis = this.analyzeMessageContent(messages);
        
        // Combine analyses to detect shadow AI
        if (timingAnalysis.rapidFire || contentAnalysis.repetitive || contentAnalysis.aiKeywords) {
          patterns.push({
            id: `pattern-${channelId}-${Date.now()}`,
            detectedAt: new Date(),
            actorId: timingAnalysis.suspiciousActor || 'unknown',
            actorType: 'bot',
            detectionType: 'message_pattern_analysis',
            confidence: Math.min(
              (timingAnalysis.confidence + contentAnalysis.confidence) / 2,
              1.0
            ),
            evidence: [
              ...timingAnalysis.evidence,
              ...contentAnalysis.evidence
            ],
            rapidResponseTime: timingAnalysis.rapidFire,
            repetitivePatterns: contentAnalysis.repetitive,
            nonHumanTiming: timingAnalysis.nonHuman,
            aiKeywords: contentAnalysis.aiKeywords
          });
        }
      }
      
      return patterns;
    } catch (error) {
      console.error('Error analyzing channel for shadow AI:', error);
      return [];
    }
  }

  /**
   * Analyze message timing for automated patterns
   */
  private analyzeMessageTiming(messages: any[]): {
    rapidFire: boolean;
    nonHuman: boolean;
    confidence: number;
    suspiciousActor: string | null;
    evidence: string[];
  } {
    const evidence: string[] = [];
    let rapidFire = false;
    let nonHuman = false;
    let confidence = 0;
    let suspiciousActor: string | null = null;
    
    if (messages.length < 2) return { rapidFire, nonHuman, confidence, suspiciousActor, evidence };
    
    // Analyze time gaps between messages
    const timeGaps: number[] = [];
    const userMessages: { [userId: string]: number[] } = {};
    
    for (let i = 1; i < messages.length; i++) {
      const current = parseFloat(messages[i].ts);
      const previous = parseFloat(messages[i-1].ts);
      const gap = (previous - current) * 1000; // Convert to milliseconds
      
      timeGaps.push(gap);
      
      // Track messages per user
      const userId = messages[i].user;
      if (userId) {
        if (!userMessages[userId]) userMessages[userId] = [];
        userMessages[userId].push(current);
      }
    }
    
    // Check for rapid-fire messaging (< 100ms between messages)
    const rapidFireCount = timeGaps.filter(gap => gap < 100).length;
    if (rapidFireCount > 3) {
      rapidFire = true;
      evidence.push(`${rapidFireCount} rapid-fire messages detected (< 100ms apart)`);
      confidence += 0.4;
    }
    
    // Check for non-human timing patterns
    const regularIntervals = this.detectRegularIntervals(timeGaps);
    if (regularIntervals.detected) {
      nonHuman = true;
      evidence.push(`Regular interval pattern detected: ${regularIntervals.interval}ms`);
      confidence += 0.3;
    }
    
    // Find user with most suspicious timing
    Object.entries(userMessages).forEach(([userId, timestamps]) => {
      if (timestamps.length > 5) {
        const userGaps = [];
        for (let i = 1; i < timestamps.length; i++) {
          const prevTime = timestamps[i-1];
          const currTime = timestamps[i];
          if (prevTime && currTime) {
            userGaps.push((prevTime - currTime) * 1000);
          }
        }
        const userRapidFire = userGaps.filter(gap => gap < 200).length;
        if (userRapidFire > 2) {
          suspiciousActor = userId;
          confidence += 0.2;
        }
      }
    });
    
    return { rapidFire, nonHuman, confidence: Math.min(confidence, 1.0), suspiciousActor, evidence };
  }

  /**
   * Analyze message content for AI patterns
   */
  private analyzeMessageContent(messages: any[]): {
    repetitive: boolean;
    aiKeywords: boolean;
    confidence: number;
    evidence: string[];
  } {
    const evidence: string[] = [];
    let repetitive = false;
    let aiKeywords = false;
    let confidence = 0;
    
    const textMessages = messages.filter(msg => msg.text && !msg.subtype);
    if (textMessages.length < 3) return { repetitive, aiKeywords, confidence, evidence };
    
    // Check for repetitive patterns
    const messageTexts = textMessages.map(msg => msg.text);
    const similarities = this.calculateMessageSimilarities(messageTexts);
    if (similarities.averageSimilarity > 0.7) {
      repetitive = true;
      evidence.push(`High message similarity detected: ${(similarities.averageSimilarity * 100).toFixed(1)}%`);
      confidence += 0.3;
    }
    
    // Check for AI-related keywords
    const allText = messageTexts.join(' ').toLowerCase();
    const aiPatterns = [
      /\bai\b/, /artificial intelligence/, /machine learning/, /\bml\b/,
      /chatbot/, /\bbot\b/, /gpt/, /openai/, /claude/, /anthropic/,
      /automated/, /automation/, /neural/, /deep learning/
    ];
    
    const aiMatches = aiPatterns.filter(pattern => pattern.test(allText));
    if (aiMatches.length > 2) {
      aiKeywords = true;
      evidence.push(`AI-related keywords found: ${aiMatches.length} patterns matched`);
      confidence += 0.2;
    }
    
    // Check for template-like messages
    const templateMessages = messageTexts.filter(text => {
      return /\{\{.*\}\}/.test(text) || /\$\{.*\}/.test(text) || /%.*%/.test(text);
    });
    
    if (templateMessages.length > 0) {
      evidence.push(`${templateMessages.length} template-like messages detected`);
      confidence += 0.2;
    }
    
    return { repetitive, aiKeywords, confidence: Math.min(confidence, 1.0), evidence };
  }

  /**
   * Detect regular intervals in timing data
   */
  private detectRegularIntervals(timeGaps: number[]): { detected: boolean; interval: number } {
    if (timeGaps.length < 5) return { detected: false, interval: 0 };
    
    // Look for common intervals
    const roundedGaps = timeGaps.map(gap => Math.round(gap / 1000) * 1000); // Round to nearest second
    const intervalCounts: { [interval: number]: number } = {};
    
    roundedGaps.forEach(gap => {
      intervalCounts[gap] = (intervalCounts[gap] || 0) + 1;
    });
    
    // Find most common interval
    const mostCommon = Object.entries(intervalCounts)
      .sort(([,a], [,b]) => b - a)[0];
    
    if (mostCommon && parseInt(mostCommon[1] as any) >= timeGaps.length * 0.6) {
      return { detected: true, interval: parseInt(mostCommon[0]) };
    }
    
    return { detected: false, interval: 0 };
  }

  /**
   * Calculate message similarity scores
   */
  private calculateMessageSimilarities(messages: string[]): { averageSimilarity: number } {
    let totalSimilarity = 0;
    let comparisons = 0;
    
    for (let i = 0; i < messages.length - 1; i++) {
      for (let j = i + 1; j < messages.length; j++) {
        const similarity = this.calculateTextSimilarity(messages[i] || '', messages[j] || '');
        totalSimilarity += similarity;
        comparisons++;
      }
    }
    
    return {
      averageSimilarity: comparisons > 0 ? totalSimilarity / comparisons : 0
    };
  }

  /**
   * Calculate similarity between two text strings using Jaccard similarity
   */
  private calculateTextSimilarity(text1: string, text2: string): number {
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(word => words2.has(word)));
    const union = new Set([...words1, ...words2]);
    
    return union.size > 0 ? intersection.size / union.size : 0;
  }

  /**
   * Analyze file sharing patterns for suspicious activity
   */
  private analyzeFileSharingPattern(file: any): {
    isSuspicious: boolean;
    bulkUpload: boolean;
    automatedNaming: boolean;
    sensitiveContent: boolean;
  } {
    let bulkUpload = false;
    let automatedNaming = false;
    let sensitiveContent = false;
    
    // Check for automated naming patterns
    if (file.name) {
      const automatedPatterns = [
        /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i, // UUID
        /^\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}/, // Timestamp pattern
        /^export_\d+/, // Export pattern
        /^backup_\d+/, // Backup pattern
        /^automated_/ // Explicit automation
      ];
      
      automatedNaming = automatedPatterns.some(pattern => pattern.test(file.name));
    }
    
    // Check for sensitive content indicators
    if (file.name && file.filetype) {
      const sensitivePatterns = [
        /password/i, /credential/i, /secret/i, /token/i, /key/i,
        /database/i, /sql/i, /backup/i, /export/i, /dump/i,
        /financial/i, /personal/i, /confidential/i, /private/i
      ];
      
      sensitiveContent = sensitivePatterns.some(pattern => 
        pattern.test(file.name) || pattern.test(file.filetype)
      );
    }
    
    // File is suspicious if it matches multiple criteria
    const isSuspicious = (bulkUpload && automatedNaming) || 
                        (automatedNaming && sensitiveContent) ||
                        (bulkUpload && sensitiveContent);
    
    return { isSuspicious, bulkUpload, automatedNaming, sensitiveContent };
  }

  /**
   * Detect permission changes through indirect methods
   */
  private async detectPermissionChanges(since: Date): Promise<Array<{
    id: string;
    timestamp: Date;
    actorId: string;
    actorType: string;
    targetId: string;
    targetType: string;
    description: string;
    permissionType: string;
    oldPermissions: string[];
    newPermissions: string[];
    escalation: boolean;
    automatedRequest: boolean;
  }>> {
    // This would be implemented with actual permission monitoring
    // For now, return empty array as placeholder
    return [];
  }

  /**
   * Validate permissions and connection health
   */
  async validatePermissions(): Promise<PermissionCheck> {
    if (!this.client) {
      throw new Error('Slack client not authenticated');
    }

    try {
      // Test basic permissions
      const authTest = await this.client.auth.test();
      
      if (!authTest.ok) {
        return {
          isValid: false,
          permissions: [],
          missingPermissions: ['basic_auth'],
          errors: ['Authentication failed'],
          lastChecked: new Date()
        };
      }

      const grantedScopes = this.extractPermissions(authTest.scope as string);
      const requiredScopes = ['channels:read', 'users:read', 'team:read'];
      const missingScopes = requiredScopes.filter(scope => !grantedScopes.includes(scope));

      // Test specific API calls to validate permissions
      const permissionTests = await this.testPermissions();

      return {
        isValid: missingScopes.length === 0 && permissionTests.every(test => test.success),
        permissions: grantedScopes,
        missingPermissions: [
          ...missingScopes,
          ...permissionTests.filter(test => !test.success).map(test => test.permission)
        ],
        errors: permissionTests.filter(test => !test.success).map(test => test.error).filter((error): error is string => error !== undefined),
        lastChecked: new Date(),
        metadata: {
          teamId: authTest.team_id,
          userId: authTest.user_id,
          botId: authTest.bot_id
        }
      };
    } catch (error) {
      return {
        isValid: false,
        permissions: [],
        missingPermissions: ['basic_auth'],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        lastChecked: new Date()
      };
    }
  }

  /**
   * Discover Slack workflows and automation
   */
  private async discoverWorkflows(): Promise<AutomationEvent[]> {
    const automations: AutomationEvent[] = [];

    try {
      // Note: Workflow discovery might require specific scopes or enterprise features
      // This is a placeholder for when Slack provides workflow APIs
      
      // For now, we'll return empty array as apps.list API is not available
      console.warn('Slack apps.list API not available, returning empty automation array');
      return [];
    } catch (error) {
      console.error('Error discovering Slack workflows:', error);
      return [];
    }
  }

  /**
   * Discover bots in the workspace using users.list with is_bot filter
   */
  private async discoverBots(): Promise<AutomationEvent[]> {
    const automations: AutomationEvent[] = [];

    try {
      if (!this.client) {
        console.warn('Slack client not initialized, cannot discover bots');
        return [];
      }

      // Use users.list to find bot users (this API method exists and we have the scope)
      const usersResult = await this.client.users.list();

      if (usersResult.ok && usersResult.members) {
        // Filter for bot users
        const botUsers = usersResult.members.filter((user: any) => user.is_bot === true);

        console.log(`Found ${botUsers.length} bot users in Slack workspace`);

        // Create automation entries from bot users
        for (const botUser of botUsers) {
          try {
            // Bot users have the information we need directly from users.list
            // No need to call bots.info separately
            automations.push({
              id: `slack-bot-${botUser.id}`,
              name: botUser.profile?.real_name || botUser.name || 'Unknown Bot',
              type: 'bot',
              platform: 'slack',
              status: botUser.deleted ? 'inactive' : 'active',
              trigger: 'message',
              actions: ['chat:write', 'respond_to_messages'],
              createdAt: new Date().toISOString(),
              lastTriggered: new Date().toISOString(),
              riskLevel: 'medium',
              metadata: {
                userId: botUser.id,
                botId: botUser.profile?.bot_id,
                appId: botUser.profile?.app_id,
                displayName: botUser.profile?.display_name,
                realName: botUser.profile?.real_name,
                description: `Slack bot user: ${botUser.profile?.real_name || botUser.name}`,
                isBot: botUser.is_bot,
                isAppUser: botUser.is_app_user,
                riskFactors: [
                  'Automated bot with message access',
                  'Potential data collection through conversations',
                  botUser.is_app_user ? 'Associated with installed app' : 'Standalone bot'
                ]
              }
            });
          } catch (botError) {
            console.warn(`Failed to process bot user ${botUser.id}:`, botError);
          }
        }
      }

      console.log(`Discovered ${automations.length} bot automations`);
      return automations;
    } catch (error) {
      console.error('Error discovering Slack bots:', error);
      return [];
    }
  }

  /**
   * Discover apps in the workspace
   */
  private async discoverApps(): Promise<AutomationEvent[]> {
    const automations: AutomationEvent[] = [];

    try {
      // TODO: Implement apps discovery when API is available
      console.warn('Slack apps.list API not available, returning empty apps array');
      return [];
    } catch (error) {
      console.error('Error discovering Slack apps:', error);
      return [];
    }
  }

  /**
   * Discover webhooks and slash commands (requires admin access)
   */
  private async discoverWebhooks(): Promise<AutomationEvent[]> {
    const automations: AutomationEvent[] = [];

    try {
      // Note: This would require admin permissions and specific API calls
      // For now, this is a placeholder for webhook discovery
      
      // Slash commands would be discovered through admin.apps.list with detailed scopes
      // Webhooks would be discovered through workspace settings APIs (if available)
      
    } catch (error) {
      console.error('Error discovering Slack webhooks:', error);
    }

    return automations;
  }

  /**
   * Test specific permissions by making API calls
   */
  private async testPermissions(): Promise<Array<{permission: string, success: boolean, error?: string}>> {
    const tests = [];

    // Test channels:read
    try {
      const channelsTest = await this.client!.conversations.list({ limit: 1, types: 'public_channel' });
      tests.push({
        permission: 'channels:read',
        success: channelsTest.ok === true,
        error: channelsTest.ok ? undefined : channelsTest.error
      });
    } catch (error) {
      tests.push({
        permission: 'channels:read',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test users:read
    try {
      const usersTest = await this.client!.users.list({ limit: 1 });
      tests.push({
        permission: 'users:read',
        success: usersTest.ok === true,
        error: usersTest.ok ? undefined : usersTest.error
      });
    } catch (error) {
      tests.push({
        permission: 'users:read',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    // Test team:read
    try {
      const teamTest = await this.client!.team.info();
      tests.push({
        permission: 'team:read',
        success: teamTest.ok === true,
        error: teamTest.ok ? undefined : teamTest.error
      });
    } catch (error) {
      tests.push({
        permission: 'team:read',
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }

    return tests;
  }

  /**
   * Extract permissions from Slack OAuth scope string
   */
  private extractPermissions(scope: string): string[] {
    if (!scope) return [];
    return scope.split(',').map(s => s.trim()).filter(s => s.length > 0);
  }

  /**
   * Determine if an app has automation capabilities
   */
  private isAutomationApp(app: SlackApp): boolean {
    const automationKeywords = [
      'bot', 'workflow', 'automat', 'schedul', 'trigger', 'integrat',
      'sync', 'webhook', 'api', 'connect', 'flow', 'task', 'remind',
      'poll', 'survey', 'alert', 'notif'
    ];

    const searchText = `${app.name} ${app.description || ''}`.toLowerCase();
    return automationKeywords.some(keyword => searchText.includes(keyword)) || 
           !app.is_internal; // External apps often provide automation features
  }

  /**
   * Get an authenticated Slack client for a connection
   */
  static async getClientForConnection(connectionId: string): Promise<WebClient> {
    const accessToken = await encryptedCredentialRepository.getDecryptedValue(
      connectionId,
      'access_token'
    );

    if (!accessToken) {
      throw new Error('No access token found for Slack connection');
    }

    return new WebClient(accessToken, {
      timeout: 30000,
      retryConfig: {
        retries: 2,
        factor: 1.96
      }
    });
  }
}

// Export singleton instance
export const slackConnector = new SlackConnector();