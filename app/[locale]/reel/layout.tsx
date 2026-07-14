import type { ReactNode } from "react";
import type { Viewport } from "next";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#000000",
};

export default function ReelLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-black text-white touch-pan-y">
      {children}
    </div>
  );
}
