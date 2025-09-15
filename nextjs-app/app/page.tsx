import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-5xl font-bold mb-6">
            Discover Shadow AI in Your Organization
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            SaaS X-Ray automatically finds and monitors unauthorized bots, automations, 
            and AI agents running across your SaaS applications
          </p>
          <div className="flex gap-4 justify-center">
            <Link
              href="/dashboard"
              className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:opacity-90 transition-opacity"
            >
              Get Started
            </Link>
            <Link
              href="/connections"
              className="border border-primary text-primary px-6 py-3 rounded-lg hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              View Connections
            </Link>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 mt-16">
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="font-semibold mb-2">Automatic Discovery</h3>
              <p className="text-sm text-muted-foreground">
                Find all automations, bots, and AI agents across your SaaS ecosystem
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="font-semibold mb-2">Risk Assessment</h3>
              <p className="text-sm text-muted-foreground">
                Identify high-risk automations and potential compliance violations
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h3 className="font-semibold mb-2">Real-Time Monitoring</h3>
              <p className="text-sm text-muted-foreground">
                Continuous monitoring with alerts for new automations and changes
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}