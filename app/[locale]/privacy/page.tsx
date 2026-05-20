import { PageHeader } from "@/components/ui/PageHeader";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { isRtl, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const dict = getDictionary(locale);
  return { title: dict.footer.privacy };
}

export default async function PrivacyPage({ params }: Props) {
  const { locale } = await params;
  const dict = getDictionary(locale);
  const p = dict.pages.privacy;
  const rtl = isRtl(locale);

  return (
    <>
      <PageHeader label={p.label} title={p.title} isRtl={rtl} />
      <div className={cn("mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8", rtl && "text-right")}>
        <p className="mb-4 text-text-muted">{p.p1}</p>
        <p className="text-text-muted">{p.p2}</p>
      </div>
    </>
  );
}
