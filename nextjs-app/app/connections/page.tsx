import Link from 'next/link';

export default function ConnectionsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-6">Platform Connections</h1>
          <p className="text-xl text-gray-600 mb-8">
            Connect your SaaS platforms to enable shadow AI detection
          </p>
        </div>

        {/* Professional Connection Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-xl border shadow-lg hover:shadow-xl transition-all">
            <div className="text-center">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-xl font-semibold mb-2">Slack</h3>
              <p className="text-gray-600 text-sm mb-4">
                Bot detection and app inventory monitoring
              </p>
              <div className="px-3 py-1 bg-green-100 text-green-800 text-xs rounded-full inline-block">
                ENTERPRISE READY
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border shadow-lg hover:shadow-xl transition-all">
            <div className="text-center">
              <div className="text-4xl mb-4">🌐</div>
              <h3 className="text-xl font-semibold mb-2">Google Workspace</h3>
              <p className="text-gray-600 text-sm mb-4">
                Apps Script and OAuth app monitoring
              </p>
              <div className="px-3 py-1 bg-blue-100 text-blue-800 text-xs rounded-full inline-block">
                AI DETECTION ACTIVE
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border shadow-lg hover:shadow-xl transition-all">
            <div className="text-center">
              <div className="text-4xl mb-4">💼</div>
              <h3 className="text-xl font-semibold mb-2">Microsoft 365</h3>
              <p className="text-gray-600 text-sm mb-4">
                Power Platform and Graph API analysis
              </p>
              <div className="px-3 py-1 bg-purple-100 text-purple-800 text-xs rounded-full inline-block">
                COMING SOON
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border shadow-lg hover:shadow-xl transition-all">
            <div className="text-center">
              <div className="text-4xl mb-4">☁️</div>
              <h3 className="text-xl font-semibold mb-2">Salesforce</h3>
              <p className="text-gray-600 text-sm mb-4">
                Process Builder and Flow automation audit
              </p>
              <div className="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs rounded-full inline-block">
                IN DEVELOPMENT
              </div>
            </div>
          </div>
        </div>

        {/* Connection Status */}
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-8 rounded-xl border">
          <h2 className="text-2xl font-semibold mb-4">🔗 Connection Management</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="font-semibold mb-2">OAuth Security</h3>
              <p className="text-sm text-gray-600 mb-4">
                Enterprise-grade OAuth 2.0 authentication with encrypted token storage
              </p>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-green-700 text-sm font-medium">Secure & Encrypted</span>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="font-semibold mb-2">Real-time Monitoring</h3>
              <p className="text-sm text-gray-600 mb-4">
                Continuous monitoring with automatic token refresh and health checks
              </p>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-blue-700 text-sm font-medium">Actively Monitoring</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-semibold hover:opacity-90 transition-all shadow-lg hover:shadow-xl"
          >
            ← Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}