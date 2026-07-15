export interface SiteConfig {
  name: string;
  brand: string;
  tagline: string[];
  subtitle: string;
  badges: string[];
  cta: { label: string; href: string };
  ctaSecondary?: { label: string; href: string };
  cv: { label: string; href: string; filename: string };
  contact: {
    email: string;
    phone: string;
    location: string;
    birthDate?: string;
  };
  experience: {
    title: string;
    company: string;
    period: string;
    bullets: string[];
    stack: string[];
  }[];
  about: {
    bio: string[];
    highlights: { title: string; description: string }[];
  };
  social: { platform: string; handle: string; href: string }[];
}

export interface LocalizedString {
  en: string;
  he: string;
}

export interface Project {
  slug: string;
  name: string;
  description: LocalizedString;
  stars: number;
  featured?: boolean;
  category?: string;
  stack: string[];
  href?: string;
  demoUrl?: string;
  playStoreUrl?: string;
}

export interface ProjectView extends Omit<Project, "description"> {
  description: string;
}

export interface App {
  slug: string;
  name: string;
  description: string;
  tagline: string;
  stack: string[];
  href: string;
  preview?: string;
}

export interface Course {
  slug: string;
  title: string;
  description: string;
  level: string;
  isNew?: boolean;
  href: string;
}

export interface Video {
  id: string;
  title: string;
  category: string;
  thumbnail: string;
  href: string;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  company: string;
  quote: string;
  relation: string;
  date?: string;
  featured?: boolean;
  href?: string;
}

export interface Trend {
  id: string;
  title: string;
  source: string;
  description: string;
  href: string;
  stars?: number;
  imageUrl?: string;
}

export interface MdxDoc {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  readTime: string;
  tags: string[];
  lang: string;
  featured?: boolean;
  isNew?: boolean;
  difficulty?: string;
  category?: string;
  emoji?: string;
  content: string;
  imageUrl?: string;
  sourceHref?: string;
}
