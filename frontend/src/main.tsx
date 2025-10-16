/**
 * Application Entry Point
 * Sets up React root with Clerk authentication, Sentry monitoring, and renders the main App component
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import * as Sentry from '@sentry/react';
import App from './App';
import { initializeSentry } from './lib/errorLogger';

// Initialize Sentry for error tracking
initializeSentry();

// Get Clerk publishable key from environment
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

if (!CLERK_PUBLISHABLE_KEY) {
  throw new Error('Missing VITE_CLERK_PUBLISHABLE_KEY environment variable');
}

// Get the root element
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found. Make sure there is an element with id="root" in your HTML.');
}

// Create React root and render the app with Clerk
const root = ReactDOM.createRoot(rootElement);

// Wrap App with Sentry's ErrorBoundary for additional error tracking
const SentryApp = import.meta.env.VITE_SENTRY_DSN
  ? Sentry.withErrorBoundary(App, {
      fallback: ({ error, resetError }) => (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="mb-4">Error: {error?.toString()}</p>
            <button
              onClick={resetError}
              className="px-4 py-2 bg-primary text-primary-foreground rounded"
            >
              Try again
            </button>
          </div>
        </div>
      ),
      showDialog: false,
    })
  : App;

root.render(
  <React.StrictMode>
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
      <SentryApp />
    </ClerkProvider>
  </React.StrictMode>
);

// Register service worker for PWA capabilities (optional)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}