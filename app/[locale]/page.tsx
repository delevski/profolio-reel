import { Hero } from "@/components/sections/Hero";
import { Marquee } from "@/components/ui/Marquee";
import { BlogPreview } from "@/components/sections/BlogPreview";
import { LearnPreview } from "@/components/sections/LearnPreview";
import { TrendsSection } from "@/components/sections/TrendsSection";
import { YouTubeSection } from "@/components/sections/YouTubeSection";
import { AppsPreview } from "@/components/sections/AppsPreview";
import { ProjectsPreview } from "@/components/sections/ProjectsPreview";
import { AcademyPreview } from "@/components/sections/AcademyPreview";
import { TestimonialsSection } from "@/components/sections/TestimonialsSection";
import { ConnectSection } from "@/components/sections/ConnectSection";
import { getSiteConfig, getVideos } from "@/lib/content";
import type { Locale } from "@/lib/i18n/config";

type Props = { params: Promise<{ locale: Locale }> };

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  const site = getSiteConfig(locale);
  const videos = getVideos();

  return (
    <>
      <Hero site={site} locale={locale} />
      <Marquee />
      <BlogPreview locale={locale} />
      <LearnPreview locale={locale} />
      <TrendsSection />
      <YouTubeSection videos={videos} />
      <AppsPreview locale={locale} />
      <ProjectsPreview locale={locale} />
      <AcademyPreview locale={locale} />
      <TestimonialsSection locale={locale} />
      <ConnectSection site={site} locale={locale} />
    </>
  );
}
