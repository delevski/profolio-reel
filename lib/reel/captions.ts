import type { Locale } from "@/lib/i18n/config";

export const REEL_CAPTIONS_EN = [
  "Turning Ideas Into Digital Products",
  "AI-Powered Development",
  "Full-Stack Web Development",
  "Vibe Coding",
  "AI Agents",
  "Business Automation",
  "Smart Workflows",
  "API Integrations",
  "WhatsApp & Email Automation",
  "Cloud & Scalable Architecture",
  "Modern AI Tools",
  "From Prompt to Production",
  "Faster Development",
  "Smarter Business",
  "Better Customer Experience",
  "Your Vision. Powered by AI.",
] as const;

export const REEL_CAPTIONS_HE = [
  "הופכים רעיונות למוצרים דיגיטליים",
  "פיתוח באמצעות בינה מלאכותית",
  "פיתוח Full-Stack",
  "Vibe Coding",
  "סוכני AI",
  "אוטומציה עסקית",
  "תהליכי עבודה חכמים",
  "אינטגרציות API",
  "אוטומציית WhatsApp ואימייל",
  "ענן וארכיטקטורה מדרגית",
  "כלי AI מודרניים",
  "מפרומפט לפרודקשן",
  "פיתוח מהיר יותר",
  "עסק חכם יותר",
  "חוויית לקוח טובה יותר",
  "החזון שלך. באמצעות בינה מלאכותית.",
] as const;

export function reelCaptions(locale: Locale): readonly string[] {
  return locale === "he" ? REEL_CAPTIONS_HE : REEL_CAPTIONS_EN;
}

export type CaptionStyle = {
  opacity: number;
  translateY: number;
  blur: number;
};

/** Soft envelope: fade/slide in → hold → fade/slide out per caption along 0..1 progress. */
export function captionStyle(
  progress: number,
  index: number,
  total: number,
): CaptionStyle {
  const slot = 1 / total;
  const start = index * slot;
  const end = start + slot;
  const fade = slot * 0.28;
  const holdStart = start + fade;
  const holdEnd = end - fade;

  if (progress < start || progress > end) {
    return { opacity: 0, translateY: progress < start ? 28 : -28, blur: 8 };
  }

  if (progress < holdStart) {
    const t = (progress - start) / fade;
    const e = 1 - Math.pow(1 - t, 3);
    return { opacity: e, translateY: 28 * (1 - e), blur: 8 * (1 - e) };
  }

  if (progress > holdEnd) {
    const t = (progress - holdEnd) / fade;
    const e = Math.pow(t, 2);
    return { opacity: 1 - e, translateY: -28 * e, blur: 8 * e };
  }

  return { opacity: 1, translateY: 0, blur: 0 };
}
