import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { MdxContent } from "@/lib/mdx";
import { getLearnGuide, getLearnGuides } from "@/lib/content";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localizedPath } from "@/lib/i18n/navigation";
import { isRtl, type Locale } from "@/lib/i18n/config";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export async function generateStaticParams() {
  const guides = getLearnGuides();
  return ["en", "he"].flatMap((locale) =>
    guides.map((guide) => ({ locale, slug: guide.slug }))
  );
}

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const guide = getLearnGuide(slug, locale);
  if (!guide) return { title: "Guide Not Found" };
  return { title: guide.title, description: guide.excerpt };
}

export default async function LearnGuidePage({ params }: Props) {
  const { locale, slug } = await params;
  const guide = getLearnGuide(slug, locale);
  if (!guide) notFound();

  const dict = getDictionary(locale);
  const rtl = isRtl(locale);
  const BackArrow = rtl ? ArrowRight : ArrowLeft;

  return (
    <article
      className={cn(
        "mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8",
        rtl && "text-right"
      )}
    >
      <Link
        href={localizedPath(locale, "/learn")}
        className={cn(
          "mb-8 inline-flex items-center gap-2 text-sm text-text-muted hover:text-accent",
          rtl && "flex-row-reverse"
        )}
      >
        <BackArrow className="h-4 w-4" />
        {dict.pages.learn.back}
      </Link>
      <div className={cn("mb-6 flex flex-wrap items-center gap-2", rtl && "justify-end")}>
        {guide.emoji && <span className="text-3xl">{guide.emoji}</span>}
        {guide.isNew && <Badge variant="new">{dict.common.new}</Badge>}
        {guide.difficulty && <Badge>{guide.difficulty}</Badge>}
        {guide.category && <Badge variant="accent">{guide.category}</Badge>}
      </div>
      <h1 className="mb-4 font-serif text-4xl text-text md:text-5xl">
        {guide.title}
      </h1>
      <p className="mb-10 text-text-muted">
        {guide.readTime} {dict.pages.learn.read}
      </p>
      <MdxContent source={guide.content} />
    </article>
  );
}
