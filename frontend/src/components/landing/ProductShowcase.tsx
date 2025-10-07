import dashboardPreview from "@/assets/dashboard-preview.jpg";

const ProductShowcase = () => {
  return (
    <section id="platform" className="py-24 lg:py-32 bg-surface-depth">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold mb-4 animate-fade-in">
            Enterprise-Grade
            <br />
            <span style={{ color: '#00ffff' }}>Automation Intelligence</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto font-light animate-fade-in-up">
            Gain complete visibility into your organization's automation landscape
          </p>
        </div>

        <div className="relative max-w-6xl mx-auto animate-scale-in">
          {/* Glow effect behind image */}
          <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-3xl" />

          {/* Dashboard Image */}
          <div className="relative rounded-2xl overflow-hidden border border-primary/30 glow-border">
            <img
              src={dashboardPreview}
              alt="SaaS X-Ray Dashboard"
              className="w-full h-auto"
            />
          </div>

          {/* Feature Annotations */}
          <div className="mt-12 grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">99.9%</div>
              <div className="text-sm text-muted-foreground font-light">Discovery Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">&lt;60s</div>
              <div className="text-sm text-muted-foreground font-light">First Discovery</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-primary mb-2">0.1%</div>
              <div className="text-sm text-muted-foreground font-light">False Positive Rate</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProductShowcase;
