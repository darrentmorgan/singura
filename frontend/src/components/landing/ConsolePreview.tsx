import { Card, CardContent } from "@/components/ui/card";
import { CONTENT } from "@/lib/brand";
import { CheckCircle2 } from "lucide-react";

const ConsolePreview = () => {
  return (
    <section id="console" className="py-24 px-6 lg:px-8 bg-gradient-to-b from-background/50 to-background">
      <div className="container mx-auto max-w-7xl">
        <div className="grid md:grid-cols-2 gap-16 items-center">
          {/* Left: Console Features */}
          <div className="space-y-8">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                {CONTENT.console.headline}
              </h2>
              <p className="text-xl text-muted-foreground font-light leading-relaxed">
                {CONTENT.console.description}
              </p>
            </div>

            {/* Feature List */}
            <ul className="space-y-4" role="list">
              {CONTENT.console.features.map((feature, index) => (
                <li key={index} className="flex items-start gap-3 text-lg">
                  <CheckCircle2
                    className="w-6 h-6 text-primary flex-shrink-0 mt-1"
                    aria-hidden="true"
                  />
                  <span className="text-muted-foreground font-light">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Right: Console Preview Placeholder */}
          <Card className="aspect-[4/3] bg-gradient-to-br from-card to-card/50 border-primary/20 relative overflow-hidden group">
            {/* Subtle animated glow */}
            <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-primary/10 opacity-50 group-hover:opacity-75 transition-opacity duration-700" />

            <CardContent className="flex flex-col items-center justify-center h-full p-8 relative z-10">
              {/* Placeholder content */}
              <div className="text-center space-y-6">
                {/* Icon placeholder */}
                <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
                  <svg
                    className="w-12 h-12 text-primary"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>

                <div>
                  <p className="text-muted-foreground text-base font-light">
                    Interactive dashboard preview
                  </p>
                  <p className="text-sm text-muted-foreground/60 mt-2">
                    Coming soon: Live demo
                  </p>
                </div>
              </div>

              {/* Grid overlay effect */}
              <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:32px_32px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_80%)]" />
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default ConsolePreview;
