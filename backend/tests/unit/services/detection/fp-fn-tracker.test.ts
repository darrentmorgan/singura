/**
 * Tests for FPFNTrackerService
 */

import {
  FPFNTrackerService,
  FPFNReport
} from '../../../../src/services/detection/fp-fn-tracker.service';
import {
  DetectionResult,
  GroundTruthLabel
} from '../../../../src/services/detection/detection-metrics.service';

describe('FPFNTrackerService', () => {
  let service: FPFNTrackerService;

  beforeEach(() => {
    service = new FPFNTrackerService();
  });

  describe('track', () => {
    it('should identify false positives correctly', () => {
      const predictions: DetectionResult[] = [
        {
          automationId: 'slack-bot-001',
          predicted: 'malicious',
          confidence: 0.85,
          detectorName: 'velocity-detector',
          timestamp: new Date()
        }
      ];

      const groundTruth: GroundTruthLabel[] = [
        {
          automationId: 'slack-bot-001',
          actual: 'legitimate',
          confidence: 0.90,
          reviewers: ['engineer1', 'engineer2'],
          rationale: 'Standard notification bot'
        }
      ];

      const automationDetails = new Map([
        [
          'slack-bot-001',
          {
            platform: 'slack',
            type: 'bot',
            features: {
              hasAIProvider: false,
              velocityScore: 0.30,
              offHoursActivity: false
            }
          }
        ]
      ]);

      const report = service.track(predictions, groundTruth, automationDetails);

      expect(report.falsePositives).toHaveLength(1);
      expect(report.falseNegatives).toHaveLength(0);
      expect(report.stats.totalFP).toBe(1);
      expect(report.stats.totalFN).toBe(0);

      const fp = report.falsePositives[0];
      expect(fp.automationId).toBe('slack-bot-001');
      expect(fp.predictedMalicious).toBe(true);
      expect(fp.actualLegitimate).toBe(true);
      expect(fp.confidence).toBe(0.85);
      expect(fp.detectorName).toBe('velocity-detector');
      expect(fp.analysis).toContain('velocity');
    });

    it('should identify false negatives correctly', () => {
      const predictions: DetectionResult[] = [
        {
          automationId: 'slack-bot-002',
          predicted: 'legitimate',
          confidence: 0.45,
          detectorName: 'ai-provider-detector',
          timestamp: new Date()
        }
      ];

      const groundTruth: GroundTruthLabel[] = [
        {
          automationId: 'slack-bot-002',
          actual: 'malicious',
          confidence: 0.95,
          reviewers: ['engineer1', 'engineer2'],
          rationale: 'Data exfiltration with OpenAI integration'
        }
      ];

      const automationDetails = new Map([
        [
          'slack-bot-002',
          {
            platform: 'slack',
            type: 'bot',
            attackType: 'data_exfiltration',
            features: {
              hasAIProvider: true,
              aiProvider: 'openai',
              velocityScore: 0.89,
              dataVolumeAnomalous: true,
              offHoursActivity: true
            }
          }
        ]
      ]);

      const report = service.track(predictions, groundTruth, automationDetails);

      expect(report.falsePositives).toHaveLength(0);
      expect(report.falseNegatives).toHaveLength(1);
      expect(report.stats.totalFP).toBe(0);
      expect(report.stats.totalFN).toBe(1);

      const fn = report.falseNegatives[0];
      expect(fn.automationId).toBe('slack-bot-002');
      expect(fn.predictedLegitimate).toBe(true);
      expect(fn.actualMalicious).toBe(true);
      expect(fn.confidence).toBe(0.45);
      expect(fn.automationDetails.attackType).toBe('data_exfiltration');
      expect(fn.analysis).toBeTruthy();
    });

    it('should track completely missed detections (no prediction)', () => {
      const predictions: DetectionResult[] = [];

      const groundTruth: GroundTruthLabel[] = [
        {
          automationId: 'google-script-001',
          actual: 'malicious',
          confidence: 0.95,
          reviewers: ['engineer1', 'engineer2'],
          rationale: 'Critical exfiltration script'
        }
      ];

      const automationDetails = new Map([
        [
          'google-script-001',
          {
            platform: 'google',
            type: 'apps-script',
            attackType: 'data_exfiltration',
            features: {
              hasAIProvider: true,
              aiProvider: 'openai',
              velocityScore: 0.92
            }
          }
        ]
      ]);

      const report = service.track(predictions, groundTruth, automationDetails);

      expect(report.falseNegatives).toHaveLength(1);
      expect(report.stats.totalFN).toBe(1);

      const fn = report.falseNegatives[0];
      expect(fn.automationId).toBe('google-script-001');
      expect(fn.detectorName).toBe('none');
      expect(fn.confidence).toBe(0);
      expect(fn.analysis).toContain('Critical miss');
    });

    it('should calculate FP rate correctly', () => {
      const predictions: DetectionResult[] = [
        {
          automationId: 'bot-001',
          predicted: 'malicious',
          confidence: 0.80,
          detectorName: 'detector-1',
          timestamp: new Date()
        },
        {
          automationId: 'bot-002',
          predicted: 'malicious',
          confidence: 0.85,
          detectorName: 'detector-1',
          timestamp: new Date()
        },
        {
          automationId: 'bot-003',
          predicted: 'legitimate',
          confidence: 0.30,
          detectorName: 'detector-1',
          timestamp: new Date()
        }
      ];

      const groundTruth: GroundTruthLabel[] = [
        {
          automationId: 'bot-001',
          actual: 'legitimate', // FP
          confidence: 0.90,
          reviewers: ['engineer1'],
          rationale: 'Legitimate bot'
        },
        {
          automationId: 'bot-002',
          actual: 'malicious', // TP
          confidence: 0.95,
          reviewers: ['engineer1'],
          rationale: 'Malicious bot'
        },
        {
          automationId: 'bot-003',
          actual: 'legitimate', // TN
          confidence: 0.90,
          reviewers: ['engineer1'],
          rationale: 'Legitimate bot'
        }
      ];

      const automationDetails = new Map(
        ['bot-001', 'bot-002', 'bot-003'].map(id => [
          id,
          { platform: 'slack', type: 'bot', features: {} }
        ])
      );

      const report = service.track(predictions, groundTruth, automationDetails);

      // FP = 1, TN = 1
      // FP Rate = FP / (FP + TN) = 1 / 2 = 0.5
      expect(report.stats.fpRate).toBeCloseTo(0.5, 2);
    });

    it('should calculate FN rate correctly', () => {
      const predictions: DetectionResult[] = [
        {
          automationId: 'bot-001',
          predicted: 'legitimate',
          confidence: 0.40,
          detectorName: 'detector-1',
          timestamp: new Date()
        },
        {
          automationId: 'bot-002',
          predicted: 'malicious',
          confidence: 0.85,
          detectorName: 'detector-1',
          timestamp: new Date()
        },
        {
          automationId: 'bot-003',
          predicted: 'malicious',
          confidence: 0.90,
          detectorName: 'detector-1',
          timestamp: new Date()
        }
      ];

      const groundTruth: GroundTruthLabel[] = [
        {
          automationId: 'bot-001',
          actual: 'malicious', // FN
          confidence: 0.95,
          reviewers: ['engineer1'],
          rationale: 'Malicious bot'
        },
        {
          automationId: 'bot-002',
          actual: 'malicious', // TP
          confidence: 0.95,
          reviewers: ['engineer1'],
          rationale: 'Malicious bot'
        },
        {
          automationId: 'bot-003',
          actual: 'malicious', // TP
          confidence: 0.95,
          reviewers: ['engineer1'],
          rationale: 'Malicious bot'
        }
      ];

      const automationDetails = new Map(
        ['bot-001', 'bot-002', 'bot-003'].map(id => [
          id,
          { platform: 'slack', type: 'bot', attackType: 'data_exfiltration', features: {} }
        ])
      );

      const report = service.track(predictions, groundTruth, automationDetails);

      // FN = 1, TP = 2
      // FN Rate = FN / (FN + TP) = 1 / 3 = 0.333
      expect(report.stats.fnRate).toBeCloseTo(0.333, 2);
    });

    it('should break down errors by detector', () => {
      const predictions: DetectionResult[] = [
        {
          automationId: 'bot-001',
          predicted: 'malicious',
          confidence: 0.80,
          detectorName: 'velocity-detector',
          timestamp: new Date()
        },
        {
          automationId: 'bot-002',
          predicted: 'legitimate',
          confidence: 0.40,
          detectorName: 'ai-provider-detector',
          timestamp: new Date()
        }
      ];

      const groundTruth: GroundTruthLabel[] = [
        {
          automationId: 'bot-001',
          actual: 'legitimate', // FP for velocity-detector
          confidence: 0.90,
          reviewers: ['engineer1'],
          rationale: 'Legitimate bot'
        },
        {
          automationId: 'bot-002',
          actual: 'malicious', // FN for ai-provider-detector
          confidence: 0.95,
          reviewers: ['engineer1'],
          rationale: 'Malicious bot'
        }
      ];

      const automationDetails = new Map([
        ['bot-001', { platform: 'slack', type: 'bot', features: {} }],
        ['bot-002', { platform: 'google', type: 'script', attackType: 'ai_abuse', features: {} }]
      ]);

      const report = service.track(predictions, groundTruth, automationDetails);

      expect(report.stats.byDetector.size).toBe(2);

      const velocityStats = report.stats.byDetector.get('velocity-detector');
      expect(velocityStats).toBeDefined();
      expect(velocityStats!.fpCount).toBe(1);
      expect(velocityStats!.fnCount).toBe(0);

      const aiProviderStats = report.stats.byDetector.get('ai-provider-detector');
      expect(aiProviderStats).toBeDefined();
      expect(aiProviderStats!.fpCount).toBe(0);
      expect(aiProviderStats!.fnCount).toBe(1);
    });

    it('should break down errors by platform', () => {
      const predictions: DetectionResult[] = [
        {
          automationId: 'slack-bot-001',
          predicted: 'malicious',
          confidence: 0.80,
          detectorName: 'detector-1',
          timestamp: new Date()
        },
        {
          automationId: 'google-script-001',
          predicted: 'legitimate',
          confidence: 0.40,
          detectorName: 'detector-1',
          timestamp: new Date()
        }
      ];

      const groundTruth: GroundTruthLabel[] = [
        {
          automationId: 'slack-bot-001',
          actual: 'legitimate', // FP for slack
          confidence: 0.90,
          reviewers: ['engineer1'],
          rationale: 'Legitimate bot'
        },
        {
          automationId: 'google-script-001',
          actual: 'malicious', // FN for google
          confidence: 0.95,
          reviewers: ['engineer1'],
          rationale: 'Malicious script'
        }
      ];

      const automationDetails = new Map([
        ['slack-bot-001', { platform: 'slack', type: 'bot', features: {} }],
        ['google-script-001', { platform: 'google', type: 'script', attackType: 'data_exfiltration', features: {} }]
      ]);

      const report = service.track(predictions, groundTruth, automationDetails);

      expect(report.stats.byPlatform.size).toBe(2);

      const slackStats = report.stats.byPlatform.get('slack');
      expect(slackStats).toBeDefined();
      expect(slackStats!.fpCount).toBe(1);
      expect(slackStats!.fnCount).toBe(0);

      const googleStats = report.stats.byPlatform.get('google');
      expect(googleStats).toBeDefined();
      expect(googleStats!.fpCount).toBe(0);
      expect(googleStats!.fnCount).toBe(1);
    });

    it('should break down errors by attack type', () => {
      const predictions: DetectionResult[] = [
        {
          automationId: 'bot-001',
          predicted: 'legitimate',
          confidence: 0.40,
          detectorName: 'detector-1',
          timestamp: new Date()
        },
        {
          automationId: 'bot-002',
          predicted: 'legitimate',
          confidence: 0.35,
          detectorName: 'detector-1',
          timestamp: new Date()
        }
      ];

      const groundTruth: GroundTruthLabel[] = [
        {
          automationId: 'bot-001',
          actual: 'malicious',
          confidence: 0.95,
          reviewers: ['engineer1'],
          rationale: 'Data exfiltration'
        },
        {
          automationId: 'bot-002',
          actual: 'malicious',
          confidence: 0.95,
          reviewers: ['engineer1'],
          rationale: 'Privilege escalation'
        }
      ];

      const automationDetails = new Map([
        ['bot-001', { platform: 'slack', type: 'bot', attackType: 'data_exfiltration', features: {} }],
        ['bot-002', { platform: 'google', type: 'script', attackType: 'privilege_escalation', features: {} }]
      ]);

      const report = service.track(predictions, groundTruth, automationDetails);

      expect(report.stats.byAttackType.size).toBe(2);

      const exfiltrationStats = report.stats.byAttackType.get('data_exfiltration');
      expect(exfiltrationStats).toBeDefined();
      expect(exfiltrationStats!.fnCount).toBe(1);

      const escalationStats = report.stats.byAttackType.get('privilege_escalation');
      expect(escalationStats).toBeDefined();
      expect(escalationStats!.fnCount).toBe(1);
    });

    it('should generate recommendations for high FP rate detectors', () => {
      const predictions: DetectionResult[] = Array.from({ length: 10 }, (_, i) => ({
        automationId: `bot-${i}`,
        predicted: 'malicious' as const,
        confidence: 0.80,
        detectorName: 'velocity-detector',
        timestamp: new Date()
      }));

      const groundTruth: GroundTruthLabel[] = Array.from({ length: 10 }, (_, i) => ({
        automationId: `bot-${i}`,
        actual: 'legitimate' as const, // All FPs
        confidence: 0.90,
        reviewers: ['engineer1'],
        rationale: 'Legitimate bot'
      }));

      const automationDetails = new Map(
        Array.from({ length: 10 }, (_, i) => [
          `bot-${i}`,
          { platform: 'slack', type: 'bot', features: {} }
        ])
      );

      const report = service.track(predictions, groundTruth, automationDetails);

      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations.some(r => r.includes('velocity-detector'))).toBe(true);
      expect(report.recommendations.some(r => r.includes('false positive rate'))).toBe(true);
    });

    it('should throw error for invalid inputs', () => {
      expect(() => {
        service.track(null as any, [], new Map());
      }).toThrow('Predictions must be an array');

      expect(() => {
        service.track([], null as any, new Map());
      }).toThrow('Ground truth must be an array');

      expect(() => {
        service.track([], [], {} as any);
      }).toThrow('Automation details must be a Map');
    });
  });

  describe('generateReport', () => {
    it('should generate comprehensive markdown report', () => {
      const predictions: DetectionResult[] = [
        {
          automationId: 'bot-001',
          predicted: 'malicious',
          confidence: 0.85,
          detectorName: 'velocity-detector',
          timestamp: new Date()
        }
      ];

      const groundTruth: GroundTruthLabel[] = [
        {
          automationId: 'bot-001',
          actual: 'legitimate',
          confidence: 0.90,
          reviewers: ['engineer1'],
          rationale: 'Standard notification bot'
        }
      ];

      const automationDetails = new Map([
        ['bot-001', { platform: 'slack', type: 'bot', features: {} }]
      ]);

      const report = service.track(predictions, groundTruth, automationDetails);
      const markdown = service.generateReport(report);

      expect(markdown).toContain('# False Positive / False Negative Analysis Report');
      expect(markdown).toContain('## Summary Statistics');
      expect(markdown).toContain('**Total False Positives**');
      expect(markdown).toContain('**Total False Negatives**');
      expect(markdown).toContain('## Breakdown by Detector');
      expect(markdown).toContain('## Breakdown by Platform');
    });

    it('should include top false positives in report', () => {
      const predictions: DetectionResult[] = [
        {
          automationId: 'bot-001',
          predicted: 'malicious',
          confidence: 0.95,
          detectorName: 'detector-1',
          timestamp: new Date()
        }
      ];

      const groundTruth: GroundTruthLabel[] = [
        {
          automationId: 'bot-001',
          actual: 'legitimate',
          confidence: 0.90,
          reviewers: ['engineer1'],
          rationale: 'Legitimate bot'
        }
      ];

      const automationDetails = new Map([
        ['bot-001', { platform: 'slack', type: 'bot', features: {} }]
      ]);

      const report = service.track(predictions, groundTruth, automationDetails);
      const markdown = service.generateReport(report);

      expect(markdown).toContain('## Top 5 False Positives');
      expect(markdown).toContain('bot-001');
      expect(markdown).toContain('95.0%');
    });

    it('should include top false negatives in report', () => {
      const predictions: DetectionResult[] = [
        {
          automationId: 'bot-001',
          predicted: 'legitimate',
          confidence: 0.40,
          detectorName: 'detector-1',
          timestamp: new Date()
        }
      ];

      const groundTruth: GroundTruthLabel[] = [
        {
          automationId: 'bot-001',
          actual: 'malicious',
          confidence: 0.95,
          reviewers: ['engineer1'],
          rationale: 'Data exfiltration'
        }
      ];

      const automationDetails = new Map([
        ['bot-001', { platform: 'slack', type: 'bot', attackType: 'data_exfiltration', features: {} }]
      ]);

      const report = service.track(predictions, groundTruth, automationDetails);
      const markdown = service.generateReport(report);

      expect(markdown).toContain('## Top 5 False Negatives');
      expect(markdown).toContain('bot-001');
      expect(markdown).toContain('data_exfiltration');
    });
  });

  describe('exportToJSON', () => {
    it('should export report to valid JSON', () => {
      const predictions: DetectionResult[] = [
        {
          automationId: 'bot-001',
          predicted: 'malicious',
          confidence: 0.85,
          detectorName: 'detector-1',
          timestamp: new Date()
        }
      ];

      const groundTruth: GroundTruthLabel[] = [
        {
          automationId: 'bot-001',
          actual: 'legitimate',
          confidence: 0.90,
          reviewers: ['engineer1'],
          rationale: 'Legitimate bot'
        }
      ];

      const automationDetails = new Map([
        ['bot-001', { platform: 'slack', type: 'bot', features: {} }]
      ]);

      const report = service.track(predictions, groundTruth, automationDetails);
      const json = service.exportToJSON(report);

      expect(() => JSON.parse(json)).not.toThrow();

      const parsed = JSON.parse(json);
      expect(parsed).toHaveProperty('falsePositives');
      expect(parsed).toHaveProperty('falseNegatives');
      expect(parsed).toHaveProperty('stats');
      expect(parsed).toHaveProperty('recommendations');
      expect(parsed.stats).toHaveProperty('byDetector');
      expect(parsed.stats).toHaveProperty('byPlatform');
    });
  });

  describe('getAutomationAnalysis', () => {
    it('should retrieve false positive analysis', () => {
      const predictions: DetectionResult[] = [
        {
          automationId: 'bot-001',
          predicted: 'malicious',
          confidence: 0.85,
          detectorName: 'detector-1',
          timestamp: new Date()
        }
      ];

      const groundTruth: GroundTruthLabel[] = [
        {
          automationId: 'bot-001',
          actual: 'legitimate',
          confidence: 0.90,
          reviewers: ['engineer1'],
          rationale: 'Legitimate bot'
        }
      ];

      const automationDetails = new Map([
        ['bot-001', { platform: 'slack', type: 'bot', features: {} }]
      ]);

      const report = service.track(predictions, groundTruth, automationDetails);
      const analysis = service.getAutomationAnalysis('bot-001', report);

      expect(analysis.type).toBe('fp');
      expect(analysis.details).toBeTruthy();
      expect((analysis.details as any).automationId).toBe('bot-001');
    });

    it('should retrieve false negative analysis', () => {
      const predictions: DetectionResult[] = [
        {
          automationId: 'bot-001',
          predicted: 'legitimate',
          confidence: 0.40,
          detectorName: 'detector-1',
          timestamp: new Date()
        }
      ];

      const groundTruth: GroundTruthLabel[] = [
        {
          automationId: 'bot-001',
          actual: 'malicious',
          confidence: 0.95,
          reviewers: ['engineer1'],
          rationale: 'Malicious bot'
        }
      ];

      const automationDetails = new Map([
        ['bot-001', { platform: 'slack', type: 'bot', attackType: 'data_exfiltration', features: {} }]
      ]);

      const report = service.track(predictions, groundTruth, automationDetails);
      const analysis = service.getAutomationAnalysis('bot-001', report);

      expect(analysis.type).toBe('fn');
      expect(analysis.details).toBeTruthy();
      expect((analysis.details as any).automationId).toBe('bot-001');
    });

    it('should return none for automation not in report', () => {
      const predictions: DetectionResult[] = [];
      const groundTruth: GroundTruthLabel[] = [];
      const automationDetails = new Map();

      const report = service.track(predictions, groundTruth, automationDetails);
      const analysis = service.getAutomationAnalysis('bot-999', report);

      expect(analysis.type).toBe('none');
      expect(analysis.details).toBeNull();
    });
  });
});
