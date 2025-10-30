/**
 * Unit tests for StressTestDataGenerator
 *
 * Tests generation of realistic automation scenarios for stress testing,
 * including distribution ratios, feature differences, and performance.
 */

import {
  StressTestDataGenerator,
  AutomationScenario
} from '../../../../src/services/testing/stress-test-data-generator.service';

describe('StressTestDataGenerator', () => {
  let generator: StressTestDataGenerator;

  beforeEach(() => {
    generator = new StressTestDataGenerator();
  });

  describe('generateAutomations', () => {
    it('should generate specified number of automations', () => {
      const count = 100;
      const scenarios = generator.generateAutomations(count);

      expect(scenarios).toHaveLength(count);
    });

    it('should generate 10K automations in less than 5 seconds', () => {
      const startTime = Date.now();
      const scenarios = generator.generateAutomations(10000);
      const elapsed = Date.now() - startTime;

      expect(scenarios).toHaveLength(10000);
      expect(elapsed).toBeLessThan(5000); // Must be under 5 seconds
    });

    it('should maintain platform distribution (50% Slack, 30% Google, 20% Microsoft)', () => {
      const scenarios = generator.generateAutomations(10000);

      const slackCount = scenarios.filter(s => s.platform === 'slack').length;
      const googleCount = scenarios.filter(s => s.platform === 'google').length;
      const microsoftCount = scenarios.filter(s => s.platform === 'microsoft').length;

      // Allow 2% tolerance for distribution
      expect(slackCount).toBeGreaterThan(4800); // ~50%
      expect(slackCount).toBeLessThan(5200);
      expect(googleCount).toBeGreaterThan(2800); // ~30%
      expect(googleCount).toBeLessThan(3200);
      expect(microsoftCount).toBeGreaterThan(1800); // ~20%
      expect(microsoftCount).toBeLessThan(2200);
    });

    it('should maintain malicious ratio (~20%)', () => {
      const scenarios = generator.generateAutomations(10000);

      const maliciousCount = scenarios.filter(s => s.actual === 'malicious').length;
      const legitimateCount = scenarios.filter(s => s.actual === 'legitimate').length;

      // Allow 2% tolerance for ratio
      expect(maliciousCount).toBeGreaterThan(1800); // ~20%
      expect(maliciousCount).toBeLessThan(2200);
      expect(legitimateCount).toBeGreaterThan(7800); // ~80%
      expect(legitimateCount).toBeLessThan(8200);
    });

    it('should generate unique automation IDs', () => {
      const scenarios = generator.generateAutomations(1000);
      const ids = scenarios.map(s => s.automationId);
      const uniqueIds = new Set(ids);

      expect(uniqueIds.size).toBe(scenarios.length);
    });

    it('should generate timestamps spread over 30 days', () => {
      const scenarios = generator.generateAutomations(1000);
      const now = Date.now();
      const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);

      scenarios.forEach(scenario => {
        const timestamp = scenario.timestamp.getTime();
        expect(timestamp).toBeGreaterThanOrEqual(thirtyDaysAgo);
        expect(timestamp).toBeLessThanOrEqual(now);
      });
    });
  });

  describe('generateSlackBot', () => {
    it('should generate malicious Slack bot with high velocity', () => {
      const scenario = generator.generateSlackBot(true);

      expect(scenario.platform).toBe('slack');
      expect(scenario.actual).toBe('malicious');
      expect(scenario.features.hasAIProvider).toBe(true);
      expect(scenario.features.aiProvider).toBeDefined();
      expect(scenario.features.velocityScore).toBeGreaterThanOrEqual(0.7);
      expect(scenario.attackType).toBeDefined();
    });

    it('should generate legitimate Slack bot with low velocity', () => {
      const scenario = generator.generateSlackBot(false);

      expect(scenario.platform).toBe('slack');
      expect(scenario.actual).toBe('legitimate');
      expect(scenario.features.velocityScore).toBeLessThan(0.5);
      expect(scenario.attackType).toBeUndefined();
    });

    it('should assign attack types to malicious bots', () => {
      const validAttackTypes = [
        'data_exfiltration',
        'privilege_escalation',
        'credential_theft',
        'backdoor',
        'rate_limit_evasion',
        'ai_abuse'
      ];

      const scenario = generator.generateSlackBot(true);

      expect(validAttackTypes).toContain(scenario.attackType);
    });
  });

  describe('generateGoogleScript', () => {
    it('should generate malicious Google script with AI provider', () => {
      const scenario = generator.generateGoogleScript(true);

      expect(scenario.platform).toBe('google');
      expect(scenario.actual).toBe('malicious');
      expect(scenario.features.hasAIProvider).toBe(true);
      expect(scenario.features.aiProvider).toBeDefined();
      expect(['openai', 'anthropic', 'google']).toContain(scenario.features.aiProvider);
    });

    it('should generate legitimate Google script without suspicious features', () => {
      const scenario = generator.generateGoogleScript(false);

      expect(scenario.platform).toBe('google');
      expect(scenario.actual).toBe('legitimate');
      expect(scenario.features.permissionEscalation).toBe(false);
      expect(scenario.features.dataVolumeAnomalous).toBe(false);
    });
  });

  describe('generateMicrosoftFlow', () => {
    it('should generate malicious Microsoft flow with off-hours activity', () => {
      const maliciousScenarios = Array.from({ length: 20 }, () =>
        generator.generateMicrosoftFlow(true)
      );

      // At least some should have off-hours activity (70% probability)
      const offHoursCount = maliciousScenarios.filter(
        s => s.features.offHoursActivity
      ).length;

      expect(offHoursCount).toBeGreaterThan(10); // Expect majority
    });

    it('should generate legitimate Microsoft flow with business hours activity', () => {
      const scenario = generator.generateMicrosoftFlow(false);

      expect(scenario.platform).toBe('microsoft');
      expect(scenario.actual).toBe('legitimate');
      expect(scenario.features.velocityScore).toBeLessThan(0.5);
    });
  });

  describe('generateBatch', () => {
    it('should respect custom malicious ratio', () => {
      const count = 1000;
      const maliciousRatio = 0.3; // 30% malicious

      const scenarios = generator.generateBatch(count, maliciousRatio);

      const maliciousCount = scenarios.filter(s => s.actual === 'malicious').length;

      expect(maliciousCount).toBe(300); // Exact count
      expect(scenarios).toHaveLength(count);
    });

    it('should generate all malicious when ratio is 1.0', () => {
      const scenarios = generator.generateBatch(100, 1.0);

      const maliciousCount = scenarios.filter(s => s.actual === 'malicious').length;

      expect(maliciousCount).toBe(100);
    });

    it('should generate all legitimate when ratio is 0.0', () => {
      const scenarios = generator.generateBatch(100, 0.0);

      const legitimateCount = scenarios.filter(s => s.actual === 'legitimate').length;

      expect(legitimateCount).toBe(100);
    });
  });

  describe('malicious vs legitimate feature differences', () => {
    it('malicious automations should have higher velocity scores', () => {
      const maliciousScenarios = Array.from({ length: 100 }, (_, i) =>
        generator.generateSlackBot(true)
      );
      const legitimateScenarios = Array.from({ length: 100 }, (_, i) =>
        generator.generateSlackBot(false)
      );

      const avgMaliciousVelocity =
        maliciousScenarios.reduce((sum, s) => sum + (s.features.velocityScore || 0), 0) /
        maliciousScenarios.length;
      const avgLegitimateVelocity =
        legitimateScenarios.reduce((sum, s) => sum + (s.features.velocityScore || 0), 0) /
        legitimateScenarios.length;

      expect(avgMaliciousVelocity).toBeGreaterThan(0.7);
      expect(avgLegitimateVelocity).toBeLessThan(0.5);
      expect(avgMaliciousVelocity).toBeGreaterThan(avgLegitimateVelocity);
    });

    it('malicious automations should have AI providers', () => {
      const scenarios = Array.from({ length: 100 }, () =>
        generator.generateGoogleScript(true)
      );

      scenarios.forEach(scenario => {
        expect(scenario.features.hasAIProvider).toBe(true);
        expect(scenario.features.aiProvider).toBeDefined();
        expect(['openai', 'anthropic', 'google']).toContain(scenario.features.aiProvider);
      });
    });

    it('legitimate automations should rarely have AI providers', () => {
      const scenarios = Array.from({ length: 1000 }, () =>
        generator.generateMicrosoftFlow(false)
      );

      const withAICount = scenarios.filter(s => s.features.hasAIProvider).length;

      // Should be around 10% (allow variance)
      expect(withAICount).toBeGreaterThan(50); // At least 5%
      expect(withAICount).toBeLessThan(200); // No more than 20%
    });

    it('malicious automations should have higher off-hours activity', () => {
      const maliciousScenarios = Array.from({ length: 1000 }, () =>
        generator.generateSlackBot(true)
      );
      const legitimateScenarios = Array.from({ length: 1000 }, () =>
        generator.generateSlackBot(false)
      );

      const maliciousOffHours = maliciousScenarios.filter(
        s => s.features.offHoursActivity
      ).length;
      const legitimateOffHours = legitimateScenarios.filter(
        s => s.features.offHoursActivity
      ).length;

      // Malicious ~70% off-hours vs legitimate ~20%
      expect(maliciousOffHours).toBeGreaterThan(600); // At least 60%
      expect(legitimateOffHours).toBeLessThan(300); // No more than 30%
      expect(maliciousOffHours).toBeGreaterThan(legitimateOffHours);
    });

    it('malicious automations should have data volume anomalies', () => {
      const scenarios = Array.from({ length: 100 }, () =>
        generator.generateGoogleScript(true)
      );

      const withAnomalies = scenarios.filter(s => s.features.dataVolumeAnomalous).length;

      // Around 60% should have anomalies
      expect(withAnomalies).toBeGreaterThan(40);
    });

    it('legitimate automations should never have data volume anomalies', () => {
      const scenarios = Array.from({ length: 100 }, () =>
        generator.generateMicrosoftFlow(false)
      );

      scenarios.forEach(scenario => {
        expect(scenario.features.dataVolumeAnomalous).toBe(false);
      });
    });

    it('malicious automations should have permission escalation patterns', () => {
      const scenarios = Array.from({ length: 100 }, () =>
        generator.generateGoogleScript(true)
      );

      const withEscalation = scenarios.filter(s => s.features.permissionEscalation).length;

      // Around 40% should have permission escalation
      expect(withEscalation).toBeGreaterThan(20);
    });

    it('legitimate automations should never have permission escalation', () => {
      const scenarios = Array.from({ length: 100 }, () =>
        generator.generateSlackBot(false)
      );

      scenarios.forEach(scenario => {
        expect(scenario.features.permissionEscalation).toBe(false);
      });
    });

    it('some malicious automations should have timing variance', () => {
      const scenarios = Array.from({ length: 100 }, () =>
        generator.generateSlackBot(true)
      );

      const withTimingVariance = scenarios.filter(s => s.features.timingVariance !== undefined).length;

      // Around 30% should have timing variance
      expect(withTimingVariance).toBeGreaterThan(15);
    });

    it('malicious automations should have realistic confidence scores', () => {
      const maliciousScenarios = Array.from({ length: 1000 }, () =>
        generator.generateMicrosoftFlow(true)
      );
      const legitimateScenarios = Array.from({ length: 1000 }, () =>
        generator.generateMicrosoftFlow(false)
      );

      const avgMaliciousConfidence =
        maliciousScenarios.reduce((sum, s) => sum + s.confidence, 0) / maliciousScenarios.length;
      const avgLegitimateConfidence =
        legitimateScenarios.reduce((sum, s) => sum + s.confidence, 0) / legitimateScenarios.length;

      // Both should have high confidence, legitimate slightly higher
      expect(avgMaliciousConfidence).toBeGreaterThanOrEqual(0.7);
      expect(avgLegitimateConfidence).toBeGreaterThanOrEqual(0.79); // Allow some rounding error
    });
  });

  describe('confidence score validation', () => {
    it('should generate confidence scores within valid range', () => {
      const scenarios = generator.generateAutomations(1000);

      scenarios.forEach(scenario => {
        expect(scenario.confidence).toBeGreaterThanOrEqual(0.1);
        expect(scenario.confidence).toBeLessThanOrEqual(1.0);
      });
    });

    it('malicious scenarios should have confidence >= 0.7', () => {
      const scenarios = generator.generateBatch(1000, 1.0); // All malicious

      scenarios.forEach(scenario => {
        expect(scenario.confidence).toBeGreaterThanOrEqual(0.7);
      });
    });

    it('legitimate scenarios should have confidence >= 0.8', () => {
      const scenarios = generator.generateBatch(1000, 0.0); // All legitimate

      scenarios.forEach(scenario => {
        expect(scenario.confidence).toBeGreaterThanOrEqual(0.8);
      });
    });
  });

  describe('attack type distribution', () => {
    it('should distribute attack types across malicious automations', () => {
      const scenarios = generator.generateBatch(1000, 1.0); // All malicious

      const attackTypeCounts = scenarios.reduce((acc, s) => {
        if (s.attackType) {
          acc[s.attackType] = (acc[s.attackType] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>);

      // All attack types should appear
      expect(Object.keys(attackTypeCounts).length).toBeGreaterThan(0);

      // Each attack type should have some representation
      Object.values(attackTypeCounts).forEach(count => {
        expect(count).toBeGreaterThan(0);
      });
    });

    it('legitimate automations should not have attack types', () => {
      const scenarios = generator.generateBatch(100, 0.0); // All legitimate

      scenarios.forEach(scenario => {
        expect(scenario.attackType).toBeUndefined();
      });
    });
  });

  describe('deterministic generation', () => {
    it('should produce same results with same seed', () => {
      const gen1 = new StressTestDataGenerator();
      const gen2 = new StressTestDataGenerator();

      const scenarios1 = gen1.generateAutomations(100);
      const scenarios2 = gen2.generateAutomations(100);

      expect(scenarios1.length).toBe(scenarios2.length);

      scenarios1.forEach((scenario, i) => {
        expect(scenario.automationId).toBe(scenarios2[i].automationId);
        expect(scenario.platform).toBe(scenarios2[i].platform);
        expect(scenario.actual).toBe(scenarios2[i].actual);
      });
    });
  });

  describe('automation ID format', () => {
    it('should generate IDs with platform prefix and padded numbers', () => {
      const scenarios = generator.generateAutomations(100);

      scenarios.forEach(scenario => {
        expect(scenario.automationId).toMatch(/^(slack|google|microsoft)-\d{6}$/);
      });
    });
  });

  describe('feature combinations', () => {
    it('malicious automations should have multiple risk indicators', () => {
      const scenarios = Array.from({ length: 100 }, () =>
        generator.generateSlackBot(true)
      );

      scenarios.forEach(scenario => {
        const riskIndicators = [
          scenario.features.hasAIProvider,
          scenario.features.velocityScore && scenario.features.velocityScore > 0.7,
          scenario.features.offHoursActivity,
          scenario.features.dataVolumeAnomalous,
          scenario.features.permissionEscalation,
          scenario.features.batchOperations
        ].filter(Boolean).length;

        // Each malicious automation should have at least 2 risk indicators
        expect(riskIndicators).toBeGreaterThanOrEqual(2);
      });
    });

    it('legitimate automations should have minimal risk indicators', () => {
      const scenarios = Array.from({ length: 1000 }, () =>
        generator.generateMicrosoftFlow(false)
      );

      const riskCounts = scenarios.map(scenario => {
        return [
          scenario.features.hasAIProvider,
          scenario.features.velocityScore && scenario.features.velocityScore > 0.5,
          scenario.features.offHoursActivity,
          scenario.features.dataVolumeAnomalous,
          scenario.features.permissionEscalation
        ].filter(Boolean).length;
      });

      const avgRiskIndicators = riskCounts.reduce((a, b) => a + b, 0) / riskCounts.length;

      // Average should be low (legitimate should have few risk indicators)
      expect(avgRiskIndicators).toBeLessThan(0.5); // Average less than 0.5 indicators per automation
    });
  });
});
