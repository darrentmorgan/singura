import { Badge } from "@/components/ui/badge";
import { Shield, Lock, FileCheck, Award } from "lucide-react";

const TrustSection = () => {
  const compliance = [
    { icon: Shield, label: "SOC 2 Type II" },
    { icon: Lock, label: "ISO 27001" },
    { icon: FileCheck, label: "GDPR Compliant" },
    { icon: Award, label: "Enterprise Ready" },
  ];

  return (
    <section className="py-24 lg:py-32 border-t border-border/50">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Trusted by Security Leaders
          </h2>
          <p className="text-muted-foreground text-lg font-light">
            Enterprise-grade security and compliance
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-6 mb-16">
          {compliance.map((item, index) => {
            const Icon = item.icon;
            return (
              <Badge
                key={index}
                variant="outline"
                className="px-6 py-3 border-primary/30 bg-card hover:bg-primary/10 transition-colors"
              >
                <Icon className="h-4 w-4 mr-2 text-primary" />
                {item.label}
              </Badge>
            );
          })}
        </div>

        {/* Testimonial */}
        <div className="max-w-3xl mx-auto text-center">
          <blockquote className="text-xl md:text-2xl font-light text-foreground/90 mb-6 italic">
            "SaaS X-Ray helped us discover shadow AI workflows we didn't even know existed.
            The ROI was immediate and the insights were board-ready."
          </blockquote>
          <div className="text-sm text-muted-foreground">
            <div className="font-medium text-foreground">Sarah Chen</div>
            <div>CISO, Fortune 500 Technology Company</div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
