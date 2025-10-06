import { chromium } from '@playwright/test';

async function test() {
  console.log('Starting comprehensive Clerk auth flow test...\n');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  
  const errors = [];
  page.on('console', msg => { 
    if (msg.type() === 'error') {
      console.error('Console error:', msg.text());
      errors.push(msg.text()); 
    }
  });
  page.on('pageerror', err => {
    console.error('Page error:', err.message);
    errors.push(err.message);
  });
  
  try {
    // Step 1: Login page
    console.log('Step 1: Navigate to login page');
    await page.goto('http://localhost:4200/login');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'step1-login.png', fullPage: true });
    console.log('  - Screenshot: step1-login.png');
    console.log('  - Clerk elements:', await page.locator('.cl-rootBox, .cl-internal-').count());
    
    // Step 2: Check if we're redirected when accessing protected route
    console.log('\nStep 2: Try accessing protected dashboard (should redirect)');
    await page.goto('http://localhost:4200/dashboard');
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    console.log('  - Current URL:', currentUrl);
    console.log('  - Redirected to login:', currentUrl.includes('/login') ? 'YES ✓' : 'NO ✗');
    await page.screenshot({ path: 'step2-protected-redirect.png', fullPage: true });
    console.log('  - Screenshot: step2-protected-redirect.png');
    
    // Step 3: Check sign-up page
    console.log('\nStep 3: Navigate to sign-up page');
    await page.goto('http://localhost:4200/sign-up');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: 'step3-signup.png', fullPage: true });
    console.log('  - Screenshot: step3-signup.png');
    console.log('  - Clerk signup elements:', await page.locator('.cl-rootBox, .cl-signUp-root').count());
    
    // Step 4: Check organization creation route
    console.log('\nStep 4: Check create-organization route (requires auth)');
    await page.goto('http://localhost:4200/create-organization');
    await page.waitForTimeout(2000);
    const orgUrl = page.url();
    console.log('  - Current URL:', orgUrl);
    console.log('  - Redirected to login:', orgUrl.includes('/login') ? 'YES ✓' : 'NO ✗');
    
    // Step 5: Back to login and check for Clerk components
    console.log('\nStep 5: Final login page check');
    await page.goto('http://localhost:4200/login');
    await page.waitForTimeout(2000);
    
    // Check for specific Clerk elements
    const hasEmailInput = await page.locator('input[name="identifier"], input[type="email"]').count() > 0;
    const hasContinueButton = await page.locator('button:has-text("Continue")').count() > 0;
    const hasGoogleButton = await page.locator('button:has-text("Google")').count() > 0;
    const hasSignUpLink = await page.locator('a:has-text("Sign up"), button:has-text("Sign up")').count() > 0;
    
    console.log('\nClerk Component Checks:');
    console.log('  - Email input:', hasEmailInput ? '✓' : '✗');
    console.log('  - Continue button:', hasContinueButton ? '✓' : '✗');
    console.log('  - Google OAuth button:', hasGoogleButton ? '✓' : '✗');
    console.log('  - Sign up link:', hasSignUpLink ? '✓' : '✗');
    
    await page.screenshot({ path: 'step5-final-login.png', fullPage: true });
    console.log('  - Screenshot: step5-final-login.png');
    
    // Summary
    console.log('\n=== TEST SUMMARY ===');
    console.log('Total errors:', errors.length);
    if (errors.length > 0) {
      console.log('Errors found:');
      errors.forEach(err => console.log('  -', err));
    } else {
      console.log('✓ No errors detected');
    }
    
    console.log('\nScreenshots saved:');
    console.log('  1. step1-login.png - Initial login page');
    console.log('  2. step2-protected-redirect.png - Protected route redirect');
    console.log('  3. step3-signup.png - Sign-up page');
    console.log('  4. step5-final-login.png - Final login check');
    
  } catch (error) {
    console.error('\n✗ Test failed:', error.message);
    await page.screenshot({ path: 'error-screenshot.png', fullPage: true });
  } finally {
    await page.waitForTimeout(2000);
    await browser.close();
    console.log('\n=== Test Complete ===');
  }
}

test().catch(console.error);
