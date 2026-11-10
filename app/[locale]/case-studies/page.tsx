import { PageHeader } from "@/components/ui/PageHeader";
import { ContentCard } from "@/components/ui/Card";
import { getCaseStudies } from "@/lib/content";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localizedPath } from "@/lib/i18n/navigation";
import { isRtl, type Locale } from "@/lib/i18n/config";
import { formatDate, formatReadTime } from "@/lib/utils";

type Props = { params: Promise<{ locale: Locale }> };

export const revalidate = 300;

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const dict = getDictionary(locale);
  return {
    title: dict.nav.caseStudies,
    description: dict.pages.caseStudies.subtitle,
  };
}

export default async function CaseStudiesPage({ params }: Props) {
  const { locale } = await params;
  const studies = getCaseStudies(locale);
  const dict = getDictionary(locale);
  const p = dict.pages.caseStudies;
  const rtl = isRtl(locale);

  return (
    <>
      <PageHeader label={p.label} title={p.title} subtitle={p.subtitle} isRtl={rtl} />
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {studies.map((study) => (
            <ContentCard
              key={study.slug}
              href={localizedPath(locale, `/case-studies/${study.slug}`)}
              title={study.title}
              excerpt={study.excerpt}
              tags={study.tags}
              lang={study.lang}
              imageUrl={study.imageUrl}
              meta={`${formatDate(study.date, locale)} · ${formatReadTime(study.readTime, locale)}`}
              isRtl={rtl}
            />
          ))}
        </div>
      </div>
    </>
  );
}
