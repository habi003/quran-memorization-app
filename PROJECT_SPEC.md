# Family Quran & Qaida Practice App — Project Spec

## 1. Goal

A multi-kid, multi-device app for daily Quran memorization + Arabic reading (Qaida) practice.

- **Kid mode** (tablet): today's practice — a few memorization ayahs + a few reading lines, big buttons, audio, streaks.
- **Parent mode** (phone/laptop): assign surahs, set daily targets, digitize the Qaida book lesson-by-lesson as the teacher progresses, watch progress live.
- Data syncs across devices in real time. One parent account owns the family; multiple kid profiles.

## 2. Architecture Principle

**Content is external and cached. Only user state lives in our database.**

- Quran verse text / transliteration / audio → fetched from `alquran.cloud` (free, no auth, no rate limit), cached client-side.
- Qaida (letters/words/reading) content → does **not** exist in any public API. It is manually digitized from the family's own book, page by page, as the teacher covers it. Stored in our DB as first-class content (see §4.2).
- Everything else (assignments, progress, streaks, kid profiles) → our DB.

This keeps the DB small and keeps us off any API's rate limits or auth requirements forever.

## 3. Stack

- **Backend**: Supabase (Postgres + Auth + Realtime + Row-Level Security). Free tier.
- **Frontend**: React + Vite, deployed free on Vercel/Netlify/Cloudflare Pages. Build as a **PWA** so it installs to the kid's tablet home screen and works offline for already-cached content.
- **Quran content**: `https://api.alquran.cloud/v1/surah/{n}/editions/quran-uthmani,en.transliteration,{reciter}` — Arabic text, English transliteration, and audio in one call, where `{reciter}` comes from the kid's `preferred_reciter` setting (default `ar.alafasy`). Cache text permanently (never changes); cache audio per reciter. Fetch the full reciter list once from `https://api.alquran.cloud/v1/edition/format/audio` to populate the in-app reciter picker.
- **Audio CDN pattern** (no API call needed once you know the edition): `https://cdn.islamic.network/quran/audio/{bitrate}/{edition}/{ayahNumber}.mp3`

## 4. Data Model

### 4.1 Core / family

```sql
-- One row per parent account (maps to Supabase auth.users)
-- kids belong to a family (owner_id), RLS scopes everything by this

create table kids (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  name text not null,
  avatar text,
  preferred_reciter text not null default 'ar.alafasy',  -- alquran.cloud audio edition id
  created_at timestamptz default now()
);
```

### 4.2 Memorization track (Quran)

```sql
create table assignments (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references kids(id),
  surah_number int not null,          -- 1-114
  daily_ayah_target int default 2,
  status text default 'learning',     -- learning | mastered
  assigned_at timestamptz default now()
);

create table memorization_progress (
  kid_id uuid not null references kids(id),
  surah_number int not null,
  ayah_number int not null,
  status text default 'new',          -- new | learning | memorized
  review_bucket text default 'sabaq', -- sabaq | sabqi | manzil
  last_reviewed_at timestamptz,
  primary key (kid_id, surah_number, ayah_number)
);

create table practice_log (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references kids(id),
  date date not null,
  track text not null,                -- memorization | reading
  completed boolean default false,
  created_at timestamptz default now()
);
```

**Sabaq / sabqi / manzil**: `sabaq` = today's new ayahs, `sabqi` = this week's recent ayahs, `manzil` = older surahs in rotation. A daily review query pulls a few ayahs from each bucket, weighted toward `manzil` so nothing learned is forgotten.

### 4.3 Reading track (Qaida — modeled on the actual book, "Noor Al-Bayan")

The book has 7 units, each broken into numbered lessons (دروس), each lesson built from small drill items (letter tiles, word-image pairs, syllable drills, sentences, paragraphs, and — from Unit 6 onward — actual Tajweed rules with Quranic examples). This structure maps directly to a 3-level hierarchy:

```sql
create table qaida_units (
  id uuid primary key default gen_random_uuid(),
  unit_number int not null,
  title_ar text not null
);
-- Seed data (from the book's table of contents):
-- 1  الحركات                          (Harakat: fatha, kasra, damma)
-- 2  المدود                          (Madd: elongation with alif/ya/waw)
-- 3  السكون                          (Sukoon)
-- 4  التنوين                         (Tanween)
-- 5  الشدة                           (Shadda / gemination + Lam Shamsiyyah)
-- 6  أحكام ترتيل القرآن               (Tajweed rules: noon sakinah, meem sakinah, madd types...)
-- 7  الرسم القرآني والرسم الإملائي     (Quranic script vs. standard script)

create table qaida_lessons (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references qaida_units(id),
  lesson_number int not null,        -- الدرس الأول, الثاني, ...
  title_ar text,                      -- e.g. "حركة الفتح", "المد بالألف"
  page_number int,                    -- page in the physical book, for cross-reference
  teacher_note_ar text,               -- the "للمعلم والآباء" box — guidance for whoever is running the lesson
  order_index int not null            -- overall sequence across the whole book
);

create table qaida_items (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references qaida_lessons(id),
  order_index int not null,
  item_type text not null,
  content jsonb not null,             -- shape depends on item_type, see below
  created_at timestamptz default now()
);
```

`item_type` values, matching what's actually in the book:

| item_type | content JSON shape | book example |
|---|---|---|
| `letter_isolated` | `{"tile": "بَ"}` | single letter+harakat tile |
| `letter_word_pair` | `{"tile": "بَ", "word": "بَيْت", "meaning_en": "house", "icon_key": "home"}` | letter + illustrated word (Unit 1 opening pages) |
| `letter_grid_drill` | `{"tiles": ["أَ","بَ","تَ", ...]}` | row of tiles for rapid drilling |
| `position_forms` | `{"letter": "ب", "forms": ["بـ","ـبـ","ـب","ب"]}` | initial/medial/final/isolated shapes |
| `similar_letters` | `{"mode": "shape\|sound", "group": ["ب","ت","ث"]}` | commonly confused letters |
| `syllable_build` | `{"parts": ["رَ","كَ"], "result": "رَكَ"}` | two-letter combination (هجاء method) |
| `word_reading` | `{"word": "طَلَقَ"}` | word without image, harder level |
| `phrase_reading` | `{"phrase": "رَكَعَ وَسَجَدَ"}` | two connected words |
| `sentence_reading` | `{"text": "أَطَاعَ عُمَرُ أَبَاهُ فَفَازَ بِرِضَا خَالِقِهِ"}` | full sentence |
| `paragraph_reading` | `{"title": "الْمُسْلِمُ", "text": "الْمُسْلِمُ هَادِئٌ فِي طَبْعِهِ..."}` | short story passage (e.g. "العصفور", "الفلاح") |
| `quranic_example` | `{"text": "وَٱلَّيْلِ إِذَا سَجَىٰ", "surah_ref": "93:2"}` | real ayah demonstrating the rule (Units 2, 6, 7) |
| `rule_comparison` | `{"quranic_rasm": "هَـٰذَا", "imlai_rasm": "هَذَا"}` | Unit 7 side-by-side script comparison |

```sql
create table reading_progress (
  kid_id uuid not null references kids(id),
  lesson_id uuid not null references qaida_lessons(id),
  status text default 'not_started',  -- not_started | in_progress | mastered
  last_practiced_at timestamptz,
  primary key (kid_id, lesson_id)
);

-- Where each kid currently is, since the teacher's pace (1-2 lines/day)
-- doesn't map cleanly to "lesson complete" — this is a pointer, not a status.
create table kid_reading_position (
  kid_id uuid primary key references kids(id),
  current_lesson_id uuid references qaida_lessons(id),
  current_item_index int default 0,
  updated_at timestamptz default now()
);
```

### 4.4 Gamification & Rewards

```sql
alter table kids add column stars_balance int not null default 0;

create table stars_log (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references kids(id),
  amount int not null,
  reason text not null,        -- 'item_complete' | 'ayah_complete' | 'streak_bonus' | 'perfect_day' | 'lesson_complete' | 'surah_complete'
  created_at timestamptz default now()
);

create table badges (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references kids(id),
  badge_key text not null,     -- see catalogue below
  earned_at timestamptz default now(),
  unique (kid_id, badge_key)
);
```

**Badge catalogue** — keep this as a small frontend constant (name, icon, description, unlock condition), *not* a DB table. It's app copy, not data that changes per family, so it doesn't need to sync:

| badge_key | unlocks when |
|---|---|
| `first_ayah` | completes the very first memorization item ever |
| `first_lesson` | completes the very first reading item ever |
| `streak_3` / `streak_7` / `streak_30` | practice_log has entries on that many consecutive days |
| `perfect_day` | both tracks completed on the same day |
| `unit_1_complete` | all Unit 1 lessons show `mastered` in `reading_progress` |
| `surah_complete` (parameterized per surah) | an assigned surah's every ayah is `memorized` |

**Streak** is computed, not stored: count consecutive calendar days (working backward from today) with at least one `practice_log` row — no separate streak column to keep in sync.

**Design principle for the reward system**: keep rewards predictable and tied directly to effort (fixed stars per completed item, fixed badges per named milestone) rather than randomized "loot box" style rewards. Variable-ratio reward schedules are what make some apps compulsively engaging for adults — that mechanic is best avoided for a 7-year-old's habit-building tool. A missed day should just quietly reset the streak counter with no guilt-tripping copy ("Let's start a new streak!" not "You broke your streak!").

### 4.5 Row-Level Security

Every table filters through `kids.owner_id = auth.uid()`. Example:

```sql
alter table kids enable row level security;
create policy "owner full access" on kids
  for all using (owner_id = auth.uid());

-- assignments/progress/etc. join through kids:
create policy "owner access via kid" on assignments
  for all using (
    exists (select 1 from kids where kids.id = assignments.kid_id and kids.owner_id = auth.uid())
  );
-- repeat the same pattern for memorization_progress, practice_log, reading_progress, kid_reading_position, stars_log, badges
```

`qaida_units`, `qaida_lessons`, `qaida_items` are **not** per-family — they're shared reference content (the book itself), so they're readable by any authenticated user but only writable by the parent entering data (in a single-family app, this distinction barely matters; just leave them world-readable-to-authenticated, insert/update restricted to your own account).

## 5. Auth Model

One parent account owns the family. The tablet stays signed into that same account but opens straight into **Kid Mode**: a profile picker, then today's practice — no login screen for the child. A parent PIN (stored client-side, not a real auth boundary, just a speed bump) gates switching into **Parent Mode**. Your own device signs into the same account and opens to the parent dashboard.

## 6. Digitizing the Qaida Content — Practical Strategy

Don't try to transcribe the whole 96-page book up front. Digitize **incrementally, one lesson ahead of where the teacher currently is**, using a simple "add lesson" screen in Parent Mode:

1. Pick unit + lesson number, add the page's teacher note if useful.
2. Add items in order (usually just typing the Arabic — the book's structure repeats a small number of `item_type` patterns per unit, so after the first few lessons this goes fast).
3. Set `kid_reading_position` to point here once it's the current lesson.

**Starter seed data** (Unit 1, Lesson 1 — "الحروف بحركة الفتح", from the book itself) to give Claude Code a working example to build the entry UI against:

```json
[
  {"item_type": "letter_word_pair", "content": {"tile": "بَ", "word": "بَيْت", "meaning_en": "house"}},
  {"item_type": "letter_word_pair", "content": {"tile": "تَ", "word": "تَمْر", "meaning_en": "dates"}},
  {"item_type": "letter_word_pair", "content": {"tile": "أَ", "word": "أَقْصَى", "meaning_en": "Al-Aqsa"}},
  {"item_type": "letter_word_pair", "content": {"tile": "ثَ", "word": "ثَلَّاجَة", "meaning_en": "fridge"}},
  {"item_type": "letter_word_pair", "content": {"tile": "جَ", "word": "جَمَل", "meaning_en": "camel"}},
  {"item_type": "letter_word_pair", "content": {"tile": "حَ", "word": "حَمَامَة", "meaning_en": "dove"}},
  {"item_type": "letter_grid_drill", "content": {"tiles": ["أَ","بَ","تَ","ثَ","جَ","حَ","خَ","دَ","ذَ","رَ","زَ","سَ"]}}
]
```

**Icons — decided**: use `lucide-react` (MIT-licensed, already bundled in most Claude-Code-generated React setups, ~1000 icons). Map each `letter_word_pair.icon_key` (e.g. `"home"`, `"date"`, `"camel"`) to a lucide icon name in a small local lookup table; fall back to the Arabic word alone if no sensible icon exists (some vocabulary in later lessons is abstract). This avoids sourcing/licensing the book's actual photos entirely.

**Audio for the reading track — decided**: use the browser's built-in **Web Speech API** (`SpeechSynthesis`) with an Arabic voice — free, zero backend, zero API key, works offline once the voice is downloaded on-device. Pronunciation quality varies by OS/browser (generally decent on iOS Safari and Android Chrome, weaker on desktop Linux). Because `qaida_items.content` is JSONB, nothing in the schema needs to change if you later swap in recorded audio (teacher's or your own voice) — just add an `audio_url` key to the relevant items' content and prefer it over TTS when present.

**Seeding scope — decided**: seed **Unit 1 in full** (all lessons — harakat, letter positions, similar letters, syllable building, word/sentence reading) plus **Unit 2, Lesson 1** ("المد بالألف" — madd with alif), since that's where he is now (book page 24/25). Set `kid_reading_position` to Unit 2 / Lesson 1 / item 0 once seeded. Extend one lesson at a time from there as the teacher progresses — don't seed Unit 2 Lessons 2+ yet since the exact drills only matter once he's actually there.

## 7. Kid Mode — Daily Screen

Profile picker → today's screen, two tracks. Two design principles run through everything below:

**Chunking.** The daily targets (`daily_ayah_target`, and 1-2 reading items via `kid_reading_position`) already limit *how much* new content appears per day. Inside a session, apply the same idea to *how it's shown*: never a list to power through — one ayah or one reading item fills the screen at a time, full-focus, with a small progress dots indicator ("● ● ○" — 2 of 3 today) so he always knows how close he is to done without feeling the weight of the whole session at once.

**Repetition**, modeled directly on his teacher's own method (listen with her once → repeat after her → recite alone if confident). Each memorization item is a 3-step mini-flow, not a single screen:

1. **Listen** — Arabic + transliteration visible, audio auto-loads, tap-to-play/replay freely.
2. **Repeat with me** — same view stays up; a simple 3-dot repeat counter fills in as he replays and repeats out loud (mirrors the "repeat several times" technique without being rigid about an exact count — tapping past 3 is fine, the dots just stop filling).
3. **Recite alone** — the Arabic/transliteration blurs out; only a "show me" button remains for if he gets stuck. When he's done he taps either **"I got it!"** (marks reviewed, awards stars, advances) or **"Need more practice"** (loops back to step 2, no penalty, no negative copy — just "Let's try that again").

The reading track uses a lighter version of the same 3 steps (hear it → repeat it → read it yourself), scaled to fit the item type — a `letter_word_pair` needs less scaffolding than a `sentence_reading`.

**Gamification, woven into the flow above rather than bolted on:**
- Stars animate in immediately on "I got it!" / item complete (small, frequent, satisfying — not saved up for later).
- A streak flame with the current count sits at the top of the home screen always.
- A **badge shelf** (Parent or Kid mode, either works) shows earned badges in color and locked ones as grey silhouettes with a hint — gives him something to look forward to.
- Optional but a nice signature touch: a simple visual "path" of his assigned surahs as stepping stones (walking figure or similar), each stone lighting up as that surah is completed — turns the surah list into something that feels like progress on a map rather than a checklist.

## 8. Parent Mode — Dashboard

Per kid: today's status (done/not done, both tracks), streak, weekly history (small chart is fine). Realtime subscription so it updates live when the tablet reports progress. Controls: manage assignments/targets, add new Qaida lessons/items, add a new kid (just an insert into `kids`), reset/edit reading position if the teacher moves faster/slower than expected on a given day.

## 9. Build Order (suggest to Claude Code as milestones)

1. Supabase project: run the schema above, enable RLS with the policies shown.
2. App scaffold (Vite + React), auth wiring, kid-profile picker + parent-mode PIN gate.
3. Memorization core: assignment → fetch from alquran.cloud → cache → display → audio → the listen/repeat/recite-alone 3-step flow → writes to `practice_log` and `memorization_progress`.
4. Gamification layer: `stars_log` writes on item completion, streak calculation, badge-unlock checks, badge shelf UI.
5. Parent dashboard with Realtime subscription on `practice_log`.
6. Reading track: lesson/item entry screen (parent) + item-type renderer with the lighter hear/repeat/read-yourself flow (kid) + `kid_reading_position` advance logic.
7. Sabaq/sabqi/manzil review query, weighted toward manzil.
8. PWA manifest + service worker for offline caching + deploy.

## 10. Decisions Log

**Resolved:**
- Icons: `lucide-react` with an `icon_key` lookup table.
- Reading-track audio: browser Web Speech API (TTS), schema ready for recorded audio later.
- Initial seed: Unit 1 complete + Unit 2 Lesson 1.
- **Reciter**: per-kid setting (`kids.preferred_reciter`), in-app picker populated from alquran.cloud's audio edition list, default `ar.alafasy`. The family will identify the exact reciter from the kid's current YouTube listening (an uncredited compilation channel) by A/B comparing in the picker, then set it as his default. If the match turns out to be a reciter not on alquran.cloud (e.g. Islam Sobhi), audio can be sourced from everyayah.com or QUL's open datasets using the same `{surah}/{ayah}` URL-pattern approach — keep the audio-URL builder a single swappable function.
- **Recording his own recitation**: deferred to a later phase (v2). When built: MediaRecorder API → upload to Supabase Storage → parent can listen in dashboard before Saturday class. Nothing in v1 schema blocks this.
- **Target device: iPad.** Build/test PWA against iOS Safari specifically:
  - Install flow is Share → Add to Home Screen (no install prompt like Android — add a one-time in-app hint).
  - iOS requires a user gesture before audio playback — never rely on autoplay; the "Listen" step's play button satisfies this naturally.
  - iOS Arabic TTS voices are decent quality; test `SpeechSynthesis` voice selection early (pick an `ar-SA` voice explicitly rather than the default).
  - iOS may evict PWA storage under pressure — treat all caches as re-fetchable, keep source-of-truth in Supabase.

**Still open — worth deciding early, not blocking a first build:**
- Supabase vs Firebase (spec assumes Supabase/Postgres).
- Whether kid mode needs its own PIN to prevent leaving the app, or whether you'll rely on the tablet's OS-level guided-access/kiosk mode instead — the app itself doesn't need to solve this, just document which approach you're using.
- Whether to seed his existing **23 memorized surahs** into `memorization_progress` as `status = 'memorized'` right away, so the review rotation (sabqi/manzil) has real material to pull from from day one, instead of starting empty. Recommended: yes, seed them — otherwise the review feature has nothing to show until weeks of new assignments accumulate.
- Daily reminder notifications (push notification vs. just relying on the home-screen PWA icon) — a nice-to-have, not needed for v1.
- Whether to store the physical book's page number on `qaida_lessons` (already in the schema) as a working cross-reference while you're transcribing lesson-by-lesson at the kitchen table.
