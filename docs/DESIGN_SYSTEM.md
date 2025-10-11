# Singura Landing Page Design System

**Version:** 1.0.0
**Last Updated:** October 7, 2025
**Author:** Shadow Map Reveal Integration

---

## Design Philosophy

### Inspiration
The landing page design is inspired by **Apple** and **Tesla's** premium, cinematic aesthetics:
- **Dark, nearly-black backgrounds** for premium feel
- **Cyan/teal accent colors** for high-tech, security-focused branding
- **Glow effects** for emphasis and visual interest
- **Smooth animations** for engaging user experience
- **Minimal, clean typography** for professionalism

### Core Principles
1. **Premium & Professional** - Enterprise-grade aesthetic
2. **Security-First** - Visual language conveys trust and security
3. **Modern & Innovative** - Cutting-edge design patterns
4. **Accessible** - WCAG 2.1 AA compliant
5. **Performant** - Optimized animations and assets

---

## Color Palette

### Primary Colors (Dark Theme)
```css
/* Background Layers */
--background: 0 0% 4%;           /* Nearly black (#0a0a0a) */
--surface-depth: 0 0% 6%;        /* Slightly lighter (#0f0f0f) */
--surface-elevated: 0 0% 10%;    /* Elevated surfaces (#1a1a1a) */
--card: 0 0% 7%;                 /* Card background (#121212) */

/* Text */
--foreground: 0 0% 98%;          /* Primary text (#fafafa) */
--muted-foreground: 0 0% 60%;    /* Secondary text (#999999) */

/* Borders */
--border: 0 0% 20%;              /* Subtle borders (#333333) */
```

### Accent Colors
```css
/* Primary Accent - Cyan/Teal */
--primary: 180 95% 55%;          /* Bright cyan (#0ddddd) */
--accent: 180 95% 55%;           /* Matching primary */

/* Glow Effects */
--glow-primary: 180 95% 55%;     /* Primary glow */
--glow-secondary: 190 85% 65%;   /* Secondary glow (lighter cyan) */
```

### Semantic Colors
```css
--destructive: 0 84% 60%;        /* Error/danger (#f25555) */
--muted: 0 0% 15%;               /* Muted backgrounds (#262626) */
--secondary: 0 0% 12%;           /* Secondary elements (#1f1f1f) */
```

---

## Typography

### Font Family
```css
font-family: "Inter", system-ui, sans-serif;
font-feature-settings: "rlig" 1, "calt" 1, "cv11", "ss01";
```

### Type Scale (Landing Page)
```css
/* Hero Heading */
.hero-title {
  font-size: clamp(3rem, 8vw, 8rem);    /* 48px - 128px */
  font-weight: 700;
  line-height: 1.1;
  letter-spacing: -0.02em;
}

/* Section Headings */
.section-heading {
  font-size: clamp(1.875rem, 4vw, 3rem);  /* 30px - 48px */
  font-weight: 700;
  line-height: 1.2;
}

/* Subsection Headings */
.subsection-heading {
  font-size: clamp(1.5rem, 3vw, 2rem);    /* 24px - 32px */
  font-weight: 600;
  line-height: 1.3;
}

/* Body Text */
.body-text {
  font-size: clamp(1rem, 2vw, 1.25rem);   /* 16px - 20px */
  font-weight: 300;                        /* Light weight */
  line-height: 1.6;
}

/* Small Text */
.small-text {
  font-size: 0.875rem;                     /* 14px */
  font-weight: 300;
  line-height: 1.5;
}
```

---

## Spacing System

### Base Unit: 4px
```css
/* Spacing Scale */
--space-1: 0.25rem;  /* 4px */
--space-2: 0.5rem;   /* 8px */
--space-3: 0.75rem;  /* 12px */
--space-4: 1rem;     /* 16px */
--space-6: 1.5rem;   /* 24px */
--space-8: 2rem;     /* 32px */
--space-12: 3rem;    /* 48px */
--space-16: 4rem;    /* 64px */
--space-24: 6rem;    /* 96px */
--space-32: 8rem;    /* 128px */
```

### Component Spacing
- **Section Padding (Vertical):** `py-24 lg:py-32` (96px - 128px)
- **Container Padding (Horizontal):** `px-6 lg:px-8` (24px - 32px)
- **Card Padding:** `p-8` (32px)
- **Button Padding:** `px-8 h-12` (32px horizontal, 48px height)

---

## Visual Effects

### Glow Effects
```css
/* Text Glow - Used for hero headings and accent text */
.glow-text {
  text-shadow:
    0 0 20px hsl(var(--glow-primary) / 0.5),
    0 0 40px hsl(var(--glow-primary) / 0.3);
}

/* Border Glow - Used for featured elements */
.glow-border {
  border-color: hsl(var(--glow-primary) / 0.5);
  box-shadow: 0 0 20px hsl(var(--glow-primary) / 0.2);
}

/* Surface Glow - Used for backgrounds */
.surface-glow {
  background: radial-gradient(
    circle at center,
    hsl(var(--glow-primary) / 0.1) 0%,
    transparent 70%
  );
}
```

### Glassmorphism (Navigation)
```css
.glassmorphic {
  background-color: hsl(var(--background) / 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}
```

---

## Animations

### Keyframe Animations
```css
/* Fade In - Entrance animation */
@keyframes fade-in {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Fade In Up - Delayed entrance */
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(40px); }
  to { opacity: 1; transform: translateY(0); }
}

/* Glow Pulse - Breathing effect */
@keyframes glow-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* Scale In - Zoom entrance */
@keyframes scale-in {
  from { opacity: 0; transform: scale(0.95); }
  to { opacity: 1; transform: scale(1); }
}
```

### Animation Classes
```css
.animate-fade-in { animation: fade-in 0.6s ease-out; }
.animate-fade-in-up { animation: fade-in-up 0.8s ease-out; }
.animate-glow-pulse { animation: glow-pulse 2s ease-in-out infinite; }
.animate-scale-in { animation: scale-in 0.5s ease-out; }
```

### Transition Standards
```css
/* Micro-interactions */
.transition-fast { transition: all 0.15s ease; }
.transition-base { transition: all 0.2s ease; }
.transition-slow { transition: all 0.3s ease; }

/* Hover States */
button:hover { transform: translateY(-1px); }
card:hover { box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3); }
```

---

## Components

### Navigation Bar
```typescript
// Fixed, glassmorphic header with Singura branding
<nav className="fixed top-0 left-0 right-0 z-50
                border-b border-border/50
                bg-background/80 backdrop-blur-xl">
  ...
</nav>
```

**Properties:**
- **Position:** Fixed top
- **Z-index:** 50
- **Height:** 64px (h-16)
- **Background:** Translucent with blur
- **Border:** Bottom border with 50% opacity

### Hero Section
```typescript
// Full-screen hero with background image and glow effects
<section className="relative min-h-screen flex items-center
                    justify-center overflow-hidden">
  ...
</section>
```

**Properties:**
- **Height:** Full viewport (min-h-screen)
- **Background:** Dark gradient over image
- **Glow:** Radial gradient overlay
- **Content:** Centered, max-width constrained

### Feature Cards
```typescript
// Animated cards with hover effects
<Card className="bg-card border-border/50 p-8
                hover:border-primary/50
                transition-all duration-300
                hover:shadow-lg hover:shadow-primary/10
                group animate-scale-in">
  ...
</Card>
```

**Properties:**
- **Padding:** 32px (p-8)
- **Border:** Subtle, brightens on hover
- **Shadow:** Appears on hover with primary color tint
- **Animation:** Scale-in entrance

### Buttons
```typescript
// Primary CTA button
<Button className="bg-primary text-primary-foreground
                   hover:bg-primary/90
                   font-medium group px-8 h-12">
  ...
</Button>
```

**Button Variants:**
- **Primary:** Cyan background, dark text
- **Outline:** Transparent with primary border
- **Ghost:** Transparent, text-only

---

## Layout Patterns

### Section Structure
```typescript
<section className="py-24 lg:py-32">
  <div className="container mx-auto px-6 lg:px-8">
    <div className="text-center mb-16">
      {/* Section Header */}
    </div>
    <div className="max-w-6xl mx-auto">
      {/* Section Content */}
    </div>
  </div>
</section>
```

### Grid Layouts
```css
/* 3-Column Feature Grid */
.grid-features {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 3rem;
}

/* 2-Column Content Grid */
.grid-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
}

/* Responsive breakpoints */
@media (max-width: 768px) {
  .grid-features,
  .grid-content {
    grid-template-columns: 1fr;
  }
}
```

---

## Accessibility

### Focus States
```css
*:focus-visible {
  outline: none;
  ring: 2px solid hsl(var(--ring));
  ring-offset: 2px;
}
```

### Reduced Motion
```css
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

### Color Contrast
All text combinations meet **WCAG 2.1 AA standards**:
- Primary text on background: 19.5:1 (AAA)
- Muted text on background: 7.2:1 (AA)
- Primary accent on dark: 8.1:1 (AA+)

---

## Future Migration Strategy

### Tagging System
Components designed for this landing page are tagged with `@design-v2` annotations for future reference when migrating the rest of the application.

### Rollout Plan
1. **Phase 1:** Landing page (✅ Complete)
2. **Phase 2:** Login/Signup pages
3. **Phase 3:** Dashboard redesign
4. **Phase 4:** Connections page
5. **Phase 5:** Automations page
6. **Phase 6:** Settings and admin pages

### Component Library
Reusable components from the landing page:
- `Navigation` - Glassmorphic header
- `Hero` - Full-screen hero section
- `ValueProps` - Feature card grid
- `ProductShowcase` - Product preview section
- `TrustSection` - Testimonial/compliance section
- `CTASection` - Call-to-action section
- `Footer` - Multi-column footer

---

## Assets

### Images
- **hero-network.jpg** (76KB) - Hero background image
- **dashboard-preview.jpg** (78KB) - Product showcase image

### Optimization
- Images served at appropriate sizes for viewport
- Lazy loading for below-fold content
- WebP format with JPEG fallback (future enhancement)

---

## Performance Benchmarks

### Target Metrics
- **First Contentful Paint:** < 1.5s
- **Largest Contentful Paint:** < 2.5s
- **Time to Interactive:** < 3.0s
- **Cumulative Layout Shift:** < 0.1

### Optimization Techniques
- Minimal CSS-in-JS (Tailwind classes only)
- Optimized animation keyframes
- Lazy-loaded below-fold components
- Efficient asset compression

---

## Browser Support

### Supported Browsers
- **Chrome/Edge:** Latest 2 versions
- **Firefox:** Latest 2 versions
- **Safari:** Latest 2 versions
- **Mobile Safari (iOS):** Latest 2 versions
- **Chrome Mobile (Android):** Latest 2 versions

### Graceful Degradation
- Glow effects degrade to solid colors
- Glassmorphism falls back to solid backgrounds
- Animations disabled for `prefers-reduced-motion`

---

## Maintenance & Updates

### Version Control
- All design tokens defined in `index.css` and `tailwind.config.js`
- Single source of truth for colors, spacing, and animations
- Version documented in this file header

### Update Protocol
1. Update design tokens in CSS variables
2. Update Tailwind config if needed
3. Test across all components
4. Update this documentation
5. Bump version number

---

## References

### Design Inspiration
- [Apple.com](https://apple.com) - Premium minimalism
- [Tesla.com](https://tesla.com) - Cinematic dark theme
- [Stripe.com](https://stripe.com) - Professional SaaS design

### Technical Resources
- [TailwindCSS Documentation](https://tailwindcss.com)
- [Radix UI Primitives](https://radix-ui.com)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

**End of Design System Documentation**
