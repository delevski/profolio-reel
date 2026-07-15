import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { MdxContent } from "@/lib/mdx";
import { getBlogPost, getMdxBlogPosts } from "@/lib/content";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localizedPath } from "@/lib/i18n/navigation";
import { isRtl, type Locale } from "@/lib/i18n/config";
import { formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
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
  const { slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) return { title: "Post Not Found" };
  return { title: post.title, description: post.excerpt };
}

export default async function BlogPostPage({ params }: Props) {
  const { locale, slug } = await params;
  const post = await getBlogPost(slug);
  if (!post) notFound();

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
        href={localizedPath(locale, "/blog")}
        className={cn(
          "mb-8 inline-flex items-center gap-2 text-sm text-text-muted hover:text-accent",
          rtl && "flex-row-reverse"
        )}
      >
        <BackArrow className="h-4 w-4" />
        {dict.pages.blog.back}
      </Link>
      <div className={cn("mb-6 flex flex-wrap gap-2", rtl && "justify-end")}>
        {post.tags.map((tag) => (
          <Badge key={tag} variant="accent">
            {tag}
          </Badge>
        ))}
        <Badge>{post.lang}</Badge>
      </div>
      <h1 className="mb-4 font-serif text-4xl text-text md:text-5xl">
        {post.title}
      </h1>
      <p className="mb-8 text-text-muted">
        {formatDate(post.date, locale)} · {post.readTime}
      </p>
      {post.imageUrl && (
        <div className="relative mb-10 aspect-[16/9] w-full overflow-hidden rounded-2xl border border-surface-border">
          <Image
            src={post.imageUrl}
            alt={post.title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 768px"
            priority
          />
        </div>
      )}
      <MdxContent source={post.content} />
    </article>
  );
}
