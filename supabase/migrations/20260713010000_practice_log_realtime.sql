-- Milestone 5: the Parent Dashboard needs live updates when the tablet
-- reports progress. practice_log is written on every completed ayah (not
-- just full-target completion) and every mastery/badge-claim event happens
-- in the same session as a practice_log write, so subscribing to just this
-- one table is enough to keep the whole dashboard (assignments, counts,
-- streaks, titles) fresh — no need to add assignments/badges/stars_log too.
alter publication supabase_realtime add table practice_log;
