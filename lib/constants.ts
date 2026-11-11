/** Canonical public origin. Hardcoded on purpose: Google must see one host. */
export const SITE_URL = "https://ordel.dev";

export const navLinks = [
  { href: "/about", label: "About" },
  { href: "/blog", label: "Blog" },
  { href: "/learn", label: "Learn" },
  { href: "/ai-trends", label: "AI Trends" },
  { href: "/projects", label: "Projects" },
  { href: "/apps", label: "Apps" },
  { href: "/contact", label: "Contact" },
] as const;

export const logoPartners = [
  "GitHub",
  "AWS",
  "Microsoft",
  "Vercel",
  "Supabase",
  "OpenAI",
] as const;

export const THEME_STORAGE_KEY = "ordel-theme";

/** Full-screen background video — dark theme (MP4) */
export const HERO_VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260514_102933_4e8f73b5-775a-4179-b2fb-472f59063dcd.mp4";

/** Full-screen background video — bright/light theme (MP4) */
export const HERO_VIDEO_SRC_LIGHT =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_083109_283f3553-e28f-428b-a723-d639c617eb2b.mp4";

/** Same WhatsApp / email contact the v2 home page shows */
export const CONTACT_WHATSAPP_URL = "https://wa.me/972547917154";
export const CONTACT_EMAIL = "ordi1985@gmail.com";
