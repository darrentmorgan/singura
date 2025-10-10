import { CONTENT } from "@/lib/brand";

const Mission = () => {
  return (
    <section id="mission" className="py-24 px-6 lg:px-8 bg-background">
      <div className="container mx-auto max-w-4xl">
        {/* Centered headline */}
        <h2 className="text-3xl md:text-4xl font-bold mb-12 text-center tracking-tight glow-text">
          {CONTENT.mission.headline}
        </h2>

        {/* Mission body */}
        <div className="text-center">
          <p className="text-lg text-muted-foreground leading-relaxed font-light max-w-3xl mx-auto">
            {CONTENT.mission.body}
          </p>
        </div>

        {/* Subtle dividers */}
        <div className="mt-12 flex items-center justify-center gap-4">
          <div className="h-px w-16 bg-gradient-to-r from-transparent to-border" />
          <div className="h-1 w-1 rounded-full bg-primary" />
          <div className="h-px w-16 bg-gradient-to-l from-transparent to-border" />
        </div>
      </div>
    </section>
  );
};

export default Mission;
