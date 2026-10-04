import { readFileSync } from "fs";
import path from "path";
import type { Metadata } from "next";
import { ReelExperience } from "@/components/reel/ReelExperience";
import type { ReelManifest } from "@/lib/reel/types";

export const metadata: Metadata = {
  title: "Reel",
  description:
    "Scroll-driven promotional reel — ideas into digital products, powered by AI.",
  robots: { index: true, follow: true },
  openGraph: {
    title: "Or Delevski — Reel",
    description:
      "Scroll-driven promotional reel — ideas into digital products, powered by AI.",
    type: "website",
    images: [
      {
        url: "/reel/og.jpg",
        width: 1200,
        height: 630,
        alt: "Or Delevski Reel",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Or Delevski — Reel",
    description:
      "Scroll-driven promotional reel — ideas into digital products, powered by AI.",
    images: ["/reel/og.jpg"],
  },
  icons: {
    icon: [{ url: "/reel/icon-512.png", type: "image/png", sizes: "512x512" }],
    apple: [{ url: "/reel/icon-512.png", sizes: "512x512" }],
  },
};

function loadManifest(): ReelManifest {
  const file = path.join(process.cwd(), "public/reel/manifest.json");
  return JSON.parse(readFileSync(file, "utf8")) as ReelManifest;
}

export default function ReelPage() {
  const manifest = loadManifest();
  return <ReelExperience manifest={manifest} />;
}
