# ORDEL — Personal Portfolio

A [yuv.ai](https://yuv.ai/)-inspired personal portfolio built with Next.js, featuring a warm stone/amber/teal design system.

## Stack

- Next.js 16 (App Router)
- Tailwind CSS v4
- MDX content (blog + learn guides)
- Framer Motion animations

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Languages

- **English:** http://localhost:3000/en
- **Hebrew (RTL):** http://localhost:3000/he

Use the **עברית / English** toggle in the nav to switch. Visiting `/` redirects to your preferred locale (cookie or default `en`).

## Content

Edit files in `content/`:

- `site.en.json` / `site.he.json` — hero, bio, social links
- `projects.json` — GitHub repos with `description.en` and `description.he`
- `projects.json`, `apps.json`, `courses.json`, etc.
- `blog/*.mdx` and `learn/*.mdx` — articles and tutorials

## Scripts

- `npm run dev` — development server
- `npm run build` — production build
- `npm run start` — production server
- `npm run lint` — ESLint

## Production

**Live:** https://ordelwebsite.vercel.app (Vercel project `ordel_website`)

- English: https://ordelwebsite.vercel.app/en
- Hebrew: https://ordelwebsite.vercel.app/he

## Environment

`NEXT_PUBLIC_SITE_URL` — set in Vercel for sitemap and robots (production: `https://ordelwebsite.vercel.app`). Local default: `https://ordel.dev`.
