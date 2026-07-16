import { PageHeader } from "@/components/ui/PageHeader";
import { ContentCard } from "@/components/ui/Card";
import { getLearnGuides } from "@/lib/content";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localizedPath } from "@/lib/i18n/navigation";
import { isRtl, type Locale } from "@/lib/i18n/config";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const dict = getDictionary(locale);
  return { title: dict.nav.learn };
}

export default async function LearnPage({ params }: Props) {
  const { locale } = await params;
  const guides = getLearnGuides(locale);
  const dict = getDictionary(locale);
  const p = dict.pages.learn;
  const rtl = isRtl(locale);

  return (
    <>
      <PageHeader label={p.label} title={p.title} subtitle={p.subtitle} isRtl={rtl} />
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {guides.map((guide) => (
            <ContentCard
              key={guide.slug}
              href={localizedPath(locale, `/learn/${guide.slug}`)}
              title={guide.title}
              excerpt={guide.excerpt}
              tags={guide.tags}
              isNew={guide.isNew}
              emoji={guide.emoji}
              difficulty={guide.difficulty}
              meta={`${guide.category} · ${guide.readTime}`}
              newLabel={dict.common.new}
              isRtl={rtl}
            />
          ))}
        </div>
      </div>
    </>
  );
}
