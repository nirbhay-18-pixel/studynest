-- StudyNest — Supabase schema with Row Level Security.
-- Run in the Supabase SQL editor. Auth is handled by Supabase Auth (auth.users).

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default 'Student',
  prep_type text not null default 'other',
  daily_goal_min integer not null default 120,
  onboarded boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.subjects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  color text not null default '#1f5b46',
  icon text not null default 'book',
  description text not null default '',
  archived boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.chapters (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  completed boolean not null default false,
  completed_at timestamptz,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  target_date date,
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 200),
  subject_id uuid references public.subjects (id) on delete set null,
  due_date date,
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high')),
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  subject_id uuid not null references public.subjects (id) on delete cascade,
  chapter_id uuid references public.chapters (id) on delete set null,
  started_at timestamptz not null,
  duration_sec integer not null check (duration_sec > 0 and duration_sec <= 86400),
  notes text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null check (char_length(title) between 1 and 120),
  kind text not null check (kind in ('hours', 'chapters', 'sessions', 'streak', 'tasks')),
  target integer not null check (target >= 1),
  deadline date,
  created_at timestamptz not null default now()
);

create table if not exists public.assistant_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  is_error boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists idx_chapters_user on public.chapters (user_id, subject_id);
create index if not exists idx_tasks_user on public.tasks (user_id, completed);
create index if not exists idx_sessions_user on public.study_sessions (user_id, started_at desc);
create index if not exists idx_goals_user on public.goals (user_id);
create index if not exists idx_messages_user on public.assistant_messages (user_id, created_at);

-- ---------- Row Level Security: each user sees only their own rows ----------

alter table public.profiles enable row level security;
alter table public.subjects enable row level security;
alter table public.chapters enable row level security;
alter table public.tasks enable row level security;
alter table public.study_sessions enable row level security;
alter table public.goals enable row level security;
alter table public.assistant_messages enable row level security;

create policy "profiles own row" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "subjects private" on public.subjects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "chapters private" on public.chapters
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "tasks private" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "sessions private" on public.study_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "goals private" on public.goals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "messages private" on public.assistant_messages
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
