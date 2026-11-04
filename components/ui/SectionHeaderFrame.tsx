import { cn } from "@/lib/utils";

type SectionHeaderFrameProps = {
  children: React.ReactNode;
  className?: string;
  dir?: "ltr" | "rtl";
};

/** Section / page heading block — v2 style (no boxed panel, just type). */
export function SectionHeaderFrame({ children, className, dir }: SectionHeaderFrameProps) {
  return (
    <div dir={dir} className={cn("section-header-frame", className)}>
      {children}
    </div>
  );
}
