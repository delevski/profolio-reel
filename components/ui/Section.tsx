"use client";

import Link from "@/components/ui/SiteLink";
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
    <section id={id} className={cn("py-14 md:py-20", className)}>
      <div className="wrap">
        <SectionHeaderFrame
          dir={isRtl ? "rtl" : "ltr"}
          className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
        >
          <div>
            {label && (
              <p className="kicker">{label}</p>
            )}
            <h2 className="v2-h2 text-text">{title}</h2>
            {subtitle && (
              <p className="mt-3 max-w-2xl text-text-muted" suppressHydrationWarning>
                {subtitle}
              </p>
            )}
          </div>
          {action && (
            <Link
              href={action.href}
              className="group btn btn-sm btn-ghost shrink-0"
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
