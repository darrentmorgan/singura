import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const CTASection = () => {
  return (
    <section id="contact" className="py-24 lg:py-32 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute inset-0 surface-glow opacity-50" />

      <div className="container mx-auto px-6 lg:px-8 relative z-10">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6">
            Ready to Expose Your
            <br />
            <span className="glow-text" style={{ color: '#00ffff' }}>Shadow AI Network?</span>
          </h2>

          <p className="text-lg text-muted-foreground mb-10 font-light">
            Start discovering unauthorized AI agents in under 60 seconds.
            <br />
            No credit card required.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link to="/login">
              <Button
                size="lg"
                className="font-medium group px-8 h-12"
                style={{ backgroundColor: '#00ffff', color: '#000000' }}
              >
                Start Free Trial
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>

            <a href="mailto:contact@saasxray.com">
              <Button
                size="lg"
                variant="outline"
                className="border-primary/50 text-foreground hover:bg-primary/10 font-medium px-8 h-12"
                style={{ borderColor: 'rgba(0, 255, 255, 0.5)' }}
              >
                Schedule Demo
              </Button>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTASection;
