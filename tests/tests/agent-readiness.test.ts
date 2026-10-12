import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";
import { NextRequest } from "next/server";
import { identity, preferredFormat, serializeJsonLd } from "../lib/agent/readiness";
import { middleware } from "../middleware";

test("Accept negotiation respects quality, specificity and HTML defaults", () => {
  for (const value of [null, "*/*", "text/html", "text/html, text/markdown", "text/markdown;q=0, */*;q=1"]) assert.equal(preferredFormat(value), "html");
  for (const value of ["text/markdown", "text/markdown;q=0.9, text/html;q=0.5", "text/markdown, */*;q=0.1"]) assert.equal(preferredFormat(value), "markdown");
  for (const value of ["application/json", "text/html;q=0, text/markdown;q=0"]) assert.equal(preferredFormat(value), "none");
});
test("Markdown homepage, reel and missing paths rewrite without locale redirect", () => {
  for (const path of ["/", "/en/reel", "/he/reel", "/missing", "/en/missing"]) {
    const r = middleware(new NextRequest(`https://example.com${path}`, { headers: { Accept: "text/markdown" } }));
    const target = new URL(r.headers.get("x-middleware-rewrite")!);
    assert.equal(target.pathname, "/api/markdown"); assert.equal(target.searchParams.get("path"), path);
    assert.equal(r.headers.get("vary"), "Accept");
  }
});
test("HTML keeps locale cookies; assets and APIs bypass negotiation", () => {
  const r = middleware(new NextRequest("https://example.com/", { headers: { Accept: "text/html", Cookie: "NEXT_LOCALE=he" } }));
  assert.equal(r.headers.get("location"), "https://example.com/he");
  assert.equal(r.headers.get("vary"), "Accept");
  for (const path of ["/llms.txt", "/api/agent", "/_next/static/a.js", "/reel/frame.jpg"]) {
    const r = middleware(new NextRequest(`https://example.com${path}`, { headers: { Accept: "text/markdown" } }));
    assert.equal(r.headers.get("x-middleware-next"), "1");
  }
});
test("Unsupported representation is 406", () => {
  assert.equal(middleware(new NextRequest("https://example.com/en", { headers: { Accept: "application/json" } })).status, 406);
});
test("Identity has Person and Organization, published contact and city only", () => {
  const org = identity["@graph"][1];
  assert.equal(identity["@graph"][0]["@type"], "Person");
  assert.equal(org["@type"], "Organization");
  assert.equal(org.contactPoint?.email, "ordi1985@gmail.com");
  assert.equal(org.contactPoint?.telephone, "+972-54-7917154");
  assert.equal(org.address?.addressLocality, "Ramat-Gan");
  assert.equal(org.address?.addressCountry, "IL");
  assert.ok(!("streetAddress" in (org.address ?? {})));
  assert.equal(JSON.parse(serializeJsonLd(identity))["@context"], "https://schema.org");
  assert.ok(!serializeJsonLd({ value: "</script>" }).includes("<"));
});
test("llms.txt keeps required H1/summary and H2 sections as linked file lists", () => {
  const text = fs.readFileSync("public/llms.txt", "utf8");
  assert.match(text, /^# Or Delevski\n\n> /);
  assert.match(text, /When to use this site:/); assert.match(text, /Accept: text\/markdown/);
  for (const section of text.split(/^## /m).slice(1)) {
    const lines = section.trim().split("\n").slice(1).filter((l) => l.trim());
    assert.ok(lines.length > 0); for (const l of lines) assert.match(l, /^- \[[^\]]+\]\(https:\/\/[^)]+\): /);
  }
});
