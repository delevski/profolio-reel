import { PageHeader } from "@/components/ui/PageHeader";
import { ContactForm } from "@/components/contact/ContactForm";
import { getSiteConfig } from "@/lib/content";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { isRtl, type Locale } from "@/lib/i18n/config";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const dict = getDictionary(locale);
  return { title: dict.nav.contact };
}

export default async function ContactPage({ params }: Props) {
  const { locale } = await params;
  const site = getSiteConfig(locale);
  const dict = getDictionary(locale);
  const p = dict.pages.contact;

  return (
    <>
      <PageHeader label={p.label} title={p.title} subtitle={p.subtitle} isRtl={isRtl(locale)} />
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <ContactForm
          social={site.social}
          contact={site.contact}
          labels={p}
          isRtl={isRtl(locale)}
        />
      </div>
    </>
  );
}
