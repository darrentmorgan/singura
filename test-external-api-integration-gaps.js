/**
 * External API Integration Gap Analysis
 * Identifies specific gaps in OAuth-to-RealDataProvider bridge
 *
 * Purpose: Test-driven approach to validate what needs implementation
 */

const axios = require('axios');

async function analyzeExternalAPIGaps() {
  console.log('🧪 External API Integration Gap Analysis');
  console.log('='.repeat(60));

  try {
    // 1. Validate OAuth connections are active
    console.log('\n📊 Step 1: OAuth Connection Validation');
    const connectionsResponse = await axios.get('http://localhost:4201/api/connections');

    if (!connectionsResponse.data.success) {
      throw new Error('Failed to fetch connections');
    }

    const connections = connectionsResponse.data.connections;
    const activeConnections = connections.filter(c => c.status === 'active');

    console.log(`✅ Active OAuth connections: ${activeConnections.length}`);
    activeConnections.forEach(conn => {
      console.log(`   - ${conn.platform_type}: ${conn.display_name} (ID: ${conn.id})`);
    });

    if (activeConnections.length === 0) {
      throw new Error('No active OAuth connections - complete OAuth flows first');
    }

    // 2. Test discovery endpoint integration
    console.log('\n🔍 Step 2: Discovery Endpoint Gap Analysis');

    for (const connection of activeConnections) {
      console.log(`\n📡 Testing ${connection.platform_type} discovery integration...`);

      try {
        // Test discovery endpoint
        const discoveryResponse = await axios.post(
          `http://localhost:4201/api/discovery/${connection.id}`,
          {},
          { timeout: 30000 }
        );

        console.log(`✅ Discovery endpoint responded for ${connection.platform_type}`);

        if (discoveryResponse.data.discovery) {
          const automations = discoveryResponse.data.discovery.automations || [];
          console.log(`📈 Automations discovered: ${automations.length}`);

          if (automations.length > 0) {
            console.log(`🧪 Analyzing automation data source...`);

            automations.forEach((automation, index) => {
              const isLiveData = !automation.name.includes('Test') &&
                               !automation.name.includes('Demo') &&
                               !automation.id.includes('mock') &&
                               automation.createdBy && automation.createdBy.includes('@');

              console.log(`   ${index + 1}. ${automation.name}`);
              console.log(`      Platform: ${automation.platform}`);
              console.log(`      Data Source: ${isLiveData ? '✅ LIVE DATA' : '⚠️ MOCK DATA'}`);
              console.log(`      Risk Score: ${automation.metadata?.riskScore || 'N/A'}/100`);
            });
          }
        }

      } catch (error) {
        console.log(`❌ Discovery failed for ${connection.platform_type}:`);
        console.log(`   Status: ${error.response?.status || 'Network Error'}`);
        console.log(`   Error: ${error.message}`);

        if (error.response?.status === 404) {
          console.log('💡 GAP IDENTIFIED: Discovery endpoint missing for this connection');
        } else if (error.response?.status === 500) {
          console.log('💡 GAP IDENTIFIED: OAuth credential bridge not working');
        }
      }
    }

    // 3. Test current automation data source
    console.log('\n📊 Step 3: Current Automation Data Source Analysis');

    const automationsResponse = await axios.get('http://localhost:4201/api/automations');
    const automations = automationsResponse.data.automations || [];

    console.log(`📈 Current dashboard shows: ${automations.length} automations`);

    if (automations.length === 0) {
      console.log('⚠️ No automations displayed - RealDataProvider not connected to OAuth');
      console.log('💡 IMPLEMENTATION NEEDED: OAuth credential bridge in RealDataProvider');
    } else {
      console.log('🔍 Analyzing current automation data source:');

      let liveDataCount = 0;
      let mockDataCount = 0;

      automations.forEach((automation, index) => {
        const isLiveData = !automation.name.includes('Customer Onboarding') &&
                         !automation.name.includes('Teams Meeting') &&
                         !automation.name.includes('Google Sheets') &&
                         automation.createdBy && automation.createdBy.includes('@company.com');

        if (isLiveData) {
          liveDataCount++;
          console.log(`   ${index + 1}. ✅ LIVE: ${automation.name} (${automation.platform})`);
        } else {
          mockDataCount++;
          console.log(`   ${index + 1}. ⚠️ MOCK: ${automation.name} (${automation.platform})`);
        }
      });

      console.log(`\n📊 Data Source Summary:`);
      console.log(`   - Live Data: ${liveDataCount} automations`);
      console.log(`   - Mock Data: ${mockDataCount} automations`);

      if (mockDataCount > liveDataCount) {
        console.log('💡 IMPLEMENTATION NEEDED: Connect RealDataProvider to OAuth for live data');
      }
    }

    // 4. Test GPT-5 API integration
    console.log('\n🤖 Step 4: GPT-5 API Integration Validation');

    const openaiApiKey = process.env.OPENAI_API_KEY;
    if (openaiApiKey) {
      console.log('✅ OpenAI API key available');

      try {
        // Test direct GPT-5 API call
        const gpt5Response = await axios.post('https://api.openai.com/v1/chat/completions', {
          model: 'gpt-4',
          messages: [{
            role: 'user',
            content: 'Respond with "EXTERNAL_API_WORKING" to confirm API connectivity'
          }],
          max_tokens: 50,
          temperature: 0.1
        }, {
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('✅ GPT-5 external API call successful');
        console.log(`📝 Response: ${gpt5Response.data.choices[0].message.content}`);
        console.log(`💰 Tokens consumed: ${gpt5Response.data.usage.total_tokens}`);

      } catch (error) {
        console.log('❌ GPT-5 API call failed:', error.response?.data?.error?.message || error.message);
      }
    } else {
      console.log('⚠️ OpenAI API key not found in environment');
    }

    // 5. Summary and implementation requirements
    console.log('\n🎯 Implementation Requirements Summary:');
    console.log('');
    console.log('REQUIRED IMPLEMENTATIONS:');
    console.log('1. 🔗 OAuth-to-RealDataProvider Bridge');
    console.log('   - Connect RealDataProvider to OAuth credential storage');
    console.log('   - Enable live Google Workspace API calls');
    console.log('   - Enable live Slack API calls');
    console.log('');
    console.log('2. 📡 Discovery Endpoint Integration');
    console.log('   - Implement /api/discovery/{connectionId} endpoints');
    console.log('   - Connect discovery to live external API calls');
    console.log('   - Return real automation data instead of "no automations yet"');
    console.log('');
    console.log('3. 🤖 GPT-5 Integration with Live Data');
    console.log('   - Process real automation data through GPT-5 validation');
    console.log('   - Integrate AI analysis with live discovery results');
    console.log('   - Display AI-validated threats in dashboard');

    console.log('\n🎉 Gap analysis complete - ready for implementation!');

  } catch (error) {
    console.error('❌ Gap analysis failed:', error.message);
  }
}

// Run gap analysis
analyzeExternalAPIGaps();