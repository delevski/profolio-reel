import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { DM_Sans, Fraunces, Heebo } from "next/font/google";
import { SetHtmlLangDir } from "@/components/providers/SetHtmlLangDir";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { THEME_STORAGE_KEY } from "@/lib/constants";
import "./globals.css";

const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light")document.documentElement.setAttribute("data-theme","light");}catch(e){}})();`;

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
});

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://ordelwebsite.vercel.app",
  ),
  title: {
    default: "Or Delevski — CTO / VP R&D & Technology Leader",
    template: "%s | Or Delevski",
  },
  description:
    "Innovative technology leader with 15+ years of experience in R&D, product innovation, and scaling high-performance engineering teams. Expert in cloud architecture, AI-powered solutions, automation, and mobile platforms.",
  keywords: [
    "CTO",
    "VP R&D",
    "Technology Leader",
    "Software Development",
    "AI",
    "Mobile Development",
    "Fintech",
  ],
  icons: {
    icon: [{ url: "/favicon.ico" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "512x512" }],
  },
  openGraph: {
    type: "website",
    siteName: "Or Delevski",
    title: "Or Delevski — CTO / VP R&D & Technology Leader",
    description:
      "Innovative technology leader with 15+ years of experience in R&D, product innovation, and scaling high-performance engineering teams.",
    images: [
      {
        url: "/og.jpg",
        width: 1200,
        height: 630,
        alt: "Or Delevski",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Or Delevski — CTO / VP R&D & Technology Leader",
    description:
      "Innovative technology leader with 15+ years of experience in R&D, product innovation, and scaling high-performance engineering teams.",
    images: ["/og.jpg"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      dir="ltr"
      className={`${dmSans.variable} ${fraunces.variable} ${heebo.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="relative min-h-full flex flex-col font-sans">
        <SetHtmlLangDir />
        <ThemeProvider>{children}</ThemeProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
