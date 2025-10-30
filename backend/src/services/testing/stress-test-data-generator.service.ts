/**
 * Stress Test Data Generator Service
 *
 * Generates realistic automation scenarios for stress testing detection algorithms.
 * Produces 10,000 automation scenarios with realistic distributions across platforms,
 * malicious vs legitimate classifications, and attack patterns.
 *
 * Performance target: Generate 10K automations in <5 seconds
 */

export interface AutomationScenario {
  automationId: string;
  platform: 'slack' | 'google' | 'microsoft';
  actual: 'malicious' | 'legitimate';
  confidence: number;
  timestamp: Date;
  features: {
    hasAIProvider?: boolean;
    aiProvider?: string;
    velocityScore?: number;
    offHoursActivity?: boolean;
    dataVolumeAnomalous?: boolean;
    permissionEscalation?: boolean;
    batchOperations?: boolean;
    timingVariance?: number;
  };
  attackType?: 'data_exfiltration' | 'privilege_escalation' | 'credential_theft' | 'backdoor' | 'rate_limit_evasion' | 'ai_abuse';
}

export class StressTestDataGenerator {
  private static readonly AI_PROVIDERS = ['openai', 'anthropic', 'google'];
  private static readonly ATTACK_TYPES: AutomationScenario['attackType'][] = [
    'data_exfiltration',
    'privilege_escalation',
    'credential_theft',
    'backdoor',
    'rate_limit_evasion',
    'ai_abuse'
  ];

  private counter = 0;

  /**
   * Generate N automation scenarios
   * @param count Number of scenarios to generate
   * @returns Array of automation scenarios
   */
  generateAutomations(count: number): AutomationScenario[] {
    const scenarios: AutomationScenario[] = [];
    const startTime = Date.now();

    for (let i = 0; i < count; i++) {
      scenarios.push(this.generateScenario(i));
    }

    const elapsed = Date.now() - startTime;
    console.log(`Generated ${count} automations in ${elapsed}ms (${(elapsed / 1000).toFixed(2)}s)`);

    return scenarios;
  }

  /**
   * Generate a single automation scenario
   * @param index Scenario index for deterministic generation
   * @returns Automation scenario
   */
  private generateScenario(index: number): AutomationScenario {
    const platform = this.selectPlatform(index);
    const isMalicious = this.determineMalicious(index);

    if (isMalicious) {
      return this.generateMaliciousScenario(platform, index);
    } else {
      return this.generateLegitimateScenario(platform, index);
    }
  }

  /**
   * Generate Slack bot scenario
   * @param malicious Whether scenario should be malicious
   * @returns Automation scenario
   */
  generateSlackBot(malicious: boolean): AutomationScenario {
    const id = this.counter++;
    const platform = 'slack' as const;

    if (malicious) {
      return this.generateMaliciousScenario(platform, id);
    } else {
      return this.generateLegitimateScenario(platform, id);
    }
  }

  /**
   * Generate Google Apps Script scenario
   * @param malicious Whether scenario should be malicious
   * @returns Automation scenario
   */
  generateGoogleScript(malicious: boolean): AutomationScenario {
    const id = this.counter++;
    const platform = 'google' as const;

    if (malicious) {
      return this.generateMaliciousScenario(platform, id);
    } else {
      return this.generateLegitimateScenario(platform, id);
    }
  }

  /**
   * Generate Microsoft Power Automate scenario
   * @param malicious Whether scenario should be malicious
   * @returns Automation scenario
   */
  generateMicrosoftFlow(malicious: boolean): AutomationScenario {
    const id = this.counter++;
    const platform = 'microsoft' as const;

    if (malicious) {
      return this.generateMaliciousScenario(platform, id);
    } else {
      return this.generateLegitimateScenario(platform, id);
    }
  }

  /**
   * Generate batch of scenarios with specific malicious ratio
   * @param count Total number of scenarios
   * @param maliciousRatio Ratio of malicious scenarios (0-1)
   * @returns Array of automation scenarios
   */
  generateBatch(count: number, maliciousRatio: number): AutomationScenario[] {
    const scenarios: AutomationScenario[] = [];
    const maliciousCount = Math.floor(count * maliciousRatio);

    for (let i = 0; i < count; i++) {
      const isMalicious = i < maliciousCount;
      const platform = this.selectPlatform(i);

      if (isMalicious) {
        scenarios.push(this.generateMaliciousScenario(platform, i));
      } else {
        scenarios.push(this.generateLegitimateScenario(platform, i));
      }
    }

    return scenarios;
  }

  /**
   * Select platform based on distribution (50% Slack, 30% Google, 20% Microsoft)
   * @param seed Random seed for deterministic selection
   * @returns Platform name
   */
  private selectPlatform(seed: number): 'slack' | 'google' | 'microsoft' {
    const hash = this.seededRandom(seed, 999, 1000);

    if (hash < 500) {
      return 'slack';
    } else if (hash < 800) {
      return 'google';
    } else {
      return 'microsoft';
    }
  }

  /**
   * Determine if scenario should be malicious (20% ratio)
   * @param seed Random seed for deterministic selection
   * @returns Whether scenario is malicious
   */
  private determineMalicious(seed: number): boolean {
    const hash = this.seededRandom(seed, 1001, 1000);
    return hash < 200; // 20% malicious
  }

  /**
   * Generate malicious automation scenario
   * @param platform Platform name
   * @param seed Random seed for deterministic generation
   * @returns Malicious automation scenario
   */
  private generateMaliciousScenario(
    platform: 'slack' | 'google' | 'microsoft',
    seed: number
  ): AutomationScenario {
    const aiProviderIndex = this.seededRandom(seed, 1002, StressTestDataGenerator.AI_PROVIDERS.length);
    const attackTypeIndex = this.seededRandom(seed, 1003, StressTestDataGenerator.ATTACK_TYPES.length);
    const hasTimingVariance = this.seededRandom(seed, 1004, 1000) < 300; // 30% have timing variance

    return {
      automationId: `${platform}-${seed.toString().padStart(6, '0')}`,
      platform,
      actual: 'malicious',
      confidence: this.seededRandom(seed, 1005, 300) / 1000 + 0.70, // 0.70-1.00
      timestamp: this.generateTimestamp(seed),
      features: {
        hasAIProvider: true,
        aiProvider: StressTestDataGenerator.AI_PROVIDERS[aiProviderIndex],
        velocityScore: this.seededRandom(seed, 1006, 300) / 1000 + 0.70, // 0.70-1.00
        offHoursActivity: this.seededRandom(seed, 1007, 1000) < 700, // 70% off-hours
        dataVolumeAnomalous: this.seededRandom(seed, 1008, 1000) < 600, // 60% anomalous
        permissionEscalation: this.seededRandom(seed, 1009, 1000) < 400, // 40% permission escalation
        batchOperations: this.seededRandom(seed, 1010, 1000) < 500, // 50% batch operations
        ...(hasTimingVariance && {
          timingVariance: this.seededRandom(seed, 1011, 200) / 1000 + 0.75 // 0.75-0.95
        })
      },
      attackType: StressTestDataGenerator.ATTACK_TYPES[attackTypeIndex]
    };
  }

  /**
   * Generate legitimate automation scenario
   * @param platform Platform name
   * @param seed Random seed for deterministic generation
   * @returns Legitimate automation scenario
   */
  private generateLegitimateScenario(
    platform: 'slack' | 'google' | 'microsoft',
    seed: number
  ): AutomationScenario {
    const hasAI = this.seededRandom(seed, 1012, 1000) < 100; // 10% legitimate automations have AI
    const hasBatch = this.seededRandom(seed, 1013, 1000) < 300; // 30% have batch operations

    const scenario: AutomationScenario = {
      automationId: `${platform}-${seed.toString().padStart(6, '0')}`,
      platform,
      actual: 'legitimate',
      confidence: this.seededRandom(seed, 1014, 200) / 1000 + 0.80, // 0.80-1.00
      timestamp: this.generateTimestamp(seed),
      features: {
        hasAIProvider: hasAI,
        velocityScore: this.seededRandom(seed, 1015, 500) / 1000, // 0.00-0.50
        offHoursActivity: this.seededRandom(seed, 1016, 1000) < 200, // 20% off-hours
        dataVolumeAnomalous: false,
        permissionEscalation: false,
        ...(hasBatch && { batchOperations: true })
      }
    };

    if (hasAI) {
      const aiProviderIndex = this.seededRandom(seed, 1017, StressTestDataGenerator.AI_PROVIDERS.length);
      scenario.features.aiProvider = StressTestDataGenerator.AI_PROVIDERS[aiProviderIndex];
    }

    return scenario;
  }

  /**
   * Generate realistic timestamp spread over 30 days
   * @param seed Random seed for deterministic generation
   * @returns Timestamp
   */
  private generateTimestamp(seed: number): Date {
    const now = Date.now();
    const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
    const offsetMs = this.seededRandom(seed, 1018, thirtyDaysMs);

    return new Date(now - offsetMs);
  }

  /**
   * Seeded pseudo-random number generator
   * Uses MurmurHash3-inspired algorithm for better distribution
   * @param seed Random seed
   * @param salt Additional salt for variation
   * @param max Maximum value (exclusive)
   * @returns Random number between 0 and max
   */
  private seededRandom(seed: number, salt: number, max: number): number {
    // MurmurHash3-inspired hash for better distribution
    let hash = seed + salt;

    // Mix bits
    hash ^= hash >>> 16;
    hash = Math.imul(hash, 0x85ebca6b);
    hash ^= hash >>> 13;
    hash = Math.imul(hash, 0xc2b2ae35);
    hash ^= hash >>> 16;

    // Convert to unsigned 32-bit integer and take modulo
    return (hash >>> 0) % max;
  }
}
