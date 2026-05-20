"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app/error]", error.message, error.digest);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] flex-col items-center justify-center px-4 text-center">
      <p className="text-sm uppercase tracking-widest text-accent">Error</p>
      <h1 className="mt-4 font-serif text-3xl text-text md:text-4xl">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-md text-text-muted">
        An unexpected error occurred. You can try again or return home.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-4">
        <Button type="button" onClick={() => reset()}>
          Try again
        </Button>
        <Button href="/en" variant="secondary">
          Go home
        </Button>
      </div>
    </main>
  );
}
