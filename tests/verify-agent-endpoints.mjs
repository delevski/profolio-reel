import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
const base = process.argv[2] || "http://localhost:3000";
function probe(path, accept, expected, type) {
  const raw = execFileSync("curl", ["-sS", "-L", "-i", "-H", `Accept: ${accept}`, `${base}${path}`], { encoding: "utf8" });
  const parts = raw.split(/\r?\n\r?\n/); let headers, body;
  while (parts[0]?.startsWith("HTTP/")) { headers = parts.shift(); }
  body = parts.join("\n\n");
  assert.match(headers, new RegExp(`^HTTP/[^ ]+ ${expected}\\b`));
  assert.match(headers.toLowerCase(), new RegExp(`content-type: ${type}`));
  if (type === "text/markdown") { assert.match(headers.toLowerCase(), /vary:.*accept/); assert.ok(body.length >= 20); assert.match(body, /^# /); }
  console.log(`${path} | ${accept} | ${headers.split(/\r?\n/)[0]} | ${headers.split(/\r?\n/).filter(l => /^(content-type|vary):/i.test(l)).join(" | ")} | ${body.length} characters`);
  return body;
}
for (const p of ["/", "/en", "/he", "/en/reel", "/he/reel", "/en/about", "/en/contact", "/en/projects", "/en/apps", "/en/blog", "/en/learn", "/en/academy", "/en/privacy"]) {
  probe(p, "text/markdown", 200, "text/markdown");
}
for (const p of ["/__ora-404-probe-qp9j7ffd", "/en/some-path-that-does-not-exist", "/he/some-path-that-does-not-exist", "/en/blog/no-such-post", "/en/learn/no-such-guide"]) {
  assert.match(probe(p, "text/markdown", 404, "text/markdown"), /\[site guide\]\(https:\/\/ordelwebsite.vercel.app\/llms.txt\)/);
}
for (const p of ["/", "/en/reel", "/he/reel"]) {
  const html = probe(p, "text/html", 200, "text/html");
  const json = JSON.parse(html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)[1]);
  assert.equal(json["@graph"][0]["@type"], "Person"); assert.equal(json["@graph"][1]["@type"], "Organization");
}
probe("/", "application/json", 406, "text/plain");
probe("/", "text/markdown;q=1,text/html;q=0.1", 200, "text/markdown");
probe("/", "text/markdown;q=0,text/html", 200, "text/html");
assert.match(probe("/llms.txt", "*/*", 200, "text/plain"), /## When to use this/);
probe("/robots.txt", "*/*", 200, "text/plain");
probe("/sitemap.xml", "*/*", 200, "application/xml");
console.log("All endpoint checks passed.");
