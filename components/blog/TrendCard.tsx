import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { TrendDigest, TrendDigestItem } from "@/lib/types";

export type TrendCardLabels = {
  trendOfDay: string;
  stars: string;
  likes: string;
  language: string;
  type: string;
  downloads: string;
  project: string;
  source: string;
  github: string;
  huggingface: string;
  open: string;
  alsoTrending: string;
  comparison: string;
};

function Metric({ label, value, dir }: { label: string; value: string; dir?: "ltr" }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs uppercase tracking-wider text-text-muted">{label}</span>
      <span className="text-lg font-semibold text-text" dir={dir}>
        {value}
      </span>
    </div>
  );
}

/** "Trend of the day" card: the project's own numbers, from the day's digest file. */
export function TrendCard({
  item,
  labels,
  numberLocale,
  rtl,
}: {
  item: TrendDigestItem;
  labels: TrendCardLabels;
  numberLocale: string;
  rtl: boolean;
}) {
  const isGh = item.source === "github";
  const kind = item.language ?? item.tag;
  return (
    <aside
      aria-label={labels.trendOfDay}
      className={cn("v2-panel mb-8 border-s-4 p-5 sm:p-6", rtl && "text-right")}
      style={{ borderInlineStartColor: "var(--rust)" }}
    >
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Badge variant="accent">{labels.trendOfDay}</Badge>
        <Badge variant="featured">{isGh ? labels.github : labels.huggingface}</Badge>
        {kind && <Badge>{kind}</Badge>}
      </div>
      <h2 className="mb-4 break-words text-xl text-text sm:text-2xl">
        <bdi dir="ltr">{item.title}</bdi>
      </h2>
      <div className="mb-5 flex flex-wrap gap-x-8 gap-y-3">
        {typeof item.stars === "number" && (
          <Metric
            label={isGh ? labels.stars : labels.likes}
            value={`★ ${item.stars.toLocaleString(numberLocale)}`}
            dir="ltr"
          />
        )}
        {item.language && <Metric label={labels.language} value={item.language} dir="ltr" />}
        {item.tag && <Metric label={labels.type} value={item.tag} dir="ltr" />}
        {typeof item.downloads === "number" && (
          <Metric label={labels.downloads} value={item.downloads.toLocaleString(numberLocale)} dir="ltr" />
        )}
      </div>
      <Button href={item.href} variant="secondary" external>
        {labels.open} {rtl ? "↖" : "↗"}
      </Button>
    </aside>
  );
}

/** Small comparison table of the day's GitHub / Hugging Face items. */
export function TrendComparison({
  digest,
  labels,
  numberLocale,
  rtl,
}: {
  digest: TrendDigest;
  labels: TrendCardLabels;
  numberLocale: string;
  rtl: boolean;
}) {
  if (digest.items.length < 2) return null;
  return (
    <section aria-labelledby="also-trending" className={cn("mt-12", rtl && "text-right")}>
      <h2 id="also-trending" className="mb-1 text-2xl text-text">
        {labels.alsoTrending}
      </h2>
      <p className="mb-4 text-sm text-text-muted">{labels.comparison}</p>
      <div className="overflow-x-auto rounded-2xl border border-surface-border">
        <table className="w-full min-w-[34rem] border-collapse text-sm">
          <thead className="bg-surface text-text-muted">
            <tr>
              <th scope="col" className="px-4 py-3 text-start font-medium">{labels.project}</th>
              <th scope="col" className="px-4 py-3 text-start font-medium">{labels.source}</th>
              <th scope="col" className="px-4 py-3 text-start font-medium">★</th>
              <th scope="col" className="px-4 py-3 text-start font-medium">{labels.language} / {labels.type}</th>
            </tr>
          </thead>
          <tbody>
            {digest.items.map((i) => {
              const isTop = i.href === digest.trendOfTheDay?.sourceHref;
              return (
                <tr key={i.id} className={cn("border-t border-surface-border", isTop && "bg-surface")}>
                  <td className="px-4 py-3">
                    <a
                      href={i.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="break-words text-accent-2 underline-offset-4 hover:underline"
                    >
                      <bdi dir="ltr">{i.title}</bdi>
                    </a>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{i.source === "github" ? labels.github : labels.huggingface}</td>
                  <td className="px-4 py-3 text-text-muted" dir="ltr">
                    {typeof i.stars === "number" ? i.stars.toLocaleString(numberLocale) : "—"}
                  </td>
                  <td className="px-4 py-3 text-text-muted" dir="ltr">{i.language ?? i.tag ?? "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
