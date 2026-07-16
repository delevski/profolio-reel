"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, TrendingUp } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { Badge } from "@/components/ui/Badge";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { Trend } from "@/lib/types";
import { cn } from "@/lib/utils";

function TrendSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-surface-border bg-surface/90 backdrop-blur-md p-6">
      <div className="mb-3 h-4 w-24 rounded bg-surface-border" />
      <div className="mb-2 h-6 w-3/4 rounded bg-surface-border" />
      <div className="h-16 rounded bg-surface-border" />
    </div>
  );
}

export function TrendsSection() {
  const { locale, dict, isRtl } = useLocale();
  const [trends, setTrends] = useState<Trend[]>([]);
  const [loading, setLoading] = useState(true);
  const s = dict.sections.trends;
  const Arrow = isRtl ? ArrowLeft : ArrowRight;
  const numberLocale = locale === "he" ? "he-IL" : "en-US";

  useEffect(() => {
    let active = true;

    fetch(`/api/trends?locale=${locale}`)
      .then((res) => res.json())
      .then((data: Trend[]) => {
        if (!active) return;
        setTrends(data);
        setLoading(false);
      })
      .catch(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [locale]);

  return (
    <Section
      id="trends"
      label={s.label}
      title={s.title}
      subtitle={s.subtitle}
      action={{ label: s.action, href: "#" }}
      isRtl={isRtl}
    >
      {loading ? (
        <>
          <p className="mb-6 text-sm text-text-muted">{s.loading}</p>
          <div className="grid gap-6 md:grid-cols-2">
            {[1, 2, 3, 4].map((i) => (
              <TrendSkeleton key={i} />
            ))}
          </div>
        </>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {trends.map((trend) => (
            <a
              key={trend.id}
              href={trend.href}
              target="_blank"
              rel="noopener noreferrer"
              dir={isRtl ? "rtl" : "ltr"}
              className={cn(
                "group rounded-2xl border border-surface-border bg-surface/90 backdrop-blur-md p-6 transition-all hover:-translate-y-1 hover:border-accent/30",
                isRtl && "text-right"
              )}
            >
              <div className="mb-3 flex items-center justify-between">
                <Badge variant="accent">
                  <TrendingUp className="me-1 inline h-3 w-3" />
                  {trend.source}
                </Badge>
                {trend.stars !== undefined && (
                  <span className="text-sm text-text-muted">
                    ★ {trend.stars.toLocaleString(numberLocale)}
                  </span>
                )}
              </div>
              <h3 className="mb-2 font-serif text-xl text-text group-hover:text-accent">
                <bdi dir="ltr">{trend.title}</bdi>
              </h3>
              <p className="mb-4 text-sm text-text-muted">{trend.description}</p>
              <span className="inline-flex items-center gap-1 text-sm text-accent-2">
                {s.learnMore} <Arrow className="h-3 w-3" />
              </span>
            </a>
          ))}
        </div>
      )}
    </Section>
  );
}
