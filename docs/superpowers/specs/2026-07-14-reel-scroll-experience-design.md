# Reel Scroll Experience — Design Spec

**Date:** 2026-07-14  
**Status:** Approved (verbal) — awaiting final review of this written spec  
**Routes:** `/he/reel`, `/en/reel` (direct link only; not in main nav)

---

## Goal

A full-viewport scroll-driven promotional reel: still image → seven video segments as **image sequences**, muted video content, looping background MP3.

## Assets (source)

| Asset | Path | Notes |
|-------|------|-------|
| Opening still | `Desktop/סירטון תדמית/1.png` | 512×512 PNG |
| Clips 1–7 | `Desktop/סירטון תדמית/סירטון{N}.mp4` | ~4–8s, mostly 1280×720 @ 24fps (clip 1 is 1440×1440) |
| Background music | `Downloads/שיר רקע.mp3` | Loop for entire experience |

Processed output lives under `public/reel/` (committed or generated; see Implementation notes).

## User journey (scroll sections)

| Section | Content | Playback mode |
|---------|---------|---------------|
| 0 | `1.png` | Static hero |
| 1 | Sequence from סירטון1 | Scroll scrub (progress → frame) |
| 2 | סירטון2 | Scroll scrub |
| 3 | סירטון3 | Scroll scrub |
| 4 | סירטון4 | **Full loop** while section is in view / pinned |
| 5 | סירטון5 | Scroll scrub |
| 6 | סירטון6 | **Continuous loop** while section active |
| 7 | סירטון7 | Scroll scrub to end |

All sequences: **no video audio**. Only the background MP3 may play sound.

## UX / layout

- Immersive page: **no portfolio Header/Footer** on `/[locale]/reel`.
- Single fixed canvas (full viewport) showing the current still/frame.
- Tall scroll track: each scrub section maps scroll distance to frame index; loop sections have a dedicated scroll height that keeps the loop playing until the user scrolls past.
- Soft cue to scroll (subtle chevron / fade) on section 0 only.
- Background music: looped `<audio>`; start on first user gesture (browser autoplay policy) via a small unmute/play control if needed.
- Locale: same visuals for `he` and `en`; `dir` follows locale.

## Technical approach

**Chosen:** Image sequence + scroll scrubbing (Apple-style).

1. **Extract frames** with ffmpeg → WebP (max width ~720–960px), target ~12 fps effective (sample every 2nd frame from 24fps) to keep payload reasonable (~500–700 frames total).
2. **Manifest** `public/reel/manifest.json`: per-section frame count, path pattern, mode (`scrub` | `loop`), scroll height multiplier.
3. **Client component** `ReelExperience`:
   - Preload nearby section frames (current ±1).
   - `requestAnimationFrame` + scroll listener maps `scrollY` → active section + frame (or drives loop timer for sections 4 & 6).
   - Canvas or `<img>` swap for current frame; prefer canvas for smoother swaps if needed.
4. **Music** at `public/reel/audio/bg.mp3`.

### Loop sections (4 & 6)

While the section’s scroll range is active, advance frames on a timer at sequence fps and wrap to frame 0. Leaving the range freezes on the last shown frame and hands off to the next section.

### Scrub sections (1–3, 5, 7)

`frameIndex = floor(localProgress * (frameCount - 1))` where `localProgress` is 0→1 within that section’s scroll range.

## Out of scope

- Main nav / footer links to `/reel`
- CMS, analytics-specific events beyond existing site defaults
- Replacing the portfolio homepage
- Video `<audio>` tracks from the MP4s

## Success criteria

- [ ] `/he/reel` and `/en/reel` load without nav chrome
- [ ] Scroll advances through image → 1→2→3→4(loop)→5→6(loop)→7
- [ ] No sound from clip-derived content
- [ ] Background MP3 loops after user gesture
- [ ] Usable on mobile (touch scroll) and desktop
- [ ] `npm run lint` / `npm run build` pass

## Implementation notes

- Frame extraction script: `scripts/extract-reel-frames.sh` (re-runnable).
- Large `public/reel/seq/**` may need `.gitignore` + CI/local generation, or LFS; prefer generating locally first and measuring size before committing all frames.
- Do not commit source MP4s into the repo if avoidable; only processed frames + MP3 + opening PNG.
