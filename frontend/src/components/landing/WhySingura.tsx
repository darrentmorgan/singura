import { CONTENT } from "@/lib/brand";

const WhySingura = () => {
  return (
    <section id="why" className="py-24 px-6 lg:px-8 bg-gradient-to-b from-background to-background/50">
      <div className="container mx-auto max-w-5xl">
        <div className="text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-8 tracking-tight">
            {CONTENT.why.headline}
          </h2>
          <p className="text-xl text-muted-foreground leading-relaxed font-light max-w-4xl mx-auto">
            {CONTENT.why.description}
          </p>
        </div>
      </div>
    </section>
  );
};

export default WhySingura;
