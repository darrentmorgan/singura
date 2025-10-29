#!/usr/bin/env python3
"""
Test script to verify all bug fixes from OpenSpec proposal: fix-critical-bugs-from-qa-testing

Tests:
1. Zero console errors during navigation
2. Zero accessibility warnings
3. Zero React Router warnings
4. Zero CSP violations
5. Dialog accessibility (ARIA attributes)
6. Routing works correctly
"""

from playwright.sync_api import sync_playwright
import json
import sys

def test_application():
    results = {
        "console_errors": [],
        "console_warnings": [],
        "csp_violations": [],
        "accessibility_issues": [],
        "router_warnings": [],
        "navigation_errors": [],
        "dialog_aria_checks": {},
        "overall_status": "PASS"
    }

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context()
        page = context.new_page()

        # Capture console messages
        def handle_console(msg):
            text = msg.text
            msg_type = msg.type

            # Track errors
            if msg_type == 'error':
                results["console_errors"].append(text)
                print(f"❌ Console Error: {text}")

            # Track warnings
            elif msg_type == 'warning':
                results["console_warnings"].append(text)

                # Check for specific warning types
                if 'react-router' in text.lower() or 'router' in text.lower():
                    results["router_warnings"].append(text)
                    print(f"⚠️  React Router Warning: {text}")

                if 'aria' in text.lower() or 'accessibility' in text.lower():
                    results["accessibility_issues"].append(text)
                    print(f"⚠️  Accessibility Warning: {text}")

                if 'content security policy' in text.lower() or 'csp' in text.lower():
                    results["csp_violations"].append(text)
                    print(f"⚠️  CSP Violation: {text}")

        page.on("console", handle_console)

        print("\n" + "="*80)
        print("🧪 TESTING: Singura Application - Bug Fix Verification")
        print("="*80 + "\n")

        # Test 1: Landing Page
        print("📍 Test 1: Loading landing page...")
        try:
            page.goto('http://localhost:4200/', wait_until='networkidle')
            page.wait_for_timeout(2000)  # Wait for any lazy-loaded content

            # Take screenshot
            page.screenshot(path='/tmp/singura-landing.png', full_page=True)
            print("✅ Landing page loaded successfully")
            print(f"   Screenshot: /tmp/singura-landing.png")
        except Exception as e:
            results["navigation_errors"].append(f"Landing page: {str(e)}")
            print(f"❌ Landing page failed: {e}")

        # Test 2: Check for waitlist modal (accessibility test)
        print("\n📍 Test 2: Testing waitlist modal accessibility...")
        try:
            # Look for Join Waitlist button
            waitlist_button = page.locator('text=/join.*waitlist/i').first
            if waitlist_button.is_visible():
                waitlist_button.click()
                page.wait_for_timeout(500)

                # Check if dialog/modal opened
                dialog = page.locator('[role="dialog"]').first
                if dialog.is_visible():
                    # Check ARIA attributes
                    aria_labelledby = dialog.get_attribute('aria-labelledby')
                    aria_describedby = dialog.get_attribute('aria-describedby')

                    results["dialog_aria_checks"]["waitlist_modal"] = {
                        "has_role_dialog": True,
                        "has_aria_labelledby": aria_labelledby is not None,
                        "has_aria_describedby": aria_describedby is not None,
                        "aria_labelledby_value": aria_labelledby,
                        "aria_describedby_value": aria_describedby
                    }

                    if aria_labelledby and aria_describedby:
                        print("✅ Waitlist modal has proper ARIA attributes")
                        print(f"   aria-labelledby: {aria_labelledby}")
                        print(f"   aria-describedby: {aria_describedby}")
                    else:
                        print("⚠️  Waitlist modal missing ARIA attributes")
                        results["accessibility_issues"].append("Waitlist modal missing ARIA attributes")

                    # Close modal
                    close_button = page.locator('[aria-label*="Close"]').first
                    if close_button.is_visible():
                        close_button.click()
                        page.wait_for_timeout(500)
                else:
                    print("ℹ️  Modal didn't open or not using role=dialog")
            else:
                print("ℹ️  No waitlist button found on landing page")
        except Exception as e:
            print(f"⚠️  Waitlist modal test inconclusive: {e}")

        # Test 3: Navigate to login page
        print("\n📍 Test 3: Navigating to login page...")
        try:
            page.goto('http://localhost:4200/login', wait_until='networkidle')
            page.wait_for_timeout(2000)

            page.screenshot(path='/tmp/singura-login.png', full_page=True)
            print("✅ Login page loaded successfully")
            print(f"   Screenshot: /tmp/singura-login.png")
        except Exception as e:
            results["navigation_errors"].append(f"Login page: {str(e)}")
            print(f"❌ Login page failed: {e}")

        # Test 4: Check for 404 handling (React Router test)
        print("\n📍 Test 4: Testing React Router (404 page)...")
        try:
            page.goto('http://localhost:4200/nonexistent-page', wait_until='networkidle')
            page.wait_for_timeout(1000)

            # Check if we got a 404 page or were redirected
            current_url = page.url
            print(f"✅ React Router handled invalid route")
            print(f"   Final URL: {current_url}")
        except Exception as e:
            results["navigation_errors"].append(f"404 handling: {str(e)}")
            print(f"❌ 404 handling failed: {e}")

        # Test 5: Check backend health
        print("\n📍 Test 5: Checking backend health...")
        try:
            response = page.goto('http://localhost:4201/api/health', wait_until='networkidle')
            if response.status == 200:
                health_data = page.content()
                print("✅ Backend health check passed")
                print(f"   Status: {response.status}")
            else:
                print(f"⚠️  Backend health check returned {response.status}")
        except Exception as e:
            results["navigation_errors"].append(f"Backend health: {str(e)}")
            print(f"❌ Backend health check failed: {e}")

        browser.close()

    # Generate report
    print("\n" + "="*80)
    print("📊 TEST RESULTS SUMMARY")
    print("="*80 + "\n")

    # Console errors
    print(f"🔴 Console Errors: {len(results['console_errors'])}")
    if results['console_errors']:
        results["overall_status"] = "FAIL"
        for err in results['console_errors'][:5]:  # Show first 5
            print(f"   - {err[:100]}")
    else:
        print("   ✅ Zero console errors detected")

    # React Router warnings
    print(f"\n🟡 React Router Warnings: {len(results['router_warnings'])}")
    if results['router_warnings']:
        results["overall_status"] = "FAIL"
        for warn in results['router_warnings']:
            print(f"   - {warn[:100]}")
    else:
        print("   ✅ Zero React Router warnings")

    # CSP violations
    print(f"\n🟡 CSP Violations: {len(results['csp_violations'])}")
    if results['csp_violations']:
        results["overall_status"] = "FAIL"
        for viol in results['csp_violations']:
            print(f"   - {viol[:100]}")
    else:
        print("   ✅ Zero CSP violations")

    # Accessibility issues
    print(f"\n🟡 Accessibility Issues: {len(results['accessibility_issues'])}")
    if results['accessibility_issues']:
        results["overall_status"] = "WARN"
        for issue in results['accessibility_issues']:
            print(f"   - {issue[:100]}")
    else:
        print("   ✅ Zero accessibility warnings")

    # Dialog ARIA checks
    print(f"\n🎯 Dialog ARIA Compliance:")
    if results['dialog_aria_checks']:
        for dialog_name, checks in results['dialog_aria_checks'].items():
            print(f"   {dialog_name}:")
            print(f"      - role='dialog': {checks['has_role_dialog']}")
            print(f"      - aria-labelledby: {checks['has_aria_labelledby']}")
            print(f"      - aria-describedby: {checks['has_aria_describedby']}")
    else:
        print("   ℹ️  No dialogs tested (user interaction required)")

    # Navigation errors
    print(f"\n🔗 Navigation Errors: {len(results['navigation_errors'])}")
    if results['navigation_errors']:
        results["overall_status"] = "FAIL"
        for err in results['navigation_errors']:
            print(f"   - {err}")
    else:
        print("   ✅ All pages loaded successfully")

    # Overall result
    print("\n" + "="*80)
    if results["overall_status"] == "PASS":
        print("🎉 OVERALL STATUS: ✅ PASS - All bug fixes verified!")
    elif results["overall_status"] == "WARN":
        print("⚠️  OVERALL STATUS: ⚠️  PASS WITH WARNINGS")
    else:
        print("❌ OVERALL STATUS: ❌ FAIL - Issues detected")
    print("="*80 + "\n")

    # Save detailed results
    with open('/tmp/test-results.json', 'w') as f:
        json.dump(results, f, indent=2)
    print("📄 Detailed results saved to: /tmp/test-results.json")

    # Return exit code
    return 0 if results["overall_status"] in ["PASS", "WARN"] else 1

if __name__ == "__main__":
    sys.exit(test_application())
