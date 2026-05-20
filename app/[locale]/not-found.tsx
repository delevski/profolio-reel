import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function LocaleNotFound() {
  return (
    <main className="flex min-h-[50vh] flex-col items-center justify-center px-4 py-20 text-center">
      <p className="text-sm uppercase tracking-widest text-accent">404</p>
      <h1 className="mt-4 font-serif text-3xl text-text md:text-4xl">
        Page not found
      </h1>
      <p className="mt-3 max-w-md text-text-muted">
        This page does not exist in the selected language.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Button href="/en">English home</Button>
        <Button href="/he" variant="secondary">
          דף הבית בעברית
        </Button>
      </div>
      <Link
        href="/en/contact"
        className="mt-6 text-sm text-text-muted underline-offset-4 hover:text-accent hover:underline"
      >
        Contact
      </Link>
    </main>
  );
}
