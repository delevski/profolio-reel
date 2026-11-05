#!/usr/bin/env node
/**
 * Pack the reel's JPEG frame sequences into one WebP "frame pack" per sequence.
 *
 *   node scripts/build-reel-packs.mjs
 *
 * Source of truth stays public/reel/seq/<dir>/frame-%04d.jpg (scripts/extract-reel-frames.sh).
 * For every sequence the manifest references (dir, portraitDir, and per-locale overrides)
 * this writes public/reel/pack/<dir>.<hash>.rpk and records its path next to the dir in
 * public/reel/manifest.json (pack / portraitPack). Re-run after changing any frames.
 *
 * Landscape sequences also get a "narrow" pack (narrowPack / per-locale narrowPack): the same
 * frames center-cropped to manifest.narrowAspect (width / height). A phone held upright only ever
 * shows that middle strip of a landscape frame (the canvas draws object-cover, centered), so it
 * downloads and decodes the strip instead of the whole frame; the visible pixels are the same.
 *
 * Pack layout (little endian):
 *   "RPK1" | uint32 count | uint32 offsets[count + 1] | frame bytes (WebP, back to back)
 * offsets are relative to the end of the header, so frame i is data[offsets[i] .. offsets[i+1]).
 * One request per sequence instead of ~100, frames stream in order, and the file name carries a
 * content hash so it can be cached immutably.
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PUBLIC = path.join(ROOT, "public");
const MANIFEST = path.join(PUBLIC, "reel/manifest.json");
const PACK_DIR = path.join(PUBLIC, "reel/pack");
const QUALITY = 80;
/** Narrow packs cover any canvas with width / height <= this (phones upright, in-app browsers too). */
const NARROW_ASPECT = 0.66;

const manifest = JSON.parse(readFileSync(MANIFEST, "utf8"));

async function buildPack(dir, pattern, frameCount, narrow = false) {
  const abs = path.join(PUBLIC, dir);
  const frames = [];
  for (let i = 1; i <= frameCount; i++) {
    const name = pattern.replace("%04d", String(i).padStart(4, "0"));
    const jpg = readFileSync(path.join(abs, name));
    let img = sharp(jpg);
    if (narrow) {
      const { width, height } = await sharp(jpg).metadata();
      const w = Math.min(width, Math.ceil((height * NARROW_ASPECT) / 2) * 2);
      img = img.extract({ left: Math.round((width - w) / 2), top: 0, width: w, height });
    }
    frames.push(await img.webp({ quality: QUALITY, effort: 6, smartSubsample: true }).toBuffer());
  }
  const header = Buffer.alloc(8 + 4 * (frames.length + 1));
  header.write("RPK1", 0, "ascii");
  header.writeUInt32LE(frames.length, 4);
  let off = 0;
  frames.forEach((f, i) => {
    header.writeUInt32LE(off, 8 + 4 * i);
    off += f.length;
  });
  header.writeUInt32LE(off, 8 + 4 * frames.length);
  const buf = Buffer.concat([header, ...frames]);
  const hash = createHash("sha256").update(buf).digest("hex").slice(0, 10);
  const base = dir.replace(/^\/reel\/seq\//, "").replace(/\//g, "-") + (narrow ? "n" : "");
  const file = `${base}.${hash}.rpk`;
  writeFileSync(path.join(PACK_DIR, file), buf);
  console.log(`${dir}: ${frames.length} frames, ${(buf.length / 1e6).toFixed(2)} MB -> /reel/pack/${file}`);
  return `/reel/pack/${file}`;
}

rmSync(PACK_DIR, { recursive: true, force: true });
mkdirSync(PACK_DIR, { recursive: true });

manifest.narrowAspect = NARROW_ASPECT;
for (const s of manifest.sections) {
  if (s.mode === "still" || !s.pattern || !s.frameCount) continue;
  if (s.dir) {
    s.pack = await buildPack(s.dir, s.pattern, s.frameCount);
    // Sections with their own portrait frames never draw a narrow landscape strip.
    if (!s.portraitDir) s.narrowPack = await buildPack(s.dir, s.pattern, s.frameCount, true);
    else delete s.narrowPack;
  }
  if (s.portraitDir) s.portraitPack = await buildPack(s.portraitDir, s.pattern, s.frameCount);
  for (const o of Object.values(s.locales ?? {})) {
    if (o.dir) {
      o.pack = await buildPack(o.dir, s.pattern, s.frameCount);
      if (!(o.portraitDir ?? s.portraitDir)) o.narrowPack = await buildPack(o.dir, s.pattern, s.frameCount, true);
      else delete o.narrowPack;
    }
    if (o.portraitDir) o.portraitPack = await buildPack(o.portraitDir, s.pattern, s.frameCount);
  }
}

// The opening still: same pixels as opening.png, as WebP.
if (manifest.openingSource) {
  const src = path.join(PUBLIC, manifest.openingSource);
  const out = manifest.openingSource.replace(/\.png$/i, ".webp");
  writeFileSync(path.join(PUBLIC, out), await sharp(readFileSync(src)).webp({ quality: 90, effort: 6 }).toBuffer());
  manifest.opening = out;
  for (const s of manifest.sections) if (s.mode === "still") s.src = out;
  console.log(`opening: ${manifest.openingSource} -> ${out}`);
}

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 2) + "\n");
console.log("manifest updated");
