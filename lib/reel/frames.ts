/**
 * Frame store for the scroll reel.
 *
 * Frames arrive as one "frame pack" per sequence (public/reel/pack/*.rpk, built by
 * scripts/build-reel-packs.mjs): a small header and the WebP frames back to back. The pack is
 * read as a stream, so each frame becomes usable the moment its bytes land, in order. Compressed
 * frames are kept as Blobs (cheap); only a window of frames around what is on screen is decoded
 * into ImageBitmaps (off the main thread), and decoded frames far from it are closed again, so
 * memory stays bounded instead of holding every decoded frame of the whole reel.
 *
 * Without a pack (or if it fails) a sequence falls back to its per-frame JPEGs.
 */

export type Drawable = ImageBitmap | HTMLImageElement;

export type FrameSeq = {
  /** Unique id: the pack URL, or the frame directory. */
  key: string;
  pack?: string;
  dir?: string;
  pattern?: string;
  frameCount: number;
};

export type FocusWindow = {
  key: string;
  center: number;
  /** Frames on each side of center to keep decoded. */
  radius: number;
  /** Loops wrap around (frame 0 follows the last one). */
  wrap?: boolean;
};

type SeqState = {
  seq: FrameSeq;
  blobs: (Blob | undefined)[];
  status: "idle" | "queued" | "loading" | "done" | "error";
};

const MAX_PACK_FETCHES = 2;
const MAX_DECODES = 4;

function framePathOf(seq: FrameSeq, i: number): string | null {
  if (!seq.dir || !seq.pattern) return null;
  return `${seq.dir}/${seq.pattern.replace("%04d", String(i + 1).padStart(4, "0"))}`;
}

function drawableBytes(d: Drawable): number {
  const w = d instanceof HTMLImageElement ? d.naturalWidth : d.width;
  const h = d instanceof HTMLImageElement ? d.naturalHeight : d.height;
  return w * h * 4;
}

export function closeDrawable(d: Drawable | undefined) {
  if (d && typeof ImageBitmap !== "undefined" && d instanceof ImageBitmap) d.close();
}

/** Decode compressed bytes into something drawImage can paint, off the main thread where possible. */
async function decodeBlob(blob: Blob): Promise<Drawable> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(blob);
    } catch {
      /* fall through to <img> */
    }
  }
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } finally {
    // Safe once decode() resolved: the decoded image stays drawable.
    URL.revokeObjectURL(url);
  }
}

/** Load a single still (the opening image) and decode it before it is painted. */
export async function loadStill(src: string): Promise<Drawable> {
  const res = await fetch(src);
  if (!res.ok) throw new Error(`still ${res.status}`);
  return decodeBlob(await res.blob());
}

export class FrameStore {
  private seqs = new Map<string, SeqState>();
  private queue: string[] = [];
  private fetching = 0;
  /** Decoded frames; Map order is least-recently-used first. */
  private bitmaps = new Map<string, Drawable>();
  private bytes = 0;
  private decoding = new Set<string>();
  private focus: FocusWindow[] = [];
  private disposed = false;
  private aborts = new Set<AbortController>();

  constructor(
    private readonly onFrame: (key: string, index: number) => void,
    private readonly budgetBytes: number,
  ) {}

  private state(seq: FrameSeq): SeqState {
    let st = this.seqs.get(seq.key);
    if (!st) {
      st = { seq, blobs: new Array(seq.frameCount), status: "idle" };
      this.seqs.set(seq.key, st);
    }
    return st;
  }

  /** Queue a sequence for download; `urgent` puts it at the front (the clip on screen). */
  load(seq: FrameSeq, urgent = false) {
    if (this.disposed) return;
    const st = this.state(seq);
    if (st.status === "idle") {
      st.status = "queued";
      if (urgent) this.queue.unshift(seq.key);
      else this.queue.push(seq.key);
    } else if (st.status === "queued" && urgent) {
      this.queue = [seq.key, ...this.queue.filter((k) => k !== seq.key)];
    }
    this.pumpFetch();
  }

  private pumpFetch() {
    while (!this.disposed && this.fetching < MAX_PACK_FETCHES && this.queue.length) {
      const key = this.queue.shift()!;
      const st = this.seqs.get(key);
      if (!st || st.status !== "queued") continue;
      st.status = "loading";
      this.fetching += 1;
      const run = st.seq.pack ? this.fetchPack(st).catch(() => this.fetchFrames(st)) : this.fetchFrames(st);
      void run
        .then(() => {
          st.status = st.blobs.some((b) => !b) ? "error" : "done";
        })
        .catch(() => {
          st.status = "error";
        })
        .finally(() => {
          this.fetching -= 1;
          this.pumpFetch();
        });
    }
  }

  private gotBlob(st: SeqState, i: number, blob: Blob) {
    if (this.disposed || st.blobs[i]) return;
    st.blobs[i] = blob;
    if (this.inFocus(st.seq.key, i) >= 0) this.pumpDecode();
  }

  /** Stream a pack: header (magic, count, offsets), then the frames in order. */
  private async fetchPack(st: SeqState) {
    const ac = new AbortController();
    this.aborts.add(ac);
    try {
      const res = await fetch(st.seq.pack!, { signal: ac.signal });
      if (!res.ok || !res.body) throw new Error(`pack ${res.status}`);
      const reader = res.body.getReader();
      let head: Uint8Array<ArrayBuffer> = new Uint8Array(0);
      let data: Uint8Array<ArrayBuffer> | null = null;
      let filled = 0;
      let headerLen = 0;
      let offsets: number[] = [];
      let next = 0;
      let count = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        if (this.disposed) {
          ac.abort();
          return;
        }
        if (!data) {
          const merged = new Uint8Array(head.length + value.length);
          merged.set(head);
          merged.set(value, head.length);
          head = merged;
          if (head.length < 8) continue;
          const dv = new DataView(head.buffer, head.byteOffset, head.byteLength);
          if (String.fromCharCode(head[0]!, head[1]!, head[2]!, head[3]!) !== "RPK1") throw new Error("bad pack");
          count = dv.getUint32(4, true);
          if (count !== st.seq.frameCount) throw new Error("pack frame count mismatch");
          headerLen = 8 + 4 * (count + 1);
          if (head.length < headerLen) continue;
          offsets = [];
          for (let i = 0; i <= count; i++) offsets.push(dv.getUint32(8 + 4 * i, true));
          data = new Uint8Array(headerLen + offsets[count]!);
          filled = Math.min(head.length, data.length);
          data.set(head.subarray(0, filled));
        } else {
          const n = Math.min(value.length, data.length - filled);
          data.set(value.subarray(0, n), filled);
          filled += n;
        }
        while (next < count && filled >= headerLen + offsets[next + 1]!) {
          const bytes = data.subarray(headerLen + offsets[next]!, headerLen + offsets[next + 1]!);
          this.gotBlob(st, next, new Blob([bytes], { type: "image/webp" }));
          next += 1;
        }
      }
      if (next < count) throw new Error("pack truncated");
    } finally {
      this.aborts.delete(ac);
    }
  }

  /** Fallback: the sequence's individual JPEG frames, a few at a time, in order. */
  private async fetchFrames(st: SeqState) {
    const { seq } = st;
    let i = 0;
    const worker = async () => {
      while (!this.disposed && i < seq.frameCount) {
        const idx = i++;
        if (st.blobs[idx]) continue;
        const url = framePathOf(seq, idx);
        if (!url) return;
        try {
          const res = await fetch(url);
          if (res.ok) this.gotBlob(st, idx, await res.blob());
        } catch {
          /* leave the hole; nearest() paints a neighbour */
        }
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
  }

  /** Which frames to keep decoded, most important window first. */
  setFocus(windows: FocusWindow[]) {
    this.focus = windows;
    this.pumpDecode();
  }

  /** Distance rank of a frame inside the focus windows, or -1 when outside all of them. */
  private inFocus(key: string, i: number): number {
    let base = 0;
    for (const w of this.focus) {
      if (w.key === key) {
        const st = this.seqs.get(key);
        const n = st?.seq.frameCount ?? 0;
        let d = Math.abs(i - w.center);
        if (w.wrap && n > 0) d = Math.min(d, n - d);
        if (d <= w.radius) return base + d;
      }
      base += 1000;
    }
    return -1;
  }

  private pumpDecode() {
    if (this.disposed) return;
    for (const w of this.focus) {
      const st = this.seqs.get(w.key);
      if (!st) continue;
      const n = st.seq.frameCount;
      // center, then ahead/behind alternately (ahead first: scrolling forward is the common case)
      for (let d = 0; d <= w.radius; d++) {
        for (const sign of d === 0 ? [1] : [1, -1]) {
          if (this.decoding.size >= MAX_DECODES) return;
          let i = w.center + sign * d;
          if (w.wrap) i = ((i % n) + n) % n;
          if (i < 0 || i >= n) continue;
          const id = `${w.key}#${i}`;
          const blob = st.blobs[i];
          if (!blob || this.bitmaps.has(id) || this.decoding.has(id)) continue;
          this.decoding.add(id);
          void decodeBlob(blob)
            .then((bm) => {
              if (this.disposed) {
                closeDrawable(bm);
                return;
              }
              this.bitmaps.set(id, bm);
              this.bytes += drawableBytes(bm);
              this.evict();
              this.onFrame(w.key, i);
            })
            .catch(() => {
              /* undecodable frame: a neighbour gets painted instead */
            })
            .finally(() => {
              this.decoding.delete(id);
              this.pumpDecode();
            });
        }
      }
    }
  }

  /** Close least-recently-used decoded frames outside the focus windows until under budget. */
  private evict() {
    if (this.bytes <= this.budgetBytes) return;
    for (const [id, bm] of this.bitmaps) {
      if (this.bytes <= this.budgetBytes) break;
      const hash = id.lastIndexOf("#");
      if (this.inFocus(id.slice(0, hash), Number(id.slice(hash + 1))) >= 0) continue;
      this.bitmaps.delete(id);
      this.bytes -= drawableBytes(bm);
      closeDrawable(bm);
    }
  }

  /** The decoded frame, if ready (marks it recently used). */
  get(key: string, i: number): Drawable | null {
    const id = `${key}#${i}`;
    const bm = this.bitmaps.get(id);
    if (!bm) return null;
    this.bitmaps.delete(id);
    this.bitmaps.set(id, bm);
    return bm;
  }

  /** The decoded frame closest to `i` in the same sequence (so a scrub never paints black). */
  nearest(key: string, i: number, frameCount: number): { index: number; frame: Drawable } | null {
    for (let d = 0; d < frameCount; d++) {
      for (const j of d === 0 ? [i] : [i - d, i + d]) {
        if (j < 0 || j >= frameCount) continue;
        const bm = this.bitmaps.get(`${key}#${j}`);
        if (bm) return { index: j, frame: bm };
      }
    }
    return null;
  }

  dispose() {
    this.disposed = true;
    for (const ac of this.aborts) ac.abort();
    this.aborts.clear();
    for (const bm of this.bitmaps.values()) closeDrawable(bm);
    this.bitmaps.clear();
    this.bytes = 0;
    this.seqs.clear();
    this.queue = [];
  }
}
