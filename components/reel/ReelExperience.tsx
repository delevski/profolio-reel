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
/** Prefetch this many frames ahead/behind the current scrub frame. */
const PREFETCH_RADIUS = 24;

type Props = {
  manifest: ReelManifest;
};

type ScrollMap = {
  sectionIndex: number;
  localProgress: number;
};

type BitmapCache = Map<string, ImageBitmap | HTMLImageElement | "loading" | "error">;

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

function scrubFrameIndex(localProgress: number, frameCount: number): number {
  const count = Math.max(1, frameCount);
  if (count <= 1) return 0;
  return Math.min(
    count - 1,
    Math.max(0, Math.round(localProgress * (count - 1))),
  );
}

function isDrawable(
  entry: ImageBitmap | HTMLImageElement | "loading" | "error" | undefined,
): entry is ImageBitmap | HTMLImageElement {
  if (!entry || entry === "loading" || entry === "error") return false;
  if (typeof ImageBitmap !== "undefined" && entry instanceof ImageBitmap) {
    return entry.width > 0;
  }
  const img = entry as HTMLImageElement;
  return img.complete && img.naturalWidth > 0;
}

/** object-cover draw into a canvas sized to CSS pixels × DPR. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  source: ImageBitmap | HTMLImageElement,
  canvasW: number,
  canvasH: number,
) {
  const sw =
    typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap
      ? source.width
      : (source as HTMLImageElement).naturalWidth;
  const sh =
    typeof ImageBitmap !== "undefined" && source instanceof ImageBitmap
      ? source.height
      : (source as HTMLImageElement).naturalHeight;
  if (sw <= 0 || sh <= 0) return;

  const scale = Math.max(canvasW / sw, canvasH / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  const dx = (canvasW - dw) / 2;
  const dy = (canvasH - dh) / 2;
  ctx.drawImage(source, dx, dy, dw, dh);
}

function loadFrame(src: string, cache: BitmapCache) {
  if (cache.has(src)) return;
  cache.set(src, "loading");

  const img = new Image();
  img.decoding = "async";
  img.src = src;

  const finish = async () => {
    try {
      if (typeof createImageBitmap === "function") {
        const bitmap = await createImageBitmap(img);
        cache.set(src, bitmap);
      } else if (img.complete && img.naturalWidth > 0) {
        cache.set(src, img);
      } else {
        cache.set(src, "error");
      }
    } catch {
      if (img.complete && img.naturalWidth > 0) cache.set(src, img);
      else cache.set(src, "error");
    }
  };

  if (img.complete && img.naturalWidth > 0) {
    void finish();
  } else {
    img.addEventListener(
      "load",
      () => {
        void finish();
      },
      { once: true },
    );
    img.addEventListener(
      "error",
      () => {
        cache.set(src, "error");
      },
      { once: true },
    );
  }
}

function prefetchAround(
  section: ReelSection,
  center: number,
  cache: BitmapCache,
  radius = PREFETCH_RADIUS,
) {
  if (section.mode === "still") {
    if (section.src) loadFrame(section.src, cache);
    return;
  }
  const count = section.frameCount ?? 0;
  const from = Math.max(0, center - radius);
  const to = Math.min(count - 1, center + radius);
  for (let i = from; i <= to; i++) {
    const path = framePath(section, i);
    if (path) loadFrame(path, cache);
  }
}

function nearestReadySrc(
  section: ReelSection,
  center: number,
  cache: BitmapCache,
): string | null {
  const count = section.frameCount ?? 0;
  const exact = framePath(section, center);
  if (exact && isDrawable(cache.get(exact))) return exact;
  for (let d = 1; d < count; d++) {
    const lo = center - d;
    const hi = center + d;
    if (lo >= 0) {
      const p = framePath(section, lo);
      if (p && isDrawable(cache.get(p))) return p;
    }
    if (hi < count) {
      const p = framePath(section, hi);
      if (p && isDrawable(cache.get(p))) return p;
    }
  }
  return null;
}

export function ReelExperience({ manifest }: Props) {
  const { locale } = useLocale();
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const cacheRef = useRef<BitmapCache>(new Map());
  const shownSrcRef = useRef<string | null>(null);
  const canvasSizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const loopFrameRef = useRef(0);
  const loopSectionRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  const autoPlayRafRef = useRef(0);
  const autoPlayingRef = useRef(false);
  const introFrameRef = useRef<number | null>(null);
  const exitTriggeredRef = useRef(false);
  const musicRef = useRef<ReelMusicHandle>(null);
  const [vh, setVh] = useState(800);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [showStart, setShowStart] = useState(true);
  const [showIdleHint, setShowIdleHint] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [exitFade, setExitFade] = useState(0);
  const idleHintVisibleRef = useRef(false);

  const totalVh = useMemo(
    () => manifest.sections.reduce((sum, s) => sum + s.scrollVh, 0),
    [manifest.sections],
  );
  const trackVh = totalVh + 20;

  const offsets = useMemo(
    () => buildOffsets(manifest.sections, vh),
    [manifest.sections, vh],
  );

  const syncCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = Math.max(1, Math.round(window.innerWidth * dpr));
    const h = Math.max(1, Math.round(window.innerHeight * dpr));
    const prev = canvasSizeRef.current;
    if (prev.w === w && prev.h === h && prev.dpr === dpr) return;
    canvas.width = w;
    canvas.height = h;
    canvasSizeRef.current = { w, h, dpr };
    const ctx = canvas.getContext("2d", { alpha: false });
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctxRef.current = ctx;
      // Re-paint last frame after resize so the canvas never goes blank.
      const src = shownSrcRef.current;
      if (src) {
        const entry = cacheRef.current.get(src);
        if (isDrawable(entry)) {
          drawCover(ctx, entry, w, h);
        }
      }
    }
  }, []);

  /**
   * Draw a frame onto the canvas only when it is already decoded.
   * Never clear between frames — previous pixels stay until the next draw,
   * so there is no flash of black between JPEG swaps.
   */
  const showFrame = useCallback((src: string | null) => {
    if (!src || src === shownSrcRef.current) return;
    const cache = cacheRef.current;
    loadFrame(src, cache);
    const entry = cache.get(src);
    if (!isDrawable(entry)) return;

    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;

    const { w, h } = canvasSizeRef.current;
    if (w <= 0 || h <= 0) return;

    drawCover(ctx, entry, w, h);
    shownSrcRef.current = src;
  }, []);

  const preloadSection = useCallback((section: ReelSection) => {
    if (section.mode === "still" && section.src) {
      loadFrame(section.src, cacheRef.current);
      return;
    }
    const count = section.frameCount ?? 0;
    const warm = Math.min(count, PREFETCH_RADIUS * 2);
    for (let i = 0; i < warm; i++) {
      const path = framePath(section, i);
      if (path) loadFrame(path, cacheRef.current);
    }
    if (count > warm) {
      const cache = cacheRef.current;
      const rest = () => {
        for (let i = warm; i < count; i++) {
          const path = framePath(section, i);
          if (path) loadFrame(path, cache);
        }
      };
      if (typeof requestIdleCallback !== "undefined") {
        requestIdleCallback(rest, { timeout: 1500 });
      } else {
        window.setTimeout(rest, 0);
      }
    }
  }, []);

  const cancelAutoPlay = useCallback(() => {
    if (autoPlayRafRef.current) {
      cancelAnimationFrame(autoPlayRafRef.current);
      autoPlayRafRef.current = 0;
    }
    autoPlayingRef.current = false;
    introFrameRef.current = null;
    setIsAutoPlaying(false);
  }, []);

  const beginExit = useCallback(() => {
    if (exitTriggeredRef.current) return;
    exitTriggeredRef.current = true;
    // Same locale as the reel route: /he/reel → /he, /en/reel → /en
    const target = `/${locale}`;

    autoPlayingRef.current = false;
    introFrameRef.current = null;

    const durationMs = 700;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / durationMs);
      const eased = t * t * (3 - 2 * t);
      setExitFade(eased);
      if (t < 1) {
        requestAnimationFrame(step);
      } else {
        window.location.href = target;
      }
    };
    requestAnimationFrame(step);
  }, [locale]);

  const startFirstClip = useCallback(() => {
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

    // Do NOT lock overflow — overflow:hidden reliably traps scroll on Safari/iOS
    // and can leave the page unable to move after unlock. Intro drives scrollY;
    // user touch/wheel just cancels intro (see listeners below).

    const first = framePath(clip, 0);
    if (first) {
      loadFrame(first, cacheRef.current);
      showFrame(first);
    }
    window.scrollTo({ top: startY, behavior: "auto" });
    progressRef.current = Math.min(1, startY / contentEnd);

    let frame = 0;
    let lastTs = performance.now();

    const finishIntro = () => {
      autoPlayingRef.current = false;
      introFrameRef.current = null;
      autoPlayRafRef.current = 0;
      window.scrollTo({ top: endY, behavior: "auto" });
      setIsAutoPlaying(false);
    };

    const step = (now: number) => {
      if (!autoPlayingRef.current) return;

      if (now - lastTs >= frameMs) {
        const steps = Math.floor((now - lastTs) / frameMs);
        frame = Math.min(frames - 1, frame + steps);
        lastTs += steps * frameMs;

        introFrameRef.current = frame;
        const src = framePath(clip, frame);
        if (src) {
          prefetchAround(clip, frame, cacheRef.current);
          const ready = isDrawable(cacheRef.current.get(src))
            ? src
            : nearestReadySrc(clip, frame, cacheRef.current);
          if (ready) showFrame(ready);
        }

        const local = frames <= 1 ? 1 : frame / (frames - 1);
        const y = startY + (endY - startY) * local;
        window.scrollTo({ top: y, behavior: "auto" });
        progressRef.current = Math.min(1, y / contentEnd);

        if (frame >= frames - 1) {
          finishIntro();
          return;
        }
      }

      autoPlayRafRef.current = requestAnimationFrame(step);
    };

    autoPlayRafRef.current = requestAnimationFrame(step);
  }, [
    cancelAutoPlay,
    manifest.fps,
    manifest.sections,
    offsets,
    preloadSection,
    showFrame,
  ]);

  useEffect(() => {
    syncCanvasSize();
    const update = () => {
      setVh(window.innerHeight);
      syncCanvasSize();
    };
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [syncCanvasSize]);

  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const cache = cacheRef.current;
    const prev = {
      htmlOX: html.style.overflowX,
      htmlOY: html.style.overflowY,
      bodyOX: body.style.overflowX,
      bodyOY: body.style.overflowY,
      bodyOverflow: body.style.overflow,
      bodyTouch: body.style.touchAction,
      htmlTouch: html.style.touchAction,
      htmlOverscroll: html.style.overscrollBehavior,
      bodyOverscroll: body.style.overscrollBehavior,
      htmlScrollBehavior: html.style.scrollBehavior,
    };
    html.style.overflowX = "clip";
    html.style.overflowY = "scroll";
    html.style.touchAction = "pan-y";
    html.style.overscrollBehavior = "none";
    html.style.scrollBehavior = "auto";
    body.style.overflow = "";
    body.style.overflowX = "clip";
    body.style.overflowY = "visible";
    body.style.touchAction = "pan-y";
    body.style.overscrollBehavior = "none";
    return () => {
      html.style.overflowX = prev.htmlOX;
      html.style.overflowY = prev.htmlOY;
      html.style.touchAction = prev.htmlTouch;
      html.style.overscrollBehavior = prev.htmlOverscroll;
      html.style.scrollBehavior = prev.htmlScrollBehavior;
      body.style.overflow = prev.bodyOverflow;
      body.style.overflowX = prev.bodyOX;
      body.style.overflowY = prev.bodyOY;
      body.style.touchAction = prev.bodyTouch;
      body.style.overscrollBehavior = prev.bodyOverscroll;
      cancelAutoPlay();
      for (const entry of cache.values()) {
        if (typeof ImageBitmap !== "undefined" && entry instanceof ImageBitmap) {
          entry.close();
        }
      }
      cache.clear();
    };
  }, [cancelAutoPlay]);

  useEffect(() => {
    const onScroll = () => {
      if (autoPlayingRef.current) return;
      if (window.scrollY > 24) setShowStart(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // User gesture during Start intro → hand control back immediately (no overflow lock).
  useEffect(() => {
    const interrupt = () => {
      if (!autoPlayingRef.current) return;
      cancelAutoPlay();
    };
    window.addEventListener("wheel", interrupt, { passive: true });
    window.addEventListener("touchstart", interrupt, { passive: true });
    window.addEventListener("keydown", interrupt, { passive: true });
    return () => {
      window.removeEventListener("wheel", interrupt);
      window.removeEventListener("touchstart", interrupt);
      window.removeEventListener("keydown", interrupt);
    };
  }, [cancelAutoPlay]);

  useEffect(() => {
    loadFrame(manifest.opening, cacheRef.current);
    preloadSection(manifest.sections[0]!);
    preloadSection(manifest.sections[1]!);
    if (manifest.sections[2]) preloadSection(manifest.sections[2]);

    // Paint opening once it decodes (no black flash on first paint).
    let tries = 0;
    const waitOpening = () => {
      tries += 1;
      const entry = cacheRef.current.get(manifest.opening);
      if (isDrawable(entry)) {
        showFrame(manifest.opening);
        return;
      }
      if (tries < 120) requestAnimationFrame(waitOpening);
    };
    requestAnimationFrame(waitOpening);
  }, [manifest.opening, manifest.sections, preloadSection, showFrame]);

  useEffect(() => {
    let raf = 0;
    let lastLoopTs = 0;
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
      if (autoPlayingRef.current && introFrameRef.current !== null) {
        lastMoveTs = ts;
        setIdleHint(false);
        raf = requestAnimationFrame(tick);
        return;
      }

      const targetY = window.scrollY;
      const map = resolveScroll(targetY, offsets, manifest.sections.length);
      const section = manifest.sections[map.sectionIndex]!;
      const contentEnd = Math.max(1, offsets[offsets.length - 1] ?? 1);
      progressRef.current = Math.min(1, Math.max(0, targetY / contentEnd));

      if (map.sectionIndex !== lastSection) {
        lastSection = map.sectionIndex;
        setSectionIndex(map.sectionIndex);
        if (map.sectionIndex > 0) setShowStart(false);
        const next = manifest.sections[map.sectionIndex + 1];
        const prev = manifest.sections[map.sectionIndex - 1];
        if (next) preloadSection(next);
        if (prev) preloadSection(prev);
      }

      let desired: string | null = null;
      let activeFrameKey = `${map.sectionIndex}:still`;
      let scrubIdx = 0;

      if (section.mode === "still") {
        desired = section.src ?? manifest.opening;
        loopSectionRef.current = null;
      } else if (section.mode === "scrub") {
        loopSectionRef.current = null;
        scrubIdx = scrubFrameIndex(map.localProgress, section.frameCount ?? 1);
        desired = framePath(section, scrubIdx);
        activeFrameKey = `${map.sectionIndex}:scrub:${scrubIdx}`;
        prefetchAround(section, scrubIdx, cacheRef.current);
      } else if (section.mode === "loop") {
        if (loopSectionRef.current !== section.id) {
          loopSectionRef.current = section.id;
          loopFrameRef.current = 0;
          lastLoopTs = ts;
          // Warm the whole loop so wraps don't hitch.
          preloadSection(section);
        }
        const count = Math.max(1, section.frameCount ?? 1);
        const frameMs = 1000 / manifest.fps;
        if (ts - lastLoopTs >= frameMs) {
          const steps = Math.floor((ts - lastLoopTs) / frameMs);
          loopFrameRef.current = (loopFrameRef.current + steps) % count;
          lastLoopTs += steps * frameMs;
        }
        scrubIdx = loopFrameRef.current;
        desired = framePath(section, scrubIdx);
        activeFrameKey = `${map.sectionIndex}:loop:${scrubIdx}`;
        prefetchAround(section, scrubIdx, cacheRef.current);
      }

      if (desired) {
        const cache = cacheRef.current;
        loadFrame(desired, cache);
        const paintSrc = isDrawable(cache.get(desired))
          ? desired
          : section.mode === "still"
            ? desired
            : nearestReadySrc(section, scrubIdx, cache);
        if (paintSrc) showFrame(paintSrc);
      }

      const scrollMoved = Math.abs(targetY - lastScrollY) > 1;
      const frameChanged = activeFrameKey !== scrubFrameKey;
      if (scrollMoved || frameChanged) {
        lastScrollY = targetY;
        scrubFrameKey = activeFrameKey;
        lastMoveTs = ts;
        setIdleHint(false);
      } else {
        const lastIdx = manifest.sections.length - 1;
        const nearExit =
          map.sectionIndex === lastIdx && map.localProgress >= 0.85;
        const onOpeningStart = map.sectionIndex === 0 && targetY < 24;
        const canHint =
          !exitTriggeredRef.current &&
          !autoPlayingRef.current &&
          !nearExit &&
          !onOpeningStart &&
          targetY > 8;

        if (canHint && ts - lastMoveTs >= IDLE_HINT_MS) {
          setIdleHint(true);
        }
      }

      // Leave the reel once the final clip is nearly done, OR the user has
      // physically reached the bottom of the scroll track (covers vh mismatches).
      const lastIdx = manifest.sections.length - 1;
      const finalClip = manifest.sections[lastIdx]!;
      const finalFrame =
        finalClip.mode === "scrub" && (finalClip.frameCount ?? 0) > 1
          ? scrubFrameIndex(map.localProgress, finalClip.frameCount ?? 1)
          : 0;
      const finalFrameCount = finalClip.frameCount ?? 1;
      const nearLastFrame =
        map.sectionIndex === lastIdx &&
        finalClip.mode === "scrub" &&
        finalFrame >= finalFrameCount - 2;
      const nearLastProgress =
        map.sectionIndex === lastIdx && map.localProgress >= 0.88;
      const maxScroll = Math.max(
        0,
        (document.documentElement.scrollHeight || 0) - window.innerHeight,
      );
      const atDocumentBottom = maxScroll > 0 && targetY >= maxScroll - 12;

      if (
        !exitTriggeredRef.current &&
        !autoPlayingRef.current &&
        (nearLastProgress || nearLastFrame || atDocumentBottom)
      ) {
        setIdleHint(false);
        beginExit();
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [offsets, manifest, preloadSection, beginExit, showFrame]);

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
        <canvas
          ref={canvasRef}
          className="pointer-events-none absolute inset-0 h-full w-full select-none"
          style={{ touchAction: "none" }}
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
        aria-hidden="true"
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
