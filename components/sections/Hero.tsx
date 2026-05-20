"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { localizedPath } from "@/lib/i18n/navigation";
import { isRtl, type Locale } from "@/lib/i18n/config";
import type { SiteConfig } from "@/lib/types";
import { cn } from "@/lib/utils";

const PROFILE_IMAGE = "/profile_img.png";

export function Hero({ site, locale }: { site: SiteConfig; locale: Locale }) {
  const rtl = isRtl(locale);
  const Arrow = rtl ? ArrowLeft : ArrowRight;

  const [name, ...supportingLines] = site.tagline;
  const showEyebrow =
    site.subtitle.trim().length > 0 && site.subtitle !== supportingLines[0];

  return (
    <section className="relative overflow-hidden pt-10 pb-16 md:pt-14 md:pb-20">
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div
          className={cn(
            "flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8 lg:gap-10",
            rtl && "sm:flex-row-reverse"
          )}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6 }}
            className="relative z-10 w-[9.5rem] shrink-0 sm:w-36 md:w-40 lg:w-44"
          >
            <div className="relative aspect-[4/5] overflow-hidden rounded-2xl border border-surface-border bg-surface/90 shadow-xl shadow-[0_0_32px_var(--accent-glow)] backdrop-blur-md">
              <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-accent/20 ring-inset" />
              <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br from-accent/20 via-transparent to-accent-2/20 opacity-60" />
              <Image
                src={PROFILE_IMAGE}
                alt={site.name}
                fill
                priority
                sizes="(max-width: 640px) 152px, (max-width: 1024px) 160px, 176px"
                className="object-cover object-top"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className={cn(
              "relative z-10 min-w-0 flex-1 text-center",
              rtl ? "sm:text-right" : "sm:text-left"
            )}
          >
            {showEyebrow && (
              <p className="mb-2 text-xs font-medium uppercase tracking-[0.2em] text-accent-2">
                {site.subtitle}
              </p>
            )}
            <h1 className="space-y-2">
              <span className="block font-serif text-2xl leading-tight text-text sm:text-3xl lg:text-[2rem]">
                {name}
              </span>
              {supportingLines.map((line, i) => (
                <span
                  key={i}
                  className={cn(
                    "block font-sans font-normal leading-snug",
                    i === 0
                      ? "text-sm text-accent-2/90 sm:text-base"
                      : "text-xs text-text-muted sm:text-sm"
                  )}
                >
                  {line}
                </span>
              ))}
            </h1>
          <div
            className={cn(
              "mt-5 flex flex-wrap gap-1.5",
              rtl ? "justify-center sm:justify-end" : "justify-center sm:justify-start"
            )}
          >
            {site.badges.map((badge) => (
              <Badge key={badge} variant="accent">
                {badge}
              </Badge>
            ))}
          </div>
          <div
            className={cn(
              "mt-6 flex flex-wrap gap-3",
              rtl
                ? "flex-row-reverse justify-center sm:justify-end"
                : "justify-center sm:justify-start"
            )}
          >
            <Button
              href={site.cv.href}
              download={site.cv.filename}
              className="px-5 py-2 text-sm"
            >
              {site.cv.label}
            </Button>
            <Button
              href={localizedPath(locale, site.cta.href)}
              variant="secondary"
              className="px-5 py-2 text-sm"
            >
              <span
                className={cn(
                  "inline-flex items-center gap-2",
                  rtl && "flex-row-reverse"
                )}
              >
                {site.cta.label}
                <Arrow className="h-4 w-4" />
              </span>
            </Button>
          </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
