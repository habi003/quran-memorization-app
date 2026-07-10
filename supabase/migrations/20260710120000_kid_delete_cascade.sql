-- Deleting a kid should cleanly remove all their associated data rather than
-- fail with a foreign key violation once these tables have real rows
-- (assignments/progress/logs start filling up from milestone 3 onward).

alter table assignments drop constraint assignments_kid_id_fkey,
  add constraint assignments_kid_id_fkey foreign key (kid_id) references kids(id) on delete cascade;

alter table memorization_progress drop constraint memorization_progress_kid_id_fkey,
  add constraint memorization_progress_kid_id_fkey foreign key (kid_id) references kids(id) on delete cascade;

alter table practice_log drop constraint practice_log_kid_id_fkey,
  add constraint practice_log_kid_id_fkey foreign key (kid_id) references kids(id) on delete cascade;

alter table reading_progress drop constraint reading_progress_kid_id_fkey,
  add constraint reading_progress_kid_id_fkey foreign key (kid_id) references kids(id) on delete cascade;

alter table kid_reading_position drop constraint kid_reading_position_kid_id_fkey,
  add constraint kid_reading_position_kid_id_fkey foreign key (kid_id) references kids(id) on delete cascade;

alter table stars_log drop constraint stars_log_kid_id_fkey,
  add constraint stars_log_kid_id_fkey foreign key (kid_id) references kids(id) on delete cascade;

alter table badges drop constraint badges_kid_id_fkey,
  add constraint badges_kid_id_fkey foreign key (kid_id) references kids(id) on delete cascade;
