import { Button } from "@/components/ui/button";
import heroNetwork from "@/assets/hero-network.jpg";
import { ArrowRight } from "lucide-react";

interface HeroProps {
  onJoinWaitlist: () => void;
}

const Hero = ({ onJoinWaitlist }: HeroProps) => {
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
          <span className="glow-text text-primary">AI Network</span>
        </h1>

        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 animate-fade-in-up font-light">
          Mapping unauthorized AI agents and automation risks
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up">
          <Button
            size="lg"
            onClick={onJoinWaitlist}
            className="font-medium px-8 h-12 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            JOIN WAITLIST
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
