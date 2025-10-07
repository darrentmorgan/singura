import { Shield } from "lucide-react";
import { Link } from "react-router-dom";

const Footer = () => {
  return (
    <footer className="border-t border-border/50 py-12">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <Link to="/" className="flex items-center space-x-2 mb-4">
              <Shield className="h-5 w-5 text-primary" />
              <div className="text-lg font-semibold">
                SaaS <span className="text-primary">X-Ray</span>
              </div>
            </Link>
            <p className="text-sm text-muted-foreground font-light">
              Enterprise security platform for shadow AI and automation discovery
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Product</h3>
            <ul className="space-y-2 text-sm">
              <li><a href="#product" className="text-muted-foreground hover:text-primary transition-colors">Discovery</a></li>
              <li><a href="#platform" className="text-muted-foreground hover:text-primary transition-colors">Risk Assessment</a></li>
              <li><a href="#platform" className="text-muted-foreground hover:text-primary transition-colors">Compliance</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Company</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about" className="text-muted-foreground hover:text-primary transition-colors">About</Link></li>
              <li><a href="mailto:careers@saasxray.com" className="text-muted-foreground hover:text-primary transition-colors">Careers</a></li>
              <li><a href="mailto:contact@saasxray.com" className="text-muted-foreground hover:text-primary transition-colors">Contact</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">Legal</h3>
            <ul className="space-y-2 text-sm">
              <li><Link to="/privacy" className="text-muted-foreground hover:text-primary transition-colors">Privacy</Link></li>
              <li><Link to="/terms" className="text-muted-foreground hover:text-primary transition-colors">Terms</Link></li>
              <li><Link to="/security" className="text-muted-foreground hover:text-primary transition-colors">Security</Link></li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border/50 text-center text-sm text-muted-foreground">
          © 2025 SaaS X-Ray. All rights reserved.
        </div>
      </div>
    </footer>
  );
};

export default Footer;
