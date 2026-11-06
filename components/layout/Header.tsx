"use client";

import Link from "@/components/ui/SiteLink";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { localizedPath, switchLocalePath } from "@/lib/i18n/navigation";
import { useLocale } from "@/components/providers/LocaleProvider";
import { useTheme } from "@/components/providers/ThemeProvider";
import { BrandMark } from "@/components/layout/BrandMark";
import { CONTACT_WHATSAPP_URL } from "@/lib/constants";
import type { Locale } from "@/lib/i18n/config";

/** Site header — same markup/classes as the v2 static home (public/v2). */
export function Header() {
  const { locale, dict } = useLocale();
  const { toggleTheme } = useTheme();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = [
    { href: "/projects", label: dict.nav.projects },
    { href: "/case-studies", label: dict.nav.caseStudies },
    { href: "/blog", label: dict.nav.blog },
    { href: "/learn", label: dict.nav.learn },
    { href: "/academy", label: dict.nav.academy },
    { href: "/apps", label: dict.nav.apps },
    { href: "/about", label: dict.nav.about },
    { href: "/contact", label: dict.nav.contact },
  ];

  const other: Locale = locale === "en" ? "he" : "en";
  const otherHref = switchLocalePath(pathname || `/${locale}`, other);
  const ctaLabel = locale === "he" ? "בואו נדבר" : "Let’s talk";

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("menu-open", menuOpen);
    return () => document.documentElement.classList.remove("menu-open");
  }, [menuOpen]);

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMenuOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  return (
    <header className={`site-head${scrolled ? " scrolled" : ""}`} id="top">
      <nav className="nav" aria-label={locale === "he" ? "ראשי" : "Main"}>
        <Link className="brand" href={localizedPath(locale, "/")} aria-label="ORDEL — Or Delevski">
          <BrandMark />
        </Link>
        <div className="nav-links" id="navlinks">
          {navItems.map((item) => {
            const href = localizedPath(locale, item.href);
            const active = pathname === href || pathname?.startsWith(href + "/");
            return (
              <Link
                key={item.href}
                href={href}
                aria-current={active ? "page" : undefined}
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        <div className="nav-tools">
          <Link
            className="lang"
            href={otherHref}
            hrefLang={other}
            lang={other}
            onClick={() => {
              document.cookie = `NEXT_LOCALE=${other};path=/;max-age=31536000`;
            }}
          >
            {other === "he" ? "עברית" : "English"}
          </Link>
          <button
            className="icon-btn theme-toggle"
            type="button"
            aria-label={dict.theme.switchLabel}
            onClick={toggleTheme}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true" className="i-sun"><circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.8" /><path stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></svg>
            <svg viewBox="0 0 24 24" aria-hidden="true" className="i-moon"><path fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" /></svg>
          </button>
          <a className="btn btn-sm btn-primary nav-cta" href={CONTACT_WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
            {ctaLabel}
          </a>
          <button
            className="icon-btn menu-toggle"
            type="button"
            aria-label={locale === "he" ? "תפריט" : "Menu"}
            aria-expanded={menuOpen}
            aria-controls="navlinks"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span />
            <span />
          </button>
        </div>
      </nav>
    </header>
  );
}
