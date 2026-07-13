# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project State

Milestones 1–4 are complete and merged into `develop`: Supabase schema/RLS, app scaffold + auth + kid picker + parent PIN gate, memorization core (assignment → fetch/cache/display/audio → 3-step practice flow), and a gamification layer (stars, streaks, badges, milestone titles, cosmetic unlocks) that grew substantially beyond the original spec's §4.4 sketch — see the "Gamification" subsection below and PROJECT_SPEC.md §4.4/§10 for what actually shipped. Milestones 5–8 (Parent Dashboard Realtime, reading/Qaida track, sabaq/sabqi/manzil review, PWA + deploy) are not started. [PROJECT_SPEC.md](PROJECT_SPEC.md) is the authoritative spec — read it in full before starting new milestone work; update it when decisions change during a build, the way §4.4/§9/§10 were updated after Milestone 4.

## Commands

```bash
npm install
npm run dev      # dev server, http://localhost:5173
npm run lint      # oxlint
npm run build     # tsc -b && vite build (type-check + production build)
```

```bash
npx supabase db push               # apply pending migrations to the linked project
npx supabase db push --dry-run     # preview what would be applied
npx supabase db query --linked "select ..."   # ad-hoc read query against the linked project
```

Manual testing needs a real Supabase login the assistant doesn't have — a browser smoke test (dev server boots, sign-in screen renders, no console errors) plus `lint`/`build` is the automatable verification; anything behind auth needs a human pass.

## Git Workflow

`main` ← `develop` ← `feature/*` / `fix/*` / `docs/*`. Never commit directly to `main` or `develop`. Cut a branch off `develop`, PR back into `develop`. Draft commit messages and PR title/body as plain text in chat and wait for explicit approval before running `git commit`/`gh pr create` — this applies per-commit, not once per session (a prior approval doesn't carry forward to the next one). No `Co-Authored-By: Claude` trailer.

## What This Is

A multi-kid, multi-device family app for daily Quran memorization + Arabic reading (Qaida) practice:
- **Kid mode** (tablet, e.g. iPad): today's practice — a few memorization ayahs + a few reading lines, big buttons, audio, streaks.
- **Parent mode** (phone/laptop): assign surahs, set daily targets, digitize the Qaida book lesson-by-lesson, watch progress live.
- One parent account owns the family; multiple kid profiles; real-time sync across devices (Realtime is milestone 5, not yet built — Parent Dashboard currently polls/refetches).

## Core Architecture Principle

**Content is external and cached. Only user state lives in our database.**

- Quran verse text / transliteration / audio comes from `alquran.cloud` (free, no auth, no rate limit) and is cached client-side (`src/lib/quran.ts`, localStorage, versioned cache-key prefix — bump the version when a cached shape changes).
- Qaida (Arabic reading primer) content does not exist in any public API — it will be manually digitized from the family's own book ("Noor Al-Bayan") lesson-by-lesson as the teacher covers it, and stored as first-class content in our DB (`qaida_units` → `qaida_lessons` → `qaida_items`). Not built yet (milestone 6).
- Everything else (assignments, progress, streaks, kid profiles, stars, badges) lives in our DB.

This keeps the DB small and avoids any external API's rate limits or auth requirements.

## Stack

- **Backend**: Supabase (Postgres + Auth + Realtime + Row-Level Security), free tier.
- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS v4, `react-router-dom`. Built toward a PWA (installs to home screen, works offline for cached content) — manifest/service worker not yet added (milestone 8). Target device is iPad — build/test against iOS Safari specifically (see iOS-specific gotchas in spec §10).
- **Icons**: `lucide-react`, mapped via local `icon_key`-style lookup tables (`src/lib/avatarIcons.ts`, badge/reason icons in `src/lib/badgeCatalog.ts`).
- **Sound**: procedural Web Audio oscillator tones (`src/lib/sounds.ts`) — no audio files to source/license for UI feedback.
- **Quran audio CDN pattern** (no API call needed once the edition is known): `https://cdn.islamic.network/quran/audio/{bitrate}/{edition}/{ayahNumber}.mp3`.

## Data Model (see PROJECT_SPEC.md §4 for full DDL, and `supabase/migrations/` for the exact history of changes)

Three logical groups, all scoped by `kids.owner_id = auth.uid()` via RLS:

1. **Core/family**: `kids` — one parent account, multiple kid profiles. Beyond the original spec: `theme`, `text_size`, `animations_enabled` (per-kid self-serve customization, `src/lib/themes.ts` / `src/lib/textSize.ts`), `preferred_reciter`.
2. **Memorization track**: `assignments` (surah + target — `target_period` is `'daily'` or `'weekly'`, added after the original spec) → `memorization_progress` (per-ayah status) → `practice_log` (daily completion, drives streaks). Review pulls from three buckets — `sabaq` (today's new ayahs), `sabqi` (this week's), `manzil` (older surahs in rotation); the weighted review query itself is milestone 7, not built yet — `review_bucket` is written today but not yet read.
3. **Reading track**: not built yet (milestone 6) — schema exists (`qaida_units` → `qaida_lessons` → `qaida_items`, `kid_reading_position`) per spec §4.3.
4. **Gamification** (`src/lib/gamification.ts`, `src/lib/badgeCatalog.ts`, `src/lib/cosmeticUnlocks.ts`) — see below, this is where the build diverged most from the original spec sketch.

### Gamification

- `stars_log` (append-only) drives `kids.stars_balance` via a Postgres trigger (`sync_stars_balance`, not client-side increment — can't drift regardless of write path).
- `badges` has a `claimed_at` column (added post-spec): a badge is *recorded* (condition met, `claimed_at: null`) separately from being *claimed* (kid taps it in the Badge Shelf, conditional `UPDATE ... WHERE claimed_at IS NULL` sets it — race-safe, and the durability of this column is what avoids a real bug where a live-recomputed "pending" state would silently lose a badge if a non-monotonic stat like streak reset before the kid tapped). Admin/parent-driven backfill (`checkAndAwardSurahCompleteBadge`, used by the "mark surahs already completed" flow) grants instantly, no claim gate — that's a trusted action outside Kid Mode.
- Reachable badge families today: `first_ayah`; `streak_3/7/14/30/60/100/180/365`; `milestone_surahs_3/5/10/25/50/75/100/114` (each also grants a **title**, e.g. "Quran Explorer", via `TITLE_CATALOG`, and some grant a cosmetic avatar/theme unlock via `COSMETIC_UNLOCKS`); `surah_complete_<n>` (per specific surah, instant-grant, not shown in the Badge Shelf — see comment in `BadgeShelf.tsx` for why). `first_lesson`/`perfect_day`/`unit_1_complete` from the original spec are reserved but unreachable until the reading track (milestone 6) exists.
- Cosmetic unlocks never retroactively lock anything that existed before this feature — only new reward-only avatar/theme entries are gated. A parent editing a specific kid's profile only ever sees that kid's own unlocked options, newest-unlocked first.
- Streak is still **computed on read** (consecutive `practice_log` days working backward from today), never stored as a column — but the query has a `.limit()` that must stay sized past the largest configured streak tier (365 today), not just "big enough for now."
- Badge catalogue/titles/cosmetic map are frontend constants, not DB tables, per the original spec's reasoning.

## Key Product/Design Decisions (don't relitigate without reason)

- **Reward design**: fixed stars per completed item, fixed badges per named milestone — deliberately not randomized/loot-box style, to avoid compulsive-engagement mechanics in a 7-year-old's habit tool. A missed day quietly resets the streak with neutral copy, never guilt-tripping. Badges are claimed via a deliberate tap ("unlock" moment), not auto-granted silently — see Gamification above.
- **Kid-mode session flow**: one item fills the screen at a time (never a list to power through), with a small progress-dots indicator. Each memorization item follows a 3-step mini-flow modeled on the teacher's own method: Listen → Repeat with me → Recite alone (blurred text, "I got it!" vs "Need more practice" with no penalty for the latter). The reading track (not built yet) will use a lighter version of the same 3 steps, scaled to item type.
- **Qaida digitization strategy**: incremental, one lesson ahead of where the teacher currently is — never try to transcribe the whole book upfront. Seed scope is Unit 1 in full + Unit 2 Lesson 1 (see spec §6 for the worked seed-data example and item_type reference). Not started.
- **Auth**: single parent account; tablet stays signed in and opens straight to Kid Mode (profile picker, no login screen for the child); a client-side PIN (not a real auth boundary) gates entry to Parent Mode.
- **Reciter resolution**: per-kid `preferred_reciter` setting, in-app A/B picker (`ReciterPicker`) from alquran.cloud's edition list; if the family's target reciter isn't on alquran.cloud, fall back to everyayah.com/QUL via a single swappable audio-URL-builder function (`buildAudioUrl` in `src/lib/quran.ts`).
- **Settings UI**: prefer a tabbed panel over one long scrolling stack once there are more than ~2 categories of controls (established in `CustomizePanel.tsx` and `KidForm.tsx`) — hide a tab entirely if it has nothing to show rather than rendering an empty state.

## Open Decisions (see PROJECT_SPEC.md §10)

Not blocking further build, but check before assuming an answer: whether Kid Mode needs its own app-level PIN vs. relying on OS-level guided access/kiosk mode, whether to seed the kid's existing memorized surahs into `memorization_progress` on day one (recommended: yes), and daily reminder notifications (nice-to-have, not v1). Supabase (vs. Firebase) is settled — the app is built on it.

## Build Order

Per spec §9: ✅ Supabase schema/RLS → ✅ app scaffold + auth + profile picker → ✅ memorization core → ✅ gamification layer → parent dashboard with Realtime (next) → reading track (entry UI + item renderer + position advance) → sabaq/sabqi/manzil review query → PWA manifest/service worker + deploy.
