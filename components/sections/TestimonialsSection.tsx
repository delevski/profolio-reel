import { Quote } from "lucide-react";
import { Section } from "@/components/ui/Section";
import { Badge } from "@/components/ui/Badge";
import { getTestimonials } from "@/lib/content";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { isRtl, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

export function TestimonialsSection({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const testimonials = getTestimonials(locale);
  const featured = testimonials.find((t) => t.featured);
  const others = testimonials.filter((t) => !t.featured);
  const s = dict.sections.testimonials;
  const rtl = isRtl(locale);

  return (
    <Section
      id="testimonials"
      label={s.label}
      title={s.title}
      subtitle={s.subtitle}
      isRtl={rtl}
    >
      <div className="grid gap-6 lg:grid-cols-3">
        {featured && (
          <div
            className={cn(
              "relative rounded-2xl border border-accent/30 bg-surface/90 backdrop-blur-md p-8 lg:col-span-2 ring-1 ring-accent/20",
              rtl && "text-right"
            )}
          >
            <Badge variant="featured" className="mb-4">
              {s.featured}
            </Badge>
            <Quote className={cn("mb-4 h-8 w-8 text-accent/50", rtl && "ms-auto")} />
            <blockquote className="mb-6 text-lg leading-relaxed text-text">
              &ldquo;{featured.quote}&rdquo;
            </blockquote>
            <div>
              <p className="font-semibold text-text">{featured.name}</p>
              <p className="text-sm text-text-muted">
                {featured.role} · {featured.company}
              </p>
            </div>
          </div>
        )}
        <div className="flex flex-col gap-6">
          {others.map((t) => (
            <div
              key={t.id}
              className={cn(
                "flex flex-1 flex-col rounded-2xl border border-surface-border bg-surface/90 backdrop-blur-md p-6",
                rtl && "text-right"
              )}
            >
              <Quote className={cn("mb-3 h-5 w-5 text-accent/40", rtl && "ms-auto")} />
              <blockquote className="mb-4 flex-1 text-sm leading-relaxed text-text-muted">
                &ldquo;{t.quote}&rdquo;
              </blockquote>
              <div>
                <p className="font-medium text-text">{t.name}</p>
                <p className="text-xs text-text-muted">{t.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
