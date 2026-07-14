# Reel Scroll Experience — Implementation Plan

> **For agentic workers:** Execute task-by-task. Steps use checkbox syntax.

**Goal:** Immersive scroll reel at `/he/reel` and `/en/reel` using image sequences + looping BG music.

**Architecture:** Extract WebP frames from seven MP4s; client `ReelExperience` maps scroll to sections (scrub or loop); locale layout hides Header/Footer on `reel` segment.

**Tech Stack:** Next.js 16 App Router, React 19, ffmpeg, WebP sequences, HTMLAudioElement.

---

## File map

| Path | Role |
|------|------|
| `scripts/extract-reel-frames.sh` | ffmpeg extraction → `public/reel/seq/{n}/` + `manifest.json` |
| `public/reel/opening.png` | Section 0 still |
| `public/reel/audio/bg.mp3` | Looped background music |
| `public/reel/seq/{1..7}/frame-XXXX.webp` | Image sequences |
| `public/reel/manifest.json` | Frame counts + modes |
| `lib/reel/types.ts` | Manifest TypeScript types |
| `components/reel/ReelExperience.tsx` | Scroll engine + canvas/img + audio |
| `components/reel/ReelMusicControl.tsx` | Play/mute control (user gesture) |
| `components/layout/LocaleShell.tsx` | Conditionally render Header/Footer |
| `app/[locale]/layout.tsx` | Use LocaleShell |
| `app/[locale]/reel/page.tsx` | Reel page entry |
| `app/[locale]/reel/layout.tsx` | Minimal metadata / full-bleed styles |

---

### Task 1: Extract frames + manifest

**Files:**
- Create: `scripts/extract-reel-frames.sh`
- Create: `public/reel/seq/**`, `public/reel/manifest.json`

- [ ] Run extraction: every 2nd frame from 24fps (~12fps), scale width 720, WebP q=75
- [ ] Write manifest with sections 0–7 (`still` | `scrub` | `loop`)

---

### Task 2: Locale shell (hide chrome on reel)

**Files:**
- Create: `components/layout/LocaleShell.tsx`
- Modify: `app/[locale]/layout.tsx`

- [ ] `useSelectedLayoutSegment() === "reel"` → children only (no Header/Footer)
- [ ] Otherwise existing Header + main + Footer

---

### Task 3: ReelExperience client

**Files:**
- Create: `lib/reel/types.ts`
- Create: `components/reel/ReelExperience.tsx`
- Create: `components/reel/ReelMusicControl.tsx`
- Create: `app/[locale]/reel/page.tsx`
- Create: `app/[locale]/reel/layout.tsx`

Behavior:
- Section 0: opening.png
- Scrub sections: frame from local scroll progress
- Loop sections 4 & 6: rAF timer while in range
- Preload current ±1 section frames
- Audio loop via music control
- Scroll height ~120vh per scrub section, ~100vh per loop section

---

### Task 4: Verify + docs

- [ ] `npm run lint` && `npm run build`
- [ ] Manual: open `/he/reel`, scroll through all sections, music after click
- [ ] Update `docs/current-state.md`, `docs/decisions.md`, `docs/roadmap.md`, handoff
