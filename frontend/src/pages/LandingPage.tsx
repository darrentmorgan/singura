/**
 * Landing Page - Public Marketing Page
 * Modern, dark-themed landing page for Singura AI
 * Inspired by Apple/Tesla premium aesthetic
 */

import React, { useEffect, useState } from 'react';
import Navigation from '@/components/landing/Navigation';
import Hero from '@/components/landing/Hero';
import Features from '@/components/landing/Features';
import WhySingura from '@/components/landing/WhySingura';
import ConsolePreview from '@/components/landing/ConsolePreview';
import Mission from '@/components/landing/Mission';
import FooterCTA from '@/components/landing/FooterCTA';
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
      {/* Skip link for keyboard navigation accessibility */}
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <Navigation onJoinWaitlist={() => setWaitlistOpen(true)} />
      <main id="main-content">
        <Hero onJoinWaitlist={() => setWaitlistOpen(true)} />
        <Features />
        <WhySingura />
        <ConsolePreview />
        <Mission />
        <FooterCTA onJoinWaitlist={() => setWaitlistOpen(true)} />
      </main>
      <Footer />
      <WaitlistModal open={waitlistOpen} onOpenChange={setWaitlistOpen} />
    </div>
  );
};

export default LandingPage;
