import { Section } from "@/components/ui/Section";
import { ProjectCard } from "@/components/ui/Card";
import { getProjects } from "@/lib/content";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { localizedPath } from "@/lib/i18n/navigation";
import { isRtl, type Locale } from "@/lib/i18n/config";

export function ProjectsPreview({ locale }: { locale: Locale }) {
  const dict = getDictionary(locale);
  const projects = getProjects(locale)
    .filter((p) => p.featured)
    .slice(0, 6);
  const s = dict.sections.projects;

  return (
    <Section
      id="projects"
      label={s.label}
      title={s.title}
      subtitle={s.subtitle}
      action={{ label: s.action, href: localizedPath(locale, "/projects") }}
      isRtl={isRtl(locale)}
    >
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => (
          <ProjectCard
            key={project.slug}
            {...project}
            featuredLabel={s.featured}
            githubLabel={s.viewGithub}
            liveDemoLabel={s.liveDemo}
            googlePlayLabel={s.googlePlay}
            isRtl={isRtl(locale)}
          />
        ))}
      </div>
    </Section>
  );
}
