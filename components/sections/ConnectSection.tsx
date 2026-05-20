import { Code2, Play, Share2 } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localizedPath } from "@/lib/i18n/navigation";
import { isRtl, type Locale } from "@/lib/i18n/config";
import type { SiteConfig } from "@/lib/types";
import { cn } from "@/lib/utils";

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  LinkedIn: Share2,
  GitHub: Code2,
  X: Share2,
  YouTube: Play,
};

export function ConnectSection({
  site,
  locale,
}: {
  site: SiteConfig;
  locale: Locale;
}) {
  const dict = getDictionary(locale);
  const s = dict.sections.connect;
  const rtl = isRtl(locale);

  return (
    <Section
      id="connect"
      label={s.label}
      title={s.title}
      subtitle={s.subtitle}
      isRtl={rtl}
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {site.social.map((link) => {
          const Icon = iconMap[link.platform] ?? Share2;
          return (
            <a
              key={link.platform}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "group flex flex-col rounded-2xl border border-surface-border bg-surface/90 backdrop-blur-md p-6 transition-all hover:-translate-y-1 hover:border-accent/30",
                rtl && "text-right"
              )}
            >
              <Icon className={cn("mb-3 h-6 w-6 text-accent group-hover:text-accent-2", rtl && "ms-auto")} />
              <span className="font-medium text-text">{link.platform}</span>
              <span className="text-sm text-text-muted">{link.handle}</span>
            </a>
          );
        })}
      </div>
      <div className="mt-10 text-center">
        <Button href={localizedPath(locale, "/contact")}>{s.action}</Button>
      </div>
    </Section>
  );
}
