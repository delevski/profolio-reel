# SR-PTD: Bright theme + background video switch

**Date:** 2026-05-20  
**Task:** Add header theme toggle; swap hero MP4 on bright theme.

## Workflow

1. CSS `[data-theme="light"]` variable overrides in `globals.css`
2. `lib/theme.ts` + `ThemeProvider` + `localStorage` + inline head script (FOUC)
3. `ThemeToggle` in `Header`; `VideoBackground` reads `useTheme()` and `key={theme}`
4. `HERO_VIDEO_SRC_LIGHT` in `constants.ts`; i18n in `messages/en.json` + `he.json`
5. `npm run lint` && `npm run build`

## Outputs

- Dark default; bright on demand
- Separate CloudFront videos per theme

## Notes

- Avoided `next-themes`; eslint disallows setState in mount effect — lazy `useState(readInitialTheme)` + `onLoadStart` for video ready reset
