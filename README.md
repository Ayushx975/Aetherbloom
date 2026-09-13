# AETHERBLOOM — The Living Atlas

**Web Hackathon • Tech Zephyr 4.0 • IIT Bhubaneswar**
**Team size 1–4 • Round 1: Online 12 Sep 10:00 AM → 13 Sep 12:00 PM IST**

Turn real-life tasks into a living world. Complete **quests** → earn **XP** + **coins** → rank up from **Seed → Everbloom**, grow **streaks**, train six attributes (**Strength, Intellect, Discipline, Health, Creativity, Social**), and spend in the **Vault**. Every completion nourishes a real-time 3D atlas: blooms grow, energy flows into the Aether Heart, streaks shift the sky.

Theme: original premium world — a celestial conservatory above the clouds. Semantic color roles (researched): midnight observatory canvas, moonstone text (≥4.5:1), jade growth, dawn-gold reward, orchid rare, periwinkle focus, coral urgency. Rarity always double-encoded (color + label). Lucide icons throughout, no emoji. Real WebGL world (Three.js), no Solo Leveling / anime references anywhere.

## Live + Repo (fill before submitting)
- Live URL: `https://YOUR-APP.vercel.app`
- Video (90–180s, <100MB): link here / `docs/demo.mp4`
- Submission form: https://forms.gle/CCZxgL5CWvGYwgxx7

## Tech (with disclosure)
- Frontend: Next.js 14 (App Router), React, Framer Motion (restrained motion only), Lucide icons, Three.js via React Three Fiber + Drei (real WebGL: floating island, Aether Heart crystal, biome pads, quest nodes with raycast hover/click, avatar statue, wisps, reflection, clouds)
- Backend + DB + Auth: Supabase (Postgres + Auth + RLS) + trusted Next.js API routes (`/api/quests/complete`, `/api/vault/purchase`) that compute XP/levels/purchases with the service key. Direct-client fallback when the key is absent (documented below). No raw SQL from client.
- Deploy: Vercel. Styling: hand-written token-based CSS (`app/globals.css`), no UI template copied.
- AI/tools disclosure: Supabase docs + Framer Motion docs + R3F/Drei docs used; all game code original.

## Setup
1. `npm install`
2. Copy `.env.example` → `.env.local` and add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (recommended: enables trusted server-side rewards; never expose to browser)
3. Supabase Dashboard → SQL Editor → run in order: `supabase/schema.sql`, `supabase/migration_002.sql`, `supabase/migration_003.sql`, `supabase/migration_004.sql` (all safe to re-run).
4. `npm run dev` → http://localhost:3000
5. `npm run build` must pass before submitting.

## Architecture
- `app/` — routes: `/` (cinematic 3D landing), `/dashboard` (HQ + living atlas), `/quests` (CRUD + due dates + statuses), `/shop` (vault + 3D inspect), `/profile` (ladder, attributes, achievements, history), `/settings` (identity, quality, sound, theme, session). Per-route `loading.tsx` skeletons.
- `components/three/PowerCoreScene.js` — WebGL atlas (island, heart, observatory, grove + blooms, biome pads, quest nodes with raycast hover/click, energy wisps, day/dusk moods, reflection, clouds). Client-only via `next/dynamic`; error boundary + static fallback included.
- `components/three/ItemPreview3D.js` — rotatable vault item previews.
- `lib/gameLogic.js` — XP math, garden ranks, streaks (with wilt + recovery), 6-attribute system with legacy normalization, achievements, activity feed.
- `lib/store.js` — Supabase + demo fallback; tries `/api` first, falls back transparently.
- `lib/server.js` — service-role progression (ownership checks, duplicate-completion/purchase guards, non-negative enforcement + DB CHECKs).
- `lib/sound.js` — WebAudio reward hooks (mutable). `lib/prefs.js` — device quality/motion prefs.
- 3D lazy-loads; quality Auto/High/Low + reduced-motion + chamber toggle control density, shadows, reflections, particles.

> Without Supabase keys the app runs in DEMO MODE (localStorage) for UI testing only. **Submit only with Supabase connected** — localStorage-only persistence = zero per rulebook. Without `SUPABASE_SERVICE_ROLE_KEY`, rewards compute client-side behind RLS (documented fallback).

## Routes
- `/` — Landing (cinematic atlas, loop, attributes, reward table, sign in)
- `/dashboard` — HQ (living atlas, briefing, quests, daily progress, radar stats, skills, achievements, unlocks, quest detail dialog)
- `/quests` — Full quest workflow (create, search, filter, complete, rename, abandon, due dates, overdue/scheduled)
- `/shop` — Vault (categories, rarity, unlock gates, 3D inspect, purchase/equip dialogs)
- `/profile` — Player overview (rank ladder, attributes, skills, equipment, achievements, history)
- `/settings` — Display name, 3D quality, sounds, chamber effects, theme, session

## Features → requirements map
- Auth (signup/login/session, RLS: user sees only own data, password visibility, protected routes) ✅
- Quests CRUD (create/read/update/delete, due dates, empty-title blocked, offline error, optimistic complete + rollback) ✅
- Non-linear leveling `xp = 100 * level^1.5`, rank-up bonus, garden ranks Seed→Everbloom ✅
- Streaks (consecutive days; miss → wilt reset + −20 coins + recovery mode) ✅
- Attributes (Coding→Intellect, Gym→Strength, Run→Health, Reading→Creativity, Work/Meditation→Discipline, Social→Social) ✅
- Economy (coins → Vault: auras, titles, frames, themes; buy + equip, persists, alters world/profile) ✅
- 3D world reacts: blooms per completion, wisp energy transfer, pulse bursts, streak moods, theme reskin, level rings ✅
- Responsive (collapsible sidebar, mobile bottom nav, thumb-friendly 44px targets), keyboard accessible (skip link, focus rings, Esc closes dialogs), screen-reader labels, semantic HTML + SEO metadata ✅
- Loading routes, toasts, confirm/purchase/insufficient-coin dialogs, empty + error + locked + overdue states ✅
- Achievements (10, derived — no schema change), activity history, rank ladder, notifications ✅

## Commits (keep 3+ chronological, after 12 Sep 10 AM)
Suggested: `feat: auth + schema`, `feat: quests + leveling + streak`, `feat: vault + polish + README`

## Video script (90–180s)
See `VIDEO_SCRIPT.md`. Must show: signup/login → add/complete quest → 3D wisp + level up → refresh persists → vault 3D inspect + purchase.

## Rulebook compliance
Third-party libs disclosed above. No boilerplate beyond Next.js starter. Commit history is real work log. Organizer decision final.
