export default function ConnectionsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Platform Connections</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="bg-card border rounded-lg p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Slack</h2>
            <span className="text-sm px-2 py-1 rounded bg-muted text-muted-foreground">Not Connected</span>
          </div>
          <p className="text-muted-foreground mb-4">Connect to discover Slack bots and automations</p>
          <button className="w-full bg-primary text-primary-foreground px-4 py-2 rounded hover:opacity-90 transition-opacity">
            Connect
          </button>
        </div>
        <div className="bg-card border rounded-lg p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Google Workspace</h2>
            <span className="text-sm px-2 py-1 rounded bg-muted text-muted-foreground">Not Connected</span>
          </div>
          <p className="text-muted-foreground mb-4">Monitor Apps Script and service accounts</p>
          <button className="w-full bg-primary text-primary-foreground px-4 py-2 rounded hover:opacity-90 transition-opacity">
            Connect
          </button>
        </div>
        <div className="bg-card border rounded-lg p-6 hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Microsoft 365</h2>
            <span className="text-sm px-2 py-1 rounded bg-muted text-muted-foreground">Not Connected</span>
          </div>
          <p className="text-muted-foreground mb-4">Track Power Platform apps and flows</p>
          <button className="w-full bg-primary text-primary-foreground px-4 py-2 rounded hover:opacity-90 transition-opacity">
            Connect
          </button>
        </div>
      </div>
    </div>
  )
}