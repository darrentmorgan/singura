import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8">
            <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 text-sm font-medium rounded-full mb-6">
              🚀 Enterprise-Ready • Fortune 500 Demonstration Platform
            </div>
            <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              SaaS X-Ray Professional
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Revolutionary 3-Layer GPT-5 Shadow Network Detection System automatically discovers
              and monitors unauthorized AI agents, bots, and automations across your enterprise SaaS ecosystem
            </p>
          </div>

          <div className="flex gap-6 justify-center mb-16">
            <Link
              href="/dashboard"
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:opacity-90 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            >
              Access Professional Dashboard
            </Link>
            <Link
              href="/connections"
              className="border-2 border-blue-600 text-blue-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-blue-600 hover:text-white transition-all"
            >
              Platform Connections
            </Link>
          </div>

          {/* Revolutionary Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <div className="bg-white p-8 rounded-xl shadow-lg border border-blue-100">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">🧠</span>
              </div>
              <h3 className="text-xl font-bold mb-4">VelocityDetector AI</h3>
              <p className="text-gray-600">
                AI-powered automation velocity analysis detecting shadow AI operations with machine learning precision
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg border border-green-100">
              <div className="w-16 h-16 bg-gradient-to-r from-green-500 to-blue-500 rounded-lg flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">⚡</span>
              </div>
              <h3 className="text-xl font-bold mb-4">BatchOperationDetector</h3>
              <p className="text-gray-600">
                Enterprise-grade batch operation pattern recognition system with real-time correlation analysis
              </p>
            </div>

            <div className="bg-white p-8 rounded-xl shadow-lg border border-purple-100">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-xl font-bold mb-4">AIProviderDetector</h3>
              <p className="text-gray-600">
                Revolutionary AI provider correlation and comprehensive enterprise risk assessment engine
              </p>
            </div>
          </div>

          {/* Enterprise Stats */}
          <div className="bg-white p-8 rounded-xl shadow-lg border">
            <h3 className="text-2xl font-bold mb-6">Enterprise Platform Coverage</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="text-3xl mb-2">💬</div>
                <div className="font-semibold">Slack</div>
                <div className="text-sm text-gray-600">Bot Detection</div>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">🌐</div>
                <div className="font-semibold">Google Workspace</div>
                <div className="text-sm text-gray-600">Apps Script Monitoring</div>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">💼</div>
                <div className="font-semibold">Microsoft 365</div>
                <div className="text-sm text-gray-600">Power Platform Analysis</div>
              </div>
              <div className="text-center">
                <div className="text-3xl mb-2">☁️</div>
                <div className="font-semibold">Salesforce</div>
                <div className="text-sm text-gray-600">Process Builder Audit</div>
              </div>
            </div>
          </div>

          {/* Professional Deployment Status */}
          <div className="mt-16 bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-xl border border-green-200">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-lg font-semibold text-green-800">LIVE: Professional Deployment Active</span>
            </div>
            <p className="text-green-700">
              ✅ Single unified deployment replacing fragmented Vercel chaos
              <br />
              ✅ Fortune 500 demonstration-ready professional URL
              <br />
              ✅ Automated GitHub deployment pipeline operational
              <br />
              ✅ Revolutionary AI detection system integrated and functional
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}