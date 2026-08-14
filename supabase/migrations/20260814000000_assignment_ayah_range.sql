-- Lets a parent scope an assignment to part of a surah (e.g. "ayahs 5-20")
-- instead of always the whole thing. Null on both means "whole surah" —
-- existing rows and any insert that omits the range keep today's behavior.
alter table assignments add column start_ayah int;
alter table assignments add column end_ayah int;

alter table assignments add constraint assignments_ayah_range_check check (
  (start_ayah is null and end_ayah is null)
  or (start_ayah is not null and end_ayah is not null and start_ayah >= 1 and end_ayah >= start_ayah)
);
