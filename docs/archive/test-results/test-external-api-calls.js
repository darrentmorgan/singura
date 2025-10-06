/**
 * External API Call Testing Suite
 * Validates that SaaS X-Ray is making real external API calls
 *
 * Tests:
 * 1. OpenAI GPT-5 API calls for threat validation
 * 2. Google Workspace API calls for live automation discovery
 * 3. Slack API calls for bot and webhook detection
 * 4. Network traffic monitoring and API usage validation
 */

const axios = require('axios');
const https = require('https');

async function testExternalAPICalls() {
  console.log('🧪 Testing External API Call Integration');
  console.log('='.repeat(60));

  // 1. Test OpenAI API Key Configuration
  console.log('\n🤖 Step 1: OpenAI GPT-5 Configuration Test');
  await testOpenAIConfiguration();

  // 2. Test Live Google Workspace API Calls
  console.log('\n🌐 Step 2: Google Workspace API Call Test');
  await testGoogleWorkspaceAPICalls();

  // 3. Test Slack API Integration
  console.log('\n💬 Step 3: Slack API Integration Test');
  await testSlackAPICalls();

  // 4. Test Network Traffic Monitoring
  console.log('\n📡 Step 4: Network Traffic Analysis');
  await monitorNetworkTraffic();

  console.log('\n🎉 External API Call Testing Complete!');
}

async function testOpenAIConfiguration() {
  try {
    // Test if OpenAI API key is working
    const openaiApiKey = process.env.OPENAI_API_KEY;

    if (!openaiApiKey) {
      console.log('❌ No OpenAI API key found in environment');
      return;
    }

    console.log('✅ OpenAI API key present:', openaiApiKey.substring(0, 10) + '...');

    // Test direct OpenAI API call
    console.log('🔄 Testing direct OpenAI API call...');

    const response = await axios.post('https://api.openai.com/v1/chat/completions', {
      model: 'gpt-4', // Using GPT-4 for testing (GPT-5 may not be available yet)
      messages: [{
        role: 'user',
        content: 'Test API connectivity. Respond with just "API_WORKING" if this call succeeds.'
      }],
      max_tokens: 50,
      temperature: 0.1
    }, {
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (response.data && response.data.choices && response.data.choices[0]) {
      console.log('✅ OpenAI API call successful!');
      console.log(`📝 Response: ${response.data.choices[0].message.content}`);
      console.log(`💰 Tokens used: ${response.data.usage?.total_tokens || 'unknown'}`);
    }

  } catch (error) {
    if (error.response) {
      console.log(`❌ OpenAI API error: ${error.response.status} - ${error.response.data?.error?.message || 'Unknown error'}`);
    } else {
      console.log('❌ OpenAI API call failed:', error.message);
    }
  }
}

async function testGoogleWorkspaceAPICalls() {
  try {
    console.log('🔄 Testing Google Workspace API integration...');

    // Test if backend makes Google API calls
    const response = await axios.get('http://localhost:4201/api/connections');

    if (response.data && response.data.connections) {
      const googleConnections = response.data.connections.filter(c => c.platform_type === 'google');

      if (googleConnections.length > 0) {
        console.log(`✅ Google Workspace connections found: ${googleConnections.length}`);

        // Trigger discovery to test Google API calls
        console.log('🔄 Triggering Google Workspace discovery...');

        const discoveryResponse = await axios.post(`http://localhost:4201/api/discovery/${googleConnections[0].id}`, {
          timeout: 30000
        });

        if (discoveryResponse.data) {
          console.log('✅ Google Workspace API discovery triggered successfully');
          console.log(`📊 Discovery response: ${JSON.stringify(discoveryResponse.data).substring(0, 100)}...`);
        }
      } else {
        console.log('⚠️ No Google Workspace connections available for API testing');
      }
    }

  } catch (error) {
    console.log('❌ Google Workspace API test failed:', error.message);
  }
}

async function testSlackAPICalls() {
  try {
    console.log('🔄 Testing Slack API integration...');

    const response = await axios.get('http://localhost:4201/api/connections');

    if (response.data && response.data.connections) {
      const slackConnections = response.data.connections.filter(c => c.platform_type === 'slack');

      if (slackConnections.length > 0) {
        console.log(`✅ Slack connections found: ${slackConnections.length}`);

        // Trigger discovery to test Slack API calls
        console.log('🔄 Triggering Slack discovery...');

        const discoveryResponse = await axios.post(`http://localhost:4201/api/discovery/${slackConnections[0].id}`, {
          timeout: 30000
        });

        if (discoveryResponse.data) {
          console.log('✅ Slack API discovery triggered successfully');
          console.log(`📊 Discovery response: ${JSON.stringify(discoveryResponse.data).substring(0, 100)}...`);
        }
      } else {
        console.log('⚠️ No Slack connections available for API testing');
      }
    }

  } catch (error) {
    console.log('❌ Slack API test failed:', error.message);
  }
}

async function monitorNetworkTraffic() {
  console.log('📡 Monitoring network traffic for external API calls...');

  // Monitor outbound HTTPS connections
  const originalRequest = https.request;
  let apiCalls = [];

  // Monkey patch HTTPS to monitor API calls
  https.request = function(options, callback) {
    if (options.hostname) {
      const isExternalAPI =
        options.hostname.includes('openai.com') ||
        options.hostname.includes('googleapis.com') ||
        options.hostname.includes('slack.com') ||
        options.hostname.includes('api.') ||
        options.hostname.includes('.api.');

      if (isExternalAPI) {
        apiCalls.push({
          hostname: options.hostname,
          path: options.path,
          method: options.method || 'GET',
          timestamp: new Date().toISOString()
        });

        console.log(`🌐 External API call detected: ${options.method || 'GET'} ${options.hostname}${options.path || ''}`);
      }
    }

    return originalRequest.call(this, options, callback);
  };

  // Trigger some API activity
  console.log('🔄 Triggering API activity for monitoring...');

  try {
    // Test automation discovery to trigger API calls
    await axios.get('http://localhost:4201/api/automations');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for async API calls

    console.log(`📊 Monitored ${apiCalls.length} external API calls:`);
    apiCalls.forEach(call => {
      console.log(`   - ${call.method} ${call.hostname}${call.path} at ${call.timestamp}`);
    });

    // Restore original https.request
    https.request = originalRequest;

    if (apiCalls.length > 0) {
      console.log('✅ External API calls detected - system is making real API requests');
    } else {
      console.log('⚠️ No external API calls detected - may be using cached/mock data');
    }

  } catch (error) {
    console.log('❌ Network monitoring failed:', error.message);
  }
}

// Run the comprehensive API testing
testExternalAPICalls().catch(console.error);