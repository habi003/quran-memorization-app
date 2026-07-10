# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project State

This repository currently contains only [PROJECT_SPEC.md](PROJECT_SPEC.md) — no application code has been scaffolded yet. That file is the authoritative spec; read it in full before starting implementation work. This CLAUDE.md summarizes its key architectural decisions so you don't have to re-derive them, but PROJECT_SPEC.md is the source of truth and should be updated if decisions change during the build.

There are no build/lint/test commands yet because no scaffold exists. Once the app is scaffolded (per the build order in §9 of the spec), update this file with the actual `npm`/`vite`/test commands.

## What This Is

A multi-kid, multi-device family app for daily Quran memorization + Arabic reading (Qaida) practice:
- **Kid mode** (tablet, e.g. iPad): today's practice — a few memorization ayahs + a few reading lines, big buttons, audio, streaks.
- **Parent mode** (phone/laptop): assign surahs, set daily targets, digitize the Qaida book lesson-by-lesson, watch progress live.
- One parent account owns the family; multiple kid profiles; real-time sync across devices.

## Core Architecture Principle

**Content is external and cached. Only user state lives in our database.**

- Quran verse text / transliteration / audio comes from `alquran.cloud` (free, no auth, no rate limit) and is cached client-side (text is permanent, audio cached per reciter).
- Qaida (Arabic reading primer) content does not exist in any public API — it is manually digitized from the family's own book ("Noor Al-Bayan") lesson-by-lesson as the teacher covers it, and stored as first-class content in our DB (`qaida_units` → `qaida_lessons` → `qaida_items`).
- Everything else (assignments, progress, streaks, kid profiles, stars, badges) lives in our DB.

This keeps the DB small and avoids any external API's rate limits or auth requirements.

## Stack

- **Backend**: Supabase (Postgres + Auth + Realtime + Row-Level Security), free tier.
- **Frontend**: React + Vite, built as a PWA (installs to home screen, works offline for cached content). Target device is iPad — build/test against iOS Safari specifically (see iOS-specific gotchas in spec §10).
- **Icons**: `lucide-react`, mapped via a local `icon_key` lookup table (see `letter_word_pair.icon_key` in the data model).
- **Reading-track audio**: browser Web Speech API (`SpeechSynthesis`) with an explicit `ar-SA` voice — no backend, no API key. Schema supports swapping in recorded audio later via an `audio_url` key in `qaida_items.content` without migration.
- **Quran audio CDN pattern** (no API call needed once the edition is known): `https://cdn.islamic.network/quran/audio/{bitrate}/{edition}/{ayahNumber}.mp3`.

## Data Model (see PROJECT_SPEC.md §4 for full DDL)

Three logical groups, all scoped by `kids.owner_id = auth.uid()` via RLS:

1. **Core/family**: `kids` (one parent account, multiple kid profiles, each with `preferred_reciter`).
2. **Memorization track**: `assignments` (surah + daily target) → `memorization_progress` (per-ayah status) → `practice_log` (daily completion). Review pulls from three buckets — `sabaq` (today's new ayahs), `sabqi` (this week's), `manzil` (older surahs in rotation), weighted toward `manzil` so nothing is forgotten.
3. **Reading track**: mirrors the physical Qaida book's structure — `qaida_units` (7 units) → `qaida_lessons` (numbered lessons per unit) → `qaida_items` (drill items, `content` is JSONB whose shape depends on `item_type` — see the item_type table in spec §4.3). `kid_reading_position` is a pointer (not a status) since the teacher's real-world pace doesn't map cleanly to "lesson complete." `qaida_units/lessons/items` are shared reference content, not per-family — readable by any authenticated user, writable only by the parent digitizing them.
4. **Gamification**: `stars_log` (append-only, drives `kids.stars_balance`), `badges` (unlocked, keyed by `badge_key`). The badge catalogue (name/icon/description/unlock condition) is a **frontend constant, not a DB table** — see spec §4.4 for the full list. Streaks are **computed on read** (consecutive `practice_log` days working backward from today), never stored as a column.

## Key Product/Design Decisions (don't relitigate without reason)

- **Reward design**: fixed stars per completed item, fixed badges per named milestone — deliberately not randomized/loot-box style, to avoid compulsive-engagement mechanics in a 7-year-old's habit tool. A missed day quietly resets the streak with neutral copy, never guilt-tripping.
- **Kid-mode session flow**: one item fills the screen at a time (never a list to power through), with a small progress-dots indicator. Each memorization item follows a 3-step mini-flow modeled on the teacher's own method: Listen → Repeat with me → Recite alone (blurred text, "I got it!" vs "Need more practice" with no penalty for the latter). The reading track uses a lighter version of the same 3 steps, scaled to item type.
- **Qaida digitization strategy**: incremental, one lesson ahead of where the teacher currently is — never try to transcribe the whole book upfront. Seed scope is Unit 1 in full + Unit 2 Lesson 1 (see spec §6 for the worked seed-data example and item_type reference).
- **Auth**: single parent account; tablet stays signed in and opens straight to Kid Mode (profile picker, no login screen for the child); a client-side PIN (not a real auth boundary) gates entry to Parent Mode.
- **Reciter resolution**: per-kid `preferred_reciter` setting, in-app A/B picker from alquran.cloud's edition list; if the family's target reciter isn't on alquran.cloud, fall back to everyayah.com/QUL via a single swappable audio-URL-builder function.

## Open Decisions (see PROJECT_SPEC.md §10)

Not blocking a first build, but check before assuming an answer: Supabase vs. Firebase (spec assumes Supabase), whether Kid Mode needs its own app-level PIN vs. relying on OS-level guided access/kiosk mode, whether to seed the kid's existing memorized surahs into `memorization_progress` on day one (recommended: yes), and daily reminder notifications (nice-to-have, not v1).

## Build Order

Follow the milestone sequence in spec §9: Supabase schema/RLS → app scaffold + auth + profile picker → memorization core (fetch/cache/display/audio/3-step flow) → gamification layer → parent dashboard with Realtime → reading track (entry UI + item renderer + position advance) → sabaq/sabqi/manzil review query → PWA manifest/service worker + deploy.
