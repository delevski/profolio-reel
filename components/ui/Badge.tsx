import { cn } from "@/lib/utils";

type BadgeProps = {
  children: React.ReactNode;
  variant?: "default" | "new" | "featured" | "accent";
  className?: string;
};

const variants = {
  default: "bg-surface border-surface-border text-text-muted",
  new: "bg-accent/20 border-accent/40 text-accent",
  featured: "bg-accent-2/20 border-accent-2/40 text-accent-2",
  accent: "bg-surface border-accent/40 text-accent",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
