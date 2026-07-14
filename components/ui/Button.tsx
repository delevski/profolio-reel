import Link from "next/link";
import { cn } from "@/lib/utils";

type ButtonProps = {
  href?: string;
  variant?: "primary" | "secondary" | "ghost";
  className?: string;
  children: React.ReactNode;
  onClick?: () => void;
  type?: "button" | "submit";
  download?: string;
  external?: boolean;
};

const variants = {
  primary:
    "bg-accent text-on-accent font-semibold hover:bg-amber-500 shadow-[0_0_24px_var(--accent-glow)]",
  secondary:
    "border border-surface-border bg-surface/90 text-text backdrop-blur-md hover:border-accent/50",
  ghost: "text-text-muted hover:text-text",
};

export function Button({
  href,
  variant = "primary",
  className,
  children,
  onClick,
  type = "button",
  download,
  external,
}: ButtonProps) {
  const classes = cn(
    "inline-flex items-center justify-center gap-2 rounded-full px-6 py-2.5 text-sm transition-all duration-200",
    variants[variant],
    className
  );

  if (href && (download || external)) {
    return (
      <a
        href={href}
        className={classes}
        download={download}
        target={external ? "_blank" : undefined}
        rel={external ? "noopener noreferrer" : undefined}
      >
        {children}
      </a>
    );
  }

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={classes}>
      {children}
    </button>
  );
}
