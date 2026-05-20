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
