import type { Locale } from "@/lib/i18n/config";

export const REEL_OPENING = {
  he: {
    eyebrow: "CTO · VP R&D",
    title: "אור דלבסקי",
    subtitle: "מנהל טכנולוגיה ופיתוח שבונה צוותים ומוצרים שמזיזים את השורה התחתונה",
    stats: [
      { value: "20+", label: "מהנדסים בהובלה" },
      { value: "$3M+", label: "חיסכון" },
      { value: "×2", label: "הכפלת הכנסות" },
    ],
  },
  en: {
    eyebrow: "CTO · VP R&D",
    title: "Or Delevski",
    subtitle: "Technology and R&D leader who builds teams and products that move the bottom line",
    stats: [
      { value: "20+", label: "engineers led" },
      { value: "$3M+", label: "in savings" },
      { value: "2×", label: "revenue doubled" },
    ],
  },
} as const;

export function reelOpeningCopy(locale: Locale) {
  return REEL_OPENING[locale] ?? REEL_OPENING.en;
}
