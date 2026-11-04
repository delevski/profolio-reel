"use client";

import { useSelectedLayoutSegment } from "next/navigation";

type Props = {
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
};

/**
 * Inner pages use the v2 shell (fixed header, glow backdrop, footer).
 * /reel keeps its own full-screen experience. The site chat widget is
 * loaded once from the root layout (public/chat/widget.js) on every page.
 */
export function LocaleShell({ header, footer, children }: Props) {
  const segment = useSelectedLayoutSegment();
  if (segment === "reel") return <>{children}</>;

  return (
    <>
      <a className="skip" href="#main">Skip to content</a>
      <div className="page-glow" aria-hidden="true" />
      {header}
      <main id="main" className="v2-main">
        {children}
      </main>
      {footer}
    </>
  );
}
