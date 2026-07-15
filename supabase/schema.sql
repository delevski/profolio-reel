-- Run once in the Supabase SQL editor for this project.
-- Trends (daily replace by day) + auto-generated blog posts.

create table if not exists public.trends (
  id text primary key,
  day date not null,
  source text not null check (source in ('github', 'huggingface')),
  title text not null,
  description text not null,
  href text not null,
  stars integer,
  image_url text,
  summary_he text not null,
  created_at timestamptz not null default now()
);

create index if not exists trends_day_idx on public.trends (day desc);

create table if not exists public.auto_posts (
  slug text primary key,
  title text not null,
  excerpt text not null,
  date date not null,
  read_time text not null default '5 min',
  tags text[] not null default array['AI Trend Digest'],
  image_url text,
  content text not null,
  source_href text not null unique,
  lang text not null default 'EN',
  created_at timestamptz not null default now()
);

create index if not exists auto_posts_date_idx on public.auto_posts (date desc);

-- Site reads with the anon key; pipeline writes with the service-role key.
alter table public.trends enable row level security;
alter table public.auto_posts enable row level security;

drop policy if exists "Public read trends" on public.trends;
create policy "Public read trends"
  on public.trends for select
  to anon, authenticated
  using (true);

drop policy if exists "Public read auto_posts" on public.auto_posts;
create policy "Public read auto_posts"
  on public.auto_posts for select
  to anon, authenticated
  using (true);
