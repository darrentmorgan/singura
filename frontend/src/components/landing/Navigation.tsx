import { Button } from "@/components/ui/button";
import { Shield } from "lucide-react";
import { Link } from "react-router-dom";

const Navigation = () => {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center space-x-2">
            <Shield className="h-6 w-6 text-primary" />
            <div className="text-xl font-semibold tracking-tight">
              SaaS <span className="text-primary">X-Ray</span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-8">
            <a href="#product" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              PRODUCT
            </a>
            <a href="#platform" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              PLATFORM
            </a>
            <a href="#contact" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              CONTACT
            </a>
            <Link to="/login">
              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-medium"
              >
                GET STARTED
              </Button>
            </Link>
          </div>

          <div className="w-32 md:hidden" />
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
