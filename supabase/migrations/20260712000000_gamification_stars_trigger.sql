-- Milestone 4: keep kids.stars_balance in sync with stars_log automatically,
-- so every write path gets the balance updated without relying on
-- client-side increment logic that could drift on a failed/retried request.
create or replace function sync_stars_balance()
returns trigger
language plpgsql
as $$
begin
  update kids set stars_balance = stars_balance + new.amount where id = new.kid_id;
  return new;
end;
$$;

create trigger stars_log_sync_balance
  after insert on stars_log
  for each row
  execute function sync_stars_balance();
