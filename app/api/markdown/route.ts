import { NextRequest, NextResponse } from "next/server";
import { getSiteConfig, getProjects, getApps, getCourses, getBlogPosts, getBlogPost, getLearnGuides, getLearnGuide } from "@/lib/content";
import { reelCaptions } from "@/lib/reel/captions";
import { siteUrl } from "@/lib/agent/readiness";
import type { Locale } from "@/lib/i18n/config";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.searchParams.get("path") ?? "/";
  const segments = pathname.split("/").filter(Boolean);
  const locale: Locale = segments[0] === "he" ? "he" : "en";
  if (segments[0] === "he" || segments[0] === "en") segments.shift();
  const route = segments.join("/");
  const site = getSiteConfig(locale);
  const link = (label: string, path: string) => `[${label}](${siteUrl}/${locale}${path})`;
  const contact = `## ${locale === "he" ? "יצירת קשר" : "Contact"}\n\n${site.contact.email}\n\n${site.contact.phone}\n\n${site.contact.location}\n\n${link("Contact page", "/contact")}`;
  let body: string | undefined;
  if (!route || route === "about") {
    body = `# ${site.name}\n\n> ${site.subtitle}\n\n${site.about.bio.join("\n\n")}\n\n## Experience\n\n${site.experience.map((e) => `### ${e.title} - ${e.company}\n\n${e.period}\n\n${e.bullets.map((b) => `- ${b}`).join("\n")}`).join("\n\n")}\n\n## Pages\n\n${["reel", "projects", "apps", "blog", "learn", "academy", "contact"].map((p) => `- ${link(p, `/${p}`)}`).join("\n")}\n\n${contact}`;
  } else if (route === "reel") {
    body = `# ${site.brand} - ${locale === "he" ? "ריל" : "Reel"}\n\n> ${locale === "he" ? "הופכים רעיונות למוצרים דיגיטליים" : "Turning ideas into digital products"}\n\n${reelCaptions(locale).map((c) => `- ${c}`).join("\n")}\n\n${contact}`;
  } else if (route === "contact") body = `# ${site.name}\n\n${contact}`;
  else if (route === "projects") body = `# Projects\n\n${getProjects(locale).map((p) => `## ${p.name}\n\n${p.description}\n\n${p.stack.join(", ")}\n\n${p.href ? `[Source](${p.href})` : ""}`).join("\n\n")}`;
  else if (route === "apps") body = `# Apps\n\n${getApps(locale).map((a) => `## ${a.name}\n\n${a.tagline}\n\n${a.description}\n\n[Visit](${a.href})`).join("\n\n")}`;
  else if (route === "academy") body = `# Academy\n\n${getCourses(locale).map((c) => `## ${c.title}\n\n${c.description}\n\n[Course](${c.href})`).join("\n\n")}`;
  else if (route === "blog" || route === "learn") {
    const docs = route === "blog" ? await getBlogPosts(locale) : getLearnGuides(locale);
    body = `# ${route === "blog" ? "Blog" : "Learning guides"}\n\n${docs.map((d) => `- ${link(d.title, `/${route}/${d.slug}`)}: ${d.excerpt}`).join("\n")}`;
  } else if (segments.length === 2 && ["blog", "learn"].includes(segments[0])) {
    const doc = segments[0] === "blog" ? await getBlogPost(segments[1], locale) : getLearnGuide(segments[1], locale);
    if (doc) body = `# ${doc.title}\n\n${doc.excerpt}\n\n${doc.content}`;
  } else if (route === "privacy") {
    // Keep the HTML privacy policy authoritative rather than inventing a summary.
    body = `# Privacy policy\n\nRead the site's published ${link("privacy policy", "/privacy")} for privacy and data handling details.`;
  }
  const status = body ? 200 : 404;
  body ??= `# 404 - Page not found\n\nThe requested page does not exist on Or Delevski's website. Find available pages in the [site guide](${siteUrl}/llms.txt) or [sitemap](${siteUrl}/sitemap.xml).`;
  return new NextResponse(`${body}\n`, { status, headers: {
    "Content-Type": "text/markdown; charset=utf-8", "Vary": "Accept",
    "Cache-Control": "private, no-store", "Content-Language": locale,
    "Link": `</llms.txt>; rel="describedby"`,
  } });
}
