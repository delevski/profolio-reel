"use client";

import { Moon, Sun } from "lucide-react";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const { dict } = useLocale();
  const isLight = theme === "light";

  return (
    <button
      type="button"
      role="switch"
      aria-checked={isLight}
      aria-label={dict.theme.switchLabel}
      onClick={toggleTheme}
      className={cn(
        "relative inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg p-2",
        "text-text-muted transition-colors hover:text-text",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      )}
    >
      <span
        className={cn(
          "relative flex h-7 w-12 items-center rounded-full border border-surface-border bg-surface transition-colors",
          isLight && "border-accent/40 bg-accent/10"
        )}
      >
        <span
          className={cn(
            "absolute top-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-bg shadow-sm transition-[inset] duration-200",
            isLight ? "end-1" : "start-1"
          )}
        >
          {isLight ? (
            <Sun className="h-3 w-3" aria-hidden />
          ) : (
            <Moon className="h-3 w-3" aria-hidden />
          )}
        </span>
        <Sun
          className={cn(
            "pointer-events-none absolute start-1.5 h-3 w-3 opacity-40",
            isLight && "opacity-0"
          )}
          aria-hidden
        />
        <Moon
          className={cn(
            "pointer-events-none absolute end-1.5 h-3 w-3 opacity-40",
            !isLight && "opacity-0"
          )}
          aria-hidden
        />
      </span>
      <span className="sr-only">
        {isLight ? dict.theme.light : dict.theme.dark}
      </span>
    </button>
  );
}
