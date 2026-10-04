import type { ReactNode } from "react";
import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function ReelLayout({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-[100dvh] bg-black text-white touch-pan-y">
      {children}
    </main>
  );
}
