-- ============================================================================
--  Exam Generator — Supabase schema
--  Run this ONCE in your Supabase project:
--    Supabase dashboard → SQL Editor → New query → paste all of this → Run.
-- ============================================================================

-- ── Page visits ─────────────────────────────────────────────────────────────
create table if not exists public.page_visits (
  id          bigint generated always as identity primary key,
  visited_at  timestamptz not null default now(),
  user_agent  text,
  language    text,
  platform    text,
  screen      text,
  referrer    text,
  timezone    text
);

-- ── Generated papers ────────────────────────────────────────────────────────
create table if not exists public.generated_papers (
  id               bigint generated always as identity primary key,
  created_at       timestamptz not null default now(),
  institution      text,
  session          text,
  paper            text,
  total_marks      text,
  time_allowed     text,
  exam_date        text,
  mcq_count        integer default 0,
  subjective_count integer default 0,
  format           text,          -- 'pdf' or 'docx'
  mcqs             jsonb,         -- [{ q, opts: [] }]
  subjectives      jsonb,         -- [ "question text", ... ]
  user_agent       text
);

create index if not exists idx_visits_time on public.page_visits (visited_at desc);
create index if not exists idx_papers_time on public.generated_papers (created_at desc);

-- ── Saved notes ─────────────────────────────────────────────────────────────
create table if not exists public.saved_notes (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  topic       text,
  author_name text,
  institution text,
  note_date   text,
  raw_text    text,
  blocks      jsonb          -- parsed block array
);

create index if not exists idx_notes_time on public.saved_notes (created_at desc);

-- ── Row Level Security ──────────────────────────────────────────────────────
-- The app uses the public "anon" key in the browser, so we allow anon to
-- INSERT (logging) and SELECT (the admin dashboard reads with the same key).
--
-- NOTE: this means anyone with your URL + anon key could read this data.
-- The /admin password is a convenience gate, not hard security. For a small
-- internal tool this is normally fine. If you need real protection, move the
-- reads behind Supabase Auth or an Edge Function later.
alter table public.page_visits      enable row level security;
alter table public.generated_papers enable row level security;

drop policy if exists "anon insert visits" on public.page_visits;
drop policy if exists "anon select visits" on public.page_visits;
drop policy if exists "anon insert papers" on public.generated_papers;
drop policy if exists "anon select papers" on public.generated_papers;

create policy "anon insert visits" on public.page_visits
  for insert to anon with check (true);
create policy "anon select visits" on public.page_visits
  for select to anon using (true);

create policy "anon insert papers" on public.generated_papers
  for insert to anon with check (true);
create policy "anon select papers" on public.generated_papers
  for select to anon using (true);

-- saved_notes: anon insert + select (same pattern as above)
alter table public.saved_notes enable row level security;

drop policy if exists "anon insert notes" on public.saved_notes;
drop policy if exists "anon select notes" on public.saved_notes;
drop policy if exists "anon delete notes" on public.saved_notes;

create policy "anon insert notes" on public.saved_notes
  for insert to anon with check (true);
create policy "anon select notes" on public.saved_notes
  for select to anon using (true);
create policy "anon delete notes" on public.saved_notes
  for delete to anon using (true);
