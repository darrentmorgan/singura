import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SaaS X-Ray",
  description: "Discover and monitor unauthorized AI agents and automations",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-background">
          <nav className="border-b">
            <div className="container mx-auto px-4">
              <div className="flex h-16 items-center justify-between">
                <div className="flex items-center space-x-8">
                  <Link href="/" className="text-xl font-bold">
                    SaaS X-Ray
                  </Link>
                  <div className="hidden md:flex space-x-6">
                    <Link href="/dashboard" className="text-sm hover:text-primary transition-colors">
                      Dashboard
                    </Link>
                    <Link href="/connections" className="text-sm hover:text-primary transition-colors">
                      Connections
                    </Link>
                    <Link href="/automations" className="text-sm hover:text-primary transition-colors">
                      Automations
                    </Link>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Link href="/auth/login" className="text-sm hover:text-primary transition-colors">
                    Sign In
                  </Link>
                </div>
              </div>
            </div>
          </nav>
          <main>{children}</main>
        </div>
      </body>
    </html>
  );
}