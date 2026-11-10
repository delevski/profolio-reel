"use client";

import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";

/**
 * Renders a ```mermaid block in the browser. Lazy twice: the mermaid library is only
 * downloaded (dynamic import) once a diagram is about to scroll into view. It follows
 * the site theme (html[data-theme]), re-renders when the theme flips, and is wrapped in
 * dir="ltr" so diagrams are never mirrored on Hebrew pages. securityLevel "strict"
 * because the source is LLM-written.
 */

type Theme = "light" | "dark";

function currentTheme(): Theme {
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

/** Follow html[data-theme] (the site's light/dark switch). */
function subscribeTheme(onChange: () => void) {
  const mo = new MutationObserver(onChange);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  return () => mo.disconnect();
}

const VARS: Record<Theme, Record<string, string>> = {
  dark: {
    background: "transparent",
    primaryColor: "#15224a",
    primaryTextColor: "#eef3ff",
    primaryBorderColor: "#2563eb",
    secondaryColor: "#2a1a14",
    secondaryBorderColor: "#dc5a2c",
    tertiaryColor: "#0d1119",
    lineColor: "#7aa2ff",
    textColor: "#dfe7fb",
    noteBkgColor: "#2a1a14",
    noteTextColor: "#f4efe8",
    clusterBkg: "#0d1426",
    clusterBorder: "#2f3f73",
    edgeLabelBackground: "#0d1119",
  },
  light: {
    background: "transparent",
    primaryColor: "#e8efff",
    primaryTextColor: "#14203d",
    primaryBorderColor: "#2563eb",
    secondaryColor: "#fdebe3",
    secondaryBorderColor: "#dc5a2c",
    tertiaryColor: "#ffffff",
    lineColor: "#3b5bb5",
    textColor: "#1d1722",
    noteBkgColor: "#fdebe3",
    noteTextColor: "#1d1722",
    clusterBkg: "#f1f5ff",
    clusterBorder: "#b7c6ee",
    edgeLabelBackground: "#ffffff",
  },
};

export function MermaidDiagram({ chart, label = "Diagram" }: { chart: string; label?: string }) {
  const uid = "mmd" + useId().replace(/[^a-zA-Z0-9]/g, "");
  const host = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);
  const theme = useSyncExternalStore(subscribeTheme, currentTheme, () => "dark" as Theme);
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  // lazy: only start when the figure is close to the viewport
  useEffect(() => {
    const el = host.current;
    if (!el || typeof IntersectionObserver === "undefined") {
      setNear(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "400px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!near) return;
    let cancelled = false;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          themeVariables: { ...VARS[theme], fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif", fontSize: "16px" },
          flowchart: { curve: "basis", htmlLabels: true, useMaxWidth: false, nodeSpacing: 36, rankSpacing: 42, padding: 12, wrappingWidth: 190 },
        });
        const out = await mermaid.render(`${uid}-${theme}`, chart);
        if (!cancelled) {
          setSvg(out.svg);
          setFailed(false);
        }
      } catch (err) {
        console.warn("mermaid render failed", err);
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [near, theme, chart, uid]);

  return (
    <figure
      ref={host}
      dir="ltr"
      role="img"
      aria-label={label}
      className="mermaid-figure my-8 overflow-x-auto rounded-2xl border border-surface-border bg-surface p-4 sm:p-6"
      data-diagram={failed ? "failed" : svg ? "ready" : "pending"}
    >
      {failed ? (
        <pre className="m-0 overflow-x-auto text-sm text-text-muted">
          <code>{chart}</code>
        </pre>
      ) : svg ? (
        <div
          className="flex justify-center [&_svg]:h-auto [&_svg]:max-w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="min-h-40 animate-pulse rounded-xl bg-surface" aria-hidden="true" />
      )}
      <noscript>
        <pre className="m-0 overflow-x-auto text-sm">
          <code>{chart}</code>
        </pre>
      </noscript>
    </figure>
  );
}
