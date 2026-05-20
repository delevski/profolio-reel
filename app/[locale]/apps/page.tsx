import { PageHeader } from "@/components/ui/PageHeader";
import { AppCard } from "@/components/ui/Card";
import { getApps } from "@/lib/content";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { isRtl, type Locale } from "@/lib/i18n/config";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const dict = getDictionary(locale);
  return { title: dict.nav.apps };
}

export default async function AppsPage({ params }: Props) {
  const { locale } = await params;
  const apps = getApps();
  const dict = getDictionary(locale);
  const p = dict.pages.apps;
  const rtl = isRtl(locale);

  return (
    <>
      <PageHeader label={p.label} title={p.title} subtitle={p.subtitle} isRtl={rtl} />
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {apps.map((app) => (
            <AppCard
              key={app.slug}
              {...app}
              visitLabel={dict.sections.apps.visit}
              isRtl={rtl}
            />
          ))}
        </div>
      </div>
    </>
  );
}
