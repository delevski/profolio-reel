import { MDXRemote } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import { LazyVideo } from "@/components/ui/LazyVideo";

/**
 * A clearly marked gap for Ori to fill with a real number or quote. Kept in
 * the page source but hidden from visitors, like the home page placeholders.
 */
function Placeholder({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div hidden data-placeholder="case-study" className="mb-6 rounded-xl border border-dashed border-accent/60 bg-surface/60 p-4 text-text-muted">
      <span className="mb-2 inline-block rounded-full border border-accent/60 px-2.5 py-0.5 text-xs font-semibold text-accent">
        {"\u270e"} {label}
      </span>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}

const components = {
  Video: LazyVideo,
  Placeholder,
  h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h1 className="mb-6 font-serif text-3xl text-text md:text-4xl" {...props} />
  ),
  h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h2 className="mb-4 mt-8 font-serif text-2xl text-text" {...props} />
  ),
  h3: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className="mb-3 mt-6 text-xl text-text" {...props} />
  ),
  p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className="mb-4 leading-relaxed text-text-muted" {...props} />
  ),
  ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
    <ul className="mb-4 list-disc space-y-2 ps-6 text-text-muted" {...props} />
  ),
  ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
    <ol className="mb-4 list-decimal space-y-2 ps-6 text-text-muted" {...props} />
  ),
  li: (props: React.HTMLAttributes<HTMLLIElement>) => (
    <li className="leading-relaxed" {...props} />
  ),
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a className="text-accent-2 underline-offset-4 hover:underline" {...props} />
  ),
  code: (props: React.HTMLAttributes<HTMLElement>) => (
    <code
      className="rounded bg-surface px-1.5 py-0.5 text-sm text-accent"
      {...props}
    />
  ),
  pre: (props: React.HTMLAttributes<HTMLPreElement>) => (
    <pre
      className="mb-4 overflow-x-auto rounded-xl border border-surface-border bg-surface/90 p-4 text-sm backdrop-blur-md"
      {...props}
    />
  ),
  blockquote: (props: React.HTMLAttributes<HTMLQuoteElement>) => (
    <blockquote
      className="mb-4 border-l-4 border-accent pl-4 italic text-text-muted"
      {...props}
    />
  ),
};

export function MdxContent({ source }: { source: string }) {
  return (
    <div className="prose-ordel max-w-none">
      <MDXRemote
        source={source}
        components={components}
        options={{ mdxOptions: { remarkPlugins: [remarkGfm] } }}
      />
    </div>
  );
}
