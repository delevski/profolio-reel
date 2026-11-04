# ORDEL portfolio redesign (v2) — preview build

Static, dependency-free redesign of the home page (EN + HE/RTL), proposed by Tab for Or.
Lives in `public/v2/` so it ships alongside the current Next.js site **without changing it**:

- EN: `/v2/index.html`  ·  HE: `/v2/he/index.html`
- Live preview (same files): https://ordel-preview.sites.tab.bot/

## What's inside
- `index.html`, `he/index.html` — semantic HTML, dark-first, light theme toggle, Heebo for Hebrew.
- `hero.js` — three.js `Points` + custom `ShaderMaterial`: particles start as code glyphs and assemble into the ORDEL mark
  (sampled from the logo on an offscreen canvas), mouse "lens" repel, scatter on scroll. 6k particles desktop / 2.2k mobile,
  DPR capped at 1.5, loaded after first paint, paused off-screen / hidden tab, static logo for reduced motion / no WebGL.
- `assets/three.hero.min.js` — three.js r170 (MIT), tree-shaken to the 12 classes `hero.js` uses (477 KB vs 692 KB full build), vendored so there is no CDN dependency.
- `assets/img/or-delevski-ring.webp` — circular headshot shown inside the particle ring (10 KB). Its diameter and centre are computed in `hero.js` from the same sampled ring geometry the particles use (inner edge − 1.2% breathing − ~2px jitter − an even gap of 12px at the 460px mark, proportional below, min 7px), so it stays centred on resize, any DPR, EN and HE. It fades/scales in over the last 0.6s of the assembly and fades out with the scroll scatter; it sits below the particle canvas, so the ring and the rust dot always draw on top. No-WebGL fallback: CSS-centred at 48.2% of the mark.
- `assets/img/*` — project screenshots from `public/projects`, LeadFlow screens (demo workspace, sample data), portrait.

## Placeholders for Or to fill (marked `data-placeholder` in the HTML)
1. `leadflow-result` — one real customer result / quote for LeadFlow.
2. `talks-media` — talks, podcasts or press.

## Porting
To make it the real home page, the sections map 1:1 to React components (hero, LeadFlow case study, work grid,
services + process, experience timeline, testimonials, learn, contact). Content is taken verbatim from the current site/CV.
Not merged, not deployed.
