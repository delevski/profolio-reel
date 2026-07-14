import type { Locale } from "@/lib/i18n/config";

export const REEL_OPENING = {
  he: {
    title: "עולמו של אור דלבסקי",
    subtitle:
      "מנהל ומפתח בכיר בתחום הבינה המלאכותית, מתמחה באוטומציות, בניית אתרים, ניהול, תשתיות, אבטחה, מדיה והנפשות",
  },
  en: {
    title: "The World of Or Delevski",
    subtitle:
      "Senior AI manager and developer specializing in automation, web development, management, infrastructure, security, media, and animation",
  },
} as const;

export function reelOpeningCopy(locale: Locale) {
  return REEL_OPENING[locale] ?? REEL_OPENING.en;
}
