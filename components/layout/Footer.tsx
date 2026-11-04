import Link from "next/link";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localizedPath, switchLocalePath } from "@/lib/i18n/navigation";
import { BrandMark } from "@/components/layout/BrandMark";
import type { Locale } from "@/lib/i18n/config";

/** Site footer — v2 look (brand · tagline · meta) plus the inner-page links. */
export function Footer({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const year = new Date().getFullYear();
  const he = locale === "he";

  const links = [
    { href: "/projects", label: dict.nav.projects },
    { href: "/blog", label: dict.nav.blog },
    { href: "/learn", label: dict.footer.tutorials },
    { href: "/academy", label: dict.nav.academy },
    { href: "/apps", label: dict.nav.apps },
    { href: "/about", label: dict.nav.about },
    { href: "/contact", label: dict.nav.contact },
    { href: "/reel", label: he ? "רִיל" : "Reel" },
    { href: "/privacy", label: dict.footer.privacy },
  ];

  return (
    <footer className="site-foot">
      <div className="wrap">
        <div className="foot-row">
          <Link className="brand" href={localizedPath(locale, "/")} aria-label="ORDEL — Or Delevski">
            <BrandMark />
          </Link>
          <p className="foot-tag">{dict.footer.tagline}</p>
          <p className="foot-meta">
            © {year} ORDEL · {he ? "רמת גן, ישראל" : "Ramat-Gan, Israel"} ·{" "}
            <Link href={switchLocalePath(`/${locale}`, he ? "en" : "he")} lang={he ? "en" : "he"}>
              {he ? "English" : "עברית"}
            </Link>
          </p>
        </div>
        <nav className="foot-links" aria-label={dict.footer.site}>
          {links.map((l) => (
            <Link key={l.href} href={localizedPath(locale, l.href)}>
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
