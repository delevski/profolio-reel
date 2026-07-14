"use client";

import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { SectionHeaderFrame } from "@/components/ui/SectionHeaderFrame";
import { cn } from "@/lib/utils";

type SectionProps = {
  id?: string;
  label?: string;
  title: string;
  subtitle?: string;
  action?: { label: string; href: string };
  children: React.ReactNode;
  className?: string;
  isRtl?: boolean;
};

export function Section({
  id,
  label,
  title,
  subtitle,
  action,
  children,
  className,
  isRtl = false,
}: SectionProps) {
  const Arrow = isRtl ? ArrowLeft : ArrowRight;

  return (
    <section id={id} className={cn("py-20 md:py-24", className)}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeaderFrame
          className={cn(
            "mb-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
            isRtl && "sm:flex-row-reverse"
          )}
        >
          <div className={cn(isRtl && "text-right sm:text-right")}>
            {label && (
              <p className="mb-2 text-sm font-medium uppercase tracking-widest text-accent">
                {label}
              </p>
            )}
            <h2 className="font-serif text-3xl text-text md:text-4xl">{title}</h2>
            {subtitle && (
              <p className="mt-3 max-w-2xl text-text-muted" suppressHydrationWarning>
                {subtitle}
              </p>
            )}
          </div>
          {action && (
            <Link
              href={action.href}
              className={cn(
                "group inline-flex shrink-0 items-center gap-2 text-sm font-medium text-accent-2 transition-colors hover:text-accent",
                isRtl && "flex-row-reverse"
              )}
            >
              {action.label}
              <Arrow
                className={cn(
                  "h-4 w-4 transition-transform",
                  isRtl
                    ? "group-hover:-translate-x-1"
                    : "group-hover:translate-x-1"
                )}
              />
            </Link>
          )}
        </SectionHeaderFrame>
        {children}
      </div>
    </section>
  );
}
