import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Loader2, CheckCircle } from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { celebrate } from '@/lib/confetti';
import { BRAND } from '@/lib/brand';

// Supabase client for direct frontend access
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || '',
  import.meta.env.VITE_SUPABASE_ANON_KEY || ''
);

interface WaitlistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WaitlistModal = ({ open, onOpenChange }: WaitlistModalProps) => {
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [company, setCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) {
      setError('Email is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { error: submitError } = await supabase
        .from('waitlist')
        .insert({
          email: email.toLowerCase().trim(),
          full_name: fullName.trim() || null,
          company: company.trim() || null,
          source: 'landing_page',
          metadata: {
            userAgent: navigator.userAgent,
            referrer: document.referrer || 'direct',
            timestamp: new Date().toISOString(),
          },
        });

      if (submitError) {
        // Handle duplicate email gracefully
        if (submitError.code === '23505') {
          setError('You\'re already on the waitlist! We\'ll be in touch soon.');
        } else {
          setError('Something went wrong. Please try again.');
          console.error('Waitlist submission error:', submitError);
        }
        setLoading(false);
        return;
      }

      // Success!
      setSuccess(true);
      setLoading(false);

      // Trigger celebration confetti
      celebrate();

      // Auto-close after 2 seconds
      setTimeout(() => {
        onOpenChange(false);
        // Reset form after close animation
        setTimeout(() => {
          setEmail('');
          setFullName('');
          setCompany('');
          setSuccess(false);
        }, 300);
      }, 2000);
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
      setLoading(false);
      console.error('Waitlist submission error:', err);
    }
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        {success ? (
          <div className="text-center py-8">
            <CheckCircle className="h-16 w-16 text-primary mx-auto mb-4" />
            <DialogTitle className="text-2xl mb-2">You're on the list!</DialogTitle>
            <DialogDescription className="text-base">
              We'll be in touch soon with early access details.
            </DialogDescription>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">Join the Waitlist</DialogTitle>
              <DialogDescription className="text-base">
                Be the first to discover shadow AI in your organization. Early access coming soon.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              <div>
                <label htmlFor="email" className="text-sm font-medium mb-2 block">
                  Work Email <span className="text-destructive">*</span>
                </label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="h-11"
                />
              </div>

              <div>
                <label htmlFor="fullName" className="text-sm font-medium mb-2 block">
                  Full Name
                </label>
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Jane Smith"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={loading}
                  className="h-11"
                />
              </div>

              <div>
                <label htmlFor="company" className="text-sm font-medium mb-2 block">
                  Company
                </label>
                <Input
                  id="company"
                  type="text"
                  placeholder="ACME Inc."
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  disabled={loading}
                  className="h-11"
                />
              </div>

              {error && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                data-testid="waitlist-submit"
                disabled={loading || !email}
                className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Joining...
                  </>
                ) : (
                  'Join Waitlist'
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center mt-4">
                By joining, you agree to receive updates about {BRAND.name}. Unsubscribe anytime.
              </p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
