import Link from "@/components/ui/SiteLink";
import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getTrendDigests } from "@/lib/ai-trends";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { isRtl, type Locale } from "@/lib/i18n/config";
import { localizedPath } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";
import type { TrendDigest } from "@/lib/types";

type Props = { params: Promise<{ locale: Locale }> };

/** Days shown open; older ones fold into an "Earlier days" section. */
const OPEN_DAYS = 7;

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const dict = getDictionary(locale);
  return {
    title: dict.pages.aiTrends.title,
    description: dict.pages.aiTrends.subtitle,
  };
}

function formatDay(date: string, locale: Locale) {
  return new Date(`${date}T12:00:00Z`).toLocaleDateString(
    locale === "he" ? "he-IL" : "en-US",
    { weekday: "long", month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }
  );
}

function DayDigest({ digest, locale }: { digest: TrendDigest; locale: Locale }) {
  const dict = getDictionary(locale);
  const p = dict.pages.aiTrends;
  const rtl = isRtl(locale);
  const numberLocale = locale === "he" ? "he-IL" : "en-US";
  const day = digest.trendOfTheDay;

  return (
    <section id={digest.date} aria-labelledby={`d-${digest.date}`} className="scroll-mt-28">
      <div className={cn("mb-5 flex flex-wrap items-baseline gap-x-4 gap-y-1", rtl && "text-right")}>
        <h2 id={`d-${digest.date}`} className="text-2xl text-text md:text-3xl">
          <time dateTime={digest.date}>{formatDay(digest.date, locale)}</time>
        </h2>
        <span className="text-sm text-text-muted">
          {digest.items.length} {p.items}
        </span>
      </div>

      {day && (
        <div
          className={cn(
            "v2-panel mb-6 border-s-4 p-6 md:p-8",
            rtl && "text-right"
          )}
          style={{ borderInlineStartColor: "var(--rust)" }}
        >
          <Badge variant="accent">{p.trendOfDay}</Badge>
          <h3 className="mb-3 mt-4 text-2xl text-text md:text-3xl">
            <bdi>{day.title}</bdi>
          </h3>
          <p className="mb-6 max-w-3xl text-text-muted">{day.excerpt}</p>
          <div className="flex flex-wrap gap-3">
            <Button href={localizedPath(locale, `/blog/${day.slug}`)} variant="primary">
              {p.readPost}
            </Button>
            <Button href={day.sourceHref} variant="secondary" external>
              {p.source} ↗
            </Button>
          </div>
        </div>
      )}

      <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {digest.items.map((item) => (
          <li key={item.id} className="contents">
            <a
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "group v2-panel flex flex-col p-5 transition-all hover:-translate-y-0.5 hover:border-accent/40",
                rtl && "text-right"
              )}
            >
              <div className="mb-3 flex items-center justify-between gap-3">
                <Badge variant={item.source === "github" ? "featured" : "accent"}>
                  {item.source === "github" ? p.github : p.huggingface}
                </Badge>
                {typeof item.stars === "number" && (
                  <span className="text-sm text-text-muted" dir="ltr">
                    ★ {item.stars.toLocaleString(numberLocale)}
                  </span>
                )}
              </div>
              <h3 className="mb-2 break-words text-lg text-text group-hover:text-accent">
                <bdi dir="ltr">{item.title}</bdi>
              </h3>
              <p className="mb-4 flex-1 text-sm leading-relaxed text-text-muted">{item.summary}</p>
              <span className="text-sm text-accent-2" aria-hidden="true">
                {p.open} {rtl ? "↖" : "↗"}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function AiTrendsPage({ params }: Props) {
  const { locale } = await params;
  const dict = getDictionary(locale);
  const p = dict.pages.aiTrends;
  const rtl = isRtl(locale);
  const digests = getTrendDigests(locale);
  const recent = digests.slice(0, OPEN_DAYS);
  const older = digests.slice(OPEN_DAYS);

  return (
    <>
      <PageHeader label={p.label} title={p.title} subtitle={p.subtitle} isRtl={rtl} />
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-8 sm:px-6 lg:px-8" dir={rtl ? "rtl" : "ltr"}>
        {digests.length === 0 ? (
          <p className="v2-panel p-8 text-text-muted">{p.empty}</p>
        ) : (
          <div className="flex flex-col gap-14">
            {recent.map((d) => (
              <DayDigest key={d.date} digest={d} locale={locale} />
            ))}
            {older.length > 0 && (
              <details className="group">
                <summary className="btn btn-sm btn-ghost cursor-pointer list-none">
                  {p.olderDays} ({older.length})
                </summary>
                <div className="mt-10 flex flex-col gap-14">
                  {older.map((d) => (
                    <DayDigest key={d.date} digest={d} locale={locale} />
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
        <p className={cn("mt-14 text-sm text-text-muted", rtl && "text-right")}>
          {p.updated}{" "}
          <Link href={localizedPath(locale, "/blog")} className="text-accent-2 underline-offset-4 hover:underline">
            {dict.nav.blog}
          </Link>
        </p>
      </div>
    </>
  );
}
