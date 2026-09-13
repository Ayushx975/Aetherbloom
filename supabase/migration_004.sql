-- Migration 004: rename credits → coins (terminology alignment).
-- Safe to re-run. PostgreSQL carries CHECK expressions across the rename.

do $$ begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'credits'
  ) then
    alter table public.profiles rename column credits to coins;
  end if;
end $$;
