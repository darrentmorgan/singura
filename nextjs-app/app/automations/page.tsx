export default function AutomationsPage() {
  return (
    <div className="container mx-auto py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Discovered Automations</h1>
        <button className="bg-primary text-primary-foreground px-4 py-2 rounded hover:opacity-90 transition-opacity">
          Run Discovery
        </button>
      </div>
      
      <div className="bg-card border rounded-lg p-8 text-center">
        <div className="max-w-md mx-auto">
          <svg className="w-16 h-16 mx-auto mb-4 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <h2 className="text-xl font-semibold mb-2">No Automations Discovered</h2>
          <p className="text-muted-foreground mb-6">Connect to your platforms and run discovery to find automations, bots, and AI agents</p>
          <button className="bg-primary text-primary-foreground px-6 py-2 rounded hover:opacity-90 transition-opacity">
            Connect Platforms
          </button>
        </div>
      </div>
    </div>
  )
}