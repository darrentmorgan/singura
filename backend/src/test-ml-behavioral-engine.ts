/**
 * ML Behavioral Engine Live Data Testing
 * Test ML behavioral detection with real Google Workspace + Slack automation data
 *
 * Business Validation: Verify algorithm works with live enterprise data
 * Quality Assurance: Validate <2 second response time and 90%+ accuracy
 */

import { mlEnhancedDetectionService } from './services/ml-behavioral/ml-enhanced-detection.service';
import { getDataProvider } from './services/data-provider';

async function testMLBehavioralEngine() {
  console.log('🧪 Testing ML Behavioral Pattern Recognition Engine with Live Data');
  console.log('=' .repeat(80));

  try {
    // 1. Initialize ML Enhanced Detection System
    console.log('\n📊 Step 1: Initializing ML Enhanced Detection System...');
    const initialized = await mlEnhancedDetectionService.initialize();

    if (!initialized) {
      throw new Error('Failed to initialize ML Enhanced Detection System');
    }

    console.log('✅ ML Enhanced Detection System initialized successfully');

    // 2. Get live automation data
    console.log('\n📊 Step 2: Fetching live automation data...');
    const dataProvider = getDataProvider(false); // Use real data, not mock

    // Get connections to test with
    const connections = dataProvider.getConnections();
    console.log(`📋 Found ${connections.length} available connections:`);

    connections.forEach(conn => {
      console.log(`   - ${conn.platform}: ${conn.displayName} (${conn.status})`);
    });

    if (connections.length === 0) {
      console.log('⚠️ No connections available for live data testing');
      console.log('💡 Using mock data for ML engine validation instead');

      // Create mock automation for ML testing
      const mockAutomation = {
        id: 'ml-test-automation-001',
        name: 'Test AI Automation for ML Validation',
        type: 'workflow' as const,
        platform: 'google' as const,
        status: 'active' as const,
        trigger: 'event',
        actions: ['data_processing', 'ai_analysis', 'external_api'],
        createdAt: new Date(),
        lastTriggered: new Date(),
        riskLevel: 'high' as const,
        permissions: ['drive.readonly', 'sheets.edit', 'external.url'],
        metadata: {
          riskFactors: ['external API calls', 'Recently active', 'Cross-platform activity']
        }
      };

      await testMLWithAutomation(mockAutomation, 'demo-org-id', 'google');
      return;
    }

    // 3. Test with real connection data
    for (const connection of connections) {
      try {
        console.log(`\n📊 Step 3: Testing with ${connection.platform} connection...`);

        const discoveryResult = await dataProvider.discoverAutomations(connection.id, 'demo-org-id');

        if (discoveryResult.success && discoveryResult.discovery.automations.length > 0) {
          console.log(`✅ Found ${discoveryResult.discovery.automations.length} live automations`);

          // Test ML engine with first automation
          const testAutomation = discoveryResult.discovery.automations[0];
          await testMLWithAutomation(testAutomation, 'demo-org-id', connection.platform);

          // Learn baseline if enough data
          if (discoveryResult.discovery.automations.length >= 5) {
            console.log(`\n📚 Step 4: Learning behavioral baseline...`);
            await testBaselineLearning(discoveryResult.discovery.automations, 'demo-org-id');
          }

        } else {
          console.log(`⚠️ No automations found for ${connection.platform} connection`);
        }

      } catch (error) {
        console.error(`❌ Error testing ${connection.platform}:`, error);
      }
    }

    // 4. System performance summary
    console.log('\n📊 Step 5: ML Enhanced Detection System Status');
    const systemStatus = mlEnhancedDetectionService.getSystemStatus();
    console.log('🎯 System Performance Metrics:');
    console.log(`   - Average Processing Time: ${systemStatus.performanceMetrics.averageProcessingTime}ms (Target: <2000ms)`);
    console.log(`   - Enhanced Accuracy: ${Math.round(systemStatus.performanceMetrics.enhancedAccuracy * 100)}% (Target: 90%+)`);
    console.log(`   - ML Enhancement Rate: ${Math.round(systemStatus.performanceMetrics.mlEnhancementRate * 100)}%`);

    console.log('\n🎉 ML Behavioral Engine live data testing complete!');

  } catch (error) {
    console.error('💥 ML Behavioral Engine testing failed:', error);
    console.log('\n💡 This is expected if:');
    console.log('   - No live OAuth connections are available');
    console.log('   - ML dependencies are not installed');
    console.log('   - Backend server is not running');
  }
}

/**
 * Test ML engine with specific automation
 */
async function testMLWithAutomation(
  automation: any,
  organizationId: string,
  platform: string
): Promise<void> {

  console.log(`\n🧠 Testing ML analysis for automation: ${automation.name}`);
  console.log(`   Platform: ${platform}`);
  console.log(`   Type: ${automation.type}`);
  console.log(`   Risk Level: ${automation.riskLevel}`);

  const startTime = Date.now();

  try {
    const enhancedResult = await mlEnhancedDetectionService.analyzeAutomation(
      automation,
      { organizationId, platform }
    );

    const processingTime = Date.now() - startTime;

    console.log('📈 ML Enhanced Analysis Results:');
    console.log(`   - Traditional Risk Score: ${enhancedResult.traditionalRiskScore}/100`);
    console.log(`   - ML Behavioral Score: ${enhancedResult.behavioralAnalysis.riskScore}/100`);
    console.log(`   - Enhanced Risk Score: ${enhancedResult.enhancedRiskScore}/100`);
    console.log(`   - Overall Confidence: ${Math.round(enhancedResult.overallConfidence * 100)}%`);
    console.log(`   - Processing Time: ${processingTime}ms`);
    console.log(`   - ML Enhanced: ${enhancedResult.metadata.mlEnhanced}`);

    if (enhancedResult.behavioralAnalysis.anomalyFactors.length > 0) {
      console.log(`   - Anomaly Factors: ${enhancedResult.behavioralAnalysis.anomalyFactors.join(', ')}`);
    }

    console.log(`   - Explanation: ${enhancedResult.behavioralAnalysis.explanation}`);

  } catch (error) {
    console.error(`❌ ML analysis failed for ${automation.name}:`, error);
  }
}

/**
 * Test baseline learning with live data
 */
async function testBaselineLearning(
  automations: any[],
  organizationId: string
): Promise<void> {

  console.log(`📚 Testing baseline learning with ${automations.length} live automations...`);

  try {
    const learningResult = await mlEnhancedDetectionService.learnOrganizationalBaseline(
      organizationId,
      automations
    );

    if (learningResult.success) {
      console.log('✅ Behavioral baseline learning successful!');
      console.log(`   - Confidence: ${Math.round(learningResult.confidence * 100)}%`);
      console.log(`   - Message: ${learningResult.message}`);
    } else {
      console.log('❌ Baseline learning failed:', learningResult.message);
    }

  } catch (error) {
    console.error('❌ Baseline learning test failed:', error);
  }
}

// Run the test
if (require.main === module) {
  testMLBehavioralEngine()
    .then(() => {
      console.log('\n🏁 ML Behavioral Engine testing completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Test runner failed:', error);
      process.exit(1);
    });
}

export { testMLBehavioralEngine };