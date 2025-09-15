'use client';

import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default function Dashboard() {
  // Redirect to professional dashboard immediately
  if (typeof window !== 'undefined') {
    window.location.href = '/dashboard/professional';
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold mb-6">SaaS X-Ray Enterprise Platform</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Revolutionary AI Detection System • Fortune 500 Ready
        </p>

        <div className="animate-pulse">
          <div className="h-2 bg-blue-200 rounded-full w-3/4 mx-auto mb-4"></div>
          <div className="h-2 bg-blue-300 rounded-full w-1/2 mx-auto"></div>
        </div>

        <p className="text-muted-foreground">
          Loading professional dashboard with enterprise features...
        </p>

        <div className="mt-8">
          <Link
            href="/dashboard/professional"
            className="inline-flex items-center px-6 py-3 text-lg font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Access Professional Dashboard →
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mt-12 text-sm text-muted-foreground">
          <div className="p-4 border rounded-lg">
            <strong>🧠 AI Detection System</strong>
            <p>Revolutionary 3-layer GPT-5 Shadow Network Detection</p>
          </div>
          <div className="p-4 border rounded-lg">
            <strong>⚡ Real-time Monitoring</strong>
            <p>Enterprise-grade automation discovery and analysis</p>
          </div>
          <div className="p-4 border rounded-lg">
            <strong>🎯 Professional Interface</strong>
            <p>Fortune 500 demonstration-ready dashboard</p>
          </div>
        </div>
      </div>
    </div>
  );
}