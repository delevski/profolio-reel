export const locales = ["en", "he"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export function isRtl(locale: Locale): boolean {
  return locale === "he";
}

export function isValidLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}
