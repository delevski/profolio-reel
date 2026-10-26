import { PageHeader } from "@/components/ui/PageHeader";
import { isRtl, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";
import { hermesContent } from "../content";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return { title: hermesContent[locale].privacyTitle };
}

export default async function HermesPrivacyPage({ params }: Props) {
  const { locale } = await params;
  const c = hermesContent[locale];
  const rtl = isRtl(locale);

  return (
    <>
      <PageHeader label={c.privacyLabel} title={c.privacyTitle} isRtl={rtl} />
      <div className={cn("mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8", rtl && "text-right")}>
        {c.privacyBody.map((line) => (
          <p key={line} className="mb-4 text-text-muted">
            {line}
          </p>
        ))}
      </div>
    </>
  );
}
