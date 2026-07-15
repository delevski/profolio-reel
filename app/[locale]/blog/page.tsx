import { PageHeader } from "@/components/ui/PageHeader";
import { ContentCard } from "@/components/ui/Card";
import { getBlogPosts } from "@/lib/content";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localizedPath } from "@/lib/i18n/navigation";
import { isRtl, type Locale } from "@/lib/i18n/config";
import { formatDate } from "@/lib/utils";

type Props = { params: Promise<{ locale: Locale }> };

export const revalidate = 300;

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const dict = getDictionary(locale);
  return { title: dict.nav.blog };
}

export default async function BlogPage({ params }: Props) {
  const { locale } = await params;
  const posts = await getBlogPosts();
  const dict = getDictionary(locale);
  const p = dict.pages.blog;
  const rtl = isRtl(locale);

  return (
    <>
      <PageHeader label={p.label} title={p.title} subtitle={p.subtitle} isRtl={rtl} />
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <ContentCard
              key={post.slug}
              href={localizedPath(locale, `/blog/${post.slug}`)}
              title={post.title}
              excerpt={post.excerpt}
              tags={post.tags}
              lang={post.lang}
              imageUrl={post.imageUrl}
              meta={`${formatDate(post.date, locale)} · ${post.readTime}`}
              isRtl={rtl}
            />
          ))}
        </div>
      </div>
    </>
  );
}
