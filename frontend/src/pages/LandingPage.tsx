/**
 * Landing Page - Public Marketing Page
 * Modern, dark-themed landing page for SaaS X-Ray
 * Inspired by Apple/Tesla premium aesthetic
 */

import React, { useEffect } from 'react';
import Navigation from '@/components/landing/Navigation';
import Hero from '@/components/landing/Hero';
import ValueProps from '@/components/landing/ValueProps';
import ProductShowcase from '@/components/landing/ProductShowcase';
import TrustSection from '@/components/landing/TrustSection';
import CTASection from '@/components/landing/CTASection';
import Footer from '@/components/landing/Footer';

const LandingPage: React.FC = () => {
  useEffect(() => {
    // Force dark mode for landing page
    document.documentElement.classList.add('dark');

    return () => {
      // Clean up - remove dark class when leaving landing page
      // (optional - can keep it if you want dark mode everywhere)
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main>
        <Hero />
        <ValueProps />
        <ProductShowcase />
        <TrustSection />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
};

export default LandingPage;
