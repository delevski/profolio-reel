import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "@/components/ui/SiteLink";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { renderArticle } from "@/lib/mdx";
import { getBlogPost, getMdxBlogPosts } from "@/lib/content";
import { getDigestForPost } from "@/lib/ai-trends";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localizedPath } from "@/lib/i18n/navigation";
import { isRtl, type Locale } from "@/lib/i18n/config";
import { formatDate, formatReadTime, formatTag } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { TableOfContents } from "@/components/blog/TableOfContents";
import { TrendCard, TrendComparison, type TrendCardLabels } from "@/components/blog/TrendCard";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ locale: Locale; slug: string }> };

export const dynamicParams = true;
export const revalidate = 300;

export async function generateStaticParams() {
  const posts = getMdxBlogPosts();
  return ["en", "he"].flatMap((locale) =>
    posts.map((post) => ({ locale, slug: post.slug }))
  );
}

export async function generateMetadata({ params }: Props) {
  const { locale, slug } = await params;
  const post = await getBlogPost(slug, locale);
  if (!post) return { title: "Post Not Found" };
  const images = post.imageUrl
    ? [{ url: post.imageUrl, width: 1200, height: 630, alt: post.imageAlt ?? post.title }]
    : undefined;
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: localizedPath(locale, `/blog/${post.slug}`) },
    openGraph: {
      type: "article",
      title: post.title,
      description: post.excerpt,
      publishedTime: post.date,
      locale: locale === "he" ? "he_IL" : "en_US",
      ...(images ? { images } : {}),
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: post.title,
      description: post.excerpt,
      ...(images ? { images: [post.imageUrl as string] } : {}),
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params;
  const post = await getBlogPost(slug, locale);
  if (!post) notFound();

  const dict = getDictionary(locale);
  const b = dict.pages.blog;
  const rtl = isRtl(locale);
  const BackArrow = rtl ? ArrowRight : ArrowLeft;
  const numberLocale = locale === "he" ? "he-IL" : "en-US";

  const { content, headings } = await renderArticle(post.content);

  const digest = getDigestForPost(post.slug, locale);
  const trendItem = digest
    ? digest.items.find((i) => i.href === digest.trendOfTheDay?.sourceHref) ??
      digest.items.find((i) => i.href === post.sourceHref)
    : undefined;
  const labels: TrendCardLabels = {
    trendOfDay: b.trendOfDay,
    stars: b.stars,
    likes: b.likes,
    language: b.language,
    type: b.type,
    downloads: b.downloads,
    project: b.project,
    source: b.source,
    github: b.github,
    huggingface: b.huggingface,
    open: b.open,
    alsoTrending: b.alsoTrending,
    comparison: b.comparison,
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.excerpt,
    datePublished: post.date,
    inLanguage: locale,
    ...(post.imageUrl ? { image: post.imageUrl } : {}),
    author: { "@type": "Person", name: "Or Delevski" },
  };

  return (
    <article className={cn("mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8", rtl && "text-right")}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <div className="mx-auto max-w-3xl lg:max-w-none">
        <Link
          href={localizedPath(locale, "/blog")}
          className="mb-8 inline-flex items-center gap-2 text-sm text-text-muted hover:text-accent"
        >
          <BackArrow className="h-4 w-4" />
          {b.back}
        </Link>
        <div className="mb-5 flex flex-wrap gap-2">
          {post.tags.map((tag) => (
            <Badge key={tag} variant="accent">
              {formatTag(tag, locale)}
            </Badge>
          ))}
          <Badge>{post.lang}</Badge>
        </div>
        <h1 className="mb-4 max-w-4xl text-4xl leading-tight text-text md:text-5xl">{post.title}</h1>
        <p className="mb-8 flex flex-wrap items-center gap-x-3 gap-y-1 text-text-muted">
          <time dateTime={post.date}>{formatDate(post.date, locale)}</time>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1.5">
            <Clock className="h-4 w-4" aria-hidden="true" />
            {formatReadTime(post.readTime, locale)}
          </span>
        </p>
        {post.imageUrl && (
          <div className="relative mb-10 aspect-[1200/630] w-full overflow-hidden rounded-2xl border border-surface-border bg-surface">
            <Image
              src={post.imageUrl}
              alt={post.imageAlt ?? post.title}
              fill
              className="object-cover"
              sizes="(max-width: 1152px) 100vw, 1152px"
              priority
            />
          </div>
        )}
      </div>

      <div className={cn("mx-auto max-w-3xl lg:max-w-none", headings.length >= 3 && "lg:grid lg:grid-cols-[minmax(0,1fr)_15rem] lg:items-start lg:gap-14")}>
        {headings.length >= 3 && (
          <div className="mb-8 lg:order-2 lg:mb-0">
            <TableOfContents headings={headings} label={b.toc} />
          </div>
        )}
        <div className="min-w-0 lg:order-1 lg:max-w-3xl">
          {trendItem && <TrendCard item={trendItem} labels={labels} numberLocale={numberLocale} rtl={rtl} />}
          {content}
          {digest && <TrendComparison digest={digest} labels={labels} numberLocale={numberLocale} rtl={rtl} />}
        </div>
      </div>
    </article>
  );
}
