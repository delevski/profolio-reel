import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "@/components/ui/SiteLink";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { MdxContent } from "@/lib/mdx";
import { getCaseStudies, getCaseStudy } from "@/lib/content";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localizedPath } from "@/lib/i18n/navigation";
import { isRtl, type Locale } from "@/lib/i18n/config";
import { formatDate, formatReadTime } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export const dynamicParams = true;
export const revalidate = 300;

export async function generateStaticParams() {
  const studies = getCaseStudies();
  return ["en", "he"].flatMap((locale) =>
    studies.map((study) => ({ locale, slug: study.slug }))
  );
}

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const study = getCaseStudy(slug, locale);
  if (!study) return { title: "Case Study Not Found" };
  return { title: study.title, description: study.excerpt };
}

export default async function CaseStudyPage({ params }: Props) {
  const { locale, slug } = await params;
  const study = getCaseStudy(slug, locale);
  if (!study) notFound();

  const dict = getDictionary(locale);
  const rtl = isRtl(locale);
  const BackArrow = rtl ? ArrowRight : ArrowLeft;

  return (
    <article
      dir={rtl ? "rtl" : "ltr"}
      className={cn(
        "mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8",
        rtl && "text-right"
      )}
    >
      <Link
        href={localizedPath(locale, "/case-studies")}
        className={cn(
          "mb-8 inline-flex items-center gap-2 text-sm text-text-muted hover:text-accent",
          rtl && "flex-row-reverse"
        )}
      >
        <BackArrow className="h-4 w-4" />
        {dict.pages.caseStudies.back}
      </Link>
      <div className={cn("mb-6 flex flex-wrap gap-2", rtl && "justify-end")}>
        {study.tags.map((tag) => (
          <Badge key={tag} variant="accent">
            {tag}
          </Badge>
        ))}
        <Badge>{study.lang}</Badge>
      </div>
      <h1 className="mb-4 text-4xl text-text md:text-5xl">
        {study.title}
      </h1>
      <p className="mb-8 text-text-muted">
        {formatDate(study.date, locale)} · {formatReadTime(study.readTime, locale)}
      </p>
      {study.imageUrl && (
        <div className="relative mb-10 aspect-[16/9] w-full overflow-hidden rounded-2xl border border-surface-border">
          <Image
            src={study.imageUrl}
            alt={study.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
            priority
          />
        </div>
      )}
      <MdxContent source={study.content} />
    </article>
  );
}
