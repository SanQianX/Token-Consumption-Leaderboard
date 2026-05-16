-- ============================================
-- Token Consumption Leaderboard - Supabase Schema
-- ============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- Submission type enum
-- ============================================
create type submission_type as enum ('daily', 'monthly', 'session', 'blocks');

-- ============================================
-- Profiles table (created automatically via trigger on auth.users)
-- ============================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text,
  avatar_url text,
  github_id bigint unique,
  bio text default '',
  created_at timestamptz default now() not null
);

alter table public.profiles enable row level security;

create policy "Profiles are publicly readable"
  on public.profiles for select
  using (true);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- ============================================
-- Data submissions table
-- ============================================
create table public.data_submissions (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  submission_type submission_type not null,
  payload jsonb not null,
  data_hash text unique not null,
  total_tokens bigint not null default 0,
  total_cost numeric(12, 4) not null default 0,
  created_at timestamptz default now() not null
);

alter table public.data_submissions enable row level security;

create policy "Users can insert their own submissions"
  on public.data_submissions for insert
  with check (auth.uid() = user_id);

create policy "Submissions are publicly readable"
  on public.data_submissions for select
  using (true);

create index idx_submissions_user_id on public.data_submissions(user_id);
create index idx_submissions_type on public.data_submissions(submission_type);
create index idx_submissions_created_at on public.data_submissions(created_at desc);
create index idx_submissions_hash on public.data_submissions(data_hash);

-- ============================================
-- User summaries table (denormalized for fast leaderboard queries)
-- ============================================
create table public.user_summaries (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  total_tokens_all bigint not null default 0,
  cost_all numeric(12, 4) not null default 0,
  total_tokens_30d bigint not null default 0,
  cost_30d numeric(12, 4) not null default 0,
  total_tokens_7d bigint not null default 0,
  cost_7d numeric(12, 4) not null default 0,
  total_tokens_1d bigint not null default 0,
  cost_1d numeric(12, 4) not null default 0,
  last_submitted_at timestamptz,
  updated_at timestamptz default now() not null
);

alter table public.user_summaries enable row level security;

create policy "Summaries are publicly readable"
  on public.user_summaries for select
  using (true);

-- ============================================
-- Function: Auto-create profile on user signup
-- ============================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, username, display_name, avatar_url, github_id)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'user_name',
      new.raw_user_meta_data ->> 'preferred_username',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    (new.raw_user_meta_data ->> 'provider_id')::bigint
  );
  return new;
end;
$$;

-- Trigger: auto-create profile on auth.users insert
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- Function: Generate deterministic hash for dedup
-- ============================================
create or replace function public.generate_data_hash(
  p_user_id uuid,
  p_submission_type submission_type,
  p_payload jsonb
)
returns text
language plpgsql
immutable
as $$
begin
  return md5(p_user_id::text || p_submission_type::text || md5(p_payload::text));
end;
$$;

-- ============================================
-- Function: Update user summaries on submission
-- ============================================
create or replace function public.update_user_summary()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
declare
  v_tokens bigint;
  v_cost numeric(12, 4);
  v_now timestamptz := now();
begin
  v_tokens := coalesce((new.payload->'totals'->>'totalTokens')::bigint, new.total_tokens);
  v_cost := coalesce((new.payload->'totals'->>'totalCost')::numeric, new.total_cost);

  -- Upsert into user_summaries
  insert into public.user_summaries (user_id, total_tokens_all, cost_all, last_submitted_at, updated_at)
  values (new.user_id, v_tokens, v_cost, new.created_at, v_now)
  on conflict (user_id) do update set
    total_tokens_all = user_summaries.total_tokens_all + (v_tokens - (
      select coalesce(total_tokens, 0) from public.data_submissions
      where user_id = new.user_id and submission_type = new.submission_type
      order by created_at desc limit 1 offset 1
    )),
    cost_all = user_summaries.cost_all + (v_cost - (
      select coalesce(total_cost, 0) from public.data_submissions
      where user_id = new.user_id and submission_type = new.submission_type
      order by created_at desc limit 1 offset 1
    )),
    last_submitted_at = greatest(user_summaries.last_submitted_at, new.created_at),
    updated_at = v_now;

  -- Recalculate time-based summaries from all submissions
  -- 30 days
  update public.user_summaries set
    total_tokens_30d = coalesce((
      select sum(total_tokens) from public.data_submissions
      where user_id = new.user_id and created_at >= v_now - interval '30 days'
    ), 0),
    cost_30d = coalesce((
      select sum(total_cost) from public.data_submissions
      where user_id = new.user_id and created_at >= v_now - interval '30 days'
    ), 0),
    total_tokens_7d = coalesce((
      select sum(total_tokens) from public.data_submissions
      where user_id = new.user_id and created_at >= v_now - interval '7 days'
    ), 0),
    cost_7d = coalesce((
      select sum(total_cost) from public.data_submissions
      where user_id = new.user_id and created_at >= v_now - interval '7 days'
    ), 0),
    total_tokens_1d = coalesce((
      select sum(total_tokens) from public.data_submissions
      where user_id = new.user_id and created_at >= v_now - interval '1 day'
    ), 0),
    cost_1d = coalesce((
      select sum(total_cost) from public.data_submissions
      where user_id = new.user_id and created_at >= v_now - interval '1 day'
    ), 0)
  where user_id = new.user_id;

  return new;
end;
$$;

-- Trigger: update summary on new submission
create trigger on_data_submission
  after insert on public.data_submissions
  for each row execute procedure public.update_user_summary();

-- ============================================
-- Leaderboard views
-- ============================================

create or replace view public.leaderboard_all_time as
select
  rank() over (order by s.total_tokens_all desc) as rank,
  p.username,
  p.display_name,
  p.avatar_url,
  s.total_tokens_all as total_tokens,
  s.cost_all as total_cost,
  s.last_submitted_at
from public.user_summaries s
join public.profiles p on p.id = s.user_id
where s.total_tokens_all > 0;

create or replace view public.leaderboard_30d as
select
  rank() over (order by s.total_tokens_30d desc) as rank,
  p.username,
  p.display_name,
  p.avatar_url,
  s.total_tokens_30d as total_tokens,
  s.cost_30d as total_cost,
  s.last_submitted_at
from public.user_summaries s
join public.profiles p on p.id = s.user_id
where s.total_tokens_30d > 0;

create or replace view public.leaderboard_7d as
select
  rank() over (order by s.total_tokens_7d desc) as rank,
  p.username,
  p.display_name,
  p.avatar_url,
  s.total_tokens_7d as total_tokens,
  s.cost_7d as total_cost,
  s.last_submitted_at
from public.user_summaries s
join public.profiles p on p.id = s.user_id
where s.total_tokens_7d > 0;

create or replace view public.leaderboard_1d as
select
  rank() over (order by s.total_tokens_1d desc) as rank,
  p.username,
  p.display_name,
  p.avatar_url,
  s.total_tokens_1d as total_tokens,
  s.cost_1d as total_cost,
  s.last_submitted_at
from public.user_summaries s
join public.profiles p on p.id = s.user_id
where s.total_tokens_1d > 0;
