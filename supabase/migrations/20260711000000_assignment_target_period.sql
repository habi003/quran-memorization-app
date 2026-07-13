-- Lets a parent choose a daily or weekly pacing when assigning a surah
-- (e.g. "5 ayahs by next week" homework-style targets), not just a strict
-- daily quota.
alter table assignments add column target_period text not null default 'daily';
