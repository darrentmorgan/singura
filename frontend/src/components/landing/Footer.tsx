import { Link } from "react-router-dom";
import { BRAND, CONTENT } from "@/lib/brand";

const Footer = () => {
  return (
    <footer className="border-t border-border/50 py-12">
      <div className="container mx-auto px-6 lg:px-8">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <Link to="/" className="text-lg font-semibold mb-4 block">
              {BRAND.name}
            </Link>
            <p className="text-sm text-muted-foreground font-light">
              {CONTENT.footer.description}
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{CONTENT.footer.sections.product.title}</h3>
            <ul className="space-y-2 text-sm">
              {CONTENT.footer.sections.product.links.map((link) => (
                <li key={link.label}>
                  <a href={link.href} className="text-muted-foreground hover:text-primary transition-colors">
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{CONTENT.footer.sections.company.title}</h3>
            <ul className="space-y-2 text-sm">
              {CONTENT.footer.sections.company.links.map((link) => (
                <li key={link.label}>
                  {link.href.startsWith('mailto:') ? (
                    <a href={link.href} className="text-muted-foreground hover:text-primary transition-colors">
                      {link.label}
                    </a>
                  ) : (
                    <Link to={link.href} className="text-muted-foreground hover:text-primary transition-colors">
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold mb-4">{CONTENT.footer.sections.legal.title}</h3>
            <ul className="space-y-2 text-sm">
              {CONTENT.footer.sections.legal.links.map((link) => (
                <li key={link.label}>
                  <Link to={link.href} className="text-muted-foreground hover:text-primary transition-colors">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-border/50 text-center text-sm text-muted-foreground">
          {CONTENT.footer.copyright}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
