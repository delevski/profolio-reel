import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserOrServerClient: SupabaseClient | null = null;

function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) return null;
  return { url, key };
}

/** Read-only Supabase client for the Next.js site. Returns null if env is unset. */
export function getSupabase(): SupabaseClient | null {
  const env = getSupabaseEnv();
  if (!env) return null;

  if (!browserOrServerClient) {
    browserOrServerClient = createClient(env.url, env.key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return browserOrServerClient;
}

export type DbTrend = {
  id: string;
  day: string;
  source: "github" | "huggingface";
  title: string;
  description: string;
  href: string;
  stars: number | null;
  image_url: string | null;
  summary_he: string;
  created_at: string;
};

export type DbAutoPost = {
  slug: string;
  title: string;
  excerpt: string;
  date: string;
  read_time: string;
  tags: string[];
  image_url: string | null;
  content: string;
  source_href: string;
  lang: string;
  title_he: string | null;
  excerpt_he: string | null;
  content_he: string | null;
  created_at: string;
};
