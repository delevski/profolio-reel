"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { switchLocalePath } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

export function LocaleSwitcher({ locale }: { locale: Locale }) {
  const pathname = usePathname();
  const other: Locale = locale === "en" ? "he" : "en";
  const href = switchLocalePath(pathname, other);
  const label = other === "he" ? "עברית" : "English";

  return (
    <Link
      href={href}
      className={cn(
        "rounded-lg px-3 py-2 text-sm transition-colors",
        "text-text-muted hover:text-text",
        locale === "he" ? "ms-0 me-2" : "ms-2"
      )}
      onClick={() => {
        document.cookie = `NEXT_LOCALE=${other};path=/;max-age=31536000`;
      }}
    >
      {label}
    </Link>
  );
}
