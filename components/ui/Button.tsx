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

// v2 design system buttons (classes in app/ordel-v2.css)
const variants = {
  primary: "btn-primary",
  secondary: "btn-ghost",
  ghost: "btn-text",
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
    "btn btn-sm",
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
