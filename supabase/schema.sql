-- POWER PROTOCOL - Supabase schema
-- Run this in Supabase Dashboard > SQL Editor > New Query > Run
-- Then: Authentication > Providers > Email enabled (default ON)

-- 1. Profiles: one row per user, stores RPG stats
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  level int not null default 1 check (level >= 1),
  xp int not null default 0 check (xp >= 0),
  coins int not null default 50 check (coins >= 0),
  streak int not null default 0 check (streak >= 0),
  last_active_date date,
  attributes jsonb not null default '{"STR":1,"INT":1,"DIS":1,"HLT":1,"CRT":1,"SOC":1}',
  owned_items text[] not null default '{}',
  active_title text,
  active_aura text,
  active_theme text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 2. Missions: user's quests. RLS ensures user sees only own rows.
create table if not exists public.missions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) >= 1 and char_length(title) <= 120),
  description text default '',
  category text not null default 'Other',
  difficulty text not null default 'E' check (difficulty in ('E','D','C','B','S')),
  status text not null default 'active' check (status in ('active','done')),
  due_date date,
  created_at timestamptz default now(),
  completed_at timestamptz
);

create index if not exists missions_user_idx on public.missions (user_id, status);

-- 3. Enable RLS + policies (MANDATORY for security requirement)
alter table public.profiles enable row level security;
alter table public.missions enable row level security;

drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "own missions" on public.missions;
create policy "own missions" on public.missions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- 4. Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
