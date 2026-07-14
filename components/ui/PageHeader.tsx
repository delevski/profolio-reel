import { SectionHeaderFrame } from "@/components/ui/SectionHeaderFrame";
import { cn } from "@/lib/utils";

type PageHeaderProps = {
  label?: string;
  title: string;
  subtitle?: string;
  isRtl?: boolean;
};

export function PageHeader({ label, title, subtitle, isRtl = false }: PageHeaderProps) {
  return (
    <div className="py-8 md:py-10">
      <div
        className={cn(
          "mx-auto max-w-7xl px-4 sm:px-6 lg:px-8",
          isRtl && "text-right"
        )}
      >
        <SectionHeaderFrame>
          {label && (
            <p className="mb-2 text-sm font-medium uppercase tracking-widest text-accent">
              {label}
            </p>
          )}
          <h1 className="font-serif text-4xl text-text md:text-5xl">{title}</h1>
          {subtitle && (
            <p className="mt-4 max-w-2xl text-lg text-text-muted">{subtitle}</p>
          )}
        </SectionHeaderFrame>
      </div>
    </div>
  );
}
