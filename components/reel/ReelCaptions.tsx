"use client";

import { useEffect, useRef } from "react";
import { captionStyle, reelCaptions } from "@/lib/reel/captions";
import type { Locale } from "@/lib/i18n/config";

type Props = {
  locale: Locale;
  /** 0..1 overall reel progress — updated from scroll rAF via ref for 60fps. */
  progressRef: React.MutableRefObject<number>;
};

/**
 * Cinematic caption layer. Styles are written directly to the DOM inside rAF
 * so we do not re-render React 60 times per second.
 */
export function ReelCaptions({ locale, progressRef }: Props) {
  const captions = reelCaptions(locale);
  const nodesRef = useRef<(HTMLParagraphElement | null)[]>([]);

  useEffect(() => {
    let raf = 0;
    let lastKey = "";
    const total = captions.length;

    const tick = () => {
      const progress = progressRef.current;
      const key = progress.toFixed(3);
      if (key !== lastKey) {
        lastKey = key;
        for (let i = 0; i < total; i++) {
          const el = nodesRef.current[i];
          if (!el) continue;
          const { opacity, translateY, blur } = captionStyle(progress, i, total);
          if (opacity < 0.01) {
            el.style.opacity = "0";
            el.style.visibility = "hidden";
            continue;
          }
          el.style.visibility = "visible";
          el.style.opacity = String(opacity);
          el.style.transform = `translate3d(0, ${translateY}px, 0)`;
          el.style.filter = blur > 0.2 ? `blur(${blur}px)` : "none";
        }
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [captions, progressRef]);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-20 flex items-end justify-center px-6 pb-[max(18vh,env(safe-area-inset-bottom))] pt-[20vh] sm:items-center sm:pb-0 sm:pt-0"
      aria-live="polite"
      dir={locale === "he" ? "rtl" : "ltr"}
      lang={locale}
    >
      <div className="relative mx-auto w-full max-w-3xl text-center">
        <div
          className="pointer-events-none absolute -inset-x-8 -inset-y-16 rounded-[2rem] opacity-80"
          style={{
            background:
              "radial-gradient(ellipse at center, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.18) 45%, transparent 72%)",
          }}
        />
        {captions.map((text, i) => (
          <p
            key={`${locale}-${text}`}
            ref={(el) => {
              nodesRef.current[i] = el;
            }}
            className="absolute inset-x-0 top-1/2 -translate-y-1/2 font-serif text-[1.65rem] leading-tight tracking-[-0.02em] text-white sm:text-4xl md:text-5xl"
            style={{
              opacity: 0,
              visibility: "hidden",
              textShadow:
                "0 0 28px rgba(255,255,255,0.22), 0 0 60px rgba(255,255,255,0.08), 0 2px 24px rgba(0,0,0,0.55)",
              willChange: "opacity, transform, filter",
            }}
          >
            {text}
          </p>
        ))}
      </div>
    </div>
  );
}
