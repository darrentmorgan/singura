/**
 * Frontend Debugging Script
 * Paste this into your browser console to check automation data
 */

console.log('=== SaaS X-Ray Frontend Debug ===');

// Check if automations data exists in the page
const checkAutomationsData = () => {
  // Try to find React root
  const root = document.querySelector('#root');
  if (!root) {
    console.error('❌ React root not found');
    return;
  }

  // Check for automation cards
  const cards = document.querySelectorAll('[class*="AutomationCard"]');
  console.log(`Found ${cards.length} automation cards`);

  // Try to extract data from React fiber
  const keys = Object.keys(root);
  const reactKey = keys.find(key => key.startsWith('__reactContainer'));

  if (reactKey) {
    console.log('✅ React found');
  }

  // Check localStorage for any cached data
  const cached = Object.keys(localStorage).filter(k => k.includes('automation') || k.includes('saas-xray'));
  console.log('LocalStorage keys:', cached);

  // Check sessionStorage
  const session = Object.keys(sessionStorage).filter(k => k.includes('automation') || k.includes('saas-xray'));
  console.log('SessionStorage keys:', session);
};

// Monitor network requests
const monitorRequests = () => {
  const observer = window.performance.getEntriesByType('resource')
    .filter(r => r.name.includes('/api/automations'))
    .map(r => ({
      url: r.name,
      duration: r.duration,
      size: r.transferSize
    }));

  console.log('API Requests:', observer);
};

// Check current data
checkAutomationsData();
monitorRequests();

console.log('\n=== Instructions ===');
console.log('1. Check the "API Requests" above - do you see /api/automations?');
console.log('2. Open Network tab');
console.log('3. Refresh the page');
console.log('4. Find the /api/automations request');
console.log('5. Check the response - does it have riskLevel fields?');
console.log('\nTo manually check an automation:');
console.log('  1. Open Network tab');
console.log('  2. Filter by "automations"');
console.log('  3. Look at the Response');
console.log('  4. Find ChatGPT and check if riskLevel: "high"');
