/**
 * Route Configuration
 * Defines all application routes for React Router v6/v7
 */

import React from 'react';
import { RouteObject } from 'react-router-dom';
import { OrganizationProfile, CreateOrganization, SignUp, UserProfile } from '@clerk/clerk-react';

// Layout and Auth Components
import DashboardLayout from '@/components/layout/DashboardLayout';
import ProtectedRoute from '@/components/auth/ProtectedRoute';
import OAuthCallback from '@/components/auth/OAuthCallback';

// Pages
import LandingPage from '@/pages/LandingPage';
import LoginPage from '@/pages/LoginPage';
import DashboardPage from '@/pages/DashboardPage';
import ConnectionsPage from '@/pages/ConnectionsPage';
import IntegrationsPage from '@/pages/IntegrationsPage';
import AutomationsPage from '@/pages/AutomationsPage';

// 404 Page Component
const NotFoundPage: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center bg-background p-4">
    <div className="text-center space-y-4">
      <h1 className="text-4xl font-bold text-foreground">404</h1>
      <h2 className="text-xl font-semibold text-foreground">Page Not Found</h2>
      <p className="text-muted-foreground max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <div className="space-x-4">
        <button
          onClick={() => window.history.back()}
          className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          Go Back
        </button>
        <a
          href="/dashboard"
          className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
        >
          Go to Dashboard
        </a>
      </div>
    </div>
  </div>
);

const SettingsPage: React.FC = () => (
  <div className="flex-1 p-6">
    <UserProfile
      appearance={{
        elements: {
          rootBox: "w-full",
          card: "shadow-xl"
        }
      }}
    />
  </div>
);

/**
 * Route configuration for React Router
 * Future flags enabled in main.tsx for v7 compatibility
 */
console.log('[Routes] 🛣️ Defining routes configuration');

export const routes: RouteObject[] = [
  // Public Routes
  {
    path: '/',
    element: <LandingPage />
  },
  {
    path: '/login/*',
    element: <LoginPage />
  },
  {
    path: '/sign-up/*',
    element: (
      <div className="min-h-screen flex items-center justify-center">
        <SignUp
          routing="path"
          path="/sign-up"
          signInUrl="/login"
          afterSignUpUrl="/dashboard"
          appearance={{
            elements: {
              rootBox: "w-full max-w-md",
              card: "shadow-xl",
            },
          }}
        />
      </div>
    )
  },
  {
    path: '/oauth/callback',
    element: <OAuthCallback />
  },

  // Protected Routes
  {
    path: '/dashboard',
    element: (
      <>
        {console.log('[Routes] 🏠 /dashboard route matched!')}
        <ProtectedRoute>
          <DashboardLayout>
            <DashboardPage />
          </DashboardLayout>
        </ProtectedRoute>
      </>
    )
  },
  {
    path: '/connections',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <ConnectionsPage />
        </DashboardLayout>
      </ProtectedRoute>
    )
  },
  {
    path: '/connections/:id',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <ConnectionsPage />
        </DashboardLayout>
      </ProtectedRoute>
    )
  },
  {
    path: '/integrations',
    element: (
      <>
        {console.log('[Routes] 🧩 /integrations route matched!')}
        <ProtectedRoute>
          <DashboardLayout>
            <IntegrationsPage />
          </DashboardLayout>
        </ProtectedRoute>
      </>
    )
  },
  {
    path: '/automations',
    element: (
      <>
        {console.log('[Routes] 🎯 /automations route matched!')}
        <ProtectedRoute>
          <DashboardLayout>
            <AutomationsPage />
          </DashboardLayout>
        </ProtectedRoute>
      </>
    )
  },
  {
    path: '/settings',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <SettingsPage />
        </DashboardLayout>
      </ProtectedRoute>
    )
  },

  // Clerk Organization Routes
  {
    path: '/profile',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex-1 p-6">
            <OrganizationProfile />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },
  {
    path: '/create-organization',
    element: (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex-1 p-6 flex items-center justify-center">
            <CreateOrganization afterCreateOrganizationUrl="/connections" />
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  },

  // 404 Route
  {
    path: '*',
    element: <NotFoundPage />
  }
];
