export type ReelSectionMode = "still" | "scrub" | "loop";

export type ReelSection = {
  id: number;
  mode: ReelSectionMode;
  src?: string;
  dir?: string;
  frameCount?: number;
  pattern?: string;
  scrollVh: number;
};

export type ReelManifest = {
  fps: number;
  opening: string;
  audio: string;
  /** Smooth handoff URL after the final section completes. */
  exitUrl?: string;
  sections: ReelSection[];
};

export function framePath(section: ReelSection, index: number): string | null {
  if (section.mode === "still" && section.src) return section.src;
  if (!section.dir || !section.pattern || !section.frameCount) return null;
  const n = Math.max(0, Math.min(section.frameCount - 1, index));
  // pattern is frame-%04d.jpg — pad 1-based index (ffmpeg starts at 0001)
  const name = section.pattern.replace("%04d", String(n + 1).padStart(4, "0"));
  return `${section.dir}/${name}`;
}
