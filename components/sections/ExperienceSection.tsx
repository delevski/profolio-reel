import { Badge } from "@/components/ui/Badge";
import type { SiteConfig } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ExperienceSection({
  experience,
  title,
  isRtl = false,
}: {
  experience: SiteConfig["experience"];
  title: string;
  isRtl?: boolean;
}) {
  return (
    <section className="mt-16">
      <h2
        className={cn(
          "mb-8 font-serif text-2xl text-text",
          isRtl && "text-right"
        )}
      >
        {title}
      </h2>
      <div className="space-y-10">
        {experience.map((role) => (
          <article
            key={`${role.company}-${role.period}`}
            className={cn(
              "rounded-2xl border border-surface-border bg-surface/90 p-6 backdrop-blur-md",
              isRtl && "text-right"
            )}
          >
            <div
              className={cn(
                "mb-4 flex flex-wrap items-baseline justify-between gap-2",
                isRtl && "flex-row-reverse"
              )}
            >
              <div>
                <h3 className="font-serif text-xl text-text">{role.title}</h3>
                <p className="text-accent">{role.company}</p>
              </div>
              <p className="text-sm text-text-muted">{role.period}</p>
            </div>
            <ul
              className={cn(
                "mb-4 list-disc space-y-2 ps-5 text-sm text-text-muted",
                isRtl && "list-inside text-right"
              )}
            >
              {role.bullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
            <div className={cn("flex flex-wrap gap-2", isRtl && "justify-end")}>
              {role.stack.map((tech) => (
                <Badge key={tech}>{tech}</Badge>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
