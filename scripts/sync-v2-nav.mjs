// Keeps the static v2 home pages (public/v2/index.html, public/v2/he/index.html) on the same
// header menu as the React <Header /> (components/layout/Header.tsx). Both read lib/nav-items.json
// and the labels in messages/{en,he}.json. Run on prebuild; `--check` only verifies (used by tests).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(join(root, p), "utf8");
const nav = JSON.parse(read("lib/nav-items.json"));
const targets = [
  { locale: "en", file: "public/v2/index.html" },
  { locale: "he", file: "public/v2/he/index.html" },
];

export function navLinksHtml(locale) {
  const dict = JSON.parse(read(`messages/${locale}.json`));
  return (
    '<div class="nav-links" id="navlinks">' +
    nav.items.map((i) => `<a href="/${locale}${i.href}">${dict.nav[i.key]}</a>`).join("") +
    "</div>"
  );
}

export function syncedHtml(locale, html) {
  return html
    .replace(/<div class="nav-links" id="navlinks">.*?<\/div>/s, navLinksHtml(locale))
    .replace(/(<header class="site-head" id="top">\s*<nav[^>]*>\s*<a class="brand" href=")[^"]*"/, `$1/${locale}"`);
}

const check = process.argv.includes("--check");
let stale = false;
for (const { locale, file } of targets) {
  const cur = read(file);
  const next = syncedHtml(locale, cur);
  if (cur !== next) {
    stale = true;
    if (!check) writeFileSync(join(root, file), next);
    console.log(`${check ? "stale" : "updated"}: ${file}`);
  }
}
if (check && stale) process.exit(1);
