import type { Locale } from "./config";

export function localizedPath(locale: Locale, path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === "/") return `/${locale}`;
  return `/${locale}${normalized}`;
}

export function stripLocaleFromPathname(pathname: string): string {
  const match = pathname.match(/^\/(en|he)(\/.*)?$/);
  if (!match) return pathname;
  return match[2] || "/";
}

export function getLocaleFromPathname(pathname: string): Locale | null {
  const match = pathname.match(/^\/(en|he)(\/|$)/);
  if (match) return match[1] as Locale;
  return null;
}

export function switchLocalePath(pathname: string, newLocale: Locale): string {
  const pathWithoutLocale = stripLocaleFromPathname(pathname);
  return localizedPath(newLocale, pathWithoutLocale);
}

/**
 * Paths served as static HTML (the v2 home pages, rewritten to public/v2 in
 * next.config.ts) rather than by the Next.js app router. Links to these must be
 * full-page navigations — see components/ui/SiteLink.tsx.
 */
const STATIC_PAGE_PATHS = new Set(["/en", "/he"]);

export function isStaticPagePath(href: string): boolean {
  if (!href.startsWith("/") || href.startsWith("//")) return false;
  const path = href.split(/[?#]/)[0].replace(/\/+$/, "") || "/";
  return STATIC_PAGE_PATHS.has(path);
}
