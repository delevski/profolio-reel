"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";
import { localizedPath } from "@/lib/i18n/navigation";
import { useLocale } from "@/components/providers/LocaleProvider";
import { LocaleSwitcher } from "@/components/layout/LocaleSwitcher";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { cn } from "@/lib/utils";

export function Header() {
  const { locale, dict, isRtl } = useLocale();
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { href: "/about", label: dict.nav.about },
    { href: "/blog", label: dict.nav.blog },
    { href: "/learn", label: dict.nav.learn },
    { href: "/academy", label: dict.nav.academy },
    { href: "/projects", label: dict.nav.projects },
    { href: "/apps", label: dict.nav.apps },
    { href: "/contact", label: dict.nav.contact },
  ];

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-surface-border bg-bg/90 backdrop-blur-xl"
          : "bg-bg/40 backdrop-blur-md"
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        <Link
          href={localizedPath(locale, "/")}
          className="flex items-center gap-2"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent font-bold text-bg">
            O
          </span>
          <span className="font-serif text-xl tracking-tight text-text">ORDEL</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((link) => {
            const href = localizedPath(locale, link.href);
            const active = pathname === href;
            return (
              <Link
                key={link.href}
                href={href}
                className={cn(
                  "rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-surface text-accent"
                    : "text-text-muted hover:text-text"
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <ThemeToggle />
          <LocaleSwitcher locale={locale} />
        </nav>

        <div className="flex items-center gap-2 lg:hidden">
          <ThemeToggle />
          <LocaleSwitcher locale={locale} />
          <button
            type="button"
            className="flex min-h-11 min-w-11 items-center justify-center rounded-lg text-text"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-expanded={mobileOpen}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <nav
          className="border-t border-surface-border bg-bg px-4 py-4 lg:hidden"
          dir={isRtl ? "rtl" : "ltr"}
        >
          {navItems.map((link) => {
            const href = localizedPath(locale, link.href);
            return (
              <Link
                key={link.href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "block rounded-lg px-3 py-3 text-sm",
                  pathname === href ? "text-accent" : "text-text-muted"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      )}
    </header>
  );
}
