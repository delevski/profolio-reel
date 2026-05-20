import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { ExperienceSection } from "@/components/sections/ExperienceSection";
import { getSiteConfig } from "@/lib/content";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { isRtl, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const dict = getDictionary(locale);
  return { title: dict.nav.about };
}

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  const site = getSiteConfig(locale);
  const dict = getDictionary(locale);
  const p = dict.pages.about;
  const rtl = isRtl(locale);

  return (
    <>
      <PageHeader
        label={p.label}
        title={p.title.replace("{name}", site.name)}
        subtitle={site.subtitle}
        isRtl={rtl}
      />
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        <div className={cn("mb-8 flex", rtl ? "justify-end" : "justify-start")}>
          <Button href={site.cv.href} download={site.cv.filename}>
            {p.downloadCv}
          </Button>
        </div>

        {site.about.bio.map((paragraph, i) => (
          <p
            key={i}
            className={cn(
              "mb-6 text-lg leading-relaxed text-text-muted",
              rtl && "text-right"
            )}
          >
            {paragraph}
          </p>
        ))}

        <div className="mt-12 grid gap-8 sm:grid-cols-3">
          {site.about.highlights.map((item) => (
            <div
              key={item.title}
              className={cn(
                "rounded-2xl border border-surface-border bg-surface/90 backdrop-blur-md p-6",
                rtl && "text-right"
              )}
            >
              <h3 className="mb-2 font-serif text-xl text-text">{item.title}</h3>
              <p className="text-sm text-text-muted">{item.description}</p>
            </div>
          ))}
        </div>

        <section className="mt-16">
          <h2
            className={cn(
              "mb-6 font-serif text-2xl text-text",
              rtl && "text-right"
            )}
          >
            {p.personalInfo}
          </h2>
          <dl
            className={cn(
              "grid gap-4 rounded-2xl border border-surface-border bg-surface/90 p-6 backdrop-blur-md sm:grid-cols-2",
              rtl && "text-right"
            )}
          >
            <div>
              <dt className="text-sm text-text-muted">{p.email}</dt>
              <dd>
                <a
                  href={`mailto:${site.contact.email}`}
                  className="text-accent-2 hover:text-accent"
                >
                  {site.contact.email}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-text-muted">{p.phone}</dt>
              <dd>
                <a
                  href={`tel:${site.contact.phone.replace(/\s/g, "")}`}
                  className="text-accent-2 hover:text-accent"
                >
                  {site.contact.phone}
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-sm text-text-muted">{p.location}</dt>
              <dd className="text-text">{site.contact.location}</dd>
            </div>
            {site.contact.birthDate && (
              <div>
                <dt className="text-sm text-text-muted">{p.birthDate}</dt>
                <dd className="text-text">{site.contact.birthDate}</dd>
              </div>
            )}
          </dl>
        </section>

        <ExperienceSection
          experience={site.experience}
          title={p.experience}
          isRtl={rtl}
        />
      </div>
    </>
  );
}
