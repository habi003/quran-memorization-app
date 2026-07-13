# Little Hafiz

A multi-kid, multi-device family app for daily Quran memorization and Arabic reading (Qaida) practice.

- **Kid mode** (tablet, e.g. iPad): today's practice — a few memorization ayahs, big buttons, audio, streaks, badges, titles.
- **Parent mode** (phone/laptop): assign surahs, set daily/weekly targets, watch progress live.
- One parent account owns the family; multiple kid profiles.

See [PROJECT_SPEC.md](PROJECT_SPEC.md) for the full design spec and [CLAUDE.md](CLAUDE.md) for a guide to the codebase (architecture, conventions, current build status).

## Stack

- **Frontend**: React 19 + Vite + TypeScript + Tailwind CSS v4, `react-router-dom`, `lucide-react` icons.
- **Backend**: Supabase (Postgres + Auth + Row-Level Security), managed via versioned CLI migrations in `supabase/migrations/`.
- **Content**: Quran text/audio from [alquran.cloud](https://alquran.cloud) (no auth, cached client-side); everything else (assignments, progress, gamification) lives in our own Postgres schema.

## Getting started

```bash
npm install
```

Copy `.env.example` to `.env.local` and fill in your own Supabase project's URL/anon key (Supabase dashboard → Settings → API). A parent account must already exist for that project (created once via Supabase Studio → Authentication → Users — there's no sign-up flow in the app).

```bash
npm run dev      # start the dev server (http://localhost:5173)
npm run lint      # oxlint
npm run build     # tsc type-check + production build
```

### Database

Schema is managed as versioned Supabase CLI migrations:

```bash
npx supabase login              # first time only
npx supabase link --project-ref <your-project-ref>
npx supabase db push            # apply all migrations
npx supabase db push --dry-run  # preview what would be applied
```

## Project status

Milestones 1–4 (Supabase schema, app scaffold/auth, memorization core, gamification layer) are complete and merged into `develop`. See PROJECT_SPEC.md §9 for the full build order and what's next.

## Branching

`main` ← `develop` ← `feature/*` / `fix/*` — work happens on a feature branch cut from `develop`, PR'd back into `develop`. `main` tracks released/deployed state.
