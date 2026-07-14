"use client";

import { useEffect, useRef, useState } from "react";
import { HERO_VIDEO_SRC, HERO_VIDEO_SRC_LIGHT } from "@/lib/constants";
import { useTheme } from "@/components/providers/ThemeProvider";
import { cn } from "@/lib/utils";

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mq = window.matchMedia(query);
    const handler = () => setMatches(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

export function VideoBackground() {
  const { theme } = useTheme();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const isMobile = useMediaQuery("(max-width: 767px)");
  const showVideo = !reducedMotion;
  const isLight = theme === "light";
  const src = isLight ? HERO_VIDEO_SRC_LIGHT : HERO_VIDEO_SRC;

  useEffect(() => {
    if (!showVideo) return;

    const video = videoRef.current;
    if (!video) return;

    let active = true;

    const markReady = () => {
      if (!active) return;
      requestAnimationFrame(() => {
        if (active) setReady(true);
      });
    };

    video.addEventListener("loadeddata", markReady);
    video.addEventListener("canplay", markReady);

    return () => {
      active = false;
      video.removeEventListener("loadeddata", markReady);
      video.removeEventListener("canplay", markReady);
    };
  }, [showVideo, theme]);

  return (
    <div
      className="pointer-events-none fixed inset-0 z-[1] overflow-hidden"
      aria-hidden
    >
      {showVideo ? (
        <video
          key={theme}
          ref={videoRef}
          className={cn(
            "absolute inset-0 h-full w-full scale-110 object-cover transition-opacity duration-500",
            ready ? "opacity-100" : "opacity-60"
          )}
          src={src}
          autoPlay
          muted
          loop
          playsInline
          preload={isMobile ? "metadata" : "auto"}
          onLoadStart={() => setReady(false)}
        />
      ) : (
        <div
          className="absolute inset-0 bg-gradient-to-br from-bg via-surface to-bg"
          aria-hidden
        />
      )}

      {!isLight && (
        <>
          <div className="absolute inset-0 bg-bg/30" />
          <div className="absolute inset-0 bg-gradient-to-b from-bg/40 via-transparent to-bg/50" />
        </>
      )}
    </div>
  );
}
