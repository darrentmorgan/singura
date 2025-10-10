import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { BRAND } from "@/lib/brand";

interface NavigationProps {
  onJoinWaitlist: () => void;
}

const Navigation = ({ onJoinWaitlist }: NavigationProps) => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="text-xl font-semibold tracking-tight">
            {BRAND.name}
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {BRAND.navigation.map((item) => (
              item.action === 'openWaitlist' ? (
                <Button
                  key={item.label}
                  size="sm"
                  onClick={onJoinWaitlist}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
                >
                  {item.label.toUpperCase()}
                </Button>
              ) : (
                <a
                  key={item.label}
                  href={item.anchor}
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  {item.label.toUpperCase()}
                </a>
              )
            ))}
          </div>

          <div className="w-32 md:hidden" />
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
