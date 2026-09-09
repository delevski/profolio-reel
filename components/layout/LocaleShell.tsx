"use client";

import { useSelectedLayoutSegment } from "next/navigation";
import { VideoBackground } from "@/components/layout/VideoBackground";
import { AgentWidget } from "@/components/agent/AgentWidget";

type Props = {
  header: React.ReactNode;
  footer: React.ReactNode;
  children: React.ReactNode;
};

export function LocaleShell({ header, footer, children }: Props) {
  const segment = useSelectedLayoutSegment();
  const isReel = segment === "reel";

  if (isReel) {
    return (
      <>
        {children}
        <AgentWidget />
      </>
    );
  }

  return (
    <>
      <VideoBackground />
      <div className="relative z-10 flex min-h-full flex-col">
        {header}
        <main className="flex-1">{children}</main>
        {footer}
        <AgentWidget />
      </div>
    </>
  );
}
