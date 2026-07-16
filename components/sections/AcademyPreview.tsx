import Link from "next/link";
import { Section } from "@/components/ui/Section";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getCourses } from "@/lib/content";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localizedPath } from "@/lib/i18n/navigation";
import { isRtl, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils";

export function AcademyPreview({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const courses = getCourses(locale);
  const s = dict.sections.academy;
  const rtl = isRtl(locale);

  return (
    <Section
      id="academy"
      label={s.label}
      title={s.title}
      subtitle={s.subtitle}
      action={{ label: s.action, href: localizedPath(locale, "/academy") }}
      isRtl={rtl}
    >
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {courses.map((course) => (
          <div
            key={course.slug}
            className={cn(
              "flex flex-col rounded-2xl border border-surface-border bg-surface/90 backdrop-blur-md p-6 transition-all hover:-translate-y-1 hover:border-accent/30",
              rtl && "text-right"
            )}
          >
            <div className={cn("mb-3 flex gap-2", rtl && "justify-end")}>
              {course.isNew && <Badge variant="new">{s.new}</Badge>}
              <Badge>{course.level}</Badge>
            </div>
            <h3 className="mb-2 font-serif text-xl text-text">{course.title}</h3>
            <p className="mb-6 flex-1 text-sm text-text-muted">{course.description}</p>
            <Link
              href={course.href}
              className="text-sm font-medium text-accent-2 hover:text-accent"
            >
              {s.enroll}
            </Link>
          </div>
        ))}
      </div>
      <div className="mt-10 text-center">
        <Button href={localizedPath(locale, "/academy")} variant="secondary">
          {s.visit}
        </Button>
      </div>
    </Section>
  );
}
