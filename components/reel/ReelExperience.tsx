"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Play } from "lucide-react";
import {
  framePath,
  type ReelManifest,
  type ReelSection,
} from "@/lib/reel/types";
import { ReelMusicControl, type ReelMusicHandle } from "@/components/reel/ReelMusicControl";
import { ReelCaptions } from "@/components/reel/ReelCaptions";
import { useLocale } from "@/components/providers/LocaleProvider";
import { reelOpeningCopy } from "@/lib/reel/opening";

const IDLE_HINT_MS = 1000;

type Props = {
  manifest: ReelManifest;
};

type ScrollMap = {
  sectionIndex: number;
  localProgress: number;
};

function buildOffsets(sections: ReelSection[], vh: number): number[] {
  const offsets: number[] = [0];
  let acc = 0;
  for (const s of sections) {
    acc += (s.scrollVh / 100) * vh;
    offsets.push(acc);
  }
  return offsets;
}

function resolveScroll(
  scrollY: number,
  offsets: number[],
  sectionCount: number,
): ScrollMap {
  const contentEnd = offsets[offsets.length - 1] ?? 1;
  const y = Math.max(0, Math.min(scrollY, Math.max(0, contentEnd - 0.5)));
  for (let i = 0; i < sectionCount; i++) {
    const start = offsets[i] ?? 0;
    const end = offsets[i + 1] ?? start + 1;
    if (y >= start && y < end) {
      const span = Math.max(1, end - start);
      return { sectionIndex: i, localProgress: (y - start) / span };
    }
  }
  return { sectionIndex: sectionCount - 1, localProgress: 1 };
}

function preloadImage(src: string, cache: Map<string, HTMLImageElement>) {
  if (cache.has(src)) return;
  const img = new Image();
  img.decoding = "async";
  img.src = src;
  cache.set(src, img);
}

export function ReelExperience({ manifest }: Props) {
  const { locale } = useLocale();
  const trackRef = useRef<HTMLDivElement>(null);
  const imgCache = useRef(new Map<string, HTMLImageElement>());
  const loopFrameRef = useRef(0);
  const loopSectionRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  const autoPlayRafRef = useRef(0);
  const autoPlayingRef = useRef(false);
  /** While set, main scroll tick yields frame control to the Start autoplay. */
  const introFrameRef = useRef<number | null>(null);
  const exitTriggeredRef = useRef(false);
  const musicRef = useRef<ReelMusicHandle>(null);
  const [vh, setVh] = useState(800);
  const [displaySrc, setDisplaySrc] = useState(manifest.opening);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [showStart, setShowStart] = useState(true);
  const [showIdleHint, setShowIdleHint] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [exitFade, setExitFade] = useState(0); // 0..1 overlay opacity
  const idleHintVisibleRef = useRef(false);

  const totalVh = useMemo(
    () => manifest.sections.reduce((sum, s) => sum + s.scrollVh, 0),
    [manifest.sections],
  );
  const trackVh = totalVh + 100;

  const offsets = useMemo(
    () => buildOffsets(manifest.sections, vh),
    [manifest.sections, vh],
  );

  const preloadSection = useCallback((section: ReelSection) => {
    if (section.mode === "still" && section.src) {
      preloadImage(section.src, imgCache.current);
      return;
    }
    const count = section.frameCount ?? 0;
    for (let i = 0; i < count; i++) {
      const path = framePath(section, i);
      if (path) preloadImage(path, imgCache.current);
    }
  }, []);

  const cancelAutoPlay = useCallback(() => {
    if (autoPlayRafRef.current) {
      cancelAnimationFrame(autoPlayRafRef.current);
      autoPlayRafRef.current = 0;
    }
    autoPlayingRef.current = false;
    introFrameRef.current = null;
    document.documentElement.style.overflowY = "scroll";
    document.body.style.overflow = "";
    setIsAutoPlaying(false);
  }, []);

  const beginExit = useCallback(() => {
    if (exitTriggeredRef.current) return;
    exitTriggeredRef.current = true;
    const target = manifest.exitUrl ?? "https://ordelwebsite.vercel.app/en";

    const durationMs = 1200;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / durationMs);
      const eased = t * t * (3 - 2 * t);
      setExitFade(eased);
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        window.location.assign(target);
      }
    };
    requestAnimationFrame(step);
  }, [manifest.exitUrl]);

  /**
   * Start button: unlock sound immediately (same tap), play clip 1 automatically,
   * then leave the user at the end of clip 1 for normal scrolling.
   */
  const startFirstClip = useCallback(() => {
    // Same user gesture → browsers allow unmuted audio here.
    void musicRef.current?.play();

    const clip = manifest.sections[1];
    if (!clip || clip.mode !== "scrub") return;

    cancelAutoPlay();
    setShowStart(false);
    setSectionIndex(1);
    preloadSection(clip);

    const startY = offsets[1] ?? 0;
    const endY = Math.max(startY + 1, (offsets[2] ?? startY + 1) - 1);
    const frames = Math.max(1, clip.frameCount ?? 1);
    const frameMs = 1000 / manifest.fps;
    const contentEnd = Math.max(1, offsets[offsets.length - 1] ?? 1);

    autoPlayingRef.current = true;
    introFrameRef.current = 0;
    setIsAutoPlaying(true);

    // Lock page scroll during the intro so mobile touch can't interrupt.
    document.documentElement.style.overflowY = "hidden";
    document.body.style.overflow = "hidden";

    const first = framePath(clip, 0);
    if (first) setDisplaySrc(first);
    window.scrollTo({ top: startY, behavior: "auto" });
    progressRef.current = Math.min(1, startY / contentEnd);

    let frame = 0;
    let lastTs = performance.now();

    const step = (now: number) => {
      if (!autoPlayingRef.current) return;

      if (now - lastTs >= frameMs) {
        const steps = Math.floor((now - lastTs) / frameMs);
        frame = Math.min(frames - 1, frame + steps);
        lastTs = now;

        introFrameRef.current = frame;
        const src = framePath(clip, frame);
        if (src) setDisplaySrc(src);

        const local = frames <= 1 ? 1 : frame / (frames - 1);
        const y = startY + (endY - startY) * local;
        window.scrollTo({ top: y, behavior: "auto" });
        progressRef.current = Math.min(1, y / contentEnd);

        if (frame >= frames - 1) {
          // Intro finished → unlock scroll; user continues from here.
          autoPlayingRef.current = false;
          introFrameRef.current = null;
          autoPlayRafRef.current = 0;
          document.documentElement.style.overflowY = "scroll";
          document.body.style.overflow = "";
          window.scrollTo({ top: endY, behavior: "auto" });
          setIsAutoPlaying(false);
          return;
        }
      }

      autoPlayRafRef.current = requestAnimationFrame(step);
    };

    autoPlayRafRef.current = requestAnimationFrame(step);
  }, [cancelAutoPlay, manifest.fps, manifest.sections, offsets, preloadSection]);

  useEffect(() => {
    const update = () => setVh(window.innerHeight);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prev = {
      htmlOX: html.style.overflowX,
      htmlOY: html.style.overflowY,
      bodyOX: body.style.overflowX,
      bodyOY: body.style.overflowY,
      bodyOverflow: body.style.overflow,
      bodyTouch: body.style.touchAction,
      htmlTouch: html.style.touchAction,
    };
    html.style.overflowX = "clip";
    html.style.overflowY = "scroll";
    html.style.touchAction = "pan-y";
    body.style.overflow = "";
    body.style.overflowX = "clip";
    body.style.overflowY = "visible";
    body.style.touchAction = "pan-y";
    return () => {
      html.style.overflowX = prev.htmlOX;
      html.style.overflowY = prev.htmlOY;
      html.style.touchAction = prev.htmlTouch;
      body.style.overflow = prev.bodyOverflow;
      body.style.overflowX = prev.bodyOX;
      body.style.overflowY = prev.bodyOY;
      body.style.touchAction = prev.bodyTouch;
      cancelAutoPlay();
    };
  }, [cancelAutoPlay]);

  // Hide Start after the user begins scrolling manually (not during intro).
  useEffect(() => {
    const onScroll = () => {
      if (autoPlayingRef.current) return;
      if (window.scrollY > 24) setShowStart(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    preloadSection(manifest.sections[0]!);
    preloadSection(manifest.sections[1]!);
    if (manifest.sections[2]) preloadSection(manifest.sections[2]);
  }, [manifest.sections, preloadSection]);

  useEffect(() => {
    let raf = 0;
    let lastLoopTs = 0;
    let lastSrc = "";
    let lastSection = -1;
    let lastScrollY = window.scrollY;
    let lastMoveTs = performance.now();
    let scrubFrameKey = "";

    const setIdleHint = (visible: boolean) => {
      if (idleHintVisibleRef.current === visible) return;
      idleHintVisibleRef.current = visible;
      setShowIdleHint(visible);
    };

    const tick = (ts: number) => {
      // During Start intro, frames + progress are driven by startFirstClip.
      if (autoPlayingRef.current && introFrameRef.current !== null) {
        lastMoveTs = ts;
        setIdleHint(false);
        raf = requestAnimationFrame(tick);
        return;
      }

      const scrollY = window.scrollY;
      const map = resolveScroll(scrollY, offsets, manifest.sections.length);
      const section = manifest.sections[map.sectionIndex]!;
      const contentEnd = Math.max(1, offsets[offsets.length - 1] ?? 1);
      progressRef.current = Math.min(1, Math.max(0, scrollY / contentEnd));

      if (map.sectionIndex !== lastSection) {
        lastSection = map.sectionIndex;
        setSectionIndex(map.sectionIndex);
        if (map.sectionIndex > 0) setShowStart(false);
        const next = manifest.sections[map.sectionIndex + 1];
        const prev = manifest.sections[map.sectionIndex - 1];
        if (next) preloadSection(next);
        if (prev) preloadSection(prev);
      }

      let src: string | null = null;
      let activeFrameKey = `${map.sectionIndex}:still`;

      if (section.mode === "still") {
        src = section.src ?? manifest.opening;
        loopSectionRef.current = null;
      } else if (section.mode === "scrub") {
        loopSectionRef.current = null;
        const count = section.frameCount ?? 1;
        const idx = Math.min(
          count - 1,
          Math.floor(map.localProgress * count),
        );
        src = framePath(section, idx);
        activeFrameKey = `${map.sectionIndex}:scrub:${idx}`;
      } else if (section.mode === "loop") {
        if (loopSectionRef.current !== section.id) {
          loopSectionRef.current = section.id;
          loopFrameRef.current = 0;
          lastLoopTs = ts;
        }
        const count = Math.max(1, section.frameCount ?? 1);
        const frameMs = 1000 / manifest.fps;
        if (ts - lastLoopTs >= frameMs) {
          const steps = Math.floor((ts - lastLoopTs) / frameMs);
          loopFrameRef.current = (loopFrameRef.current + steps) % count;
          lastLoopTs = ts;
        }
        src = framePath(section, loopFrameRef.current);
        // Loop frames keep moving — treat scroll stall as idle, not frame stall.
        activeFrameKey = `${map.sectionIndex}:loop`;
      }

      if (src && src !== lastSrc) {
        lastSrc = src;
        setDisplaySrc(src);
      }

      // Idle scroll nudge: same scrub/still frame (or stalled scroll on loops) > 1s.
      const scrollMoved = Math.abs(scrollY - lastScrollY) > 1;
      const frameChanged = activeFrameKey !== scrubFrameKey;
      if (scrollMoved || frameChanged) {
        lastScrollY = scrollY;
        scrubFrameKey = activeFrameKey;
        lastMoveTs = ts;
        setIdleHint(false);
      } else {
        const lastIdx = manifest.sections.length - 1;
        const nearExit =
          map.sectionIndex === lastIdx && map.localProgress >= 0.85;
        const onOpeningStart = map.sectionIndex === 0 && scrollY < 24;
        const canHint =
          !exitTriggeredRef.current &&
          !autoPlayingRef.current &&
          !nearExit &&
          !onOpeningStart &&
          scrollY > 8;

        if (canHint && ts - lastMoveTs >= IDLE_HINT_MS) {
          setIdleHint(true);
        }
      }

      // End of final clip → smooth fade, then open the portfolio homepage.
      const lastIdx = manifest.sections.length - 1;
      if (
        !exitTriggeredRef.current &&
        !autoPlayingRef.current &&
        map.sectionIndex === lastIdx &&
        map.localProgress >= 0.92
      ) {
        setIdleHint(false);
        beginExit();
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [offsets, manifest, preloadSection, beginExit]);

  const startLabel = locale === "he" ? "התחל" : "Start";
  const opening = reelOpeningCopy(locale);
  const showOpeningTitle =
    sectionIndex === 0 && !isAutoPlaying && exitFade < 0.05;

  return (
    <div className="relative bg-black text-white">
      <div
        className="pointer-events-none fixed inset-0 z-10 h-[100dvh] min-h-[100dvh] w-full overflow-hidden bg-black supports-[height:100svh]:h-[100svh] supports-[height:100svh]:min-h-[100svh]"
        aria-hidden
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={displaySrc}
          alt=""
          className="pointer-events-none absolute inset-0 h-full w-full select-none object-cover object-center"
          draggable={false}
        />
      </div>

      {showOpeningTitle && (
        <div
          className="pointer-events-none fixed inset-0 z-20 flex items-center justify-center px-6 pb-[22vh] pt-[12vh] sm:pb-[18vh]"
          dir={locale === "he" ? "rtl" : "ltr"}
        >
          <div className="relative mx-auto w-full max-w-4xl text-center">
            <div
              className="pointer-events-none absolute -inset-x-6 -inset-y-10 rounded-[2rem] sm:-inset-x-12 sm:-inset-y-14"
              style={{
                background:
                  "radial-gradient(ellipse at center, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.28) 48%, transparent 74%)",
              }}
              aria-hidden
            />
            <h1
              className="relative font-serif text-[2.35rem] leading-[1.12] tracking-[-0.02em] text-white sm:text-5xl md:text-6xl lg:text-7xl"
              style={{
                textShadow:
                  "0 0 36px rgba(255,255,255,0.18), 0 4px 28px rgba(0,0,0,0.65)",
              }}
            >
              {opening.title}
            </h1>
            <p
              className="relative mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-white/85 sm:mt-6 sm:text-base md:text-lg"
              style={{
                textShadow: "0 2px 18px rgba(0,0,0,0.7)",
              }}
            >
              {opening.subtitle}
            </p>
          </div>
        </div>
      )}

      <div
        ref={trackRef}
        style={{ height: `${trackVh}vh` }}
        className="relative z-0 touch-pan-y"
        aria-label="Scroll through the reel"
      />

      {showStart && sectionIndex === 0 && !isAutoPlaying && (
        <div className="fixed inset-x-0 bottom-[max(1.5rem,env(safe-area-inset-bottom))] z-40 flex flex-col items-center gap-3 px-6">
          <button
            type="button"
            onClick={startFirstClip}
            className="group flex items-center gap-2.5 rounded-full border border-white/25 bg-white/12 px-7 py-3.5 text-sm font-medium tracking-[0.14em] text-white uppercase backdrop-blur-md transition hover:border-white/45 hover:bg-white/20 active:scale-[0.98]"
            style={{
              boxShadow:
                "0 0 32px rgba(255,255,255,0.12), 0 8px 32px rgba(0,0,0,0.35)",
            }}
          >
            <Play size={16} className="fill-white opacity-90" />
            {startLabel}
          </button>
          <div className="pointer-events-none flex flex-col items-center gap-1.5 text-white/70">
            <span className="text-[10px] tracking-[0.22em] uppercase">
              {locale === "he" ? "או גלול למטה" : "or scroll down"}
            </span>
            <ChevronDown className="animate-bounce" size={22} />
          </div>
        </div>
      )}

      {showIdleHint && !showStart && !isAutoPlaying && exitFade < 0.05 && (
        <div
          className="pointer-events-none fixed inset-x-0 bottom-[max(2rem,env(safe-area-inset-bottom))] z-40 flex flex-col items-center gap-2 text-white/80 transition-opacity duration-300"
          aria-hidden
        >
          <span className="text-xs tracking-[0.2em] uppercase">
            {locale === "he" ? "גלול" : "Scroll"}
          </span>
          <ChevronDown className="animate-bounce" size={22} />
        </div>
      )}

      <ReelCaptions locale={locale} progressRef={progressRef} />

      <ReelMusicControl ref={musicRef} src={manifest.audio} />

      <div
        className="pointer-events-none fixed inset-0 z-[60] bg-black"
        style={{
          opacity: exitFade,
          transition: "opacity 40ms linear",
        }}
        aria-hidden
      />
    </div>
  );
}
