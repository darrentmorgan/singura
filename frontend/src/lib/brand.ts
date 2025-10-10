/**
 * Singura AI Brand Configuration
 * Single source of truth for brand identity, copy, and metadata
 */

export const BRAND = {
  name: 'Singura AI',
  domain: 'singura.ai',
  tagline: 'Illuminate the Hidden. Control the Autonomous.',

  // Navigation links
  navigation: [
    { label: 'How It Works', anchor: '#how-it-works' },
    { label: 'Product', anchor: '#console' },
    { label: 'Request Access', anchor: '#contact', action: 'openWaitlist' },
  ],

  // Contact information
  contact: {
    email: 'contact@singura.ai',
    careers: 'careers@singura.ai',
    support: 'support@singura.ai',
  },

  // Social links
  social: {
    linkedin: 'https://linkedin.com/company/singura-ai',
    twitter: 'https://twitter.com/singura_ai',
    github: 'https://github.com/singura-ai',
  },

  // Color scheme (matching the requested dark theme + teal accent)
  colors: {
    background: {
      primary: '#0B0F14',
      secondary: '#0E1116',
    },
    text: {
      primary: '#E6F1FF',
      secondary: '#A0AEC0',
    },
    accent: '#00E5FF', // Teal accent
  },
} as const;

export const CONTENT = {
  // Hero Section
  hero: {
    headline: 'Illuminate the Hidden. Control the Autonomous.',
    subheadline: 'Singura AI reveals, manages, and protects your network of AI agents — in real time.',
    cta: {
      primary: 'Request Access',
      secondary: 'See How It Works',
    },
  },

  // Value Proposition
  valueProposition: {
    headline: 'The all-seeing command center for AI ecosystems.',
    description: 'Monitor behavior, detect anomalies, and shut down rogue AI agents before they act.',
  },

  // Features Section (Observe, Detect, Control)
  features: [
    {
      id: 'observe',
      title: 'Observe',
      description: 'Gain full visibility into every AI agent, process, and decision. Track how autonomous systems evolve, interact, and adapt — in real time.',
      icon: 'Eye',
    },
    {
      id: 'detect',
      title: 'Detect',
      description: 'Identify irregularities, drift, or emergent behavior instantly. Singura uses signal intelligence and behavioral baselines to expose hidden threats.',
      icon: 'Shield',
    },
    {
      id: 'control',
      title: 'Control',
      description: 'Intervene before issues cascade. Trigger automated or manual containment for misaligned or compromised AI systems.',
      icon: 'Lock',
    },
  ],

  // Why Singura Section
  why: {
    headline: 'Why Singura',
    description: 'Built for the coming era of autonomous AI networks. Traditional monitoring tools weren\'t designed for self-learning entities. Singura is — purpose-built for AI observability, explainability, and command.',
  },

  // Console/Product Section
  console: {
    headline: 'The Singura Console',
    description: 'Visualize and manage every agent through one unified control layer.',
    features: [
      'Real-time behavioral mapping',
      'Trust scoring and drift detection',
      'Agent lifecycle and policy management',
      'Containment and rollback triggers',
    ],
  },

  // Mission Statement
  mission: {
    headline: 'Light is the ultimate form of control.',
    body: 'Singura was founded on one principle — that visibility equals safety. Our mission is to ensure every intelligent system remains aligned, accountable, and under human command.',
  },

  // Footer CTA
  footerCTA: {
    headline: 'Ready to illuminate your AI ecosystem?',
    description: 'Request early access to Singura AI.',
    cta: {
      primary: 'Request Access',
      secondary: 'See How It Works',
    },
  },

  // Footer
  footer: {
    description: 'Enterprise security platform for shadow AI discovery',
    copyright: `© 2025 ${BRAND.name}. All rights reserved.`,
    sections: {
      product: {
        title: 'Product',
        links: [
          { label: 'How It Works', href: '#how-it-works' },
          { label: 'Console', href: '#console' },
          { label: 'Security', href: '#security' },
        ],
      },
      company: {
        title: 'Company',
        links: [
          { label: 'About', href: '/about' },
          { label: 'Careers', href: `mailto:${BRAND.contact.careers}` },
          { label: 'Contact', href: `mailto:${BRAND.contact.email}` },
        ],
      },
      legal: {
        title: 'Legal',
        links: [
          { label: 'Privacy', href: '/privacy' },
          { label: 'Terms', href: '/terms' },
          { label: 'Security', href: '/security' },
        ],
      },
    },
  },

  // SEO Metadata
  seo: {
    title: 'Singura AI — Illuminate the Hidden. Control the Autonomous.',
    description: 'Singura AI reveals, manages, and protects your network of AI agents — in real time. Observe behavior, detect anomalies, and shut down rogue agents before they act.',
    keywords: [
      'AI security',
      'AI agent monitoring',
      'autonomous AI control',
      'AI observability',
      'shadow AI detection',
      'AI governance',
      'enterprise AI security',
      'AI anomaly detection',
    ],
    ogSiteName: 'Singura AI',
    canonical: 'https://singura.ai/',
  },
} as const;

/**
 * Usage: Import BRAND and CONTENT directly in components
 * @example
 * import { BRAND, CONTENT } from '@/lib/brand';
 *
 * function Header() {
 *   return <h1>{BRAND.name}</h1>;
 * }
 */
