-- At most one active ("learning") assignment per kid — defense in depth,
-- application logic also enforces this via assignSurah().
create unique index assignments_one_active_per_kid
  on assignments (kid_id) where status = 'learning';

-- practice_log has no natural conflict target for the daily upsert
-- (kid, date, track) -> completed=true.
alter table practice_log
  add constraint practice_log_kid_date_track_unique unique (kid_id, date, track);
