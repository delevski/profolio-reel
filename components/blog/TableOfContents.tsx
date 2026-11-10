"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TocHeading } from "@/lib/headings";

/**
 * Table of contents built from the article's own headings. Sticky sidebar on desktop,
 * a collapsible panel on mobile. The section being read is highlighted.
 */
export function TableOfContents({ headings, label }: { headings: TocHeading[]; label: string }) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => {
    const els = headings
      .map((h) => document.getElementById(h.id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (els.length === 0 || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-90px 0px -65% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [headings]);

  if (headings.length < 3) return null;

  return (
    <nav aria-label={label} className="toc rounded-2xl border border-surface-border bg-surface p-4 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0">
      <button
        type="button"
        className="flex w-full items-center justify-between gap-3 text-start text-sm font-semibold text-text lg:hidden"
        aria-expanded={open}
        aria-controls="toc-list"
        onClick={() => setOpen((v) => !v)}
      >
        <span>{label}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} aria-hidden="true" />
      </button>
      <p className="mb-3 hidden text-xs font-semibold uppercase tracking-widest text-text-muted lg:block">{label}</p>
      <ol
        id="toc-list"
        className={cn(
          "mt-3 space-y-1 border-s border-surface-border text-sm lg:mt-0 lg:block",
          open ? "block" : "hidden"
        )}
      >
        {headings.map((h) => (
          <li key={h.id}>
            <a
              href={`#${h.id}`}
              onClick={() => setOpen(false)}
              aria-current={active === h.id ? "true" : undefined}
              className={cn(
                "-ms-px block border-s-2 py-1 leading-snug transition-colors hover:text-text",
                h.depth === 3 ? "ps-6 text-[13px]" : "ps-4",
                active === h.id
                  ? "border-[var(--rust)] font-medium text-text"
                  : "border-transparent text-text-muted"
              )}
            >
              {h.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
