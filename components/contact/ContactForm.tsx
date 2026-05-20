"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import type { SiteConfig } from "@/lib/types";
import type { Dictionary } from "@/lib/i18n/get-dictionary";
import { cn } from "@/lib/utils";

type ContactLabels = Dictionary["pages"]["contact"];

export function ContactForm({
  social,
  contact,
  labels,
  isRtl = false,
}: {
  social: SiteConfig["social"];
  contact: SiteConfig["contact"];
  labels: ContactLabels;
  isRtl?: boolean;
}) {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = data.get("name") as string;
    const email = data.get("email") as string;
    const message = data.get("message") as string;
    const subject = encodeURIComponent(`Message from ${name}`);
    const body = encodeURIComponent(`${message}\n\n— ${name} (${email})`);
    window.location.href = `mailto:${contact.email}?subject=${subject}&body=${body}`;
    setSubmitted(true);
  }

  return (
    <div className="grid gap-12 lg:grid-cols-2">
      <form
        onSubmit={handleSubmit}
        className={cn(
          "space-y-6 rounded-2xl border border-surface-border bg-surface/90 backdrop-blur-md p-8",
          isRtl && "text-right"
        )}
        dir={isRtl ? "rtl" : "ltr"}
      >
        <div>
          <label htmlFor="name" className="mb-2 block text-sm font-medium text-text">
            {labels.name}
          </label>
          <input
            id="name"
            name="name"
            required
            className="w-full rounded-lg border border-surface-border bg-bg px-4 py-3 text-text outline-none focus:border-accent"
          />
        </div>
        <div>
          <label htmlFor="email" className="mb-2 block text-sm font-medium text-text">
            {labels.email}
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="w-full rounded-lg border border-surface-border bg-bg px-4 py-3 text-text outline-none focus:border-accent"
          />
        </div>
        <div>
          <label htmlFor="message" className="mb-2 block text-sm font-medium text-text">
            {labels.message}
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={5}
            className="w-full resize-none rounded-lg border border-surface-border bg-bg px-4 py-3 text-text outline-none focus:border-accent"
          />
        </div>
        <Button type="submit" variant="primary">
          {labels.send}
        </Button>
        {submitted && (
          <p className="text-sm text-accent-2">{labels.opening}</p>
        )}
      </form>

      <div className={cn(isRtl && "text-right")}>
        <h2 className="mb-6 font-serif text-2xl text-text">{labels.info}</h2>
        <ul className="mb-8 space-y-4">
          <li>
            <a
              href={`mailto:${contact.email}`}
              className="flex items-center justify-between rounded-xl border border-surface-border bg-surface/90 px-6 py-4 transition-colors hover:border-accent/30"
            >
              <span className="font-medium text-text">{labels.email}</span>
              <span className="text-sm text-text-muted">{contact.email}</span>
            </a>
          </li>
          <li>
            <a
              href={`tel:${contact.phone.replace(/\s/g, "")}`}
              className="flex items-center justify-between rounded-xl border border-surface-border bg-surface/90 px-6 py-4 transition-colors hover:border-accent/30"
            >
              <span className="font-medium text-text">{labels.phone}</span>
              <span className="text-sm text-text-muted">{contact.phone}</span>
            </a>
          </li>
          <li className="rounded-xl border border-surface-border bg-surface/90 px-6 py-4">
            <span className="font-medium text-text">{labels.location}</span>
            <p className="mt-1 text-sm text-text-muted">{contact.location}</p>
          </li>
        </ul>

        <h2 className="mb-6 font-serif text-2xl text-text">{labels.elsewhere}</h2>
        <ul className="space-y-4">
          {social.map((link) => (
            <li key={link.platform}>
              <a
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center justify-between rounded-xl border border-surface-border bg-surface/90 backdrop-blur-md px-6 py-4 transition-colors hover:border-accent/30",
                  isRtl && "flex-row-reverse"
                )}
              >
                <span className="font-medium text-text">{link.platform}</span>
                <span className="text-sm text-text-muted">{link.handle}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
