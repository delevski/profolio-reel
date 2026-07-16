import { Section } from "@/components/ui/Section";
import { ContentCard } from "@/components/ui/Card";
import { getLearnGuides } from "@/lib/content";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localizedPath } from "@/lib/i18n/navigation";
import { isRtl, type Locale } from "@/lib/i18n/config";

export function LearnPreview({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const guides = getLearnGuides(locale).slice(0, 3);
  const s = dict.sections.learn;

  return (
    <Section
      id="learn"
      label={s.label}
      title={s.title}
      subtitle={s.subtitle}
      action={{ label: s.action, href: localizedPath(locale, "/learn") }}
      isRtl={isRtl(locale)}
    >
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
            isRtl={isRtl(locale)}
          />
        ))}
      </div>
    </Section>
  );
}
