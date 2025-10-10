import { Card, CardContent } from "@/components/ui/card";
import { CONTENT } from "@/lib/brand";
import { Eye, Shield, Lock, LucideIcon } from "lucide-react";

// Icon mapping based on feature config
const iconMap: Record<string, LucideIcon> = {
  Eye,
  Shield,
  Lock,
};

interface FeatureCardProps {
  title: string;
  description: string;
  icon: string;
  index: number;
}

const FeatureCard = ({ title, description, icon, index }: FeatureCardProps) => {
  const Icon = iconMap[icon];

  return (
    <Card
      className="group relative overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm transition-all duration-500 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10"
      style={{ animationDelay: `${index * 150}ms` }}
    >
      {/* Subtle glow effect on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

      <CardContent className="relative p-8">
        {/* Icon with accent glow */}
        <div className="mb-6 inline-flex p-4 rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors duration-300">
          <Icon className="w-8 h-8" aria-hidden="true" />
        </div>

        <h3 className="text-2xl font-semibold mb-4 tracking-tight">{title}</h3>
        <p className="text-muted-foreground leading-relaxed text-base">{description}</p>
      </CardContent>
    </Card>
  );
};

const Features = () => {
  return (
    <section id="features" className="py-24 px-6 lg:px-8 bg-background">
      <div className="container mx-auto">
        {/* Section Header */}
        <div className="text-center mb-20">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
            {CONTENT.valueProposition.headline}
          </h2>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto font-light">
            {CONTENT.valueProposition.description}
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div
          className="grid md:grid-cols-3 gap-8 max-w-7xl mx-auto"
          role="list"
          aria-label="Platform features"
        >
          {CONTENT.features.map((feature, index) => (
            <FeatureCard key={feature.id} {...feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
