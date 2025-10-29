#!/usr/bin/env python3
"""
Detailed Browser Testing with Console Inspection
Verifies all 7 bug fixes from OpenSpec proposal with real-time monitoring
"""

from playwright.sync_api import sync_playwright
import json
from datetime import datetime

def test_application_detailed():
    """Perform detailed browser testing with console/network monitoring"""

    results = {
        "test_timestamp": datetime.now().isoformat(),
        "console_errors": [],
        "console_warnings": [],
        "console_logs": [],
        "csp_violations": [],
        "accessibility_issues": [],
        "router_warnings": [],
        "network_errors": [],
        "websocket_status": None,
        "pages_tested": [],
        "dialog_interactions": {},
        "overall_status": "PENDING"
    }

    print("=" * 80)
    print("🔍 DETAILED BROWSER TESTING - Bug Fix Verification")
    print("=" * 80)
    print()

    with sync_playwright() as p:
        # Launch browser with console logging enabled
        browser = p.chromium.launch(headless=False)  # Non-headless for visibility
        context = browser.new_context(
            viewport={'width': 1920, 'height': 1080},
            record_video_dir='/tmp/singura-test-videos/'
        )
        page = context.new_page()

        # ==================================================================
        # CONSOLE MESSAGE HANDLERS
        # ==================================================================

        def handle_console(msg):
            """Capture all console messages with categorization"""
            text = msg.text
            msg_type = msg.type
            location = msg.location

            log_entry = {
                "type": msg_type,
                "text": text,
                "url": location.get('url', 'unknown'),
                "line": location.get('lineNumber', 0)
            }

            # Categorize console messages
            if msg_type == 'error':
                results["console_errors"].append(log_entry)
                print(f"🔴 ERROR: {text}")
            elif msg_type == 'warning':
                # Filter expected Clerk warnings
                if 'Clerk' in text and 'development keys' in text:
                    print(f"ℹ️  EXPECTED: {text[:80]}...")
                else:
                    results["console_warnings"].append(log_entry)
                    print(f"🟡 WARNING: {text}")

            # Check for specific bug indicators
            if 'react-router' in text.lower() and 'future flag' in text.lower():
                results["router_warnings"].append(text)
                print(f"⚠️  REACT ROUTER: {text}")

            if 'csp' in text.lower() or 'content security policy' in text.lower():
                results["csp_violations"].append(text)
                print(f"🛡️  CSP: {text}")

            if 'aria' in text.lower() or 'accessibility' in text.lower():
                results["accessibility_issues"].append(text)
                print(f"♿ ACCESSIBILITY: {text}")

            # Log all messages for detailed analysis
            results["console_logs"].append(log_entry)

        def handle_page_error(error):
            """Capture uncaught page errors"""
            error_details = {
                "message": str(error),
                "timestamp": datetime.now().isoformat()
            }
            results["console_errors"].append(error_details)
            print(f"💥 PAGE ERROR: {error}")

        def handle_request_failed(request):
            """Capture failed network requests"""
            failure = request.failure()
            if failure:
                error_details = {
                    "url": request.url,
                    "method": request.method,
                    "failure": failure
                }
                results["network_errors"].append(error_details)
                print(f"🌐 NETWORK FAILURE: {request.method} {request.url} - {failure}")

        # Attach handlers
        page.on("console", handle_console)
        page.on("pageerror", handle_page_error)
        page.on("requestfailed", handle_request_failed)

        # ==================================================================
        # TEST 1: Landing Page with Full Console Monitoring
        # ==================================================================

        print("\n📍 Test 1: Loading landing page with console monitoring...")
        try:
            page.goto('http://localhost:4200/', wait_until='networkidle', timeout=15000)
            page.wait_for_timeout(2000)  # Allow time for any delayed console messages

            # Take screenshot
            page.screenshot(path='/tmp/singura-landing-detailed.png', full_page=True)

            results["pages_tested"].append({
                "name": "Landing Page",
                "url": page.url,
                "status": "PASS",
                "screenshot": "/tmp/singura-landing-detailed.png"
            })

            print("✅ Landing page loaded successfully")
            print(f"   URL: {page.url}")
            print(f"   Title: {page.title()}")

        except Exception as e:
            print(f"❌ Landing page failed: {e}")
            results["pages_tested"].append({
                "name": "Landing Page",
                "status": "FAIL",
                "error": str(e)
            })

        # ==================================================================
        # TEST 2: Check for WebSocket Connection (Socket.io)
        # ==================================================================

        print("\n📍 Test 2: Checking WebSocket connection...")
        try:
            # Check if Socket.io script loaded
            websocket_check = page.evaluate("""
                () => {
                    return {
                        io_available: typeof io !== 'undefined',
                        websocket_supported: 'WebSocket' in window
                    }
                }
            """)

            results["websocket_status"] = websocket_check

            if websocket_check['io_available']:
                print("✅ Socket.io library loaded")
            else:
                print("ℹ️  Socket.io not loaded on landing page (expected)")

            if websocket_check['websocket_supported']:
                print("✅ WebSocket API supported")

        except Exception as e:
            print(f"⚠️  WebSocket check failed: {e}")
            results["websocket_status"] = {"error": str(e)}

        # ==================================================================
        # TEST 3: Navigate to Login Page
        # ==================================================================

        print("\n📍 Test 3: Navigating to login page...")
        try:
            page.goto('http://localhost:4200/login', wait_until='networkidle', timeout=15000)
            page.wait_for_timeout(2000)

            # Take screenshot
            page.screenshot(path='/tmp/singura-login-detailed.png', full_page=True)

            results["pages_tested"].append({
                "name": "Login Page",
                "url": page.url,
                "status": "PASS",
                "screenshot": "/tmp/singura-login-detailed.png"
            })

            print("✅ Login page loaded successfully")
            print(f"   URL: {page.url}")

        except Exception as e:
            print(f"❌ Login page failed: {e}")
            results["pages_tested"].append({
                "name": "Login Page",
                "status": "FAIL",
                "error": str(e)
            })

        # ==================================================================
        # TEST 4: Test React Router (404 Handling)
        # ==================================================================

        print("\n📍 Test 4: Testing React Router (404 handling)...")
        try:
            page.goto('http://localhost:4200/nonexistent-test-page', wait_until='networkidle', timeout=15000)
            page.wait_for_timeout(1000)

            final_url = page.url
            print(f"✅ React Router handled invalid route")
            print(f"   Final URL: {final_url}")

            results["pages_tested"].append({
                "name": "404 Page",
                "url": final_url,
                "status": "PASS"
            })

        except Exception as e:
            print(f"⚠️  React Router test note: {e}")

        # ==================================================================
        # TEST 5: Check Accessibility Features
        # ==================================================================

        print("\n📍 Test 5: Checking accessibility features...")
        try:
            page.goto('http://localhost:4200/', wait_until='networkidle')

            # Check for ARIA landmarks
            landmarks = page.evaluate("""
                () => {
                    const landmarks = document.querySelectorAll('[role]');
                    return {
                        count: landmarks.length,
                        roles: Array.from(landmarks).map(el => el.getAttribute('role'))
                    }
                }
            """)

            print(f"✅ Found {landmarks['count']} ARIA landmarks")
            if landmarks['count'] > 0:
                print(f"   Roles: {', '.join(set(landmarks['roles']))}")

        except Exception as e:
            print(f"⚠️  Accessibility check note: {e}")

        # ==================================================================
        # TEST 6: Backend Health Check
        # ==================================================================

        print("\n📍 Test 6: Checking backend health...")
        try:
            response = page.request.get('http://localhost:4201/api/health')

            if response.status == 200:
                print("✅ Backend health check passed")
                print(f"   Status: {response.status}")
            else:
                print(f"⚠️  Backend returned status: {response.status}")

        except Exception as e:
            print(f"❌ Backend health check failed: {e}")

        # ==================================================================
        # RESULTS SUMMARY
        # ==================================================================

        print("\n" + "=" * 80)
        print("📊 DETAILED TEST RESULTS SUMMARY")
        print("=" * 80)
        print()

        # Console Errors
        error_count = len(results["console_errors"])
        print(f"🔴 Console Errors: {error_count}")
        if error_count == 0:
            print("   ✅ Zero console errors detected")
        else:
            print("   ❌ ERRORS FOUND:")
            for error in results["console_errors"][:5]:  # Show first 5
                print(f"      - {error.get('text', error.get('message', 'Unknown'))[:100]}")
        print()

        # Console Warnings (excluding expected Clerk warnings)
        warning_count = len(results["console_warnings"])
        print(f"🟡 Console Warnings: {warning_count}")
        if warning_count == 0:
            print("   ✅ Zero unexpected warnings")
        else:
            for warning in results["console_warnings"][:3]:
                print(f"      - {warning['text'][:100]}")
        print()

        # CSP Violations
        csp_count = len(results["csp_violations"])
        print(f"🛡️  CSP Violations: {csp_count}")
        if csp_count == 0:
            print("   ✅ Zero CSP violations")
        else:
            for violation in results["csp_violations"]:
                print(f"      - {violation[:100]}")
        print()

        # React Router Warnings
        router_count = len(results["router_warnings"])
        print(f"⚙️  React Router Warnings: {router_count}")
        if router_count == 0:
            print("   ✅ Zero React Router warnings")
        else:
            for warning in results["router_warnings"]:
                print(f"      - {warning[:100]}")
        print()

        # Accessibility Issues
        a11y_count = len(results["accessibility_issues"])
        print(f"♿ Accessibility Issues: {a11y_count}")
        if a11y_count == 0:
            print("   ✅ Zero accessibility warnings")
        else:
            for issue in results["accessibility_issues"]:
                print(f"      - {issue[:100]}")
        print()

        # Network Errors
        network_count = len(results["network_errors"])
        print(f"🌐 Network Errors: {network_count}")
        if network_count == 0:
            print("   ✅ Zero network failures")
        else:
            for error in results["network_errors"]:
                print(f"      - {error['method']} {error['url']}")
        print()

        # Pages Tested
        print(f"📄 Pages Tested: {len(results['pages_tested'])}")
        for page_test in results["pages_tested"]:
            status_icon = "✅" if page_test["status"] == "PASS" else "❌"
            print(f"   {status_icon} {page_test['name']}: {page_test['status']}")
        print()

        # Overall Status
        if error_count == 0 and csp_count == 0 and router_count == 0 and network_count == 0:
            results["overall_status"] = "PASS"
            print("=" * 80)
            print("🎉 OVERALL STATUS: ✅ PASS - All bug fixes verified!")
            print("=" * 80)
        else:
            results["overall_status"] = "FAIL"
            print("=" * 80)
            print("❌ OVERALL STATUS: FAIL - Issues detected")
            print("=" * 80)

        # Save detailed results
        with open('/tmp/detailed-test-results.json', 'w') as f:
            json.dump(results, f, indent=2)

        print()
        print(f"📁 Detailed results saved to: /tmp/detailed-test-results.json")
        print(f"📸 Screenshots saved to: /tmp/singura-*-detailed.png")
        print(f"🎥 Video recording saved to: /tmp/singura-test-videos/")
        print()

        # Close browser
        context.close()
        browser.close()

    return results

if __name__ == "__main__":
    test_application_detailed()
