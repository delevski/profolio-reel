import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localeAlternates, localizedPath } from "@/lib/i18n/navigation";
import { isRtl, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const dict = getDictionary(locale);
  return {
    title: dict.pages.services.title,
    description: dict.pages.services.metaDescription,
    alternates: localeAlternates(locale, "/services"),
  };
}

export default async function ServicesPage({ params }: Props) {
  const { locale } = await params;
  const dict = getDictionary(locale);
  const p = dict.pages.services;
  const rtl = isRtl(locale);

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: p.faq.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: { "@type": "Answer", text: item.a },
    })),
  };

  return (
    <>
      <PageHeader label={p.label} title={p.title} subtitle={p.subtitle} isRtl={rtl} />
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        {p.intro.map((paragraph, i) => (
          <p
            key={i}
            className={cn("mb-6 text-lg leading-relaxed text-text-muted", rtl && "text-right")}
          >
            {paragraph}
          </p>
        ))}

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {p.services.map((item) => (
            <div key={item.title} className={cn("v2-panel p-6", rtl && "text-right")}>
              <h2 className="mb-2 text-xl text-text">{item.title}</h2>
              <p className="text-sm leading-relaxed text-text-muted">{item.text}</p>
            </div>
          ))}
        </div>

        <section className="mt-16">
          <h2 className={cn("mb-6 text-2xl text-text", rtl && "text-right")}>{p.processTitle}</h2>
          <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {p.steps.map((step, i) => (
              <li key={step.title} className={cn("v2-panel p-6", rtl && "text-right")}>
                <p className="mb-2 text-sm text-text-muted">{i + 1}</p>
                <h3 className="mb-2 text-lg text-text">{step.title}</h3>
                <p className="text-sm leading-relaxed text-text-muted">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-16">
          <h2 className={cn("mb-6 text-2xl text-text", rtl && "text-right")}>{p.faqTitle}</h2>
          <div className="space-y-6">
            {p.faq.map((item) => (
              <div key={item.q} className={cn(rtl && "text-right")}>
                <h3 className="mb-2 text-lg text-text">{item.q}</h3>
                <p className="leading-relaxed text-text-muted">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className={cn("mt-16 v2-panel p-8", rtl && "text-right")}>
          <h2 className="mb-3 text-2xl text-text">{p.ctaTitle}</h2>
          <p className="mb-6 leading-relaxed text-text-muted">{p.ctaText}</p>
          <div className={cn("flex flex-wrap gap-4", rtl && "justify-end")}>
            <Button href="https://wa.me/972547917154" external>
              {p.ctaWhatsapp}
            </Button>
            <Button href={localizedPath(locale, "/contact")} variant="secondary">
              {p.ctaContact}
            </Button>
          </div>
        </section>
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
    </>
  );
}
