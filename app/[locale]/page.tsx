import { AgencyHome } from "@/components/sections/AgencyHome";
import type { Locale } from "@/lib/i18n/config";

type Props = { params: Promise<{ locale: Locale }> };

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  return <AgencyHome locale={locale} />;
}
