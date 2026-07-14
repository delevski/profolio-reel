"use client";

import { logoPartners } from "@/lib/constants";
import { useLocale } from "@/components/providers/LocaleProvider";

export function Marquee() {
  const { dict } = useLocale();
  const items = [...logoPartners, ...logoPartners];

  return (
    <section className="bg-bg/50 py-8 backdrop-blur-sm">
      <p className="mb-6 text-center text-sm uppercase tracking-widest text-text-muted">
        {dict.marquee.trusted}
      </p>
      <div className="relative overflow-hidden">
        <div className="flex animate-marquee gap-16 whitespace-nowrap">
          {items.map((name, i) => (
            <span
              key={`${name}-${i}`}
              className="inline-flex shrink-0 items-center px-4 text-xl font-semibold text-text-muted/60 transition-colors hover:text-text-muted"
            >
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
