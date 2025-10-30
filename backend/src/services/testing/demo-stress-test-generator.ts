/**
 * Demo script for StressTestDataGenerator
 *
 * Run with: npx ts-node src/services/testing/demo-stress-test-generator.ts
 */

import { StressTestDataGenerator } from './stress-test-data-generator.service';

function main() {
  console.log('=== StressTestDataGenerator Demo ===\n');

  const generator = new StressTestDataGenerator();

  // Demo 1: Generate 10K automations (performance test)
  console.log('1. Generating 10,000 automation scenarios...');
  const startTime = Date.now();
  const scenarios = generator.generateAutomations(10000);
  const elapsed = Date.now() - startTime;

  console.log(`   ✓ Generated ${scenarios.length} scenarios in ${elapsed}ms (${(elapsed / 1000).toFixed(2)}s)\n`);

  // Demo 2: Show distribution statistics
  console.log('2. Distribution statistics:');
  const slackCount = scenarios.filter(s => s.platform === 'slack').length;
  const googleCount = scenarios.filter(s => s.platform === 'google').length;
  const microsoftCount = scenarios.filter(s => s.platform === 'microsoft').length;
  const maliciousCount = scenarios.filter(s => s.actual === 'malicious').length;
  const legitimateCount = scenarios.filter(s => s.actual === 'legitimate').length;

  console.log(`   Slack: ${slackCount} (${(slackCount / scenarios.length * 100).toFixed(1)}%)`);
  console.log(`   Google: ${googleCount} (${(googleCount / scenarios.length * 100).toFixed(1)}%)`);
  console.log(`   Microsoft: ${microsoftCount} (${(microsoftCount / scenarios.length * 100).toFixed(1)}%)`);
  console.log(`   Malicious: ${maliciousCount} (${(maliciousCount / scenarios.length * 100).toFixed(1)}%)`);
  console.log(`   Legitimate: ${legitimateCount} (${(legitimateCount / scenarios.length * 100).toFixed(1)}%)\n`);

  // Demo 3: Sample scenarios
  console.log('3. Sample malicious scenario:');
  const maliciousSample = scenarios.find(s => s.actual === 'malicious');
  if (maliciousSample) {
    console.log(`   ID: ${maliciousSample.automationId}`);
    console.log(`   Platform: ${maliciousSample.platform}`);
    console.log(`   Attack Type: ${maliciousSample.attackType}`);
    console.log(`   AI Provider: ${maliciousSample.features.aiProvider}`);
    console.log(`   Velocity Score: ${maliciousSample.features.velocityScore?.toFixed(2)}`);
    console.log(`   Confidence: ${maliciousSample.confidence.toFixed(2)}\n`);
  }

  console.log('4. Sample legitimate scenario:');
  const legitimateSample = scenarios.find(s => s.actual === 'legitimate');
  if (legitimateSample) {
    console.log(`   ID: ${legitimateSample.automationId}`);
    console.log(`   Platform: ${legitimateSample.platform}`);
    console.log(`   Has AI: ${legitimateSample.features.hasAIProvider}`);
    console.log(`   Velocity Score: ${legitimateSample.features.velocityScore?.toFixed(2)}`);
    console.log(`   Confidence: ${legitimateSample.confidence.toFixed(2)}\n`);
  }

  // Demo 5: Attack type distribution
  console.log('5. Attack type distribution (malicious only):');
  const attackTypes = maliciousCount > 0 ? scenarios
    .filter(s => s.actual === 'malicious' && s.attackType)
    .reduce((acc, s) => {
      if (s.attackType) {
        acc[s.attackType] = (acc[s.attackType] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>) : {};

  Object.entries(attackTypes).forEach(([type, count]) => {
    console.log(`   ${type}: ${count} (${(count / maliciousCount * 100).toFixed(1)}%)`);
  });

  // Demo 6: Custom batch generation
  console.log('\n6. Custom batch (50% malicious):');
  const customBatch = generator.generateBatch(100, 0.5);
  const customMalicious = customBatch.filter(s => s.actual === 'malicious').length;
  console.log(`   Generated 100 scenarios with ${customMalicious} malicious (${customMalicious}%)\n`);

  console.log('=== Demo Complete ===');
}

main();
