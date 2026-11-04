import { identity, serializeJsonLd } from "@/lib/agent/readiness";
import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import Script from "next/script";
import { SetHtmlLangDir } from "@/components/providers/SetHtmlLangDir";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { THEME_STORAGE_KEY } from "@/lib/constants";
import "../globals.css";

const themeInitScript = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t);}catch(e){}})();`;

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
  alternates: { canonical: "./" },
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


import { notFound } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { LocaleShell } from "@/components/layout/LocaleShell";
import { LocaleProvider } from "@/components/providers/LocaleProvider";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { isRtl, isValidLocale } from "@/lib/i18n/config";
import type { Locale } from "@/lib/i18n/config";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return [{ locale: "en" }, { locale: "he" }];
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale: localeParam } = await params;
  if (!isValidLocale(localeParam)) notFound();

  const locale = localeParam as Locale;
  const dict = getDictionary(locale);

  return (
    <html
      lang={locale}
      dir={isRtl(locale) ? "rtl" : "ltr"}
      data-theme="dark"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <head>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(identity) }} />
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <link rel="preload" href="/v2/assets/fonts/BricolageGrotesque-latin.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <meta name="theme-color" content="#06080d" />
      </head>
      <body className={`relative min-h-full flex flex-col font-sans lang-${locale}`}>
        <SetHtmlLangDir />
        <ThemeProvider>
          <LocaleProvider locale={locale} dict={dict}>
            <LocaleShell
              header={<Header />}
              footer={<Footer locale={locale} />}
            >
              {children}
            </LocaleShell>
          </LocaleProvider>
        </ThemeProvider>
        <Script src="/chat/widget.js" strategy="afterInteractive" />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
