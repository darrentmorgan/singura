/**
 * Manual Browser Console Test Script
 * Automation Metadata Fix Verification
 *
 * INSTRUCTIONS:
 * 1. Open http://localhost:4200/automations in your browser
 * 2. Open Browser DevTools (F12)
 * 3. Go to Console tab
 * 4. Copy and paste this entire script
 * 5. Press Enter to run
 * 6. Review the test results
 */

(async function testAutomationMetadataFix() {
  console.log('=== Automation Metadata Fix Test ===\n');

  const results = {
    passed: [],
    failed: [],
    warnings: []
  };

  try {
    // Test 1: Verify we're on the correct page
    console.log('Test 1: Checking page URL...');
    if (!window.location.pathname.includes('/automations')) {
      results.warnings.push('You are not on the /automations page. Please navigate there first.');
    } else {
      results.passed.push('✅ On /automations page');
    }

    // Test 2: Check for automation cards
    console.log('\nTest 2: Checking for automation cards...');
    const cards = document.querySelectorAll('[class*="AutomationCard"], [class*="automation-card"]');
    if (cards.length === 0) {
      results.warnings.push('No automation cards found on page. Make sure automations are loaded.');
    } else {
      results.passed.push(`✅ Found ${cards.length} automation card(s)`);
    }

    // Test 3: Monitor network requests
    console.log('\nTest 3: Setting up network monitor...');
    const originalFetch = window.fetch;
    const networkRequests = [];

    window.fetch = function(...args) {
      const url = args[0];
      if (typeof url === 'string' && url.includes('/automations/') && url.includes('/details')) {
        networkRequests.push({
          url,
          timestamp: new Date().toISOString()
        });
        console.log('🔍 Intercepted request:', url);
      }
      return originalFetch.apply(this, args);
    };

    results.passed.push('✅ Network monitor installed');

    // Test 4: Instructions for manual verification
    console.log('\n=== MANUAL TESTING INSTRUCTIONS ===');
    console.log('1. Click on "View Details" button for ANY automation');
    console.log('2. Wait for the modal to appear');
    console.log('3. Run the verification command below:\n');
    console.log('testAutomationMetadataFix.verify();\n');

    // Test 5: Create verification function
    window.testAutomationMetadataFix = {
      verify: function() {
        console.log('\n=== VERIFICATION RESULTS ===\n');

        if (networkRequests.length === 0) {
          console.error('❌ No details requests detected. Did you click "View Details"?');
          return;
        }

        const lastRequest = networkRequests[networkRequests.length - 1];
        console.log('Last request URL:', lastRequest.url);

        // Extract ID from URL
        const match = lastRequest.url.match(/\/automations\/([^\/]+)\/details/);
        if (!match) {
          console.error('❌ Could not extract ID from URL');
          return;
        }

        const id = match[1];
        console.log('Extracted ID:', id);

        // Check if it's a UUID (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const isUuid = uuidRegex.test(id);

        // Check if it's an oauth-app ID
        const isOAuthAppId = id.startsWith('oauth-app-');

        console.log('\n=== TEST RESULTS ===\n');

        if (isUuid && !isOAuthAppId) {
          console.log('✅ PASS: ID is a valid UUID');
          console.log('✅ PASS: ID is NOT an oauth-app-* format');
          console.log('\n✅✅✅ ALL TESTS PASSED! ✅✅✅');
          console.log('\nThe fix is working correctly!');
          console.log('The API is using the automation UUID instead of external_id.');
        } else if (isOAuthAppId) {
          console.error('❌ FAIL: ID is an oauth-app-* format');
          console.error('This means the frontend is still using external_id instead of automation.id');
          console.error('\nBUG STILL EXISTS!');
        } else {
          console.warn('⚠️ WARNING: ID format is unusual');
          console.warn('Expected a UUID, got:', id);
        }

        // Check for successful response
        console.log('\n=== RESPONSE CHECK ===');
        console.log('Check the Network tab in DevTools:');
        console.log('1. Look for the request to:', lastRequest.url);
        console.log('2. Verify the status code is 200 (not 404)');
        console.log('3. Check the response has automation.metadata object');
        console.log('4. Check the response has automation.permissions.enriched array');

        return {
          id,
          isUuid,
          isOAuthAppId,
          passed: isUuid && !isOAuthAppId,
          url: lastRequest.url
        };
      },

      reset: function() {
        networkRequests.length = 0;
        console.log('Network requests cleared. Ready for new test.');
      },

      showRequests: function() {
        console.log('\n=== ALL INTERCEPTED REQUESTS ===\n');
        networkRequests.forEach((req, i) => {
          console.log(`${i + 1}. ${req.url}`);
          console.log(`   Time: ${req.timestamp}`);
        });
      }
    };

    console.log('\n=== AVAILABLE COMMANDS ===');
    console.log('testAutomationMetadataFix.verify()      - Run verification after clicking "View Details"');
    console.log('testAutomationMetadataFix.reset()       - Clear captured requests');
    console.log('testAutomationMetadataFix.showRequests() - Show all captured requests');

    console.log('\n=== TEST SETUP COMPLETE ===');
    console.log('Ready to test! Click "View Details" on any automation, then run:');
    console.log('testAutomationMetadataFix.verify()');

  } catch (error) {
    console.error('Test setup error:', error);
    results.failed.push(`❌ Setup error: ${error.message}`);
  }

  // Summary
  console.log('\n=== SETUP SUMMARY ===');
  results.passed.forEach(r => console.log(r));
  results.warnings.forEach(r => console.warn('⚠️', r));
  results.failed.forEach(r => console.error(r));

})();
