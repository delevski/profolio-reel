"use client";

import { useEffect, useRef } from "react";

type Props = {
  src: string;
  poster?: string;
  label?: string;
  /** width / height of the video, e.g. 0.8 for 4:5 */
  ratio?: number;
};

/**
 * Muted, looping demo video that loads nothing until it scrolls near the
 * viewport, plays while visible and pauses when it leaves. Users who ask for
 * reduced motion get the poster and native controls instead of autoplay.
 */
export function LazyVideo({ src, poster, label, ratio = 0.8 }: Props) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      video.controls = true;
      return;
    }
    if (!("IntersectionObserver" in window)) {
      video.preload = "auto";
      video.play().catch(() => {});
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            if (video.preload !== "auto") video.preload = "auto";
            video.play().catch(() => {});
          } else if (!video.paused) {
            video.pause();
          }
        }
      },
      { rootMargin: "200px 0px", threshold: 0.15 }
    );
    io.observe(video);
    return () => io.disconnect();
  }, []);

  return (
    <figure className="not-prose my-10 flex justify-center">
      <div
        className="w-full max-w-[420px] overflow-hidden rounded-2xl border border-surface-border bg-surface"
        style={{ aspectRatio: String(ratio) }}
      >
        <video
          ref={ref}
          className="h-full w-full object-cover"
          src={src}
          poster={poster}
          muted
          loop
          playsInline
          preload="none"
          aria-label={label}
        />
      </div>
    </figure>
  );
}
