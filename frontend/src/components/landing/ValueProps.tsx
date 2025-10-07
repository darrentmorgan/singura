import { Card } from "@/components/ui/card";
import { Eye, Shield, FileCheck } from "lucide-react";

const ValueProps = () => {
  const features = [
    {
      icon: Eye,
      title: "Discovery",
      description: "Automatically identify shadow AI usage, bots, and workflows across your organization",
    },
    {
      icon: Shield,
      title: "Risk Assessment",
      description: "Evaluate security impact and compliance risks of unauthorized automations",
    },
    {
      icon: FileCheck,
      title: "Compliance",
      description: "Ensure adherence to AI governance policies with enterprise-grade auditing",
    },
  ];

  return (
    <section id="product" className="py-24 lg:py-32 relative">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="bg-card border-border/50 p-8 hover:border-primary/50 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 group animate-scale-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="mb-6">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                </div>

                <h3 className="text-2xl font-semibold mb-3">
                  {feature.title}
                </h3>

                <p className="text-muted-foreground leading-relaxed font-light">
                  {feature.description}
                </p>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default ValueProps;
