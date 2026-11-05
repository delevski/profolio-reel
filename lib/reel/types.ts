export type ReelSectionMode = "still" | "scrub" | "loop";

export type ReelSection = {
  id: number;
  mode: ReelSectionMode;
  src?: string;
  dir?: string;
  /** Optional frames for portrait screens (same frameCount/pattern), used instead of `dir`. */
  portraitDir?: string;
  /**
   * Portrait only: local progress (0..1) of this section by which the reel
   * captions must be gone, so they never sit on top of the frames after it.
   */
  portraitCaptionsEnd?: number;
  frameCount?: number;
  pattern?: string;
  scrollVh: number;
  /** WebP frame pack of `dir` (scripts/build-reel-packs.mjs); the JPEGs in `dir` are the fallback. */
  pack?: string;
  /** Pack of `portraitDir`. */
  portraitPack?: string;
  /**
   * Pack of `dir` center-cropped to the manifest's narrowAspect, for canvases at least that narrow
   * (only that middle strip of a landscape frame is ever visible there).
   */
  narrowPack?: string;
  /** Per-locale frames for this section (e.g. an ending that shows that locale's home page). */
  locales?: Partial<
    Record<string, Pick<ReelSection, "dir" | "portraitDir" | "pack" | "portraitPack" | "narrowPack">>
  >;
};

export type ReelManifest = {
  fps: number;
  opening: string;
  audio: string;
  /** @deprecated Exit URL is derived from the active locale (`/{locale}`). */
  exitUrl?: string;
  sections: ReelSection[];
  /** width / height at or below which sections use their narrowPack. */
  narrowAspect?: number;
};

export function framePath(section: ReelSection, index: number): string | null {
  if (section.mode === "still" && section.src) return section.src;
  if (!section.dir || !section.pattern || !section.frameCount) return null;
  const n = Math.max(0, Math.min(section.frameCount - 1, index));
  // pattern is frame-%04d.jpg — pad 1-based index (ffmpeg starts at 0001)
  const name = section.pattern.replace("%04d", String(n + 1).padStart(4, "0"));
  return `${section.dir}/${name}`;
}
