"use client";

import { useState } from "react";
import { Section } from "@/components/ui/Section";
import { VideoCard } from "@/components/ui/Card";
import { useLocale } from "@/components/providers/LocaleProvider";
import type { Video } from "@/lib/types";

export function YouTubeSection({ videos }: { videos: Video[] }) {
  const { dict, isRtl } = useLocale();
  const s = dict.sections.youtube;
  const filters = [
    { key: "All", label: s.filters.all },
    { key: "GitHub", label: s.filters.github },
    { key: "AWS", label: s.filters.aws },
    { key: "AI Agents", label: s.filters.aiAgents },
  ] as const;

  const [active, setActive] = useState<string>("All");

  const filtered =
    active === "All"
      ? videos
      : videos.filter((v) => v.category === active);

  return (
    <Section
      id="youtube"
      label={s.label}
      title={s.title}
      subtitle={s.subtitle}
      action={{ label: s.action, href: "#" }}
      isRtl={isRtl}
    >
      <div className={`mb-8 flex flex-wrap gap-2 ${isRtl ? "justify-end" : ""}`}>
        {filters.map((filter) => (
          <button
            key={filter.key}
            type="button"
            onClick={() => setActive(filter.key)}
            className={`rounded-full px-4 py-1.5 text-sm transition-colors ${
              active === filter.key
                ? "bg-accent font-medium text-bg"
                : "border border-surface-border text-text-muted hover:text-text"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.slice(0, 6).map((video) => (
          <VideoCard key={video.id} {...video} isRtl={isRtl} />
        ))}
      </div>
    </Section>
  );
}
