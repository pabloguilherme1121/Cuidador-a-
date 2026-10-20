-- Cuidador(a): multi-account cloud backend, opt-in only.
-- No health data is sent to this database by the offline-first PWA until an authenticated sync client is explicitly configured.
-- Uses managed Supabase Auth; all exposed tables have RLS and tenant ownership.
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.care_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  preferred_name text not null default '' check (char_length(preferred_name)<=60),
  appearance jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.care_schedules (
  user_id uuid not null references auth.users(id) on delete cascade,
  id uuid not null default gen_random_uuid(),
  kind text not null check(kind in ('meal','med')),
  title text not null check(char_length(title) between 1 and 100),
  dose text not null default '' check(char_length(dose)<=100),
  note text not null default '' check(char_length(note)<=500),
  times text[] not null check(array_length(times,1) between 1 and 24),
  days smallint[] not null check(array_length(days,1) between 1 and 7),
  archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id,id)
);
create index if not exists care_schedules_active on public.care_schedules (user_id,archived);
create table if not exists public.care_occurrences (
  user_id uuid not null references auth.users(id) on delete cascade,
  schedule_id uuid not null,
  occurrence_date date not null,
  scheduled_time time not null,
  status text not null default 'done' check(status in ('done','skipped')),
  completed_at timestamptz,
  snapshot jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  primary key(user_id,schedule_id,occurrence_date,scheduled_time)
);
create index if not exists care_occurrences_by_date on public.care_occurrences (user_id,occurrence_date desc);

alter table public.care_profiles enable row level security;
alter table public.care_schedules enable row level security;
alter table public.care_occurrences enable row level security;

-- deny anonymous access; grant row-filtered access only to authenticated users
revoke all on public.care_profiles,public.care_schedules,public.care_occurrences from anon;
grant select,insert,update,delete on public.care_profiles,public.care_schedules,public.care_occurrences to authenticated;

create policy care_profile_read on public.care_profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy care_profile_insert on public.care_profiles for insert to authenticated with check ((select auth.uid()) = user_id);
create policy care_profile_update on public.care_profiles for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy care_profile_delete on public.care_profiles for delete to authenticated using ((select auth.uid()) = user_id);

create policy care_schedules_read on public.care_schedules for select to authenticated using ((select auth.uid()) = user_id);
create policy care_schedules_insert on public.care_schedules for insert to authenticated with check ((select auth.uid()) = user_id);
create policy care_schedules_update on public.care_schedules for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy care_schedules_delete on public.care_schedules for delete to authenticated using ((select auth.uid()) = user_id);

create policy care_occurrences_read on public.care_occurrences for select to authenticated using ((select auth.uid()) = user_id);
create policy care_occurrences_insert on public.care_occurrences for insert to authenticated with check ((select auth.uid()) = user_id);
create policy care_occurrences_update on public.care_occurrences for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy care_occurrences_delete on public.care_occurrences for delete to authenticated using ((select auth.uid()) = user_id);

-- DO NOT create service_role keys in the browser. DO NOT enable cloud sync without explicit opt-in and verification of user-id isolation.
