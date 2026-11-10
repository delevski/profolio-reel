import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatMinutes } from "./reading-time";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "5 min" / "4 min read" → "5 דקות קריאה" in Hebrew; unchanged otherwise. */
export function formatReadTime(readTime: string, locale = "en") {
  if (locale !== "he") return readTime;
  const m = readTime.match(/^(\d+)\s*min(?:ute)?s?(?:\s+read)?$/i);
  if (!m) return readTime;
  return formatMinutes(Number(m[1]), "he");
}

const HE_TAGS: Record<string, string> = {
  "AI Trend Digest": "סיכום טרנדים ב-AI",
  "AI Agents": "סוכני AI",
  Research: "מחקר",
  Architecture: "ארכיטקטורה",
};

/** Hebrew label for known blog tags (EN tags stay as written in English). */
export function formatTag(tag: string, locale = "en") {
  return locale === "he" ? HE_TAGS[tag] ?? tag : tag;
}

export function formatDate(dateStr: string, locale = "en") {
  return new Date(dateStr).toLocaleDateString(locale === "he" ? "he-IL" : "en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
