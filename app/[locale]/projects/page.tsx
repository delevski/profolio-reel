import { PageHeader } from "@/components/ui/PageHeader";
import { ProjectCard } from "@/components/ui/Card";
import { getProjects } from "@/lib/content";
import { getDictionary } from "@/lib/i18n/get-dictionary";
import { isRtl, type Locale } from "@/lib/i18n/config";

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props) {
  const { locale } = await params;
  const dict = getDictionary(locale);
  return { title: dict.nav.projects };
}

export default async function ProjectsPage({ params }: Props) {
  const { locale } = await params;
  const projects = getProjects(locale);
  const dict = getDictionary(locale);
  const p = dict.pages.projects;
  const rtl = isRtl(locale);

  return (
    <>
      <PageHeader
        label={p.label}
        title={p.title}
        subtitle={p.subtitle}
        isRtl={rtl}
      />
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid gap-6 md:grid-cols-2">
          {projects.map((project) => (
            <ProjectCard
              key={project.slug}
              {...project}
              featuredLabel={dict.sections.projects.featured}
              githubLabel={dict.sections.projects.viewGithub}
              liveDemoLabel={dict.sections.projects.liveDemo}
              googlePlayLabel={dict.sections.projects.googlePlay}
              isRtl={rtl}
            />
          ))}
        </div>
      </div>
    </>
  );
}
