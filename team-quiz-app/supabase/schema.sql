-- Run this in Supabase SQL Editor. Keep RLS enabled; all database access is server-side.
create extension if not exists pgcrypto;

create table if not exists public.quiz_questions (
  id uuid primary key default gen_random_uuid(),
  prompt text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array' and jsonb_array_length(options) >= 2),
  answer_index integer not null check (answer_index >= 0),
  explanation text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_submissions (
  id uuid primary key default gen_random_uuid(),
  team_id text not null unique,
  leader_name text not null,
  member_names jsonb not null default '[]'::jsonb,
  whatsapp_phone text not null,
  member_count integer not null check (member_count between 1 and 4),
  question_order jsonb not null,
  started_at timestamptz not null,
  submitted_at timestamptz,
  total_seconds integer,
  score integer,
  status text not null default 'in_progress' check (status in ('in_progress','submitted','expired')),
  created_at timestamptz not null default now()
);

create table if not exists public.quiz_answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.quiz_submissions(id) on delete cascade,
  question_id uuid not null references public.quiz_questions(id),
  question_number integer not null,
  selected_index integer,
  elapsed_seconds integer not null default 0,
  is_correct boolean not null default false,
  unique (submission_id, question_id),
  unique (submission_id, question_number)
);

alter table public.quiz_questions enable row level security;
alter table public.quiz_submissions enable row level security;
alter table public.quiz_answers enable row level security;

-- No anon/authenticated policies are intentionally created. Only server API routes using the
-- service-role key can read/write these tables. Never put that key in a browser bundle.
revoke all on public.quiz_questions from anon, authenticated;
revoke all on public.quiz_submissions from anon, authenticated;
revoke all on public.quiz_answers from anon, authenticated;
