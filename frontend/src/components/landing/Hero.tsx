import { Button } from "@/components/ui/button";
import heroNetwork from "@/assets/hero-network.jpg";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const Hero = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src={heroNetwork}
          alt="Network visualization"
          className="w-full h-full object-cover opacity-40"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/50 to-background" />
      </div>

      {/* Glow Effect */}
      <div className="absolute inset-0 surface-glow z-0" />

      {/* Content */}
      <div className="relative z-10 container mx-auto px-6 lg:px-8 text-center">
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6 animate-fade-in">
          Expose the Shadow
          <br />
          <span className="text-primary glow-text">AI Network</span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 animate-fade-in-up font-light">
          Discover unauthorized AI agents, bots, and automations across your SaaS platforms
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up">
          <Link to="/login">
            <Button
              size="lg"
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium group px-8 h-12"
            >
              START FREE TRIAL
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <a href="#platform">
            <Button
              size="lg"
              variant="outline"
              className="border-primary/50 text-foreground hover:bg-primary/10 font-medium px-8 h-12"
            >
              SEE IT IN ACTION
            </Button>
          </a>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <div className="w-6 h-10 border-2 border-primary/50 rounded-full flex items-start justify-center p-2">
            <div className="w-1.5 h-3 bg-primary rounded-full animate-glow-pulse" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
