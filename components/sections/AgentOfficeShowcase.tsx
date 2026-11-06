"use client";

import { useEffect, useRef } from "react";
import { Section } from "@/components/ui/Section";
import { isRtl, type Locale } from "@/lib/i18n/config";

const COPY = {
  en: {
    label: "Live demo",
    title: "Agent Office",
    subtitle: "One room where all my AI agents work, live.",
    body: "Every agent streams its events into one hub, and the office syncs in real time: who's busy, who's on a break, what moved to done, who reviewed whose code.",
    cta: "Open the live office",
  },
  he: {
    label: "דמו חי",
    title: "Agent Office",
    subtitle: "חדר אחד שבו כל סוכני ה-AI שלי עובדים, בלייב.",
    body: "כל סוכן מזרים את האירועים שלו להאב אחד, והמשרד מסתנכרן בזמן אמת: מי עסוק, מי בהפסקה, מה עבר ל-done ומי עשה review למי.",
    cta: "לפתוח את המשרד החי",
  },
} as const;

const DEMO = "https://agent-office-demo.orworkdelevski.workers.dev";

export function AgentOfficeShowcase({ locale }: { locale: Locale }) {
  const t = locale === "he" ? COPY.he : COPY.en;
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (v.preload !== "auto") v.preload = "auto";
          v.play().catch(() => {});
        } else {
          v.pause();
        }
      },
      { rootMargin: "200px 0px" },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return (
    <Section id="agent-office" label={t.label} title={t.title} subtitle={t.subtitle} isRtl={isRtl(locale)}>
      <div className="grid items-center gap-8 md:grid-cols-2" dir={isRtl(locale) ? "rtl" : "ltr"}>
        <div className="mx-auto w-full max-w-md overflow-hidden rounded-2xl border border-white/10 shadow-lg">
          <video
            ref={ref}
            className="block h-auto w-full"
            src="/v2/agent-office/demo.mp4"
            poster="/v2/agent-office/poster.jpg"
            muted
            loop
            playsInline
            preload="none"
            aria-label={t.title}
            width={720}
            height={900}
          />
        </div>
        <div className="flex flex-col gap-6">
          <p className="text-lg leading-relaxed opacity-80">{t.body}</p>
          <a
            href={DEMO}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex w-fit items-center gap-2 rounded-full border px-5 py-2.5 font-medium transition hover:opacity-80"
          >
            {t.cta} ↗
          </a>
        </div>
      </div>
    </Section>
  );
}
