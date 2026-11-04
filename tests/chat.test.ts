import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { retrieve, tokenize, knowledgeSize } from "../lib/agent/retrieve";

let server: http.Server;
let lastBody: { model?: string; system?: string; messages?: unknown[] } = {};
before(async () => {
  server = http.createServer((req, res) => {
    let b = "";
    req.on("data", (d) => (b += d));
    req.on("end", () => {
      if (req.headers["x-api-key"] !== "test-key") { res.writeHead(401); return res.end("{}"); }
      lastBody = JSON.parse(b || "{}");
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ content: [{ type: "text", text: "mock answer" }] }));
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const addr = server.address() as { port: number };
  process.env.ANTHROPIC_BASE_URL = `http://127.0.0.1:${addr.port}`;
});
after(() => server.close());

const post = (body: unknown, ip = "1.1.1.1") =>
  new Request("http://x/api/agent", { method: "POST", headers: { "content-type": "application/json", "x-real-ip": ip }, body: JSON.stringify(body) });

test("knowledge file is built from site content", () => {
  assert.ok(knowledgeSize > 20);
});

test("tokenize strips Hebrew prefixes", () => {
  assert.ok(tokenize("והפרויקטים").includes("הפרויקטים"));
});

test("retrieval finds experience and LeadFlow chunks (EN + HE)", () => {
  assert.ok(retrieve("Where did Or work before? PayBox", "en").some((c) => /PayBox/.test(c.text)));
  assert.ok(retrieve("What is LeadFlow?", "en").some((c) => /LeadFlow/.test(c.text)));
  assert.ok(retrieve("מה זה LeadFlow", "he").some((c) => c.lang === "he"));
});

test("no key → coming soon (GET disabled, POST 503)", async () => {
  delete process.env.ANTHROPIC_API_KEY;
  const { GET, POST } = await import("../app/api/agent/route");
  assert.deepEqual(await (await GET()).json(), { enabled: false });
  const r = await POST(post({ locale: "en", messages: [{ role: "user", content: "hi" }] }));
  assert.equal(r.status, 503);
});

test("with key → calls Anthropic with site-only system prompt and model from env", async () => {
  process.env.ANTHROPIC_API_KEY = "test-key";
  process.env.ANTHROPIC_MODEL = "claude-test-model";
  const { GET, POST } = await import("../app/api/agent/route");
  assert.deepEqual(await (await GET()).json(), { enabled: true });
  const r = await POST(post({ locale: "he", messages: [{ role: "user", content: "מה הניסיון של אור ב-PayBox?" }] }, "2.2.2.2"));
  assert.equal(r.status, 200);
  assert.equal((await r.json()).reply, "mock answer");
  assert.equal(lastBody.model, "claude-test-model");
  assert.match(lastBody.system ?? "", /ONLY the SITE CONTENT/);
  assert.match(lastBody.system ?? "", /Hebrew/);
  assert.match(lastBody.system ?? "", /PayBox/);
});

test("bad input → 400; rate limit → 429", async () => {
  process.env.ANTHROPIC_API_KEY = "test-key";
  const { POST } = await import("../app/api/agent/route");
  assert.equal((await POST(post({ messages: [] }, "3.3.3.3"))).status, 400);
  let last = 0;
  for (let i = 0; i < 10; i++) last = (await POST(post({ messages: [{ role: "user", content: "q" + i }] }, "4.4.4.4"))).status;
  assert.equal(last, 429);
});
