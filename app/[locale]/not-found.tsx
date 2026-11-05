"use client";

import { usePathname } from "next/navigation";
import Link from "@/components/ui/SiteLink";
import { Button } from "@/components/ui/Button";
import { getLocaleFromPathname } from "@/lib/i18n/navigation";

const copy = {
  en: {
    title: "Page not found",
    body: "This page does not exist in the selected language.",
    home: { href: "/en", label: "English home" },
    other: { href: "/he", label: "דף הבית בעברית", lang: "he" },
    contact: { href: "/en/contact", label: "Contact" },
  },
  he: {
    title: "הדף לא נמצא",
    body: "הדף הזה לא קיים בשפה שבחרת.",
    home: { href: "/he", label: "חזרה לדף הבית" },
    other: { href: "/en", label: "English home", lang: "en" },
    contact: { href: "/he/contact", label: "צור קשר" },
  },
} as const;

export default function LocaleNotFound() {
  const pathname = usePathname();
  const t = copy[getLocaleFromPathname(pathname ?? "") === "he" ? "he" : "en"];

  return (
    <main className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-sm uppercase tracking-widest text-accent">404</p>
      <h1 className="mt-4 text-3xl text-text md:text-4xl">{t.title}</h1>
      <p className="mt-3 max-w-md text-text-muted">{t.body}</p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Button href={t.home.href}>{t.home.label}</Button>
        <Button href={t.other.href} variant="secondary">
          <span lang={t.other.lang}>{t.other.label}</span>
        </Button>
      </div>
      <Link
        href={t.contact.href}
        className="mt-6 text-sm text-text-muted underline-offset-4 hover:text-accent hover:underline"
      >
        {t.contact.label}
      </Link>
    </main>
  );
}
