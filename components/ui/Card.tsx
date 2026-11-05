import Link from "@/components/ui/SiteLink";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { Badge } from "./Badge";

type ContentCardProps = {
  href: string;
  title: string;
  excerpt: string;
  tags?: string[];
  meta?: string;
  lang?: string;
  isNew?: boolean;
  emoji?: string;
  difficulty?: string;
  newLabel?: string;
  imageUrl?: string;
  isRtl?: boolean;
};

export function ContentCard({
  href,
  title,
  excerpt,
  tags,
  meta,
  lang,
  isNew,
  emoji,
  difficulty,
  newLabel = "NEW",
  imageUrl,
  isRtl = false,
}: ContentCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        "v2-card group flex flex-col overflow-hidden",
        isRtl && "text-right"
      )}
    >
      {imageUrl && (
        <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-surface-border bg-surface">
          <Image
            src={imageUrl}
            alt={title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col p-6 md:p-7">
        <div className={cn("mb-4 flex flex-wrap items-center gap-2")}>
          {isNew && <Badge variant="new">{newLabel}</Badge>}
          {emoji && <span className="text-2xl">{emoji}</span>}
          {difficulty && <Badge>{difficulty}</Badge>}
          {tags?.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="accent">
              {tag}
            </Badge>
          ))}
          {lang && <Badge>{lang}</Badge>}
        </div>
        <h3 className="mb-2 text-[22px] font-semibold leading-tight text-text">
          {title}
        </h3>
        <p className="mb-4 flex-1 text-sm leading-relaxed text-text-muted line-clamp-3">
          {excerpt}
        </p>
        {meta && <p className="text-xs text-text-muted">{meta}</p>}
      </div>
    </Link>
  );
}

type ProjectCardProps = {
  name: string;
  description: string;
  stars: number;
  stack: string[];
  href?: string;
  demoUrl?: string;
  playStoreUrl?: string;
  category?: string;
  featured?: boolean;
  imageUrl?: string;
  featuredLabel?: string;
  githubLabel?: string;
  liveDemoLabel?: string;
  googlePlayLabel?: string;
  isRtl?: boolean;
};

export function ProjectCard({
  name,
  description,
  stars,
  stack,
  href,
  demoUrl,
  playStoreUrl,
  category,
  featured,
  imageUrl,
  featuredLabel = "Featured",
  githubLabel = "GitHub",
  liveDemoLabel = "Live Demo",
  googlePlayLabel = "Google Play",
  isRtl = false,
}: ProjectCardProps) {
  return (
    <div
      className={cn(
        "v2-card group relative flex flex-col overflow-hidden",
        false,
        isRtl && "text-right"
      )}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-surface-border bg-surface">
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={name}
            fill
            className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 50vw"
          />
        ) : (
          <div
            className="absolute inset-0 bg-gradient-to-br from-[#2563eb]/25 via-transparent to-[#dc5a2c]/20"
            aria-hidden
          />
        )}
      </div>
      <div className="flex flex-1 flex-col p-6 md:p-7">
        <div
          className={cn(
            "mb-3 flex items-start justify-between gap-2",
            false
          )}
        >
          <div className="min-w-0 flex-1">
            <h3 className="text-2xl font-semibold text-text">
              {name}
            </h3>
            {category && (
              <Badge variant="accent" className="mt-2">
                {category}
              </Badge>
            )}
          </div>
          <div
            className={cn(
              "flex shrink-0 flex-col items-end gap-1.5",
              false
            )}
          >
            {featured && <Badge variant="featured">{featuredLabel}</Badge>}
            {stars > 0 && (
              <span className="text-sm text-text-muted">
                ★ {stars.toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <p className="mb-4 flex-1 text-sm text-text-muted">{description}</p>
        <div className={cn("mb-4 flex flex-wrap gap-2")}>
          {stack.map((tech) => (
            <Badge key={tech}>{tech}</Badge>
          ))}
        </div>
        {(href || demoUrl || playStoreUrl) && (
          <div className={cn("flex flex-wrap gap-3")}>
            {href && (
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-ghost"
              >
                {githubLabel}
              </a>
            )}
            {demoUrl && (
              <a
                href={demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-ghost"
              >
                {liveDemoLabel}
              </a>
            )}
            {playStoreUrl && (
              <a
                href={playStoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-ghost"
              >
                {googlePlayLabel}
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

type AppCardProps = {
  name: string;
  tagline: string;
  description: string;
  stack: string[];
  href: string;
  preview?: string;
  visitLabel?: string;
  isRtl?: boolean;
};

export function AppCard({
  name,
  tagline,
  description,
  stack,
  href,
  preview,
  visitLabel = "Visit App →",
  isRtl = false,
}: AppCardProps) {
  return (
    <div
      className={cn(
        "v2-card group flex flex-col overflow-hidden",
        isRtl && "text-right"
      )}
    >
      <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-surface-border bg-gradient-to-br from-[#2563eb]/20 via-transparent to-[#dc5a2c]/20">
        {preview && (
          <Image
            src={preview}
            alt={name}
            fill
            className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
          />
        )}
      </div>
      <div className="flex flex-1 flex-col p-6 md:p-7">
        <h3 className="mb-1 text-[22px] font-semibold leading-tight text-text">{name}</h3>
        <p className="mb-2 text-sm text-accent">{tagline}</p>
        <p className="mb-4 flex-1 text-sm text-text-muted">{description}</p>
        <div className={cn("mb-4 flex flex-wrap gap-2")}>
          {stack.map((tech) => (
            <Badge key={tech}>{tech}</Badge>
          ))}
        </div>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-sm btn-ghost self-start"
        >
          {visitLabel}
        </a>
      </div>
    </div>
  );
}

type VideoCardProps = {
  title: string;
  category: string;
  thumbnail: string;
  href: string;
  isRtl?: boolean;
};

export function VideoCard({
  title,
  category,
  thumbnail,
  href,
  isRtl = false,
}: VideoCardProps) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "v2-card group block overflow-hidden",
        isRtl && "text-right"
      )}
    >
      <div className="relative aspect-video overflow-hidden">
        <Image
          src={thumbnail}
          alt={title}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 33vw"
        />
        <span className={cn("absolute top-3", isRtl ? "right-3" : "left-3")}>
          <Badge variant="accent">{category}</Badge>
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-medium text-text group-hover:text-accent">{title}</h3>
      </div>
    </a>
  );
}
