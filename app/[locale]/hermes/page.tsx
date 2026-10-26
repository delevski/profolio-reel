import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { isRtl, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";
import { hermesContent } from "./content";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  return { title: hermesContent[locale].title };
}

export default async function HermesPage({ params }: Props) {
  const { locale } = await params;
  const c = hermesContent[locale];
  const rtl = isRtl(locale);

  return (
    <>
      <PageHeader label={c.label} title={c.title} isRtl={rtl} />
      <div className={cn("mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8", rtl && "text-right")}>
        <p className="mb-4 text-text-muted">{c.intro}</p>
        {c.body.map((line) => (
          <p key={line} className="mb-4 text-text-muted">
            {line}
          </p>
        ))}
        <p className="text-text-muted">
          <Link href={`/${locale}/hermes/privacy`} className="underline">
            {c.privacyLink}
          </Link>
        </p>
      </div>
    </>
  );
}
