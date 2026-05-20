import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-sm uppercase tracking-widest text-accent">404</p>
      <h1 className="mt-4 font-serif text-3xl text-text md:text-4xl">
        Page not found
      </h1>
      <p className="mt-3 max-w-md text-text-muted">
        The page you are looking for does not exist or was moved.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Button href="/en">English home</Button>
        <Button href="/he" variant="secondary">
          דף הבית בעברית
        </Button>
      </div>
      <Link
        href="/en/projects"
        className="mt-6 text-sm text-text-muted underline-offset-4 hover:text-accent hover:underline"
      >
        View projects
      </Link>
    </main>
  );
}
