import { cn } from "@/lib/utils";

type BadgeProps = {
  children: React.ReactNode;
  variant?: "default" | "new" | "featured" | "accent";
  className?: string;
};

const variants = {
  default: "",
  new: "is-accent",
  featured: "is-blue",
  accent: "is-accent",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "v2-tag font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
