-- Milestone 1: core schema + RLS, per PROJECT_SPEC.md §4.

-- ============================================================
-- 4.1 Core / family
-- ============================================================

create table kids (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id),
  name text not null,
  avatar text,
  preferred_reciter text not null default 'ar.alafasy',
  created_at timestamptz default now()
);

-- ============================================================
-- 4.2 Memorization track (Quran)
-- ============================================================

create table assignments (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references kids(id),
  surah_number int not null,
  daily_ayah_target int default 2,
  status text default 'learning',
  assigned_at timestamptz default now()
);

create table memorization_progress (
  kid_id uuid not null references kids(id),
  surah_number int not null,
  ayah_number int not null,
  status text default 'new',
  review_bucket text default 'sabaq',
  last_reviewed_at timestamptz,
  primary key (kid_id, surah_number, ayah_number)
);

create table practice_log (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references kids(id),
  date date not null,
  track text not null,
  completed boolean default false,
  created_at timestamptz default now()
);

-- ============================================================
-- 4.3 Reading track (Qaida)
-- ============================================================

create table qaida_units (
  id uuid primary key default gen_random_uuid(),
  unit_number int not null,
  title_ar text not null
);

create table qaida_lessons (
  id uuid primary key default gen_random_uuid(),
  unit_id uuid not null references qaida_units(id),
  lesson_number int not null,
  title_ar text,
  page_number int,
  teacher_note_ar text,
  order_index int not null
);

create table qaida_items (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references qaida_lessons(id),
  order_index int not null,
  item_type text not null,
  content jsonb not null,
  created_at timestamptz default now()
);

create table reading_progress (
  kid_id uuid not null references kids(id),
  lesson_id uuid not null references qaida_lessons(id),
  status text default 'not_started',
  last_practiced_at timestamptz,
  primary key (kid_id, lesson_id)
);

create table kid_reading_position (
  kid_id uuid primary key references kids(id),
  current_lesson_id uuid references qaida_lessons(id),
  current_item_index int default 0,
  updated_at timestamptz default now()
);

-- ============================================================
-- 4.4 Gamification & Rewards
-- ============================================================

alter table kids add column stars_balance int not null default 0;

create table stars_log (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references kids(id),
  amount int not null,
  reason text not null,
  created_at timestamptz default now()
);

create table badges (
  id uuid primary key default gen_random_uuid(),
  kid_id uuid not null references kids(id),
  badge_key text not null,
  earned_at timestamptz default now(),
  unique (kid_id, badge_key)
);

-- ============================================================
-- 4.5 Row-Level Security
-- ============================================================

alter table kids enable row level security;
create policy "owner full access" on kids
  for all using (owner_id = auth.uid());

alter table assignments enable row level security;
create policy "owner access via kid" on assignments
  for all using (
    exists (select 1 from kids where kids.id = assignments.kid_id and kids.owner_id = auth.uid())
  );

alter table memorization_progress enable row level security;
create policy "owner access via kid" on memorization_progress
  for all using (
    exists (select 1 from kids where kids.id = memorization_progress.kid_id and kids.owner_id = auth.uid())
  );

alter table practice_log enable row level security;
create policy "owner access via kid" on practice_log
  for all using (
    exists (select 1 from kids where kids.id = practice_log.kid_id and kids.owner_id = auth.uid())
  );

alter table reading_progress enable row level security;
create policy "owner access via kid" on reading_progress
  for all using (
    exists (select 1 from kids where kids.id = reading_progress.kid_id and kids.owner_id = auth.uid())
  );

alter table kid_reading_position enable row level security;
create policy "owner access via kid" on kid_reading_position
  for all using (
    exists (select 1 from kids where kids.id = kid_reading_position.kid_id and kids.owner_id = auth.uid())
  );

alter table stars_log enable row level security;
create policy "owner access via kid" on stars_log
  for all using (
    exists (select 1 from kids where kids.id = stars_log.kid_id and kids.owner_id = auth.uid())
  );

alter table badges enable row level security;
create policy "owner access via kid" on badges
  for all using (
    exists (select 1 from kids where kids.id = badges.kid_id and kids.owner_id = auth.uid())
  );

-- qaida_units/qaida_lessons/qaida_items are shared reference content, not per-family:
-- world-readable to any authenticated user, writable only by an authenticated user
-- (the owner distinction barely matters in a single-family app, per spec §4.5).

alter table qaida_units enable row level security;
create policy "authenticated read" on qaida_units
  for select using (auth.role() = 'authenticated');
create policy "authenticated write" on qaida_units
  for insert with check (auth.role() = 'authenticated');
create policy "authenticated update" on qaida_units
  for update using (auth.role() = 'authenticated');

alter table qaida_lessons enable row level security;
create policy "authenticated read" on qaida_lessons
  for select using (auth.role() = 'authenticated');
create policy "authenticated write" on qaida_lessons
  for insert with check (auth.role() = 'authenticated');
create policy "authenticated update" on qaida_lessons
  for update using (auth.role() = 'authenticated');

alter table qaida_items enable row level security;
create policy "authenticated read" on qaida_items
  for select using (auth.role() = 'authenticated');
create policy "authenticated write" on qaida_items
  for insert with check (auth.role() = 'authenticated');
create policy "authenticated update" on qaida_items
  for update using (auth.role() = 'authenticated');
