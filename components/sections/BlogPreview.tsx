import { Section } from "@/components/ui/Section";
import { ContentCard } from "@/components/ui/Card";
import { getBlogPosts } from "@/lib/content";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localizedPath } from "@/lib/i18n/navigation";
import { isRtl, type Locale } from "@/lib/i18n/config";
import { formatDate, formatReadTime, formatTag } from "@/lib/utils";

export async function BlogPreview({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const posts = (await getBlogPosts(locale)).slice(0, 3);
  const s = dict.sections.blog;

  return (
    <Section
      id="blog"
      label={s.label}
      title={s.title}
      subtitle={s.subtitle}
      action={{ label: s.action, href: localizedPath(locale, "/blog") }}
      isRtl={isRtl(locale)}
    >
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <ContentCard
            key={post.slug}
            href={localizedPath(locale, `/blog/${post.slug}`)}
            title={post.title}
            excerpt={post.excerpt}
            tags={post.tags.map((t) => formatTag(t, locale))}
            lang={post.lang}
            imageUrl={post.imageUrl}
            imageAlt={post.imageAlt}
            meta={`${formatDate(post.date, locale)} · ${formatReadTime(post.readTime, locale)}`}
            isRtl={isRtl(locale)}
          />
        ))}
      </div>
    </Section>
  );
}
