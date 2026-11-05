import { PageHeader } from "@/components/ui/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { getCourses } from "@/lib/content";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { isRtl, type Locale } from "@/lib/i18n/config";
import { localizedPath } from "@/lib/i18n/navigation";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const dict = getDictionary(locale);
  return { title: dict.nav.academy };
}

// Courses without their own enrollment page ("#" in content/courses.json)
// enroll through the site's contact page, in the same language.
function enrollHref(href: string | undefined, locale: Locale) {
  return href && href !== "#" ? href : localizedPath(locale, "/contact");
}

export default async function AcademyPage({ params }: Props) {
  const { locale } = await params;
  const courses = getCourses(locale);
  const dict = getDictionary(locale);
  const p = dict.pages.academy;
  const s = dict.sections.academy;
  const rtl = isRtl(locale);

  return (
    <>
      <PageHeader label={p.label} title={p.title} subtitle={p.subtitle} isRtl={rtl} />
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <div
              key={course.slug}
              className={cn(
                "flex flex-col v2-panel  p-8",
                rtl && "text-right"
              )}
            >
              <div className={cn("mb-4 flex gap-2", rtl && "justify-end")}>
                {course.isNew && <Badge variant="new">{s.new}</Badge>}
                <Badge>{course.level}</Badge>
              </div>
              <h2 className="mb-3 text-2xl text-text">{course.title}</h2>
              <p className="mb-8 flex-1 text-text-muted">{course.description}</p>
              <Button
                href={enrollHref(course.href, locale)}
                variant="primary"
              >
                {p.enroll}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
