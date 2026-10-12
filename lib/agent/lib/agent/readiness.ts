import site from "@/content/site.en.json";

export const siteUrl = "https://ordelwebsite.vercel.app";

/** Exact media ranges override wildcards; ties keep the browser's HTML default. */
export function preferredFormat(accept: string | null): "html" | "markdown" | "none" {
  if (!accept) return "html";
  const ranges = accept.toLowerCase().split(",").map((part) => {
    const [type, ...params] = part.trim().split(";");
    const qParam = params.find((p) => p.trim().startsWith("q="));
    const q = qParam ? Number(qParam.trim().slice(2)) : 1;
    return { type, q: Number.isFinite(q) && q >= 0 && q <= 1 ? q : 0 };
  });
  function quality(type: string) {
    for (const match of [type, "text/*", "*/*"]) {
      const found = ranges.filter((r) => r.type === match);
      if (found.length) return Math.max(...found.map((r) => r.q));
    }
    return 0;
  }
  const html = quality("text/html"), markdown = quality("text/markdown");
  return markdown > html ? "markdown" : html > 0 ? "html" : "none";
}

export const identity = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Person", "@id": `${siteUrl}/#person`, name: site.name,
      description: site.about.bio[0], url: `${siteUrl}/en`, jobTitle: site.subtitle,
      sameAs: site.social.map((s) => s.href),
      worksFor: { "@id": `${siteUrl}/#organization` },
    },
    {
      "@type": "Organization", "@id": `${siteUrl}/#organization`, name: site.brand,
      description: "AI-powered development, full-stack web development, AI agents and business automation by Or Delevski.",
      url: siteUrl, founder: { "@id": `${siteUrl}/#person` },
      contactPoint: {
        "@type": "ContactPoint", contactType: "business inquiries",
        email: site.contact.email, telephone: site.contact.phone,
        url: `${siteUrl}/en/contact`, availableLanguage: ["English", "Hebrew"],
      },
      // Only the city and country already published on the contact page.
      address: { "@type": "PostalAddress", addressLocality: "Ramat-Gan", addressCountry: "IL" },
    },
  ],
};

export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
