import {
  CrossPlatformCorrelationEngine,
  MultiPlatformEvent,
  AutomationWorkflowChain,
  TemporalCorrelation,
  UserCorrelationAnalysis,
  MultiPlatformRiskAssessment,
  ExecutiveRiskReport,
  CorrelationAnalysisResult
} from '@saas-xray/shared-types';

export class CrossPlatformCorrelationService implements CrossPlatformCorrelationEngine {
  detectAutomationChains(events: MultiPlatformEvent[]): AutomationWorkflowChain[] {
    const sortedEvents = events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const automationChains: AutomationWorkflowChain[] = [];

    // Group events by user
    const eventsByUser = this.groupEventsByUser(sortedEvents);

    // Detect potential automation chains for each user
    Object.entries(eventsByUser).forEach(([userId, userEvents]) => {
      const chains = this.identifyUserAutomationChains(userEvents);
      automationChains.push(...chains);
    });

    return automationChains;
  }

  private groupEventsByUser(events: MultiPlatformEvent[]): Record<string, MultiPlatformEvent[]> {
    return events.reduce((groups, event) => {
      const userId = event.userId;
      if (!groups[userId]) groups[userId] = [];
      groups[userId].push(event);
      return groups;
    }, {} as Record<string, MultiPlatformEvent[]>);
  }

  private identifyUserAutomationChains(events: MultiPlatformEvent[]): AutomationWorkflowChain[] {
    const chains: AutomationWorkflowChain[] = [];
    const timeWindowMs = 60 * 60 * 1000; // 1-hour time window

    for (let i = 0; i < events.length; i++) {
      const triggerEvent = events[i];
      if (!triggerEvent.correlationMetadata.potentialTrigger) continue;

      const potentialActionEvents = events.filter(
        event =>
          event.timestamp.getTime() - triggerEvent.timestamp.getTime() <= timeWindowMs &&
          event.correlationMetadata.potentialAction &&
          event.platform !== triggerEvent.platform
      );

      if (potentialActionEvents.length > 0) {
        const chain = this.createAutomationWorkflowChain(triggerEvent, potentialActionEvents);
        chains.push(chain);
      }
    }

    return chains;
  }

  private createAutomationWorkflowChain(
    triggerEvent: MultiPlatformEvent,
    actionEvents: MultiPlatformEvent[]
  ): AutomationWorkflowChain {
    const uniquePlatforms = new Set([
      triggerEvent.platform,
      ...actionEvents.map(e => e.platform)
    ]);

    const correlationConfidence = this.calculateCorrelationConfidence(triggerEvent, actionEvents);
    const riskLevel = this.determineRiskLevel(correlationConfidence);

    return {
      chainId: `chain_${triggerEvent.eventId}_${Date.now()}`,
      chainName: `Automation Chain: ${triggerEvent.platform} → ${actionEvents.map(e => e.platform).join(', ')}`,
      platforms: Array.from(uniquePlatforms) as AutomationWorkflowChain['platforms'],
      triggerEvent,
      actionEvents,
      correlationConfidence,
      riskLevel,
      workflow: {
        description: this.generateWorkflowDescription(triggerEvent, actionEvents),
        stages: this.createWorkflowStages(triggerEvent, actionEvents),
        dataFlow: this.analyzeDataFlow(triggerEvent, actionEvents),
        automation: this.determineAutomationType(triggerEvent, actionEvents)
      },
      riskAssessment: this.assessWorkflowRisks(triggerEvent, actionEvents)
    };
  }

  private calculateCorrelationConfidence(
    triggerEvent: MultiPlatformEvent,
    actionEvents: MultiPlatformEvent[]
  ): number {
    // Multiple factors determining confidence
    const platformDiversityScore = new Set([
      triggerEvent.platform,
      ...actionEvents.map(e => e.platform)
    ]).size * 20; // More platforms = higher confidence

    const actionTypeSimilarity = actionEvents.every(
      event => event.correlationMetadata.automationIndicators.length > 0
    ) ? 30 : 0;

    const temporalConsistency = actionEvents.reduce(
      (avg, event, i, arr) =>
        avg + (i > 0
          ? Math.abs(event.timestamp.getTime() - arr[i-1].timestamp.getTime())
          : 0),
      0
    ) / actionEvents.length;

    const temporalScore = temporalConsistency < 5000 ? 30 :
                          temporalConsistency < 30000 ? 20 : 10;

    const baseConfidence = platformDiversityScore +
                           actionTypeSimilarity +
                           temporalScore;

    return Math.min(Math.max(baseConfidence, 0), 100);
  }

  private determineRiskLevel(confidence: number): AutomationWorkflowChain['riskLevel'] {
    if (confidence < 30) return 'low';
    if (confidence < 60) return 'medium';
    if (confidence < 90) return 'high';
    return 'critical';
  }

  private generateWorkflowDescription(
    triggerEvent: MultiPlatformEvent,
    actionEvents: MultiPlatformEvent[]
  ): string {
    return `Workflow from ${triggerEvent.platform} triggering actions in ${
      new Set(actionEvents.map(e => e.platform)).size
    } other platforms`;
  }

  // Other methods remain unchanged to keep the code concise
  private createWorkflowStages(
    triggerEvent: MultiPlatformEvent,
    actionEvents: MultiPlatformEvent[]
  ): AutomationWorkflowChain['workflow']['stages'] {
    return [
      {
        stageId: `stage_trigger_${triggerEvent.eventId}`,
        platform: triggerEvent.platform,
        stageName: 'Trigger Event',
        description: `Initial event on ${triggerEvent.platform}`,
        events: [triggerEvent],
        timing: {
          averageExecutionTime: 0,
          timingRegularity: 'consistent'
        },
        dataProcessing: {
          inputData: [triggerEvent.actionDetails.action],
          outputData: [],
          transformationType: 'trigger',
          sensitivityLevel: 'internal'
        }
      },
      ...actionEvents.map((event, index) => ({
        stageId: `stage_action_${event.eventId}`,
        platform: event.platform,
        stageName: `Action Stage ${index + 1}`,
        description: `Action event on ${event.platform}`,
        events: [event],
        timing: {
          averageExecutionTime: 0,
          timeFromPreviousStage: event.timestamp.getTime() - triggerEvent.timestamp.getTime(),
          timingRegularity: 'consistent'
        },
        dataProcessing: {
          inputData: [triggerEvent.actionDetails.action],
          outputData: [event.actionDetails.action],
          transformationType: 'action',
          sensitivityLevel: 'internal'
        }
      }))
    ];
  }

  private analyzeDataFlow(
    triggerEvent: MultiPlatformEvent,
    actionEvents: MultiPlatformEvent[]
  ): AutomationWorkflowChain['workflow']['dataFlow'] {
    return {
      flowId: `flow_${triggerEvent.eventId}_${Date.now()}`,
      sourceDataType: [triggerEvent.actionDetails.action],
      destinationPlatforms: actionEvents.map(e => e.platform),
      transformations: actionEvents.map(event => ({
        transformationId: `transform_${event.eventId}`,
        stage: event.platform,
        inputFormat: triggerEvent.actionDetails.action,
        outputFormat: event.actionDetails.action,
        processingType: 'transformation',
        aiProvider: 'unknown',
        riskIndicators: event.correlationMetadata.automationIndicators
      })),
      externalServices: [],
      sensitivityClassification: {
        containsPII: false,
        containsFinancialData: false,
        containsHealthData: false,
        containsBusinessSecrets: false,
        overallSensitivity: 'internal'
      }
    };
  }

  private determineAutomationType(
    triggerEvent: MultiPlatformEvent,
    actionEvents: MultiPlatformEvent[]
  ): AutomationWorkflowChain['workflow']['automation'] {
    const isRegularlyTimed = actionEvents.every((event, i, arr) =>
      i === 0 ||
      Math.abs(event.timestamp.getTime() - arr[i-1].timestamp.getTime()) < 5000
    );

    return {
      isAutomated: true,
      automationType: 'event_driven',
      frequency: isRegularlyTimed ? 'regular' : 'irregular'
    };
  }

  private assessWorkflowRisks(
    triggerEvent: MultiPlatformEvent,
    actionEvents: MultiPlatformEvent[]
  ): AutomationWorkflowChain['riskAssessment'] {
    return {
      dataExposure: {
        exposureId: `exposure_${triggerEvent.eventId}_${Date.now()}`,
        dataTypes: [triggerEvent.actionDetails.action],
        sensitivityLevel: 'internal',
        exposureMethod: 'webhook',
        externalDestinations: actionEvents.map(e => e.platform),
        estimatedVolume: 'low',
        riskScore: 30,
        complianceViolations: []
      },
      complianceImpact: {
        gdprViolations: [],
        soxViolations: [],
        hipaaViolations: [],
        pciViolations: [],
        customViolations: [],
        overallComplianceRisk: 'compliant'
      },
      businessImpact: {
        impactLevel: 'minimal',
        affectedBusinessFunctions: [],
        reputationRisk: 'low',
        financialExposure: {
          potentialFineRange: {
            minimum: 0,
            maximum: 0,
            currency: 'USD'
          },
          remediationCosts: {
            estimated: 0,
            confidence: 'low',
            breakdown: {}
          },
          businessDisruptionCost: {
            estimated: 0,
            timeframe: 'N/A',
            confidence: 'low'
          }
        },
        operationalRisk: [],
        mitigationComplexity: 'simple'
      },
      recommendations: ['Monitor cross-platform workflow']
    };
  }

  analyzeTemporalCorrelation(
    events: MultiPlatformEvent[],
    timeWindowMs: number
  ): TemporalCorrelation[] {
    const sortedEvents = events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const correlations: TemporalCorrelation[] = [];

    for (let i = 0; i < sortedEvents.length; i++) {
      for (let j = i + 1; j < sortedEvents.length; j++) {
        const eventGroup = [sortedEvents[i], sortedEvents[j]];
        const timeDiff = sortedEvents[j].timestamp.getTime() - sortedEvents[i].timestamp.getTime();

        if (timeDiff > timeWindowMs) break;

        const correlation: TemporalCorrelation = {
          correlationId: `temporal_corr_${sortedEvents[i].eventId}_${sortedEvents[j].eventId}`,
          events: eventGroup,
          timeWindow: {
            startTime: sortedEvents[i].timestamp,
            endTime: sortedEvents[j].timestamp,
            durationMs: timeDiff
          },
          pattern: {
            isSequential: true,
            isSimultaneous: timeDiff < 1000,
            hasRegularInterval: false,
            intervalMs: timeDiff
          },
          automationLikelihood: this.calculateAutomationLikelihood(eventGroup),
          humanLikelihood: 100 - this.calculateAutomationLikelihood(eventGroup)
        };

        correlations.push(correlation);
      }
    }

    return correlations;
  }

  private calculateAutomationLikelihood(events: MultiPlatformEvent[]): number {
    const automationIndicators = events.flatMap(
      event => event.correlationMetadata.automationIndicators
    );

    const platformDiversity = new Set(events.map(e => e.platform)).size;
    const indicatorScore = automationIndicators.length * 20;
    const platformScore = platformDiversity * 25;

    return Math.min(indicatorScore + platformScore, 100);
  }

  identifyUserCorrelation(
    events: MultiPlatformEvent[],
    userId: string
  ): UserCorrelationAnalysis {
    const userEvents = events.filter(event => event.userId === userId);

    return {
      userId,
      userEmail: userEvents[0]?.userEmail || '',
      platforms: Array.from(new Set(userEvents.map(e => e.platform))),
      activityCorrelation: {
        simultaneousActivity: this.hasSimultaneousActivity(userEvents),
        crossPlatformWorkflows: this.countCrossPlatformWorkflows(userEvents),
        automationPatterns: this.detectAutomationPatterns(userEvents),
        riskIndicators: this.extractRiskIndicators(userEvents)
      },
      behavioral: {
        typicalWorkingHours: this.analyzeWorkingHours(userEvents),
        activityPatterns: this.detectActivityPatterns(userEvents),
        automationUsage: this.assessAutomationUsage(userEvents),
        shadowAIUsage: this.assessShadowAIUsage(userEvents)
      },
      riskProfile: this.assessUserRiskProfile(userEvents)
    };
  }

  private hasSimultaneousActivity(events: MultiPlatformEvent[]): boolean {
    return events.some((event, i) =>
      events.slice(i + 1).some(
        next => Math.abs(next.timestamp.getTime() - event.timestamp.getTime()) < 1000
      )
    );
  }

  private countCrossPlatformWorkflows(events: MultiPlatformEvent[]): number {
    const platforms = new Set(events.map(e => e.platform));
    return platforms.size > 1 ? 1 : 0;
  }

  private detectAutomationPatterns(events: MultiPlatformEvent[]): string[] {
    return events
      .filter(event => event.correlationMetadata.automationIndicators.length > 0)
      .map(event => `${event.platform}:${event.actionDetails.action}`);
  }

  private extractRiskIndicators(events: MultiPlatformEvent[]): string[] {
    return events.flatMap(event => event.correlationMetadata.automationIndicators);
  }

  private analyzeWorkingHours(events: MultiPlatformEvent[]): string {
    // Basic implementation - could be enhanced with more sophisticated timezone/calendar logic
    const hours = events.map(event => event.timestamp.getHours());
    const avgHour = hours.reduce((a, b) => a + b, 0) / hours.length;

    if (avgHour >= 9 && avgHour <= 17) return 'standard_business_hours';
    if (avgHour < 9 || avgHour > 22) return 'outside_business_hours';
    return 'extended_hours';
  }

  private detectActivityPatterns(events: MultiPlatformEvent[]): string[] {
    const patterns: string[] = [];
    const platforms = new Set(events.map(e => e.platform));
    const actions = new Set(events.map(e => e.actionDetails.action));

    if (platforms.size > 1) patterns.push('cross_platform');
    if (actions.size === 1) patterns.push('repetitive_action');

    return patterns;
  }

  private assessAutomationUsage(events: MultiPlatformEvent[]): UserCorrelationAnalysis['behavioral']['automationUsage'] {
    const automationEvents = events.filter(
      event => event.correlationMetadata.automationIndicators.length > 0
    );

    const ratio = automationEvents.length / events.length;
    if (ratio < 0.1) return 'low';
    if (ratio < 0.3) return 'medium';
    if (ratio < 0.6) return 'high';
    return 'excessive';
  }

  private assessShadowAIUsage(events: MultiPlatformEvent[]): UserCorrelationAnalysis['behavioral']['shadowAIUsage'] {
    const aiEvents = events.filter(
      event => event.correlationMetadata.automationIndicators.some(
        indicator => indicator.includes('ai') || indicator.includes('llm')
      )
    );

    const ratio = aiEvents.length / events.length;
    if (ratio === 0) return 'none';
    if (ratio < 0.1) return 'minimal';
    if (ratio < 0.3) return 'moderate';
    return 'extensive';
  }

  private assessUserRiskProfile(events: MultiPlatformEvent[]): UserCorrelationAnalysis['riskProfile'] {
    const riskIndicators = this.extractRiskIndicators(events);
    const highRiskIndicators = riskIndicators.filter(
      indicator =>
        indicator.includes('critical') ||
        indicator.includes('high_risk') ||
        indicator.includes('security_violation')
    );

    return {
      overallRiskScore: highRiskIndicators.length * 20,
      riskFactors: riskIndicators,
      complianceViolations: highRiskIndicators,
      recommendedActions: highRiskIndicators.length > 0
        ? ['Immediate security review', 'Revoke cross-platform access']
        : ['Continue monitoring']
    };
  }

  calculateCrossPlatformRisk(chains: AutomationWorkflowChain[]): MultiPlatformRiskAssessment {
    const platforms = new Set(chains.flatMap(chain => chain.platforms));

    const platformRiskMetrics: MultiPlatformRiskAssessment['platforms'] = {
      slack: {
        platform: 'slack',
        connectionStatus: 'connected',
        automationsDetected: 0,
        riskScore: 0,
        riskDistribution: { low: 0, medium: 0, high: 0, critical: 0 },
        aiIntegrations: [],
        complianceIssues: []
      },
      google: {
        platform: 'google',
        connectionStatus: 'connected',
        automationsDetected: 0,
        riskScore: 0,
        riskDistribution: { low: 0, medium: 0, high: 0, critical: 0 },
        aiIntegrations: [],
        complianceIssues: []
      }
    };

    // Optional Microsoft and Jira metrics based on detected platforms
    if (platforms.has('microsoft')) {
      platformRiskMetrics.microsoft = {
        platform: 'microsoft',
        connectionStatus: 'connected',
        automationsDetected: 0,
        riskScore: 0,
        riskDistribution: { low: 0, medium: 0, high: 0, critical: 0 },
        aiIntegrations: [],
        complianceIssues: []
      };
    }

    if (platforms.has('jira')) {
      platformRiskMetrics.jira = {
        platform: 'jira',
        connectionStatus: 'connected',
        automationsDetected: 0,
        riskScore: 0,
        riskDistribution: { low: 0, medium: 0, high: 0, critical: 0 },
        aiIntegrations: [],
        complianceIssues: []
      };
    }

    // Calculate platform risk metrics
    chains.forEach(chain => {
      chain.platforms.forEach(platform => {
        if (platformRiskMetrics[platform]) {
          platformRiskMetrics[platform].automationsDetected++;
          platformRiskMetrics[platform].riskScore += chain.correlationConfidence;

          switch (chain.riskLevel) {
            case 'low': platformRiskMetrics[platform].riskDistribution.low++; break;
            case 'medium': platformRiskMetrics[platform].riskDistribution.medium++; break;
            case 'high': platformRiskMetrics[platform].riskDistribution.high++; break;
            case 'critical': platformRiskMetrics[platform].riskDistribution.critical++; break;
          }
        }
      });
    });

    // Compute composite risk assessment
    const compositeRiskScore = chains.reduce((score, chain) => score + chain.correlationConfidence, 0) / chains.length;

    return {
      assessmentId: `risk_assessment_${Date.now()}`,
      organizationId: 'default_org', // Placeholder - replace with actual org ID
      assessmentDate: new Date(),
      platforms: platformRiskMetrics,
      crossPlatformRisks: {
        automationChains: chains.length,
        dataExposureRisks: chains.filter(chain =>
          chain.riskLevel === 'high' || chain.riskLevel === 'critical'
        ).length,
        complianceViolations: 0, // Placeholder - would require deeper compliance check
        unauthorizedAIIntegrations: chains.filter(chain =>
          chain.workflow.automation.automationType === 'event_driven'
        ).length
      },
      overallAssessment: {
        compositeRiskScore,
        riskLevel: this.determineOverallRiskLevel(compositeRiskScore),
        topRisks: this.identifyTopRisks(chains),
        executiveSummary: this.generateExecutiveSummary(chains),
        recommendedActions: this.generateRecommendedActions(chains)
      },
      complianceFramework: {
        gdprCompliance: {
          compliant: true,
          violations: [],
          riskLevel: 'low',
          lastAssessment: new Date(),
          nextReviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          recommendedActions: []
        },
        soxCompliance: {
          compliant: true,
          violations: [],
          riskLevel: 'low',
          lastAssessment: new Date(),
          nextReviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          recommendedActions: []
        },
        hipaaCompliance: {
          compliant: true,
          violations: [],
          riskLevel: 'low',
          lastAssessment: new Date(),
          nextReviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          recommendedActions: []
        },
        pciCompliance: {
          compliant: true,
          violations: [],
          riskLevel: 'low',
          lastAssessment: new Date(),
          nextReviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          recommendedActions: []
        },
        customCompliance: []
      }
    };
  }

  private determineOverallRiskLevel(compositeRiskScore: number): MultiPlatformRiskAssessment['overallAssessment']['riskLevel'] {
    if (compositeRiskScore < 30) return 'low';
    if (compositeRiskScore < 60) return 'medium';
    if (compositeRiskScore < 90) return 'high';
    return 'critical';
  }

  private identifyTopRisks(chains: AutomationWorkflowChain[]): string[] {
    const criticalChains = chains.filter(chain =>
      chain.riskLevel === 'high' || chain.riskLevel === 'critical'
    );

    return criticalChains.map(chain =>
      `Cross-platform risk: ${chain.chainName} (Risk Level: ${chain.riskLevel})`
    );
  }

  private generateExecutiveSummary(chains: AutomationWorkflowChain[]): string {
    const criticalChains = chains.filter(chain =>
      chain.riskLevel === 'high' || chain.riskLevel === 'critical'
    );

    return criticalChains.length > 0
      ? `Detected ${criticalChains.length} high-risk cross-platform automation workflows requiring immediate attention.`
      : 'No significant cross-platform automation risks detected.';
  }

  private generateRecommendedActions(chains: AutomationWorkflowChain[]): ActionPriority[] {
    const actions: ActionPriority[] = [];

    const criticalChains = chains.filter(chain =>
      chain.riskLevel === 'high' || chain.riskLevel === 'critical'
    );

    criticalChains.forEach((chain, index) => {
      actions.push({
        actionId: `action_${chain.chainId}_${index}`,
        priority: chain.riskLevel === 'critical' ? 'immediate' : 'high',
        action: `Review and mitigate cross-platform workflow: ${chain.chainName}`,
        rationale: `High-risk automation detected across ${chain.platforms.join(', ')}`,
        estimatedEffort: 'hours',
        businessImpact: 'high',
        complianceImpact: 'important'
      });
    });

    return actions;
  }

  generateExecutiveReport(analysis: CorrelationAnalysisResult): ExecutiveRiskReport {
    return {
      reportId: `exec_report_${analysis.analysisId}`,
      executiveSummary: analysis.riskAssessment.overallAssessment.executiveSummary,
      keyFindings: analysis.riskAssessment.overallAssessment.topRisks,
      riskLevel: analysis.riskAssessment.overallAssessment.riskLevel,
      businessContext: {
        totalPlatformsMonitored: analysis.platforms.length,
        totalAutomationsDetected: analysis.summary.totalAutomationChains,
        unauthorizedAIIntegrations: analysis.summary.aiIntegrationsDetected,
        dataExposureRisks: analysis.summary.complianceViolations
      },
      complianceStatus: {
        overallStatus: analysis.riskAssessment.overallAssessment.riskLevel === 'low'
          ? 'compliant'
          : 'at_risk',
        keyViolations: analysis.riskAssessment.overallAssessment.topRisks,
        complianceScore: 100 - (analysis.summary.complianceViolations * 10)
      },
      actionPlan: {
        immediateActions: analysis.recommendations.immediate.map(action => action.action),
        strategicRecommendations: analysis.recommendations.longTerm.map(action => action.action),
        investmentRequired: {
          potentialFineRange: { minimum: 0, maximum: 0, currency: 'USD' },
          remediationCosts: {
            estimated: 0,
            confidence: 'low',
            breakdown: {}
          },
          businessDisruptionCost: {
            estimated: 0,
            timeframe: 'N/A',
            confidence: 'low'
          }
        },
        timeline: 'Immediate review and mitigation'
      },
      kpis: {
        riskReduction: 50,
        complianceImprovement: 30,
        costBenefit: 0.8
      }
    };
  }
}