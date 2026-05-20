import Link from "next/link";
import { getSiteConfig } from "@/lib/content";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localizedPath } from "@/lib/i18n/navigation";
import type { Locale } from "@/lib/i18n/config";

export function Footer({ locale }: { locale: Locale }) {
  const site = getSiteConfig(locale);
  const dict = getDictionary(locale);
  const year = new Date().getFullYear();

  const siteLinks = [
    { href: "/about", label: dict.nav.about },
    { href: "/blog", label: dict.nav.blog },
    { href: "/projects", label: dict.nav.projects },
    { href: "/apps", label: dict.nav.apps },
    { href: "/contact", label: dict.nav.contact },
  ];

  const learnLinks = [
    { href: "/learn", label: dict.footer.tutorials },
    { href: "/academy", label: dict.nav.academy },
    { href: "#", label: dict.footer.faq },
    { href: "#", label: dict.footer.glossary },
  ];

  const moreLinks = [
    { href: "#", label: dict.footer.resources },
    { href: "#", label: dict.footer.media },
    { href: "/privacy", label: dict.footer.privacy },
  ];

  return (
    <footer className="border-t border-surface-border bg-bg/70 py-16 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-4">
          <div className="md:col-span-1">
            <Link
              href={localizedPath(locale, "/")}
              className="flex items-center gap-2"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent font-bold text-bg">
                O
              </span>
              <span className="font-serif text-xl text-text">{site.brand}</span>
            </Link>
            <p className="mt-3 text-sm text-text-muted">{dict.footer.tagline}</p>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text">
              {dict.footer.site}
            </h4>
            <ul className="space-y-2">
              {siteLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={localizedPath(locale, link.href)}
                    className="text-sm text-text-muted hover:text-accent-2"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text">
              {dict.footer.learn}
            </h4>
            <ul className="space-y-2">
              {learnLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href.startsWith("#") ? link.href : localizedPath(locale, link.href)}
                    className="text-sm text-text-muted hover:text-accent-2"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="mb-4 text-sm font-semibold uppercase tracking-wider text-text">
              {dict.footer.more}
            </h4>
            <ul className="space-y-2">
              {moreLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href.startsWith("#") ? link.href : localizedPath(locale, link.href)}
                    className="text-sm text-text-muted hover:text-accent-2"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-surface-border pt-8 sm:flex-row">
          <p className="text-sm text-text-muted">
            {dict.footer.madeBy} {site.name}
          </p>
          <p className="text-sm text-text-muted">
            © {year} {site.brand}. {dict.footer.rights}
          </p>
        </div>
      </div>
    </footer>
  );
}
