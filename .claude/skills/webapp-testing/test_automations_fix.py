"""
Test script to verify /automations redirect bug is fixed.

This script:
1. Navigates to /automations
2. Waits for page to load
3. Checks if URL stayed on /automations or redirected
4. Captures console logs
5. Takes screenshot
"""

from playwright.sync_api import sync_playwright
import sys

def test_automations_route():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Capture console logs
        console_logs = []
        page.on('console', lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

        try:
            print("Navigating to http://localhost:4200/automations...")
            page.goto('http://localhost:4200/automations', wait_until='networkidle', timeout=15000)

            # Wait longer for any redirects to happen and logs to appear
            page.wait_for_timeout(3000)

            # Check final URL
            final_url = page.url
            print(f"\nFinal URL: {final_url}")

            # Take screenshot
            screenshot_path = '/tmp/automations_test.png'
            page.screenshot(path=screenshot_path, full_page=True)
            print(f"Screenshot saved to: {screenshot_path}")

            # Print console logs
            print("\n=== Console Logs ===")
            for log in console_logs:
                print(log)

            # Check if we're on the correct page
            if '/automations' in final_url:
                print("\n✅ SUCCESS: Stayed on /automations page!")

                # Try to find automation-specific content
                try:
                    page.wait_for_selector('text=Automation Discovery', timeout=5000)
                    print("✅ Found 'Automation Discovery' heading - page loaded correctly!")
                except:
                    print("⚠️  Warning: Could not find 'Automation Discovery' heading")

                return 0
            else:
                print(f"\n❌ FAILED: Redirected from /automations to {final_url}")
                return 1

        except Exception as e:
            print(f"\n❌ ERROR: {str(e)}")
            return 1
        finally:
            browser.close()

if __name__ == '__main__':
    exit_code = test_automations_route()
    sys.exit(exit_code)
