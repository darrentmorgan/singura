import { chromium } from '@playwright/test';

async function test() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  
  const errors = [];
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
  page.on('pageerror', err => errors.push(err.message));
  
  await page.goto('http://localhost:4200/login');
  await page.waitForTimeout(5000);
  await page.screenshot({ path: 'clerk-login-page.png', fullPage: true });
  
  console.log('Screenshot saved: clerk-login-page.png');
  console.log('Clerk elements:', await page.locator('.cl-rootBox, .cl-internal-').count());
  console.log('Errors:', errors.length > 0 ? errors : 'None');
  
  await browser.close();
}

test().catch(console.error);
