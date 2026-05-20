"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { getLocaleFromPathname } from "@/lib/i18n/navigation";
import { isRtl } from "@/lib/i18n/config";

export function SetHtmlLangDir() {
  const pathname = usePathname();

  useEffect(() => {
    const locale = getLocaleFromPathname(pathname) ?? "en";
    document.documentElement.lang = locale;
    document.documentElement.dir = isRtl(locale) ? "rtl" : "ltr";
  }, [pathname]);

  return null;
}
