import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateStr: string, locale = "en") {
  return new Date(dateStr).toLocaleDateString(locale === "he" ? "he-IL" : "en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
