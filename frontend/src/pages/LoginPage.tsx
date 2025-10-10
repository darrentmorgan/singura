/**
 * Login Page - Clerk Authentication
 * Uses Clerk's built-in SignIn component
 */

import React from 'react';
import { SignIn } from '@clerk/clerk-react';
import { Shield } from 'lucide-react';
import { BRAND, CONTENT } from '@/lib/brand';

export const LoginPage: React.FC = () => {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding/Info */}
      <div className="hidden lg:flex lg:flex-1 lg:flex-col lg:justify-center lg:px-8 xl:px-12 bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5">
        <div className="max-w-md mx-auto">
          <div className="space-y-6">
            {/* Hero Content */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3 mb-6">
                <Shield className="h-10 w-10 text-primary" />
                <h1 className="text-3xl font-bold text-foreground">{BRAND.name}</h1>
              </div>
              <h2 className="text-4xl font-bold text-foreground">
                {CONTENT.hero.headline}
              </h2>
              <p className="text-xl text-muted-foreground leading-relaxed">
                {CONTENT.hero.subheadline}
              </p>
            </div>

            {/* Feature Highlights */}
            <div className="space-y-4 pt-6">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center mt-0.5">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Real-time Discovery</h3>
                  <p className="text-sm text-muted-foreground">
                    Automatically discover bots, workflows, and integrations across your connected platforms.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center mt-0.5">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Security Analysis</h3>
                  <p className="text-sm text-muted-foreground">
                    Identify security risks and compliance issues in your automation landscape.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0 w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center mt-0.5">
                  <div className="w-2 h-2 bg-primary rounded-full" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Enterprise Ready</h3>
                  <p className="text-sm text-muted-foreground">
                    Built with enterprise-grade security, audit logging, and compliance features.
                  </p>
                </div>
              </div>
            </div>

            {/* Trust Indicators */}
            <div className="pt-8 border-t border-border">
              <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>SOC 2 Compliant</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>GDPR Ready</span>
                </div>
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span>99.9% Uptime</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Clerk Sign In */}
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md">
          <SignIn
            routing="path"
            path="/login"
            signUpUrl="/sign-up"
            afterSignInUrl="/dashboard"
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-xl",
              },
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
