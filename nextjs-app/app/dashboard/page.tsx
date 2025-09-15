export default function DashboardPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">Total Automations</h2>
          <p className="text-3xl font-bold text-primary">0</p>
        </div>
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">Connected Platforms</h2>
          <p className="text-3xl font-bold text-primary">0</p>
        </div>
        <div className="bg-card border rounded-lg p-6">
          <h2 className="text-lg font-semibold mb-2">Risk Score</h2>
          <p className="text-3xl font-bold text-primary">N/A</p>
        </div>
      </div>
    </div>
  )
}