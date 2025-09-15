export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md">
        <div className="bg-card border rounded-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold">SaaS X-Ray</h1>
            <p className="text-muted-foreground mt-2">Sign in to your account</p>
          </div>
          
          <form className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="you@company.com"
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                className="w-full px-3 py-2 border rounded-md bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="••••••••"
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-primary text-primary-foreground py-2 rounded-md hover:opacity-90 transition-opacity"
            >
              Sign In
            </button>
          </form>
          
          <div className="mt-6 text-center">
            <a href="#" className="text-sm text-primary hover:underline">
              Forgot your password?
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}