import { THEME_STORAGE_KEY } from "@/lib/constants";

export type Theme = "dark" | "light";

export function applyTheme(theme: Theme): void {
  if (typeof document === "undefined") return;
  // Same attribute contract as the v2 home page (public/v2/theme.js)
  document.documentElement.setAttribute("data-theme", theme);
}

export function getStoredTheme(): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  } catch {
    /* ignore */
  }
  return null;
}

export function persistTheme(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    /* ignore */
  }
}
