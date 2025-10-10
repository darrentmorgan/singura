import { Button } from "@/components/ui/button";
import { CONTENT } from "@/lib/brand";
import { ArrowRight } from "lucide-react";

interface FooterCTAProps {
  onJoinWaitlist: () => void;
}

const FooterCTA = ({ onJoinWaitlist }: FooterCTAProps) => {
  return (
    <section className="py-24 px-6 lg:px-8 bg-gradient-to-b from-background to-background/50">
      <div className="container mx-auto max-w-4xl text-center">
        {/* Headline */}
        <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
          {CONTENT.footerCTA.headline}
        </h2>

        {/* Description */}
        <p className="text-xl text-muted-foreground mb-12 font-light">
          {CONTENT.footerCTA.description}
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            size="lg"
            onClick={onJoinWaitlist}
            className="font-medium px-8 h-12 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {CONTENT.footerCTA.cta.primary}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => {
              document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' });
            }}
            className="font-medium px-8 h-12"
          >
            {CONTENT.footerCTA.cta.secondary}
          </Button>
        </div>
      </div>
    </section>
  );
};

export default FooterCTA;
