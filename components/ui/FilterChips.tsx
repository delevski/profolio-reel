"use client";

import { SectionHeaderFrame } from "@/components/ui/SectionHeaderFrame";
import { cn } from "@/lib/utils";

export type FilterChipOption = {
  key: string;
  label: string;
};

type FilterChipsProps = {
  options: readonly FilterChipOption[];
  active: string;
  onChange: (key: string) => void;
  isRtl?: boolean;
  className?: string;
};

export function FilterChips({
  options,
  active,
  onChange,
  isRtl = false,
  className,
}: FilterChipsProps) {
  return (
    <SectionHeaderFrame className={cn("mb-8 !p-4 md:!p-4", className)}>
      <div
        className={cn("flex flex-wrap gap-2", isRtl && "justify-end")}
        role="group"
      >
        {options.map((option) => {
          const isActive = active === option.key;
          return (
            <button
              key={option.key}
              type="button"
              aria-pressed={isActive}
              onClick={() => onChange(option.key)}
              className={cn(
                "rounded-full px-4 py-1.5 text-sm transition-colors",
                isActive
                  ? "bg-accent font-medium text-on-accent shadow-sm"
                  : "border border-surface-border bg-surface text-text-muted hover:border-accent/40 hover:text-text"
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </SectionHeaderFrame>
  );
}
