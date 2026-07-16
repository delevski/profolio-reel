import { Section } from "@/components/ui/Section";
import { AppCard } from "@/components/ui/Card";
import { getApps } from "@/lib/content";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localizedPath } from "@/lib/i18n/navigation";
import { isRtl, type Locale } from "@/lib/i18n/config";

export function AppsPreview({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const apps = getApps(locale);
  const s = dict.sections.apps;

  return (
    <Section
      id="apps"
      label={s.label}
      title={s.title}
      subtitle={s.subtitle}
      action={{ label: s.action, href: localizedPath(locale, "/apps") }}
      isRtl={isRtl(locale)}
    >
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {apps.map((app) => (
          <AppCard key={app.slug} {...app} visitLabel={s.visit} isRtl={isRtl(locale)} />
        ))}
      </div>
    </Section>
  );
}
