/* ORDEL site chat widget — vanilla JS, shared by the v2 home (static) and
   the Next.js inner pages. Talks to /api/agent. Language follows <html lang>.
   No cookies, no tracking; the conversation lives in sessionStorage only. */
(function () {
  if (window.__ordelChat) return;
  window.__ordelChat = true;

  var API = "/api/agent";
  var WA = "https://wa.me/972547917154";
  var T = {
    en: {
      open: "Ask about Or", title: "Ask about Or & ORDEL", sub: "Answers come from this site only",
      ph: "Ask a question…", send: "Send", close: "Close chat",
      hello: "Hi! I can answer questions about Or Delevski, his experience, projects and ORDEL’s services — based on what’s on this site.",
      chips: ["What does ORDEL do?", "Tell me about Or’s experience", "What is LeadFlow?", "How can I contact Or?"],
      soon: "The site assistant is coming soon. Meanwhile, Or is one message away:", wa: "WhatsApp Or",
      err: "Something went wrong on my side. Try again in a moment, or reach Or directly:",
      limit: "That’s a lot of questions in a short time — give it a minute, or message Or directly:",
      thinking: "Thinking…"
    },
    he: {
      open: "שאלו על אור", title: "שאלו על אור ו-ORDEL", sub: "התשובות מבוססות רק על תוכן האתר",
      ph: "כתבו שאלה…", send: "שליחה", close: "סגירת הצ׳אט",
      hello: "היי! אפשר לשאול אותי על אור דלבסקי, הניסיון שלו, הפרויקטים והשירותים של ORDEL — לפי מה שמופיע באתר.",
      chips: ["מה ORDEL עושה?", "ספר על הניסיון של אור", "מה זה LeadFlow?", "איך יוצרים קשר?"],
      soon: "העוזר של האתר יעלה בקרוב. בינתיים, אור במרחק הודעה:", wa: "וואטסאפ לאור",
      err: "משהו השתבש אצלי. נסו שוב עוד רגע, או פנו לאור ישירות:",
      limit: "הרבה שאלות בזמן קצר — נסו שוב בעוד דקה, או כתבו לאור ישירות:",
      thinking: "חושב…"
    }
  };
  function lang() { return (document.documentElement.lang || "en").slice(0, 2) === "he" ? "he" : "en"; }
  function t() { return T[lang()]; }

  var css = "" +
    ".oc-root{--oc-bg:var(--bg,#06080d);--oc-bg2:var(--bg2,#0a0e17);--oc-text:var(--text,#f4efe8);--oc-muted:var(--muted,#a8a4ad);--oc-line:var(--line,rgba(255,255,255,.09));--oc-line2:var(--line2,rgba(255,255,255,.16));--oc-blue:var(--blue,#2563eb);--oc-rust:var(--rust,#dc5a2c);position:fixed;z-index:2147483000;bottom:max(18px,env(safe-area-inset-bottom));inset-inline-end:18px;font-family:var(--f-body,Inter,Heebo,system-ui,sans-serif);color:var(--oc-text)}" +
    ".oc-fab{display:flex;align-items:center;gap:10px;height:54px;padding:0 20px 0 16px;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:var(--oc-blue);color:#fff;font:600 15px/1 var(--f-body,Inter,Heebo,system-ui,sans-serif);cursor:pointer;box-shadow:0 14px 40px -12px rgba(37,99,235,.85),inset 0 1px 0 rgba(255,255,255,.25);transition:transform .35s cubic-bezier(.2,.7,.1,1),box-shadow .35s}" +
    ".oc-fab:hover{transform:translateY(-2px);box-shadow:0 20px 48px -12px rgba(37,99,235,.95),inset 0 1px 0 rgba(255,255,255,.25)}" +
    ".oc-fab svg{width:22px;height:22px;flex-shrink:0}.oc-dot{width:8px;height:8px;border-radius:50%;background:var(--oc-rust);box-shadow:0 0 0 3px rgba(220,90,44,.3)}" +
    ".oc-open .oc-fab{display:none}" +
    ".oc-panel{display:none;flex-direction:column;width:min(390px,calc(100vw - 24px));height:min(600px,calc(100svh - 36px));border-radius:24px;border:1px solid var(--oc-line2);background:var(--oc-bg);box-shadow:0 30px 80px -20px rgba(0,0,0,.6);overflow:hidden}" +
    ".oc-open .oc-panel{display:flex;animation:oc-in .35s cubic-bezier(.2,.7,.1,1)}@keyframes oc-in{from{opacity:0;transform:translateY(14px) scale(.98)}to{opacity:1;transform:none}}" +
    ".oc-head{display:flex;align-items:center;gap:12px;padding:16px 16px 14px 18px;border-bottom:1px solid var(--oc-line);background:linear-gradient(120deg,rgba(37,99,235,.16),transparent 60%),var(--oc-bg2)}" +
    ".oc-head svg.oc-sym{width:34px;height:34px;flex-shrink:0}.oc-ht{flex:1;min-width:0}.oc-ht b{display:block;font:650 16px/1.2 var(--f-display,'Bricolage Grotesque',Heebo,system-ui,sans-serif);letter-spacing:-.01em}.oc-ht span{display:block;font-size:12.5px;color:var(--oc-muted);margin-top:3px}" +
    ".oc-x{width:36px;height:36px;border-radius:999px;border:1px solid var(--oc-line);background:none;color:var(--oc-muted);display:grid;place-items:center;cursor:pointer}.oc-x:hover{color:var(--oc-text);border-color:var(--oc-line2)}.oc-x svg{width:16px;height:16px}" +
    ".oc-log{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;overscroll-behavior:contain}" +
    ".oc-msg{max-width:86%;padding:11px 14px;border-radius:18px;font-size:14.5px;line-height:1.55;white-space:pre-wrap;overflow-wrap:anywhere}" +
    ".oc-bot{align-self:flex-start;background:rgba(127,127,127,.09);border:1px solid var(--oc-line);border-end-start-radius:6px}" +
    ".oc-me{align-self:flex-end;background:var(--oc-blue);color:#fff;border-end-end-radius:6px}" +
    ".oc-msg a{color:inherit;text-decoration:underline;text-underline-offset:3px}.oc-bot a{color:var(--blue2,#6b95ff)}html[data-theme=light] .oc-bot a{color:var(--oc-blue)}" +
    ".oc-wa{display:inline-flex;align-items:center;gap:8px;margin-top:8px;padding:9px 14px;border-radius:999px;background:#25d366;color:#06240f!important;font-weight:600;text-decoration:none!important;font-size:14px}" +
    ".oc-chips{display:flex;flex-wrap:wrap;gap:7px;margin-top:2px}.oc-chip{padding:8px 12px;border-radius:999px;border:1px solid var(--oc-line);background:none;color:var(--oc-muted);font:500 13px/1.2 inherit;font-family:inherit;cursor:pointer;text-align:start}.oc-chip:hover{color:var(--oc-text);border-color:var(--oc-line2)}" +
    ".oc-typing{display:inline-flex;gap:4px}.oc-typing i{width:6px;height:6px;border-radius:50%;background:var(--oc-muted);animation:oc-b 1s infinite}.oc-typing i:nth-child(2){animation-delay:.15s}.oc-typing i:nth-child(3){animation-delay:.3s}@keyframes oc-b{0%,80%,100%{opacity:.25}40%{opacity:1}}" +
    ".oc-form{display:flex;gap:8px;padding:12px;border-top:1px solid var(--oc-line);background:var(--oc-bg2)}" +
    ".oc-in{flex:1;min-width:0;height:46px;padding:0 16px;border-radius:999px;border:1px solid var(--oc-line2);background:var(--oc-bg);color:var(--oc-text);font:15px/1 inherit;font-family:inherit;outline:none}.oc-in:focus{border-color:var(--oc-blue)}.oc-in:focus-visible{outline:none}" +
    ".oc-send{width:46px;height:46px;border-radius:999px;border:0;background:var(--oc-blue);color:#fff;display:grid;place-items:center;cursor:pointer;flex-shrink:0}.oc-send:disabled{opacity:.5;cursor:default}.oc-send svg{width:18px;height:18px}[dir=rtl] .oc-send svg{transform:scaleX(-1)}" +
    ".oc-root :focus-visible{outline:2px solid var(--oc-rust);outline-offset:3px}" +
    "@media (max-width:640px){.oc-root{inset-inline-end:12px;bottom:max(12px,env(safe-area-inset-bottom))}.oc-fab{height:52px;padding:0 16px 0 14px}.oc-fab .oc-lbl{display:none}.oc-fab{width:52px;padding:0;justify-content:center}.oc-fab .oc-dot{display:none}.oc-open{inset:0;bottom:0}.oc-open .oc-panel{width:100vw;height:100svh;border-radius:0;border:0}}" +
    "@media (prefers-reduced-motion:reduce){.oc-open .oc-panel{animation:none}.oc-fab{transition:none}}";

  var SYM = '<svg class="oc-sym" viewBox="0 0 256 256" aria-hidden="true"><path fill="none" stroke="#2563eb" stroke-width="40" stroke-linecap="round" d="M 164.0 39.0 A 96 96 0 1 0 217.0 92.0"/><circle cx="195.9" cy="60.1" r="26" fill="#dc5a2c"/></svg>';
  var ICON_CHAT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4A2.5 2.5 0 0 1 3 13.5"/><path stroke="currentColor" stroke-width="1.9" stroke-linecap="round" d="M8 8.5h8M8 12h5"/></svg>';
  var ICON_X = '<svg viewBox="0 0 24 24" aria-hidden="true"><path stroke="currentColor" stroke-width="2" stroke-linecap="round" d="M6 6l12 12M18 6L6 18"/></svg>';
  var ICON_SEND = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M3.4 20.4 21 12 3.4 3.6l-.01 6.53L15 12 3.39 13.87z"/></svg>';

  var KEY = "ordel-chat-v1";
  var state = { msgs: [], enabled: null, busy: false };
  try { var saved = JSON.parse(sessionStorage.getItem(KEY) || "null"); if (saved && Array.isArray(saved.msgs)) state.msgs = saved.msgs.slice(-20); } catch (e) {}
  function save() { try { sessionStorage.setItem(KEY, JSON.stringify({ msgs: state.msgs.slice(-20) })); } catch (e) {} }

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function safeUrl(u) { return /^(https?:\/\/|\/(?!\/)|mailto:)/i.test(u) ? u : null; }
  function render(text) {
    var out = esc(text);
    out = out.replace(/\[([^\]]{1,80})\]\(([^)\s]{1,300})\)/g, function (m, label, url) {
      var u = safeUrl(url.replace(/&amp;/g, "&")); if (!u) return label;
      var ext = /^https?:/i.test(u);
      return '<a href="' + esc(u) + '"' + (ext ? ' target="_blank" rel="noopener noreferrer"' : "") + ">" + label + "</a>";
    });
    out = out.replace(/(^|[\s(])(https?:\/\/[^\s<)]+)/g, function (m, pre, url) {
      return pre + '<a href="' + url + '" target="_blank" rel="noopener noreferrer">' + url.replace(/^https?:\/\//, "") + "</a>";
    });
    return out.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
  }

  var root, log, input, sendBtn, fab, panel;
  function build() {
    var st = document.createElement("style"); st.id = "ordel-chat-css"; st.textContent = css; document.head.appendChild(st);
    root = document.createElement("div"); root.className = "oc-root"; root.setAttribute("data-ordel-chat", "");
    root.innerHTML =
      '<button class="oc-fab" type="button" aria-haspopup="dialog">' + ICON_CHAT + '<span class="oc-lbl"></span><span class="oc-dot" aria-hidden="true"></span></button>' +
      '<div class="oc-panel" role="dialog" aria-modal="false">' +
        '<div class="oc-head">' + SYM + '<div class="oc-ht"><b></b><span></span></div><button class="oc-x" type="button">' + ICON_X + "</button></div>" +
        '<div class="oc-log" aria-live="polite"></div>' +
        '<form class="oc-form"><input class="oc-in" type="text" maxlength="600" autocomplete="off" enterkeyhint="send"><button class="oc-send" type="submit">' + ICON_SEND + "</button></form>" +
      "</div>";
    document.body.appendChild(root);
    fab = root.querySelector(".oc-fab"); panel = root.querySelector(".oc-panel"); log = root.querySelector(".oc-log");
    input = root.querySelector(".oc-in"); sendBtn = root.querySelector(".oc-send");
    fab.addEventListener("click", open);
    root.querySelector(".oc-x").addEventListener("click", close);
    root.querySelector(".oc-form").addEventListener("submit", function (e) { e.preventDefault(); ask(input.value); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && root.classList.contains("oc-open")) close(); });
    labels();
    new MutationObserver(function () { labels(); if (root.classList.contains("oc-open")) draw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ["lang", "dir"] });
  }
  function labels() {
    var l = t();
    root.setAttribute("dir", lang() === "he" ? "rtl" : "ltr"); root.setAttribute("lang", lang());
    fab.querySelector(".oc-lbl").textContent = l.open; fab.setAttribute("aria-label", l.open);
    panel.setAttribute("aria-label", l.title);
    root.querySelector(".oc-ht b").textContent = l.title; root.querySelector(".oc-ht span").textContent = l.sub;
    root.querySelector(".oc-x").setAttribute("aria-label", l.close);
    input.setAttribute("dir", "auto"); input.placeholder = l.ph; input.setAttribute("aria-label", l.ph); sendBtn.setAttribute("aria-label", l.send);
  }
  function bubble(cls, html) { var d = document.createElement("div"); d.className = "oc-msg " + cls; d.setAttribute("dir", "auto"); d.innerHTML = html; log.appendChild(d); return d; }
  function waLink() { return '<br><a class="oc-wa" href="' + WA + '" target="_blank" rel="noopener noreferrer">' + esc(t().wa) + "</a>"; }
  function draw() {
    log.innerHTML = "";
    var l = t();
    if (state.enabled === false) { bubble("oc-bot", esc(l.soon) + waLink()); input.disabled = true; sendBtn.disabled = true; return; }
    input.disabled = false; sendBtn.disabled = state.busy;
    bubble("oc-bot", esc(l.hello));
    state.msgs.forEach(function (m) { bubble(m.role === "user" ? "oc-me" : "oc-bot", m.role === "user" ? esc(m.content) : render(m.content) + (m.wa ? waLink() : "")); });
    if (!state.msgs.length) {
      var c = document.createElement("div"); c.className = "oc-chips";
      l.chips.forEach(function (q) { var b = document.createElement("button"); b.type = "button"; b.className = "oc-chip"; b.textContent = q; b.addEventListener("click", function () { ask(q); }); c.appendChild(b); });
      log.appendChild(c);
    }
    if (state.busy) bubble("oc-bot", '<span class="oc-typing" aria-label="' + esc(l.thinking) + '"><i></i><i></i><i></i></span>');
    log.scrollTop = log.scrollHeight;
  }
  function status() {
    if (state.enabled !== null) return Promise.resolve();
    return fetch(API, { method: "GET", headers: { accept: "application/json" } })
      .then(function (r) { return r.ok ? r.json() : { enabled: false }; })
      .then(function (j) { state.enabled = !!(j && j.enabled); })
      .catch(function () { state.enabled = false; });
  }
  function open() {
    root.classList.add("oc-open"); fab.setAttribute("aria-expanded", "true");
    draw();
    status().then(function () { draw(); if (state.enabled && window.matchMedia("(min-width:641px)").matches) input.focus(); });
  }
  function close() { root.classList.remove("oc-open"); fab.setAttribute("aria-expanded", "false"); fab.focus(); }
  function ask(q) {
    q = String(q || "").trim(); if (!q || state.busy || state.enabled === false) return;
    input.value = ""; state.msgs.push({ role: "user", content: q.slice(0, 600) }); state.busy = true; save(); draw();
    fetch(API, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ locale: lang(), messages: state.msgs.map(function (m) { return { role: m.role, content: m.content }; }) }) })
      .then(function (r) { return r.json().catch(function () { return {}; }).then(function (j) { return { s: r.status, j: j }; }); })
      .then(function (x) {
        if (x.s === 503 && x.j && x.j.error === "coming_soon") { state.enabled = false; state.msgs.pop(); return; }
        if (x.s === 200 && x.j && x.j.reply) { state.msgs.push({ role: "assistant", content: String(x.j.reply).slice(0, 2000) }); return; }
        state.msgs.push({ role: "assistant", content: x.s === 429 ? t().limit : t().err, wa: true });
      })
      .catch(function () { state.msgs.push({ role: "assistant", content: t().err, wa: true }); })
      .then(function () { state.busy = false; save(); draw(); if (state.enabled) input.focus(); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build); else build();
})();
