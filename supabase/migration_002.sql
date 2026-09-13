-- Migration 002: due dates + server-side sanity checks.
-- Additive and safe to re-run. Run AFTER schema.sql in Supabase SQL Editor.

-- 1. Due dates for quests (NULL = no deadline)
alter table public.missions add column if not exists due_date date;

-- 2. Server-side guards: progression numbers can never go negative,
-- even if a client sends bad data (defense in depth behind RLS).
do $$ begin
  alter table public.profiles add constraint profiles_level_check check (level >= 1);
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.profiles add constraint profiles_xp_check check (xp >= 0);
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.profiles add constraint profiles_credits_check check (coins >= 0);
exception when duplicate_object then null;
end $$;

do $$ begin
  alter table public.profiles add constraint profiles_streak_check check (streak >= 0);
exception when duplicate_object then null;
end $$;
