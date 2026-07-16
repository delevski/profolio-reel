import { cn } from "@/lib/utils";

type SectionHeaderFrameProps = {
  children: React.ReactNode;
  className?: string;
  dir?: "ltr" | "rtl";
};

/** Readable title panel over full-screen video background */
export function SectionHeaderFrame({
  children,
  className,
  dir,
}: SectionHeaderFrameProps) {
  return (
    <div
      dir={dir}
      className={cn(
        "section-header-frame rounded-2xl border border-surface-border bg-surface/95 p-5 shadow-[var(--card-shadow)] backdrop-blur-xl md:p-6",
        className
      )}
    >
      {children}
    </div>
  );
}
