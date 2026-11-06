"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { ChevronDown, Play } from "lucide-react";
import type { ReelManifest, ReelSection } from "@/lib/reel/types";
import { FrameStore, loadStill, type Drawable, type FocusWindow, type FrameSeq } from "@/lib/reel/frames";
import { ReelMusicControl, type ReelMusicHandle } from "@/components/reel/ReelMusicControl";
import { ReelCaptions } from "@/components/reel/ReelCaptions";
import { useLocale } from "@/components/providers/LocaleProvider";
import { reelOpeningCopy } from "@/lib/reel/opening";

const IDLE_HINT_MS = 1000;
/** Keep this many decoded frames on each side of the current scrub frame. */
const DECODE_RADIUS = 14;
/** Decode the first frames of the next clip ahead of time, so entering it is instant. */
const NEXT_CLIP_WARM = 6;
/** Upper bound for decoded frames held at once (compressed frames are kept separately). */
const DECODED_BUDGET_BYTES = 128 * 1024 * 1024;
/**
 * Scroll track beyond the clips: one screen (the last scroll position still shows a full
 * viewport) plus a little room after the last frame.
 */
const TRACK_EXTRA_VH = 120;

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

function scrubFrameIndex(localProgress: number, frameCount: number): number {
  const count = Math.max(1, frameCount);
  if (count <= 1) return 0;
  return Math.min(
    count - 1,
    Math.max(0, Math.round(localProgress * (count - 1))),
  );
}

/**
 * The frames a section plays on this screen: the locale's own frames when it has them
 * (the ending shows that language's home page), the portrait set on a phone held upright,
 * and the narrow (center-cropped) pack on canvases that only show a landscape frame's middle.
 */
function resolveSeq(
  s: ReelSection,
  locale: string,
  portrait: boolean,
  narrow: boolean,
): FrameSeq | null {
  if (s.mode === "still" || !s.pattern || !s.frameCount) return null;
  const o = { ...s, ...(s.locales?.[locale] ?? {}) };
  let dir = o.dir;
  let pack = o.pack;
  if (portrait && o.portraitDir) {
    dir = o.portraitDir;
    pack = o.portraitPack;
  } else if (narrow && o.narrowPack) {
    pack = o.narrowPack;
  }
  if (!dir) return null;
  return { key: pack ?? dir, pack, dir, pattern: s.pattern, frameCount: s.frameCount };
}

function sourceSize(source: Drawable): [number, number] {
  return source instanceof HTMLImageElement
    ? [source.naturalWidth, source.naturalHeight]
    : [source.width, source.height];
}

/** object-cover draw into a canvas sized to CSS pixels × DPR. */
function drawCover(
  ctx: CanvasRenderingContext2D,
  source: Drawable,
  canvasW: number,
  canvasH: number,
) {
  const [sw, sh] = sourceSize(source);
  if (sw <= 0 || sh <= 0) return;

  const scale = Math.max(canvasW / sw, canvasH / sh);
  const dw = sw * scale;
  const dh = sh * scale;
  const dx = (canvasW - dw) / 2;
  const dy = (canvasH - dh) / 2;
  ctx.drawImage(source, dx, dy, dw, dh);
}

const PORTRAIT_QUERY = "(orientation: portrait)";
function subscribePortrait(onChange: () => void) {
  const mq = window.matchMedia(PORTRAIT_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

export function ReelExperience({ manifest }: Props) {
  // Sections may ship a portrait frame set (portraitDir) for phones held upright,
  // where object-cover would otherwise crop a landscape frame to its middle strip.
  const portrait = useSyncExternalStore(
    subscribePortrait,
    () => window.matchMedia(PORTRAIT_QUERY).matches,
    () => false,
  );
  const { locale } = useLocale();
  // Read from the window on the first client render (it changes no markup), so the very first
  // downloads already pick the right frame set; measure() keeps it current.
  const [narrow, setNarrow] = useState(
    () =>
      typeof window !== "undefined" &&
      manifest.narrowAspect !== undefined &&
      window.innerWidth / Math.max(1, window.innerHeight) <= manifest.narrowAspect,
  );
  const seqs = useMemo(
    () => manifest.sections.map((s) => resolveSeq(s, locale, portrait, narrow)),
    [manifest.sections, locale, portrait, narrow],
  );
  // On the portrait ending the last frames are the mobile home page; finish the
  // caption sequence before them so no caption covers its buttons. Landscape
  // keeps the captions running to the reel's end.
  const captionsEndAt = useMemo(() => {
    if (!portrait) return 1;
    const sections = manifest.sections;
    const last = sections[sections.length - 1];
    const cut = last?.portraitDir ? last.portraitCaptionsEnd : undefined;
    if (cut === undefined) return 1;
    const total = sections.reduce((sum, s) => sum + s.scrollVh, 0);
    if (total <= 0) return 1;
    return (total - last.scrollVh + last.scrollVh * cut) / total;
  }, [manifest.sections, portrait]);
  const captionsEndAtRef = useRef(captionsEndAt);
  useEffect(() => {
    captionsEndAtRef.current = captionsEndAt;
  }, [captionsEndAt]);
  const trackRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fadeRef = useRef<HTMLDivElement>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const storeRef = useRef<FrameStore | null>(null);
  const openingRef = useRef<Drawable | null>(null);
  const shownIdRef = useRef<string | null>(null);
  const shownFrameRef = useRef<Drawable | null>(null);
  const canvasSizeRef = useRef({ w: 0, h: 0, dpr: 1 });
  const maxScrollRef = useRef(0);
  const loopFrameRef = useRef(0);
  const loopSectionRef = useRef<number | null>(null);
  const progressRef = useRef(0);
  const autoPlayRafRef = useRef(0);
  const autoPlayingRef = useRef(false);
  const introFrameRef = useRef<number | null>(null);
  const exitTriggeredRef = useRef(false);
  const tickRafRef = useRef(0);
  const tickFnRef = useRef<((ts: number) => void) | null>(null);
  const musicRef = useRef<ReelMusicHandle>(null);
  const [vh, setVh] = useState(() =>
    typeof window !== "undefined" ? (window.visualViewport?.height ?? window.innerHeight) : 800,
  );
  const [sectionIndex, setSectionIndex] = useState(0);
  const [showStart, setShowStart] = useState(true);
  const [showIdleHint, setShowIdleHint] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [exiting, setExiting] = useState(false);
  const idleHintVisibleRef = useRef(false);

  // The reel maps window.scrollY to its clips and leaves for the home page once
  // the scroll reaches the end. Arriving by a client-side link from far down a
  // long page (e.g. the footer "Reel" link on /projects) can carry that page's
  // scroll offset into the first frame, which read as "already at the end" and
  // bounced straight back to the home page. Always start the reel at the top.
  // ("instant": the site CSS sets scroll-behavior: smooth, which would animate
  // the jump and leave the first frames reading the old offset.)
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  const totalVh = useMemo(
    () => manifest.sections.reduce((sum, s) => sum + s.scrollVh, 0),
    [manifest.sections],
  );
  const trackVh = totalVh + TRACK_EXTRA_VH;

  const offsets = useMemo(
    () => buildOffsets(manifest.sections, vh),
    [manifest.sections, vh],
  );

  /** Run one reel update on the next animation frame (coalesces scroll, decode and resize events). */
  const schedule = useCallback(() => {
    if (tickRafRef.current) return;
    tickRafRef.current = requestAnimationFrame((ts) => {
      tickRafRef.current = 0;
      tickFnRef.current?.(ts);
    });
  }, []);

  /** Paint a decoded frame; `id` names it so the same frame is never painted twice in a row. */
  const showFrame = useCallback((id: string, frame: Drawable | null) => {
    if (!frame || id === shownIdRef.current) return;
    const ctx = ctxRef.current;
    const { w, h } = canvasSizeRef.current;
    if (!ctx || w <= 0 || h <= 0) return;
    try {
      drawCover(ctx, frame, w, h);
    } catch {
      return; // a frame closed under us; the next tick paints a live one
    }
    shownIdRef.current = id;
    shownFrameRef.current = frame;
  }, []);

  /** Paint frame `index` of a sequence, or the nearest decoded one while it decodes. */
  const showSeqFrame = useCallback(
    (seq: FrameSeq, index: number) => {
      const store = storeRef.current;
      if (!store) return;
      const exact = store.get(seq.key, index);
      if (exact) {
        showFrame(`${seq.key}#${index}`, exact);
        return;
      }
      const near = store.nearest(seq.key, index, seq.frameCount);
      if (near) showFrame(`${seq.key}#${near.index}`, near.frame);
    },
    [showFrame],
  );

  /** Canvas backing store = the canvas's real CSS box × DPR (it is 100svh/100dvh tall, not innerHeight). */
  const syncCanvasSize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const rect = canvas.getBoundingClientRect();
    const cssW = rect.width || window.innerWidth;
    const cssH = rect.height || window.innerHeight;
    const w = Math.max(1, Math.round(cssW * dpr));
    const h = Math.max(1, Math.round(cssH * dpr));
    const aspect = manifest.narrowAspect;
    setNarrow(aspect !== undefined && cssW / cssH <= aspect);
    const prev = canvasSizeRef.current;
    if (prev.w === w && prev.h === h && prev.dpr === dpr) return;
    canvas.width = w;
    canvas.height = h;
    canvasSizeRef.current = { w, h, dpr };
    const ctx = canvas.getContext("2d", { alpha: false });
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctxRef.current = ctx;
      // Re-paint the last frame after resize so the canvas never goes blank.
      const frame = shownFrameRef.current;
      if (frame) {
        try {
          drawCover(ctx, frame, w, h);
        } catch {
          shownIdRef.current = null;
        }
      }
    }
  }, [manifest.narrowAspect]);

  /**
   * Real viewport measurement. The clip offsets must use the same pixel size of "1vh" as the
   * scroll track (which is laid out in CSS vh), otherwise the reel's timing drifts from the
   * scroll length: with the old fixed 800px, tall screens ran out of clips early and jumped home.
   * Taken from the track's laid-out height, with visualViewport/innerHeight as the fallback.
   */
  const measure = useCallback(() => {
    const track = trackRef.current;
    let unit = 0;
    if (track) {
      const h = track.getBoundingClientRect().height;
      if (h > 0) unit = h / trackVh;
    }
    if (!(unit > 0)) unit = (window.visualViewport?.height ?? window.innerHeight) / 100;
    const next = Math.round(unit * 100 * 100) / 100;
    setVh((prev) => (Math.abs(prev - next) > 0.5 ? next : prev));
    maxScrollRef.current = Math.max(
      0,
      (document.documentElement.scrollHeight || 0) - window.innerHeight,
    );
    syncCanvasSize();
  }, [trackVh, syncCanvasSize]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  useEffect(() => {
    const onResize = () => {
      measure();
      schedule();
    };
    const vv = window.visualViewport;
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    vv?.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      vv?.removeEventListener("resize", onResize);
    };
  }, [measure, schedule]);

  const cancelAutoPlay = useCallback(() => {
    if (autoPlayRafRef.current) {
      cancelAnimationFrame(autoPlayRafRef.current);
      autoPlayRafRef.current = 0;
    }
    autoPlayingRef.current = false;
    introFrameRef.current = null;
    setIsAutoPlaying(false);
    schedule();
  }, [schedule]);

  const beginExit = useCallback(() => {
    if (exitTriggeredRef.current) return;
    exitTriggeredRef.current = true;
    setExiting(true);
    // Same locale as the reel route: /he/reel → /he, /en/reel → /en
    const target = `/${locale}`;

    autoPlayingRef.current = false;
    introFrameRef.current = null;

    // The fade is written straight to the overlay's style: no React render per frame.
    const durationMs = 700;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / durationMs);
      const eased = t * t * (3 - 2 * t);
      if (fadeRef.current) fadeRef.current.style.opacity = String(eased);
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
    const seq = seqs[1];
    if (!clip || clip.mode !== "scrub" || !seq) return;

    cancelAutoPlay();
    setShowStart(false);
    setSectionIndex(1);
    const store = storeRef.current;
    store?.load(seq, true);
    if (seqs[2]) store?.load(seqs[2]);

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

    store?.setFocus([{ key: seq.key, center: 0, radius: DECODE_RADIUS }]);
    showSeqFrame(seq, 0);
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
      schedule();
    };

    const step = (now: number) => {
      if (!autoPlayingRef.current) return;

      if (now - lastTs >= frameMs) {
        const steps = Math.floor((now - lastTs) / frameMs);
        frame = Math.min(frames - 1, frame + steps);
        lastTs += steps * frameMs;

        introFrameRef.current = frame;
        store?.setFocus([{ key: seq.key, center: frame, radius: DECODE_RADIUS }]);
        showSeqFrame(seq, frame);

        const local = frames <= 1 ? 1 : frame / (frames - 1);
        const y = startY + (endY - startY) * local;
        window.scrollTo({ top: y, behavior: "auto" });
        progressRef.current = Math.min(1, y / contentEnd);

        if (frame >= frames - 1) {
          finishIntro();
          return;
        }
      } else {
        // Frame not due yet, but it may have finished decoding since the last paint.
        showSeqFrame(seq, frame);
      }

      autoPlayRafRef.current = requestAnimationFrame(step);
    };

    autoPlayRafRef.current = requestAnimationFrame(step);
  }, [
    cancelAutoPlay,
    manifest.fps,
    manifest.sections,
    offsets,
    seqs,
    schedule,
    showSeqFrame,
  ]);

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
    };
  }, [cancelAutoPlay]);

  // The frame store lives as long as the reel is mounted (created before the effects below use it).
  useEffect(() => {
    const store = new FrameStore(() => schedule(), DECODED_BUDGET_BYTES);
    storeRef.current = store;
    return () => {
      store.dispose();
      if (storeRef.current === store) storeRef.current = null;
    };
  }, [schedule]);

  // Scroll: a passive listener that only schedules one rAF update (no work per scroll event).
  useEffect(() => {
    const onScroll = () => {
      schedule();
      if (autoPlayingRef.current) return;
      if (window.scrollY > 24) setShowStart(false);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [schedule]);

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

  // Progressive preload: the opening still, then the first two clips; later clips are queued
  // as the scroll approaches them (see the section change in the tick below).
  useEffect(() => {
    let cancelled = false;
    void loadStill(manifest.opening)
      .then((still) => {
        if (cancelled) return;
        openingRef.current = still;
        schedule();
      })
      .catch(() => {});
    // The clip packs are ~1 MB each: start them once the page has loaded and gone idle so they
    // don't compete with the first paint on mobile. Start/scroll still load them on demand.
    let idleId = 0;
    let timer = 0;
    const warm = () => {
      if (cancelled) return;
      const store = storeRef.current;
      if (seqs[1]) store?.load(seqs[1], true);
      if (seqs[2]) store?.load(seqs[2]);
    };
    const afterLoad = () => {
      const w = window as Window & {
        requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
      };
      if (w.requestIdleCallback) idleId = w.requestIdleCallback(warm, { timeout: 1500 });
      else timer = window.setTimeout(warm, 300);
    };
    if (document.readyState === "complete") afterLoad();
    else window.addEventListener("load", afterLoad, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", afterLoad);
      const w = window as Window & { cancelIdleCallback?: (id: number) => void };
      if (idleId && w.cancelIdleCallback) w.cancelIdleCallback(idleId);
      if (timer) window.clearTimeout(timer);
    };
  }, [manifest.opening, seqs, schedule]);

  useEffect(() => {
    let lastLoopTs = 0;
    let lastSection = -1;
    let lastScrollY = window.scrollY;
    let lastMoveTs = performance.now();
    let scrubFrameKey = "";
    let focusKey = "";
    let idleTimer = 0;

    const setIdleHint = (visible: boolean) => {
      if (idleHintVisibleRef.current === visible) return;
      idleHintVisibleRef.current = visible;
      setShowIdleHint(visible);
    };

    const setFocus = (windows: FocusWindow[]) => {
      const key = windows.map((w) => `${w.key}@${w.center}/${w.radius}`).join("|");
      if (key === focusKey) return;
      focusKey = key;
      storeRef.current?.setFocus(windows);
    };

    const tick = (ts: number) => {
      if (autoPlayingRef.current && introFrameRef.current !== null) {
        lastMoveTs = ts;
        setIdleHint(false);
        return; // the intro drives its own frames; it reschedules us when it ends
      }

      const store = storeRef.current;
      const targetY = window.scrollY;
      const map = resolveScroll(targetY, offsets, manifest.sections.length);
      const section = manifest.sections[map.sectionIndex]!;
      const seq = seqs[map.sectionIndex] ?? null;
      const nextSeq = seqs[map.sectionIndex + 1] ?? null;
      const contentEnd = Math.max(1, offsets[offsets.length - 1] ?? 1);
      progressRef.current = Math.min(1, Math.max(0, targetY / contentEnd));
      let again = false;

      if (map.sectionIndex !== lastSection) {
        lastSection = map.sectionIndex;
        setSectionIndex(map.sectionIndex);
        if (map.sectionIndex > 0) setShowStart(false);
        // Progressive preload: this clip first, then the next two, then the one behind.
        if (seq) store?.load(seq, true);
        if (nextSeq) store?.load(nextSeq);
        const after = seqs[map.sectionIndex + 2];
        if (after) store?.load(after);
        const prev = seqs[map.sectionIndex - 1];
        if (prev) store?.load(prev);
      }

      let activeFrameKey = `${map.sectionIndex}:still`;
      const warmNext: FocusWindow[] = nextSeq
        ? [{ key: nextSeq.key, center: 0, radius: NEXT_CLIP_WARM }]
        : [];

      if (section.mode === "still" || !seq) {
        loopSectionRef.current = null;
        setFocus(warmNext);
        const still = openingRef.current;
        if (still) showFrame(`still:${section.src ?? manifest.opening}`, still);
      } else if (section.mode === "scrub") {
        loopSectionRef.current = null;
        const idx = scrubFrameIndex(map.localProgress, seq.frameCount);
        activeFrameKey = `${map.sectionIndex}:scrub:${idx}`;
        setFocus([{ key: seq.key, center: idx, radius: DECODE_RADIUS }, ...warmNext]);
        showSeqFrame(seq, idx);
      } else if (section.mode === "loop") {
        if (loopSectionRef.current !== section.id) {
          loopSectionRef.current = section.id;
          loopFrameRef.current = 0;
          lastLoopTs = ts;
        }
        const count = Math.max(1, seq.frameCount);
        const frameMs = 1000 / manifest.fps;
        if (ts - lastLoopTs >= frameMs) {
          const steps = Math.floor((ts - lastLoopTs) / frameMs);
          loopFrameRef.current = (loopFrameRef.current + steps) % count;
          lastLoopTs += steps * frameMs;
        }
        const idx = loopFrameRef.current;
        activeFrameKey = `${map.sectionIndex}:loop:${idx}`;
        // Keep the whole loop decoded so wraps don't hitch.
        setFocus([
          { key: seq.key, center: 0, radius: Math.ceil(count / 2), wrap: true },
          ...warmNext,
        ]);
        showSeqFrame(seq, idx);
        again = true; // loops play on their own clock
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
        // Portrait ending: no "Scroll" hint over the home page's buttons either.
        const pastCaptions =
          captionsEndAtRef.current < 1 &&
          progressRef.current >= captionsEndAtRef.current;
        const canHint =
          !exitTriggeredRef.current &&
          !pastCaptions &&
          !autoPlayingRef.current &&
          !nearExit &&
          !onOpeningStart &&
          targetY > 8;

        if (canHint && ts - lastMoveTs >= IDLE_HINT_MS) {
          setIdleHint(true);
        }
      }
      // Wake up once the scroll has rested long enough for the idle hint.
      window.clearTimeout(idleTimer);
      if (!idleHintVisibleRef.current && !again) {
        idleTimer = window.setTimeout(schedule, Math.max(0, IDLE_HINT_MS - (ts - lastMoveTs)) + 20);
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
      const maxScroll = maxScrollRef.current;
      const atDocumentBottom = maxScroll > 0 && targetY >= maxScroll - 12;

      if (
        !exitTriggeredRef.current &&
        !autoPlayingRef.current &&
        (nearLastProgress || nearLastFrame || atDocumentBottom)
      ) {
        setIdleHint(false);
        beginExit();
      }

      if (again) schedule();
    };

    tickFnRef.current = tick;
    schedule();
    return () => {
      window.clearTimeout(idleTimer);
      if (tickFnRef.current === tick) tickFnRef.current = null;
    };
  }, [offsets, manifest, seqs, beginExit, schedule, showFrame, showSeqFrame]);

  useEffect(
    () => () => {
      if (tickRafRef.current) cancelAnimationFrame(tickRafRef.current);
      tickRafRef.current = 0;
    },
    [],
  );

  const startLabel = locale === "he" ? "התחל" : "Start";
  const opening = reelOpeningCopy(locale);
  const showOpeningTitle =
    sectionIndex === 0 && !isAutoPlaying && !exiting;

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
            <p
              className="relative mb-4 text-xs font-medium uppercase tracking-[0.28em] text-white/80 sm:text-sm"
              style={{ textShadow: "0 2px 14px rgba(0,0,0,0.7)" }}
              dir="ltr"
            >
              {opening.eyebrow}
            </p>
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
            <ul className="relative mx-auto mt-6 flex max-w-2xl flex-nowrap items-stretch justify-center gap-2 sm:mt-8 sm:gap-4">
              {opening.stats.map((s) => (
                <li
                  key={s.value}
                  className="min-w-0 flex-1 rounded-2xl border border-white/20 bg-black/35 px-2 py-3 backdrop-blur-sm sm:min-w-[8.5rem] sm:flex-none sm:px-5"
                >
                  <span className="block font-serif text-2xl leading-none text-white sm:text-3xl" dir="ltr">
                    {s.value}
                  </span>
                  <span className="mt-1.5 block text-[0.65rem] uppercase tracking-[0.08em] text-white/75 sm:text-xs sm:tracking-[0.12em]">
                    {s.label}
                  </span>
                </li>
              ))}
            </ul>
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

      {showIdleHint && !showStart && !isAutoPlaying && !exiting && (
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

      <ReelCaptions locale={locale} progressRef={progressRef} endAt={captionsEndAt} />

      <ReelMusicControl ref={musicRef} src={manifest.audio} />

      <div
        ref={fadeRef}
        className="pointer-events-none fixed inset-0 z-[60] bg-black"
        style={{
          opacity: 0,
          transition: "opacity 40ms linear",
        }}
        aria-hidden
      />
    </div>
  );
}
