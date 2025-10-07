/**
 * Landing Page - Public Marketing Page
 * Modern, dark-themed landing page for SaaS X-Ray
 * Inspired by Apple/Tesla premium aesthetic
 */

import React, { useEffect, useState } from 'react';
import Navigation from '@/components/landing/Navigation';
import Hero from '@/components/landing/Hero';
import ValueProps from '@/components/landing/ValueProps';
import ProductShowcase from '@/components/landing/ProductShowcase';
import TrustSection from '@/components/landing/TrustSection';
import CTASection from '@/components/landing/CTASection';
import Footer from '@/components/landing/Footer';
import { WaitlistModal } from '@/components/landing/WaitlistModal';

const LandingPage: React.FC = () => {
  const [waitlistOpen, setWaitlistOpen] = useState(false);

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
      <Navigation onJoinWaitlist={() => setWaitlistOpen(true)} />
      <main>
        <Hero onJoinWaitlist={() => setWaitlistOpen(true)} />
        <ValueProps />
        <ProductShowcase />
        <TrustSection />
        <CTASection onJoinWaitlist={() => setWaitlistOpen(true)} />
      </main>
      <Footer />
      <WaitlistModal open={waitlistOpen} onOpenChange={setWaitlistOpen} />
    </div>
  );
};

export default LandingPage;
