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
    <SectionHeaderFrame className={cn("mb-8", className)}>
      <div
        className="flex flex-wrap gap-2"
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
              className={cn("v2-chip", isActive && "is-active")}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </SectionHeaderFrame>
  );
}
