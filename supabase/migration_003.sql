-- Migration 003: display names for Settings → profile editing.
-- Additive and safe to re-run.

alter table public.profiles add column if not exists display_name text;
