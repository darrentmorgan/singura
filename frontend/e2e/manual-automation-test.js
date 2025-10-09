/**
 * Manual Browser Test Script for Automation Details Modal
 *
 * INSTRUCTIONS:
 * 1. Open Chrome DevTools (F12)
 * 2. Navigate to http://localhost:4200/automations
 * 3. Copy and paste this entire script into the Console
 * 4. Press Enter to run
 *
 * This script will:
 * - Click the first "View Details" button
 * - Monitor the network request for the details API call
 * - Verify the ID is a UUID
 * - Log all results to the console
 */

(async function testAutomationDetails() {
  console.log('\n🧪 === AUTOMATION DETAILS MODAL TEST ===\n');

  const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const results = {
    timestamp: new Date().toISOString(),
    modalOpened: false,
    apiRequestFound: false,
    apiUrl: null,
    extractedId: null,
    isUuid: false,
    apiStatus: null,
    responseBody: null,
    errors: []
  };

  try {
    // Step 1: Find first automation card
    console.log('Step 1: Finding first automation card...');
    const automationCard = document.querySelector('[data-testid="automation-card"]');

    if (!automationCard) {
      throw new Error('❌ No automation cards found on page');
    }
    console.log('✓ Found automation card');

    // Step 2: Set up network monitoring
    console.log('\nStep 2: Setting up network monitoring...');
    let detailsApiCall = null;

    // Override fetch to intercept API calls
    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      const url = args[0];

      if (typeof url === 'string' && url.includes('/api/automations/') && url.includes('/details')) {
        console.log('📡 Intercepted details API call:', url);

        // Clone response to read body
        const clonedResponse = response.clone();
        const body = await clonedResponse.json().catch(() => null);

        detailsApiCall = {
          url: url,
          status: response.status,
          body: body
        };

        results.apiRequestFound = true;
        results.apiUrl = url;
        results.apiStatus = response.status;
        results.responseBody = body;

        // Extract ID from URL
        const idMatch = url.match(/\/api\/automations\/([^\/]+)\/details/);
        if (idMatch) {
          results.extractedId = idMatch[1];
          results.isUuid = UUID_PATTERN.test(idMatch[1]);
        }
      }

      return response;
    };

    // Step 3: Click View Details button
    console.log('\nStep 3: Clicking "View Details" button...');
    const viewDetailsButton = automationCard.querySelector('button');

    if (!viewDetailsButton) {
      throw new Error('❌ View Details button not found');
    }

    viewDetailsButton.click();
    console.log('✓ Clicked View Details button');

    // Step 4: Wait for modal to open
    console.log('\nStep 4: Waiting for modal to open...');
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds

    const modal = document.querySelector('[role="dialog"]');
    if (modal) {
      results.modalOpened = true;
      console.log('✓ Modal opened');
    } else {
      console.warn('⚠ Modal not found');
    }

    // Step 5: Wait for API call
    console.log('\nStep 5: Waiting for API call to complete...');
    await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 more seconds

    // Restore original fetch
    window.fetch = originalFetch;

    // Step 6: Analyze results
    console.log('\n=== VERIFICATION RESULTS ===\n');

    console.log(`Modal Opened: ${results.modalOpened ? '✅ YES' : '❌ NO'}`);
    console.log(`API Request Found: ${results.apiRequestFound ? '✅ YES' : '❌ NO'}`);

    if (results.apiRequestFound) {
      console.log(`\nAPI Details:`);
      console.log(`  URL: ${results.apiUrl}`);
      console.log(`  Extracted ID: ${results.extractedId}`);
      console.log(`  Is UUID: ${results.isUuid ? '✅ YES' : '❌ NO (external_id format)'}`);
      console.log(`  Status: ${results.apiStatus === 200 ? '✅ 200 OK' : `❌ ${results.apiStatus}`}`);

      if (results.responseBody) {
        console.log(`\nResponse Metadata:`);
        console.log(`  platformName: ${results.responseBody.platformName || '❌ MISSING'}`);
        console.log(`  clientId: ${results.responseBody.clientId || '❌ MISSING'}`);
        console.log(`  authorizedBy: ${results.responseBody.authorizedBy || '❌ MISSING'}`);
        console.log(`\nFull Response Body:`);
        console.log(JSON.stringify(results.responseBody, null, 2));
      }
    }

    // Success criteria check
    console.log('\n=== SUCCESS CRITERIA ===\n');
    const allPassed =
      results.modalOpened &&
      results.apiRequestFound &&
      results.isUuid &&
      results.apiStatus === 200;

    if (allPassed) {
      console.log('✅ ALL TESTS PASSED - Fix is working correctly!');
    } else {
      console.log('❌ SOME TESTS FAILED - Review results above');
    }

    console.log('\n=== TEST COMPLETE ===\n');
    console.log('To save results, copy this object:');
    console.log(JSON.stringify(results, null, 2));

    return results;

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    results.errors.push(error.message);
    return results;
  }
})();
