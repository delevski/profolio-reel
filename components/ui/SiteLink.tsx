import Link from "next/link";
import type { ComponentProps } from "react";
import { isStaticPagePath } from "@/lib/i18n/navigation";

type Props = ComponentProps<typeof Link>;

/**
 * Drop-in replacement for next/link.
 *
 * The /en and /he home pages are the v2 static design (public/v2), served by a
 * rewrite in next.config.ts — they are not part of the Next.js app router. A
 * client-side <Link> navigation to them asks the router for an RSC payload; on
 * Vercel that request resolves to /v2/index.html.rsc, falls through to
 * app/[locale]/[...rest] and renders the 404 page under the /en URL.
 *
 * So links to those static pages render a plain <a> (a normal full-page load);
 * every other href keeps the client-side <Link> behaviour.
 */
export default function SiteLink(props: Props) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { href, prefetch: _prefetch, replace: _replace, scroll: _scroll, shallow: _shallow, legacyBehavior: _legacy, passHref: _passHref, locale: _locale, onNavigate: _onNavigate, ...rest } = props;
  if (typeof href === "string" && isStaticPagePath(href)) {
    return <a href={href} {...rest} />;
  }
  return <Link {...props} />;
}
